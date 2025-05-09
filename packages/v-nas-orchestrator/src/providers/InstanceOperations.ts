export type Options = {
  ENVIRONMENT?: {
    USER?: string;//username:password
  };
}

export interface InstanceInformation {
    vmid: number;
    node_hostname: string;
    vm_hostname: string;
}

export interface InstanceOperations {
  create(uid: string, options: Options ): Promise<InstanceInformation>;
  delete(uid: string): Promise<string>;
  reboot(uid: string): Promise<string>;
  has(uid: string): Promise<boolean>;
}
