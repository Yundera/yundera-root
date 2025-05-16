import axios from 'axios';
import { config } from "../../EnvConfig.js";

/**
 * Common response status types with more precise definitions
 */
export type ResponseStatusCompleted = "completed";
export type ResponseStatusFailed = "failed";
export type ResponseStatusProcessing = "processing";
export type ResponseStatusSuccess = "success";

export type ResponseStatus =
    | ResponseStatusCompleted
    | ResponseStatusFailed
    | ResponseStatusProcessing
    | ResponseStatusSuccess;

/**
 * Response from find operation for VM by UUID with discriminated unions
 * @see /find/{uuid} endpoint
 */
export type FindResponse =
    | {
    status: ResponseStatusCompleted;
    uuid: string;
    vmids: number[];
    error?: never;
}
    | {
    status: ResponseStatusFailed;
    uuid: string;
    vmids?: never;
    error: string;
}
    | {
    status: ResponseStatusProcessing;
    uuid: string;
    vmids?: number[];
    error?: string;
};

/**
 * Response from VM creation operation with discriminated unions
 * @see /create/{uuid} endpoint
 */
export type CreateResponse =
    | {
    status: ResponseStatusCompleted;
    uuid: string;
    vmid: number;
    node_hostname: string;
    vm_hostname: string;
    error?: never;
}
    | {
    status: ResponseStatusFailed;
    uuid: string;
    vmid?: never;
    node_hostname?: never;
    vm_hostname?: never;
    error: string;
}
    | {
    status: ResponseStatusProcessing;
    uuid: string;
    vmid?: number;
    node_hostname?: string;
    vm_hostname?: string;
    error?: string;
};

/**
 * Response from VM status operation with discriminated unions
 * @see /status/{vmid} endpoint
 */
export type StatusResponse =
    | {
    status: ResponseStatusCompleted;
    vmid: number;
    uuid?: string;
    data: Record<string, any>;
    error?: never;
}
    | {
    status: ResponseStatusFailed;
    vmid: number;
    uuid?: string;
    data?: never;
    error: string;
}
    | {
    status: ResponseStatusProcessing;
    vmid: number;
    uuid?: string;
    data?: Record<string, any>;
    error?: string;
};

/**
 * Response from VM reboot operation with discriminated unions
 * @see /reboot/{vmid} endpoint
 */
export type RebootResponse =
    | {
    status: ResponseStatusCompleted | ResponseStatusProcessing;
    vmid: number;
    uuid?: string;
    upid: string;
    data?: Record<string, any>;
    error?: never;
}
    | {
    status: ResponseStatusFailed;
    vmid: number;
    uuid?: string;
    upid?: never;
    data?: never;
    error: string;
};

/**
 * Response from VM delete operation with discriminated unions
 * @see /delete/{vmid} endpoint
 */
export type DeleteResponse =
    | {
    status: ResponseStatusCompleted | ResponseStatusProcessing;
    vmid: number;
    uuid?: string;
    upid: string;
    data?: Record<string, any>;
    error?: never;
}
    | {
    status: ResponseStatusFailed;
    vmid: number;
    uuid?: string;
    upid?: never;
    data?: never;
    error: string;
};

/**
 * Response from task status operation with discriminated unions
 * @see /job/{upid} endpoint
 */
export type TaskStatusResponse =
    | {
    status: ResponseStatusSuccess;
    upid: string;
    error?: never;
}
    | {
    status: ResponseStatusFailed;
    upid: string;
    error: string;
}
    | {
    status: ResponseStatusProcessing;
    upid: string;
    error?: string;
};

/**
 * Request body for VM creation
 * @see /create/{uuid} endpoint
 */
export interface CreateVMRequestBody {
    template_vmid: number;
    vm_tier: string;
    ceph_rbd_name?: string; // Default: "cephpool"
    disk_identifier?: string; // Default: "scsi0"
}

/**
 * Finds all VMs associated with the given user id (uuid)
 * @param uuid - UUID v4 string corresponding to the user
 * @returns Promise with find operation results
 */
export async function find(uuid: string): Promise<FindResponse> {
    try {
        const response = await axios.get(
            `${config.YPM_SERVICE_URL}/find/${uuid.toLowerCase()}`,
            {
                headers: {
                    'Authorization': `Bearer ${config.YPM_AUTH_TOKEN}`
                }
            }
        );

        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error(`Received unexpected status code: ${response.status}`);
        }
    } catch (error) {
        console.error("Error finding VMs for user:", error);
        throw error;
    }
}

/**
 * Creates a new VM for the user (uuid) by cloning from a template
 * @param uuid - UUID v4 string corresponding to the user
 * @param options - VM creation options
 * @returns Promise with operation result
 */
export async function create(
    uuid: string,
    options: CreateVMRequestBody = { template_vmid: +config.YPM_TEMPLATE_ID, vm_tier: "basic" }
): Promise<CreateResponse> {
    try {
        const response = await axios.post(
            `${config.YPM_SERVICE_URL}/create/${uuid.toLowerCase()}`,
            options,
            {
                headers: {
                    'Authorization': `Bearer ${config.YPM_AUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error(`Received unexpected status code: ${response.status}`);
        }
    } catch (error) {
        console.error("Error creating VM:", error);
        throw error;
    }
}

/**
 * Returns the current status of a VM
 * @param vmid - VM identifier
 * @returns Promise with the VM status details
 */
export async function status(vmid: number): Promise<StatusResponse> {
    try {
        const response = await axios.get(
            `${config.YPM_SERVICE_URL}/status/${vmid}`,
            {
                headers: {
                    'Authorization': `Bearer ${config.YPM_AUTH_TOKEN}`
                }
            }
        );

        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error(`Received unexpected status code: ${response.status}`);
        }
    } catch (error) {
        console.error("Error getting VM status:", error);
        throw error;
    }
}

/**
 * Reboots a VM
 * @param vmid - VM identifier
 * @returns Promise with operation result
 */
export async function reboot(vmid: number): Promise<RebootResponse> {
    try {
        const response = await axios.post(
            `${config.YPM_SERVICE_URL}/reboot/${vmid}`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${config.YPM_AUTH_TOKEN}`
                }
            }
        );

        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error(`Received unexpected status code: ${response.status}`);
        }
    } catch (error) {
        console.error("Error rebooting VM:", error);
        throw error;
    }
}

/**
 * Deletes a VM
 * @param vmid - VM identifier
 * @returns Promise with operation result
 */
export async function deleteVM(vmid: number): Promise<DeleteResponse> {
    try {
        const response = await axios.delete(
            `${config.YPM_SERVICE_URL}/delete/${vmid}`,
            {
                headers: {
                    'Authorization': `Bearer ${config.YPM_AUTH_TOKEN}`
                }
            }
        );

        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error(`Received unexpected status code: ${response.status}`);
        }
    } catch (error) {
        console.error("Error deleting VM:", error);
        throw error;
    }
}

/**
 * Retrieves the status of a task using its UPID
 * @param upid - Proxmox UPID of the task
 * @returns Promise with the task status details
 */
export async function getTaskStatus(upid: string): Promise<TaskStatusResponse> {
    try {
        const response = await axios.get(
            `${config.YPM_SERVICE_URL}/job/${upid}`,
            {
                headers: {
                    'Authorization': `Bearer ${config.YPM_AUTH_TOKEN}`
                }
            }
        );

        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error(`Received unexpected status code: ${response.status}`);
        }
    } catch (error) {
        console.error(`Error getting task status:`, error);
        throw error;
    }
}