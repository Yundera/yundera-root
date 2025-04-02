import {createUserPersoFile} from "../../library/DockerComposeLib.js";
import {
    actionOnInstance,
    createInstance,
    deleteInstance,
    getInstances,
    getMainInstance,
} from "../../library/ScalewayLib.js";
import {InstanceOperations} from "../InstanceOperations.js";
import {deleteDomainControlKeyPair, getDomainControlKeyPair} from "../../service/KeyPairDataBase.js";
import {sign} from "../../library/KeyLib.js";
import {domainApiClient} from "../../service/DomainAPIClient.js";
import {sendEmail} from "../../library/Sendgrid.js";
import {config} from "../../EnvConfig.js";
import {sshSession} from "../../library/SSHSession.js";
import {generateRandomPassword} from "../../library/PasswordGenerator.js";
import {Options} from "./Options.js";

export class ScalewayInstanceOperations implements InstanceOperations {
    private operationPromises = new Map<string, Promise<any>>();

    public async setup(uid: string, options: Options = {}): Promise<string> {
        return this.withWIPProtection(uid, async () => {

            ///////////////////////////////////
            // Domain Setup and verifications
            ///////////////////////////////////
            const keyPair = await getDomainControlKeyPair(uid);
            let signatureUid = `${uid}@nasselle.com`;
            const signature = await sign(keyPair.privkey, signatureUid);

            let domainData = await domainApiClient.getDomainInfo(signatureUid);

            if (!domainData.publicKey || keyPair.pubkey !== domainData.publicKey) {
                await domainApiClient.setDomainInfo(signatureUid, {
                    domainName: domainData.domainName,
                    publicKey: keyPair.pubkey,
                    serverDomain: domainData.serverDomain
                });
                domainData = await domainApiClient.getDomainInfo(signatureUid);
                if (!domainData.publicKey || keyPair.pubkey !== domainData.publicKey) {
                    throw new Error("Failed to update domain info");
                }
            }

            ///////////////////////////////////
            // Cleanup
            ///////////////////////////////////
            try {
                await deleteInstance(uid); // in case it already exists
            } catch (e) {
                /*ignore: if nothing to delete*/
            }

            ///////////////////////////////////
            // Instance Creation
            ///////////////////////////////////
            console.log(`Creating V-NAS for ${domainData.domainName}@${domainData.serverDomain} with uid ${uid} / ${signatureUid}`);
            const remoteFolder = `/DATA/AppData/casaos/apps/yundera`;
            await createInstance(uid);
            await this.statusInternal(uid);
            let instance = await getMainInstance(uid);
            if(!instance) {
                throw new Error(`Instance not found for UID ${uid}`);
            }
            //wait 10s for the instance to be ready
            await new Promise((resolve) => setTimeout(resolve, 10000));

            let ip = instance.public_ip.address;
            let sshkey = config.SSH_KEY;
            const persoFile = await createUserPersoFile({
                    domain: domainData.serverDomain,
                    name: domainData.domainName,
                    uid: signatureUid,
                    signature: signature,
                    ip: ip,
                    defaultpwd: generateRandomPassword(12, true, true, true, false),
                    defaultUser: options?.ENVIRONMENT?.USER
                }
            );
            await sshSession(ip, sshkey, 'root')
                .connect()
                .cmd(`mkdir -p ${remoteFolder}`)
                .sendFile(persoFile, `${remoteFolder}/.env`)
                .sendFile("./template/start.sh", `${remoteFolder}/start.sh`)
                .cmd(`chmod +x ${remoteFolder}/start.sh`)
                .sendFile("./template/compose-template.yml", `${remoteFolder}/compose-template.yml`)
                .cmd(`docker compose -f ${remoteFolder}/compose-template.yml pull > /dev/null 2>&1`) //ensure everything is up to date for first start
                .cmd(`${remoteFolder}/start.sh`)
                .cmd(`(crontab -l 2>/dev/null || echo "") | grep -v "${remoteFolder}/start.sh" | { cat; echo "@reboot ${remoteFolder}/start.sh"; } | crontab -`)
                .dispose().await();
            return instance.id;
        });
    }

    public async delete(uid: string): Promise<string> {
        return this.withWIPProtection(uid, async () => {
            console.log(`Deleting V-NAS with UID ${uid}`);
            let signatureUid = `${uid}@nasselle.com`;

            await deleteInstance(uid);
            await domainApiClient.deleteDomainInfo(signatureUid);
            await deleteDomainControlKeyPair(uid);

            await new Promise((resolve) => setTimeout(resolve, 5000));
            return "done";
        });
    }

    public async reboot(uid: string): Promise<string> {
        return this.withWIPProtection(uid, async () => {
            console.log(`Rebooting V-NAS with UID ${uid}`);
            await actionOnInstance(uid, 'reboot');
            await new Promise((resolve) => setTimeout(resolve, 20000));

            let instance;
            let ip;
            let sshkey = config.SSH_KEY;

            for (let i = 0; i < 20; i++) {
                instance = await getMainInstance(uid);
                if (instance) {
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retrying
            }
            if (instance && instance.public_ip && instance.public_ip.address) {
                ip = instance.public_ip.address;
            } else {
                throw new Error(`Failed to get IP address for instance with UID ${uid}`);
            }

            if (!ip) {
                throw new Error(`Failed to get IP address for instance with UID ${uid}`);
            }

            await sshSession(ip, sshkey, 'root').connect().cmd('ping -c 4 google.com').dispose().await();
            return "done";
        });
    }

    private async statusInternal(uid: string): Promise<string> {
        console.log(`Checking integrity of V-NAS with UID ${uid}`);

        let instances = await getInstances(uid, false);
        if (instances.length == 0) {
            return null;
        } else if (instances.length > 1) {
            console.error(`Multiple instances found for UID ${uid}`);
            await sendEmail({
                to: config.SENDMAIL_FROM_EMAIL,
                subject: "V-NAS Error",
                text: `Multiple instances found for UID ${uid}`
            });
        }
        const instance = instances[0];
        return instance.id;
    }

    public async status(uid: string): Promise<string> {
        return this.withWIPProtection(uid, async () => {
            return this.statusInternal(uid);
        });
    }

    private async withWIPProtection<T>(uid: string, operation: () => Promise<T>): Promise<T> {
        // Get the current promise chain for this UID, or create a resolved promise as the initial chain
        const currentPromise: Promise<any> = this.operationPromises.get(uid) ?? Promise.resolve();
        let newPromise: Promise<any>;
        // Wait for the current promise to complete before starting the new operation
        try {
            // Chain the operation onto the current promise
            newPromise = (async () => {
                await currentPromise;
                return await operation();
            })();

            // Update the promise chain for this UID
            this.operationPromises.set(uid, newPromise);

            // Wait for the operation to complete
            return await newPromise;
        } finally {
            // Clean up the promise map if this was the last operation in the chain
            if (this.operationPromises.get(uid) == newPromise) {
                this.operationPromises.delete(uid);
            }
        }
    }
}