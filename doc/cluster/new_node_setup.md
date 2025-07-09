# New Node Setup Guide

This document describes how to add a new node to an existing Yundera Limitless PC cluster.

## Prerequisites

- Existing Proxmox VE cluster with Ceph storage
- A dedicated server
- SSH key pair for server access (see [Create Developer SSH Key](https://github.com/Yundera/yundera-limitless-pc/blob/main/docs/SETUP.md#create-developer-ssh-key))

## Step : configure initial network

- public network for the VM to connect to internet

- internal network 
  - RPN on scaleway prod cluster
  - Wireguard on dev cluser (see wg-setup.md)

- external network (to use proxmox API)
  - Tailscale VPN (see tailscale-setup.pdf)

Note: the external network ip (tailscale ip -4) will be used in the proxmox hostname configuration

## Step : Install Proxmox VE 8 on Debian 12

Follow the official Proxmox installation guide for Debian 12:
[Install Proxmox VE on Debian 12 Bookworm](https://pve.proxmox.com/wiki/Install_Proxmox_VE_on_Debian_12_Bookworm)

**Important:** When prompted during installation, select "Internet site" for mail configuration.

## Step : Configure Network Interfaces

### Configure public network vmbr0 (Linux Bridge)
1. Access Proxmox web interface at `https://[SERVER_IP]:8006`
2. Navigate to System → Network
3. Create a Linux Bridge `vmbr0` on bridge port `eno1`
4. Configure with:
   - IP address: Public IP provided by Scaleway
   - Gateway: Gateway provided by Scaleway
   - Subnet mask: As provided by Scaleway

### Configure internal network rpnV2 (Linux VLAN) - when RPN available (optional)
1. Create a Linux VLAN on interface `eno2.200X`
2. Configure with rpnV2 information provided by Scaleway
3. **Do not set a gateway** for this interface

### Configure internal network wirguard (Linux bridge) - 
1. use the wirguard IP (wg show)
3. **Do not set a gateway** for this interface


## Step : Join Existing Cluster

### Via Web Interface
1. Access any existing cluster node's web interface
2. Navigate to Datacenter → Cluster
3. Copy the "Join Information"
4. On the new node, go to Datacenter → Cluster → Join Cluster
5. Paste the join information
6. Enter the root password of an existing cluster node


## Step : Configure SDN and Disable dnsmasq

### Remove and Reinstall dnsmasq
```bash
apt remove dnsmasq
apt install -y dnsmasq
systemctl disable --now dnsmasq
```

### Configure SDN
Follow the network configuration from the [main setup guide](setup/SETUP.md#configure-network-for-vms):

1. Navigate to Datacenter → SDN
2. Create a "simple" type Zone with automatic DHCP IPAM pve (sdnzone0)
3. Configure a VNet (vnet0) with subnet (recommend 10.0.64.0/18) ad gateway 10.0.64.1 SNAT enabled
4. Apply SDN changes

### Disable IPv6 for vnet0
```bash
sysctl -w net.ipv6.conf.vnet0.disable_ipv6=1
```

## Step 6: Configure Ceph

### Wipe Storage Drives
1. Navigate to the new node → Disks
2. Select the second drive (should have one partition)
3. Click "Wipe Disk"
4. Repeat for the /data0 partition on the first drive if needed

### Install Ceph
1. Go to the new node → Ceph
2. Click "Install Ceph"
3. Select:
   - Version: Latest (squid)
   - Repository: No-subscription
4. Wait for installation to complete
5. on configuration part (if configuration not initialized)  select the Internal Network (not the public one)

### Add Ceph Components

#### Add Manager and monitor
1. Navigate to Datacenter → Ceph → Monitor
2. Add the new node as a manager and or monitor

#### Add OSD
1. Go to the new node → Ceph → OSD
2. Click "Create OSD"
3. Select the wiped drive
4. Use default settings
5. Wait for OSD creation and integration

#### Add Metadata Server
1. Navigate to Node → Ceph → CephFS
2. Add the new node as a metadata server

#### Add or ensure CephFS is created (with cephfs_data and cephfs_metadata)
1. Navigate to Node → Ceph → CephFS
2. create CephFS named "cephfs"

#### Add or ensure cephpool RDB(PVE) is created
1. Navigate to Node → Ceph → Pools
2. create pool named "cephpool"

## All done you can now check the documentation to create VM templates

## Notes

- All Ceph-related changes are automatically shared across cluster nodes
- The new node will inherit existing storage pools and configurations
- VMs can be migrated to the new node once Ceph integration is complete
- Monitor cluster health after adding the new node to ensure proper integration

## Troubleshooting

- If cluster join fails, verify network connectivity between nodes
- If Ceph OSD creation fails, ensure the drive is properly wiped
- Check firewall settings if services are unreachable
- Verify time synchronization across all nodes