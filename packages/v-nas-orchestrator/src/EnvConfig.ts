import dotenv from 'dotenv';
dotenv.config();

interface EnvConfig {
    //scaleway instances
    SCW_ZONE: string;
    SCW_API_URL: string;
    SCW_ACCESS_KEY: string;
    SCW_SECRET_KEY: string;
    SCW_DEFAULT_ORGANIZATION_ID: string;
    SCW_DEFAULT_PROJECT_ID: string;
    SCW_INSTANCE: string;
    SCW_IMAGE: string;


    //VM access key
    SSH_KEY: string;
    SSH_GATEWAY_KEY: string;

    //proxmox instances
    YPM_SERVICE_URL: string;
    YPM_AUTH_TOKEN: string;
    YPM_TEMPLATE_ID: string;

    //mesh router backend for domain providing
    MESH_ROUTER_BACKEND_URL: string;
    MESH_ROUTER_BACKEND_API_KEY: string;

    //sendgrid
    SENDGRID_API_KEY: string;
    SENDMAIL_FROM_EMAIL: string;
}

export const config: EnvConfig = {
    SCW_ZONE: process.env.SCW_ZONE,
    SCW_API_URL: process.env.SCW_API_URL,
    SCW_ACCESS_KEY: process.env.SCW_ACCESS_KEY,
    SCW_SECRET_KEY: process.env.SCW_SECRET_KEY,
    SCW_DEFAULT_ORGANIZATION_ID: process.env.SCW_DEFAULT_ORGANIZATION_ID,
    SCW_DEFAULT_PROJECT_ID: process.env.SCW_DEFAULT_PROJECT_ID,
    SCW_INSTANCE: process.env.SCW_INSTANCE,
    SCW_IMAGE: process.env.SCW_IMAGE,

    SSH_KEY: process.env.SSH_KEY,
    SSH_GATEWAY_KEY: process.env.SSH_GATEWAY_KEY,

    YPM_SERVICE_URL: process.env.YPM_SERVICE_URL,
    YPM_AUTH_TOKEN: process.env.YPM_AUTH_TOKEN,
    YPM_TEMPLATE_ID: process.env.YPM_TEMPLATE_ID,

    MESH_ROUTER_BACKEND_URL: process.env.MESH_ROUTER_BACKEND_URL,
    MESH_ROUTER_BACKEND_API_KEY: process.env.MESH_ROUTER_BACKEND_API_KEY,

    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    SENDMAIL_FROM_EMAIL: process.env.SENDMAIL_FROM_EMAIL
};
