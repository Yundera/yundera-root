export const NSL_ROUTER_COLLECTION = "nsl-router";
export interface NSLRouterData {
    serverDomain: string;
    domainName: string;
    publicKey: string;

    // VPN IP assigned to this user's PCS instance
    vpnIp?: string;
    vpnIpUpdatedAt?: string;

    //meta
    id?: string;
    createdate?: string;
    createdby?: string;
    lastupdate?: string;
    updatedby?: string;
}