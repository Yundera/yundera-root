import { Client, SFTPWrapper } from "ssh2";

export interface JumpHostConfig {
    host: string;
    port?: number;
    username: string;
    privateKey?: string;
    password?: string;
}

export interface ConnectionConfig {
    host: string;
    port?: number;
    username: string;
    privateKey?: string;
    password?: string;
}

export class SSHSession {
    private ssh: Client | null = null;
    private isConnected: boolean = false;
    private pendingPromise: Promise<any> = Promise.resolve();
    private _lastResult: { stdout: string; stderr: string } | null = null;
    private jumpHost: JumpHostConfig | null = null;
    private connectionConfig: ConnectionConfig | null = null;

    constructor() {
    }

    /**
     * Set a jump host for the SSH connection
     * This allows connecting to the target host through an intermediate server
     */
    public setJumpHost(config: JumpHostConfig): SSHSession {
        this.jumpHost = config;
        return this;
    }

    private async sshConnect(): Promise<Client> {
        try {
            if (!this.connectionConfig) {
                throw new Error("Connection configuration is required");
            }

            const ssh = new Client();
            const retries = 10;

            for (let attempt = 1; attempt <= retries; attempt++) {
                let delay = 1000 * attempt;
                try {
                    if (this.jumpHost) {
                        // Connect through jump host
                        await this.connectViaJumpHost(ssh);
                    } else {
                        // Direct connection
                        await new Promise<void>((resolve, reject) => {
                            ssh.on('ready', () => {
                                resolve();
                            }).on('error', (err) => {
                                reject(err);
                            }).connect({
                                host: this.connectionConfig!.host,
                                port: this.connectionConfig!.port || 22,
                                username: this.connectionConfig!.username,
                                privateKey: this.connectionConfig!.privateKey,
                                password: this.connectionConfig!.password,
                            });
                        });
                    }
                    return ssh;
                } catch (error) {
                    if (attempt === retries) {
                        throw error; // Rethrow the error if it's the last attempt
                    }
                    console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
                    await new Promise(res => setTimeout(res, delay)); // Wait before retrying
                }
            }

            throw new Error("Failed to connect after all retries");
        } catch (error) {
            throw error;
        }
    }

    /**
     * Connect to target host through a jump host
     */
    private async connectViaJumpHost(targetClient: Client): Promise<void> {
        if (!this.jumpHost) {
            throw new Error("Jump host configuration is required");
        }

        if (!this.connectionConfig) {
            throw new Error("Connection configuration is required");
        }

        // Create a connection to the jump host
        const jumpClient = new Client();

        // Connect to the jump host
        await new Promise<void>((resolve, reject) => {
            jumpClient.on('ready', () => {
                resolve();
            }).on('error', (err) => {
                reject(err);
            }).connect({
                host: this.jumpHost.host,
                port: this.jumpHost.port || 22,
                username: this.jumpHost.username,
                privateKey: this.jumpHost.privateKey,
                password: this.jumpHost.password,
            });
        });

        console.log(`Connected to jump host: ${this.jumpHost.host}`);

        // Use the jump host to connect to the target
        return new Promise<void>((resolve, reject) => {
            // Create a forwarded stream to the target host
            jumpClient.forwardOut('127.0.0.1', 12345, this.connectionConfig!.host, this.connectionConfig!.port || 22, (err, stream) => {
                if (err) {
                    jumpClient.end();
                    return reject(err);
                }

                // Use the stream to connect to the target host
                targetClient.on('ready', () => {
                    // Keep the jump client alive as long as the target client is connected
                    targetClient.once('close', () => {
                        jumpClient.end();
                    });

                    targetClient.once('error', () => {
                        jumpClient.end();
                    });

                    resolve();
                }).on('error', (err) => {
                    jumpClient.end();
                    reject(err);
                }).connect({
                    host: this.connectionConfig!.host,
                    port: this.connectionConfig!.port || 22,
                    username: this.connectionConfig!.username,
                    privateKey: this.connectionConfig!.privateKey,
                    password: this.connectionConfig!.password,
                    sock: stream, // Use the forwarded stream as the socket
                });
            });
        });
    }

    /**
     * Enqueues an operation in the promise chain
     */
    private enqueue<T>(operation: () => Promise<T>): SSHSession {
        this.pendingPromise = this.pendingPromise.then(operation);
        return this;
    }

