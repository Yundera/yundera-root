import dotenv from 'dotenv';
dotenv.config();

type Config = {
    VNAS_BACKEND: string;
    VNAS_SERVICE_API_KEY: string;
    DEMO_UID: string;
    SENDGRID_API_KEY: string;
    SENDMAIL_FROM_EMAIL: string;
};


export function getConfig(key: keyof Config): string {
    return process.env[key];
}