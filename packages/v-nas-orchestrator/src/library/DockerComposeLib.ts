
import {promises as fs} from "fs";
import path from "path";

export async function createTmpDockerComposeFile (domain: string, name: string, uid: string, signature: string): Promise<string> {
    const composeFolder = `./tmp`;

    // for the crypto part we will have to do some kind of user register on the provider side
    //let userRecord = axios.post(`${config.USER_BACKEND_URL}/user/create`, {email: `${name}@${domain}`, password: password});
    //const apiKeyPair = await generateKeyPair();
    const provider = `https://${domain},${uid},${signature}`;

    await fs.mkdir(composeFolder, {recursive: true});

    // Read the template compose file
    const templateContent = await fs.readFile('./template/compose-template.yml', 'utf-8');

    // Replace placeholders with actual values
    let updatedComposeContent = templateContent
        .replace(/%PROVIDER_STR%/g, provider)
        .replace(/%DOMAIN%/g, `${name}.${domain}`);//ref domain for container

    // Write the updated compose file to the compose folder
    const composeFilePath = path.join(composeFolder, 'compose.yml');
    await fs.writeFile(composeFilePath, updatedComposeContent, 'utf-8');
    //console.log(updatedComposeContent);

    return composeFilePath;
}

export async function createUserPersoFile (domain: string, name: string, uid: string, signature: string): Promise<string> {
    const tmpFolder = `./tmp`;

    // for the crypto part we will have to do some kind of user register on the provider side
    //let userRecord = axios.post(`${config.USER_BACKEND_URL}/user/create`, {email: `${name}@${domain}`, password: password});
    //const apiKeyPair = await generateKeyPair();
    const provider = `https://${domain},${uid},${signature}`;

    await fs.mkdir(tmpFolder, {recursive: true});

    // Read the template compose file
    const templateContent = await fs.readFile('./template/env.template', 'utf-8');

    // Replace placeholders with actual values
    let updatedComposeContent = templateContent
        .replace(/%PROVIDER_STR%/g, provider)
        .replace(/%UID%/g, uid)
        .replace(/%DOMAIN%/g, `${name}.${domain}`);//ref domain for container

    // Write the updated compose file to the compose folder
    const finalFile = path.join(tmpFolder, '.env');
    await fs.writeFile(finalFile, updatedComposeContent, 'utf-8');
    //console.log(updatedComposeContent);

    return finalFile;
}