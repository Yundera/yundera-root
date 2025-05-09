import {getDomainControlKeyPair} from "../../service/KeyPairDataBase.js";
import {sign} from "../../library/KeyLib.js";
import { Client, SFTPWrapper } from "ssh2";
import {domainApiClient} from "../../service/DomainAPIClient.js";
import {
    create,
    deleteVM,
    status,
    reboot,
    find, CreateResponse
} from "./ProxmoxMiddlewareLib.js";
import {InstanceInformation, InstanceOperations, Options} from "../InstanceOperations.js";
import {config} from "../../EnvConfig.js";
import {createUserPersoFile} from "../../library/DockerComposeLib.js";
import {generateRandomPassword} from "../../library/PasswordGenerator.js";
import {sshSession} from "../../library/SSHSession.js";

export class ProxmoxInstanceOperations implements InstanceOperations{

    public async create(uid: string, options: Options = {}): Promise<InstanceInformation> {
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
        // Instance Creation
        ///////////////////////////////////
        console.log(`Creating V-NAS for ${domainData.domainName}@${domainData.serverDomain} with uid ${uid} / ${signatureUid}`);
        const createResult = await create(uid);

        if (createResult.status === "failed") {
            throw new Error(`Failed to create instance: ${createResult.error}`);
        }

        // Get the status of the newly created VM
        if (!createResult.vmid) {
            throw new Error("VM creation did not return a valid VMID");
        }

        let statusResult = await status(createResult.vmid);
        if (statusResult.status === "failed") {
            throw new Error(`Failed to get instance status: ${statusResult.error}`);
        }
        console.log(createResult)
        while (statusResult.status === "processing") {
            console.log(`Waiting for instance ${createResult.vmid} to be ready...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 seconds
            statusResult = await status(createResult.vmid);
            if (statusResult.status === "failed") {
                throw new Error(`Failed to get instance status: ${statusResult.error}`);
            }
        }

        const remoteFolder = `/DATA/AppData/casaos/apps/yundera`;
        const persoFile = await createUserPersoFile({
                domain: domainData.serverDomain,
                name: domainData.domainName,
                uid: signatureUid,
                signature: signature,
                ip: "",
                defaultpwd: generateRandomPassword(12, true, true, true, false),
                defaultUser: options?.ENVIRONMENT?.USER
            }
        );

        //wait 10s for the instance to be ready
        await new Promise((resolve) => setTimeout(resolve, 15000));

        const ssh = new Client();
        await ssh.connect({
            host: createResult.node_hostname,
            username: "root",
            privateKey: config.SSH_GATEWAY_KEY,
        });

        console.log("here")
        await sshSession()
            .setJumpHost({
                host: createResult.node_hostname,
                username: "root",
                privateKey: config.SSH_GATEWAY_KEY,
            })
            .connect({
                host: createResult.vm_hostname,
                username: "root",
                privateKey: config.SSH_KEY,
            })
            .cmd(`mkdir -p ${remoteFolder}`)
            .sendFile(persoFile, `${remoteFolder}/.env`)
            .sendFile("./template/start.sh", `${remoteFolder}/start.sh`)
            .cmd(`chmod +x ${remoteFolder}/start.sh`)
            .sendFile("./template/compose-template.yml", `${remoteFolder}/compose-template.yml`)
            .cmd(`docker compose -f ${remoteFolder}/compose-template.yml pull > /dev/null 2>&1`) //ensure everything is up to date for first start
            .cmd(`${remoteFolder}/start.sh`)
            .cmd(`(crontab -l 2>/dev/null || echo "") | grep -v "${remoteFolder}/start.sh" | { cat; echo "@reboot ${remoteFolder}/start.sh"; } | crontab -`)
            .dispose().await();

        return {
            vmid: createResult.vmid,
            node_hostname: createResult.node_hostname,
            vm_hostname: createResult.vm_hostname
        };
    }

    public async delete(uid: string): Promise<string> {
        ///////////////////////////////////
        // Domain verification
        ///////////////////////////////////
        const keyPair = await getDomainControlKeyPair(uid);
        let signatureUid = `${uid}@nasselle.com`;
        const signature = await sign(keyPair.privkey, signatureUid);

        ///////////////////////////////////
        // Check if instance exists
        ///////////////////////////////////
        try {
            const findResult = await find(uid);
            if (!findResult.vmids || findResult.vmids.length === 0) {
                console.log(`No VM instance found for UID ${uid}, nothing to delete`);
                return "no_instance";
            }

            ///////////////////////////////////
            // Delete the instance
            ///////////////////////////////////
            console.log(`Deleting V-NAS instance for UID ${uid} / ${signatureUid}`);
            const vmid = findResult.vmids[0];
            const result = await deleteVM(vmid);

            if (result.status === "processing") {
                console.log(`Successfully initiated deletion for UID ${uid}`);
                return "deletion_initiated";
            } else {
                throw new Error(`Failed to delete instance: ${result.error}`);
            }
        } catch (error) {
            if (error.message && error.message.includes("No VM found")) {
                console.log(`No VM instance found for UID ${uid}, nothing to delete`);
                return "no_instance";
            }
            throw error;
        }
    }

    public async reboot(uid: string): Promise<string> {
        ///////////////////////////////////
        // Domain verification
        ///////////////////////////////////
        const keyPair = await getDomainControlKeyPair(uid);
        let signatureUid = `${uid}@nasselle.com`;
        const signature = await sign(keyPair.privkey, signatureUid);

        ///////////////////////////////////
        // Check if instance exists
        ///////////////////////////////////
        try {
            const findResult = await find(uid);
            if (!findResult.vmids || findResult.vmids.length === 0) {
                throw new Error(`No VM instance found for UID ${uid}, cannot reboot`);
            }

            ///////////////////////////////////
            // Reboot the instance
            ///////////////////////////////////
            console.log(`Rebooting V-NAS instance for UID ${uid} / ${signatureUid}`);
            const vmid = findResult.vmids[0];
            const result = await reboot(vmid);

            if (result.status === "processing") {
                console.log(`Successfully initiated reboot for UID ${uid}`);
                return "reboot_initiated";
            } else {
                throw new Error(`Failed to reboot instance: ${result.error}`);
            }
        } catch (error) {
            if (error.message && error.message.includes("No VM found")) {
                throw new Error(`No VM instance found for UID ${uid}, cannot reboot`);
            }
            throw error;
        }
    }

    public async has(uid: string): Promise<boolean> {
        try {
            const findResult = await find(uid);
            if(findResult.vmids && findResult.vmids.length > 0){
                const vmid = findResult.vmids[0];
                const statusResult = await status(vmid);
                if (statusResult.status === "completed") {
                    return true;
                } else {
                    return false;
                }
            }
        } catch (error) {
            return false;
        }
    }
}