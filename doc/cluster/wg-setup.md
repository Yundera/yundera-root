# WireGuard Manual Installation and Network Setup Guide
 
This guide will help you manually install WireGuard on multiple Ubuntu servers and create a mesh network between them.

## Prerequisites

- Multiple Ubuntu servers with root access
- Basic knowledge of networking concepts
- Servers should be able to reach each other over the internet
- be logged as root

## Step 1: Install WireGuard

### On Ubuntu:
```bash
apt update
apt install wireguard wireguard-tools
```

## Step 2: Generate Keys for Each Server

Run these commands on **each server** to generate key pairs:

```bash
cd /etc/wireguard
# Generate private key
wg genkey |  tee privatekey

# Generate public key from private key
cat privatekey | wg pubkey | tee publickey

# Set proper permissions
chmod 600 privatekey
chmod 644 publickey
```

Save the keys for each server - you'll need them for configuration.

## Step 3: Plan Your Network

Choose a private IP range for your WireGuard network that doesn't conflict with existing networks. For this guide, we'll use 10.200.0.0/24:
- Server 1: 10.200.0.1/24
- Server 2: 10.200.0.2/24  
- Server 3: 10.200.0.3/24
- Additional servers: 10.200.0.4/24, 10.200.0.5/24, etc.

You'll also need each server's public IP address and choose a UDP port (default: 51820).

## Step 4: Create Configuration Files

### Example Server Configuration (/etc/wireguard/wg0.conf):
```
nano /etc/wireguard/wg0.conf
```

```ini
[Interface]
PrivateKey = <SERVER1_PRIVATE_KEY>
Address = 192.168.100.1/24
ListenPort = 51820
SaveConfig = true

# Server 2
[Peer]
PublicKey = <SERVER2_PUBLIC_KEY>
Endpoint = <SERVER2_PUBLIC_IP>:51820
AllowedIPs = 192.168.100.2/32

# Server 3
[Peer]
PublicKey = <SERVER3_PUBLIC_KEY>
Endpoint = <SERVER3_PUBLIC_IP>:51820
AllowedIPs = 192.168.100.3/32

# Add more [Peer] sections for additional servers
```


### Set Configuration File Permissions:
```bash
chmod 600 /etc/wireguard/wg0.conf
```

## Step 6: Enable IP Forwarding

```
sysctl -w net.ipv4.ip_forward=1
```

## Step 7: Start WireGuard

### Start the interface:
```bash
wg-quick up wg0
```

### Enable auto-start on boot:
```bash
systemctl enable wg-quick@wg0
```

### Check status:
```bash
 wg show
```

## Step 8: Test Connectivity

From each server, test connectivity to the others:

```bash
# From Server 1
ping 10.200.0.2  # Should reach Server 2
ping 10.200.0.3  # Should reach Server 3

# From Server 2
ping 10.200.0.1  # Should reach Server 1
ping 10.200.0.3  # Should reach Server 3

# Test additional servers as needed
```

## Management Commands

### Start/Stop WireGuard:
```bash
 wg-quick up wg0      # Start
 wg-quick down wg0    # Stop
 systemctl restart wg-quick@wg0  # Restart
```

### View Configuration:
```bash
 wg show              # Show all interfaces
 wg show wg0          # Show specific interface
```

## Step 9: Adding Admin Connection


### Create Admin Client Configuration File
Create a configuration file for the admin client (save as admin_wg0.conf):
```ini
# use nano /etc/wireguard/wg0.conf on server to fill admin private key info
# use wg show on server to get the public key
# use ip addr on server to get public ip
[Interface]
PrivateKey = <ADMIN_PRIVATE_KEY>
Address = 10.200.0.100/32
DNS = 8.8.8.8

[Peer]
PublicKey = <SERVER1_PUBLIC_KEY>
Endpoint = <SERVER1_PUBLIC_IP>:51820
AllowedIPs = 10.200.0.0/24
# This allows access to the entire WireGuard network

# Keep connection alive (useful for clients behind NAT)
PersistentKeepalive = 25
```

Modify Server Configuration

```ini
wg set wg0 peer <PUBLIC_KEY> allowed-ips 10.200.0.100/32

```
```bash
# save config
wg-quick save wg0
```
## Troubleshooting

### Common Issues:

1. **Connection timeout**: Check firewall rules and ensure UDP port 51820 is open
2. **Peer not connecting**: Verify public keys and endpoint IP addresses
3. **No internet from WireGuard**: Check IP forwarding and routing rules
4. **Permission denied**: Ensure configuration files have correct permissions (600)

### Debug Commands:
```bash
# Check interface status
ip addr show wg0

# Check routing table
ip route show table all

# Monitor WireGuard logs
 journalctl -u wg-quick@wg0 -f

# Check if UDP port is listening
 netstat -ulnp | grep 51820
```

## Security Considerations

1. Keep private keys secure and never share them
2. Use strong firewall rules to limit access
3. Consider using fail2ban to prevent brute force attacks
4. Regularly update WireGuard and your server OS
5. Monitor logs for suspicious activity
6. Consider changing the default port (51820) for additional security

## Adding More Servers

To add additional servers to your network:
1. Generate new key pair for the new server
2. Add the new server as a peer in all existing configurations
3. Add all existing servers as peers in the new server's configuration
4. Assign a new IP address in the 192.168.100.0/24 range (e.g., 192.168.100.4, 192.168.100.5, etc.)
5. Restart WireGuard on all servers

Your WireGuard mesh network should now be operational with secure communication between all your Ubuntu servers!