import axios from 'axios';
import {config} from "../EnvConfig.js";
import {Instance} from "../providers/scaleway/ScalewayInterface.js";

export async function createInstance(uid: string): Promise<Instance> {
    // Create an instance and attach the reserved flexible IP
    const response = await axios.post(
        `${config.SCW_API_URL}/instance/v1/zones/${config.SCW_ZONE}/servers`,
        {
            name: servername(uid),
            project: config.SCW_DEFAULT_PROJECT_ID,
            commercial_type: config.SCW_INSTANCE,
            image: config.SCW_IMAGE,
            dynamic_ip_required: false,
        },
        {
            headers: {
                'X-Auth-Token': config.SCW_SECRET_KEY,
                'Content-Type': 'application/json'
            }
        }
    );

    let instance = response.data.server;
    await reserveFlexibleIP(instance.id);//add ip

    await actionOnInstanceBySid(instance.id, 'poweron');
    instance = await getInstanceDetails(instance.id);
    console.log('Created Instance:', instance);
    return instance;
}

async function deleteFlexibleIP(ipId: string): Promise<void> {
    await axios.delete(
      `${config.SCW_API_URL}/instance/v1/zones/${config.SCW_ZONE}/ips/${ipId}`,
      {
          headers: {
              'X-Auth-Token': config.SCW_SECRET_KEY,
              'Content-Type': 'application/json'
          }
      }
    );
}

async function deleteVolume(volumeId: string): Promise<void> {
    await axios.delete(
      `${config.SCW_API_URL}/instance/v1/zones/${config.SCW_ZONE}/volumes/${volumeId}`,
      {
          headers: {
              'X-Auth-Token': config.SCW_SECRET_KEY,
              'Content-Type': 'application/json'
          }
      }
    );
}

async function getInstanceIPs(instanceId: string): Promise<string[]> {
    const response = await axios.get(
      `${config.SCW_API_URL}/instance/v1/zones/${config.SCW_ZONE}/ips`,
      {
          headers: {
              'X-Auth-Token': config.SCW_SECRET_KEY,
              'Content-Type': 'application/json'
          },
          params: {
              server: instanceId
          }
      }
    );
    return response.data.ips.map((ip: any) => ip.id);
}

export async function deleteInstance(uid: string): Promise<void> {
    const instances = await getInstances(uid, false); // Get all instances including terminated ones

    for (const instance of instances) {
        try {
            // Step 1: Get and delete all attached IPs
            const ipIds = await getInstanceIPs(instance.id);
            for (const ipId of ipIds) {
                await deleteFlexibleIP(ipId);
                console.log(`Deleted IP ${ipId} for instance ${instance.id}`);
            }

            // Step 2: Delete all attached volumes
            const volumes = Object.values(instance.volumes || {});
            for (const volume of volumes) {
                // Wait for instance to be fully terminated before deleting volumes
                await actionOnInstanceBySid(instance.id, "terminate");
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

                try {
                    await deleteVolume(volume.id);
                    console.log(`Deleted volume ${volume.id} for instance ${instance.id}`);
                } catch (error: any) {
                    if (error.response?.status === 404) {
                        console.log(`Volume ${volume.id} already deleted`);
                    } else {
                        throw error;
                    }
                }
            }

            console.log(`Successfully cleaned up instance ${instance.id}`);
        } catch (error) {
            console.error(`Error cleaning up instance ${instance.id}:`, error);
            throw error;
        }
    }
}

export async function actionOnInstance(uid: string, action: 'poweron' | 'poweroff' | 'reboot' | 'terminate'): Promise<void> {
    const instances = await getInstances(uid);
    if (instances.length !== 1) {
        console.error(instances);
        throw new Error(`Expected 1 instance but got ${instances.length}`);
    }
    await actionOnInstanceBySid(instances[0].id, action);
}

export async function getInstances(uid: string,filtered:boolean = true):Promise<Instance[]> {
    // Fetch instances filtered by name using the UID (assuming the UID is part of the instance name)
    const response = await axios.get(
      `${config.SCW_API_URL}/instance/v1/zones/${config.SCW_ZONE}/servers?name=${servername(uid)}`,
      {
          headers: {
              'X-Auth-Token': config.SCW_SECRET_KEY,
              'Content-Type': 'application/json'
          }
      }
    );

    let instances = response.data.servers;

    // If no instances are found
    if (instances.length === 0) {
        return [];
    }

    // Find the exact instance by checking the UID if necessary
    const instance = instances.find((server: any) => server.name === servername(uid));

    if (!instance) {
        throw new Error(`Instance with UID ${uid} not found`);
    }

    //filter out the instances with state_detail: 'terminating' || 'terminated' or  state: 'deleted'
    if(filtered) {
        instances = instances.filter((server: any) =>
          server.state_detail !== 'terminating' &&
          server.state_detail !== 'terminated' &&
          server.state !== 'deleted' &&
          server.state !== 'stopping' &&
          server.state !== 'stopped in place' &&
          server.state !== 'stopped' &&
          server.state !== 'locked'
        );
    }
    return instances;
}

export async function getMainInstance(uid: string):Promise<Instance> {
    const instances = await getInstances(uid);
    if (instances.length > 1) {
        console.error(instances);
        throw new Error(`Expected 0-1 instance but got ${instances.length}`);
    }
    if (instances.length === 0) {
        return null;
    }else {
        return instances[0];
    }
}

function servername(uid: string): string {
    return `nasselle-v-nas-${uid}`;
}

async function getInstanceDetails(instanceId: string):Promise<Instance> {
    const response = await axios.get(
        `${config.SCW_API_URL}/instance/v1/zones/${config.SCW_ZONE}/servers/${instanceId}`,
        {
            headers: {
                'X-Auth-Token': config.SCW_SECRET_KEY,
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data.server;
}

async function actionOnInstanceBySid(instanceId: string, action: 'poweron' | 'poweroff' | 'reboot' | 'terminate'): Promise<void> {
    await axios.post(
        `${config.SCW_API_URL}/instance/v1/zones/${config.SCW_ZONE}/servers/${instanceId}/action`, {action,},
        {
            headers: {
                'X-Auth-Token': config.SCW_SECRET_KEY,
                'Content-Type': 'application/json'
            }
        }
    );
}

async function reserveFlexibleIP(server_uuid: string): Promise<string> {
    const response = await axios.post(
        `${config.SCW_API_URL}/instance/v1/zones/${config.SCW_ZONE}/ips`,
        {
            project: config.SCW_DEFAULT_PROJECT_ID,
            //type: 'routed_ipv6',
            type: 'routed_ipv4',
            server: server_uuid,
        },
        {
            headers: {
                'X-Auth-Token': config.SCW_SECRET_KEY,
                'Content-Type': 'application/json',
            },
        }
    );

    const ip = response.data.ip;
    return ip.id;
}