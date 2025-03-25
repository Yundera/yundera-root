import {promises as fs} from "fs";
import path from "path";
import {Options} from "../providers/scaleway/Options.js";

export async function createUserPersoFile(user: {
                                            domain: string,
                                            name: string,
                                            uid: string,
                                            signature: string,
                                            ip: string,
                                            defaultpwd: string,
                                            defaultUser?:string,
                                          }
): Promise<string> {
  const tmpFolder = `./tmp`;

  // for the crypto part we will have to do some kind of user register on the provider side
  //let userRecord = axios.post(`${config.USER_BACKEND_URL}/user/create`, {email: `${name}@${domain}`, password: password});
  //const apiKeyPair = await generateKeyPair();
  const provider = `https://${user.domain},${user.uid},${user.signature}`;

  await fs.mkdir(tmpFolder, {recursive: true});

  // Read the template compose file
  const templateContent = await fs.readFile('./template/env.template', 'utf-8');

  // Replace placeholders with actual values
  let updatedComposeContent = templateContent
  .replace(/%PROVIDER_STR%/g, provider)
      .replace(/%DEFAULT_USER%/g, user.defaultUser)
  .replace(/%UID%/g, user.uid)
  .replace(/%PUBLIC_IP%/g, user.ip)
  .replace(/%DEFAULT_PWD%/g, user.defaultpwd)
  .replace(/%DOMAIN%/g, `${user.name}.${user.domain}`);//ref domain for container

  // Write the updated compose file to the compose folder
  const finalFile = path.join(tmpFolder, '.env');
  await fs.writeFile(finalFile, updatedComposeContent, 'utf-8');
  //console.log(updatedComposeContent);

  return finalFile;
}