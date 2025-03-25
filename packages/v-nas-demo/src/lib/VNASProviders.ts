// apiClient.js
import axios from "axios";
import {getConfig} from "../EnvConfig.js";

const apiBase = getConfig("VNAS_BACKEND");
const backendKey = getConfig("VNAS_SERVICE_API_KEY");


// Create an Axios instance
const apiClient = axios.create({
    baseURL: apiBase,
});

console.log("apiBase:" + apiBase);

// Utility functions
const createAuthHeader = (userid: string | string[]) => {
    return {
        Authorization: `Bearer ${backendKey};${userid}`
    };
}

export async function vnasAdminAction(uid: string, action: 'delete' | 'reboot' | 'create' | 'status', options: any = {}): Promise<string> {
    if (!action) {
        throw new Error("Action is required for VNAS action.");
    }
    try {
        const response = await apiClient.post(`/vnas/${action}`, options, {
            headers: createAuthHeader(uid),
            timeout: 480000, // 8 minutes in milliseconds
        });
        if(response.status !== 200) {
            console.error(response.data);
            throw new Error(`VNAS action ${uid}: ${action} failed with status ${response.status}`);
        }
        return response.data;
    } catch (error) {
        console.error('Error checking domain availability:', error);
        throw error;
    }
}

