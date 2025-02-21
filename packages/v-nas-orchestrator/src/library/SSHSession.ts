import {NodeSSH} from "node-ssh";

export class SSHSession {
    private ssh: NodeSSH | null = null;
    private isConnected: boolean = false;
    private pendingPromise: Promise<any> = Promise.resolve();

    constructor(private host: string, private key: string, private username: string) {
    }

    private async sshConnect(): Promise<NodeSSH> {
        try {
            const ssh = new NodeSSH();
            const retries = 10;

            for (let attempt = 1; attempt <= retries; attempt++) {
                let delay = 1000 * attempt;
                try {
                    await ssh.connect({
                        host: this.host,
                        username: this.username,
                        privateKey: this.key,
                    });
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
     * Enqueues an operation in the promise chain
     */
    private enqueue<T>(operation: () => Promise<T>): SSHSession {
        this.pendingPromise = this.pendingPromise.then(operation);
        return this;
    }

    /**
     * Connects to the SSH server if not already connected
     */
    public connect(): SSHSession {
        return this.enqueue(async () => {
            if (!this.isConnected) {
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
                await this.connect().await();
            }

            try {
                await this.ssh!.putFile(local, remote);
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
                await this.connect().await();
            }

            try {
                const result = await this.ssh!.execCommand(command);
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

    private _lastResult: { stdout: string; stderr: string } | null = null;

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
                this.ssh.dispose();
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
export function sshSession(host: string, key: string, username = "root"): SSHSession {
    return new SSHSession(host, key, username);
}

// Example usage:
// Method 1: Chain everything and await at the end
// const session = sshSession('hostname', 'private-key', 'username')
//    .connect()
//    .sendFile('/local/path/file.txt', '/remote/path/file.txt')
//    .cmd('ls -la')
//    .dispose();
// await session.await(); // Execute all operations

// Method 2: Chain and get the result
// const result = await sshSession('hostname', 'private-key', 'username')
//    .connect()
//    .sendFile('/local/path/file.txt', '/remote/path/file.txt')
//    .cmd('ls -la')
//    .execute(); // Returns the result of the last command

// Method 3: Step by step with explicit awaits when needed
// const session = sshSession('hostname', 'private-key', 'username');
// await session.connect().await(); // Connect and wait for it to complete
// await session.sendFile('/local/path/file.txt', '/remote/path/file.txt').await();
// const result = await session.cmd('ls -la').execute(); // Execute command and get result
// session.dispose(); // Dispose when done