    /**
     * Connects to the SSH server if not already connected
     */
    public connect(config: ConnectionConfig): SSHSession {
        return this.enqueue(async () => {
            if (!this.isConnected) {
                this.connectionConfig = config;
                this.ssh = await this.sshConnect();
                this.isConnected = true;
            }
            return this;
        });
    }

    /**
     * Send files from local to remote server
     */
    public sendFile(local: string, remote: string): SSHSession {
        return this.enqueue(async () => {
            if (!this.isConnected || !this.ssh) {
                throw new Error("SSH connection is not established. Call connect() first.");
            }

            try {
                // Use ssh2's sftp to put the file
                await new Promise<void>((resolve, reject) => {
                    this.ssh!.sftp((err, sftp) => {
                        if (err) {
                            return reject(err);
                        }

                        sftp.fastPut(local, remote, (err) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve();
                        });
                    });
                });

                console.log(`File sent successfully from ${local} to ${remote}`);
                return this;
            } catch (error) {
                console.error('Error sending file:', error);
                throw error;
            }
        });
    }

    /**
     * Execute a command on the remote server
     */
    public cmd(command: string): SSHSession {
        return this.enqueue(async () => {
            if (!this.isConnected || !this.ssh) {
                throw new Error("SSH connection is not established. Call connect() first.");
            }

            try {
                const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
                    this.ssh!.exec(command, (err, stream) => {
                        if (err) {
                            return reject(err);
                        }

                        let stdout = '';
                        let stderr = '';

                        stream.on('close', (code: number) => {
                            resolve({ stdout, stderr });
                        }).on('data', (data: Buffer) => {
                            stdout += data.toString();
                        }).stderr.on('data', (data: Buffer) => {
                            stderr += data.toString();
                        });
                    });
                });

                console.log(`Command executed: ${command}`);
                if(result.stdout) {
                    console.log(`stdout: ${result.stdout}`);
                }
                if (result.stderr) console.error(`stderr: ${result.stderr}`);

                // Store the result for later retrieval
                this._lastResult = result;

                return this;
            } catch (error) {
                console.error(`Error executing command "${command}":`, error);
                throw error;
            }
        });
    }

    /**
     * Get the result of the last executed command
     */
    public getLastResult(): { stdout: string; stderr: string } | null {
        return this._lastResult;
    }

    /**
     * Close the SSH connection
     */
    public dispose(): SSHSession {
        return this.enqueue(async () => {
            if (this.isConnected && this.ssh) {
                this.ssh.end();
                this.isConnected = false;
                this.ssh = null;
            }
            return this;
        });
    }

    /**
     * Wait for all pending operations to complete
     */
    public async await(): Promise<SSHSession> {
        await this.pendingPromise;
        return this;
    }

    /**
     * Execute all pending operations and return the last result
     */
    public async execute(): Promise<{ stdout: string; stderr: string } | null> {
        await this.pendingPromise;
        return this._lastResult;
    }
}

/**
 * Factory function to create and return a new SSH session
 */
export function sshSession(): SSHSession {
    return new SSHSession();
}

// Example usage:
// Method 1: Chain everything and await at the end
// const session = sshSession()
//    .connect({
//      host: 'hostname',
//      username: 'username',
//      privateKey: 'private-key'
//    })
//    .sendFile('/local/path/file.txt', '/remote/path/file.txt')
//    .cmd('ls -la')
//    .dispose();
// await session.await(); // Execute all operations

// Method 2: Chain and get the result
// const result = await sshSession()
//    .connect({
//      host: 'hostname',
//      username: 'username',
//      privateKey: 'private-key'
//    })
//    .sendFile('/local/path/file.txt', '/remote/path/file.txt')
//    .cmd('ls -la')
//    .execute(); // Returns the result of the last command

// Method 3: Step by step with explicit awaits when needed
// const session = sshSession();
// await session.connect({
//   host: 'hostname',
//   username: 'username',
//   privateKey: 'private-key'
// }).await(); // Connect and wait for it to complete
// await session.sendFile('/local/path/file.txt', '/remote/path/file.txt').await();
// const result = await session.cmd('ls -la').execute(); // Execute command and get result
// session.dispose(); // Dispose when done

// Example with jump host:
// const session = sshSession()
//    .setJumpHost({
//      host: 'jump-server',
//      username: 'jump-user',
//      privateKey: 'jump-private-key',
//      // or password: 'jump-password'
//    })
//    .connect({
//      host: 'private-server',
//      username: 'target-user',
//      privateKey: 'target-private-key'
//    })
//    .cmd('ls -la')
//    .execute();