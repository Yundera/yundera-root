# Yundera PCS Orchestrator VM Template Creation Guide

This document outlines the step-by-step process for creating and configuring a new VM template for use with the Yundera PCS Orchestrator. This template serves as the base image for deploying new virtual machines in the Yundera environment.

## Prerequisites

- Access to Proxmox VE environment
- Access to the referenced GitHub repositories

## Base VM Creation

### Create the Virtual Machine

First, download this image to the ISO Images section of the cephfs:
```
https://releases.ubuntu.com/24.04.2/ubuntu-24.04.2-live-server-amd64.iso
```

Then follow all the steps in this guide in the create-vm section:

📖 [VM Creation Guide](https://github.com/Yundera/yundera-limitless-pc/blob/main/docs/SETUP.md#create-vm)

Create the VM according to the specifications outlined in the VM Creation Guide:

**Note:**
- Use ubuntu-24.04.2-live-server
- Use CPU type "max" on the CPU configuration

Once the VM is created, start it and proceed with the Ubuntu installation.

### Ubuntu Server Installation

On the Ubuntu server setup, keep all defaults when not specified in this doc:

**Disk configuration:**
Configure the system disk to usee all the space (32GB)

**Server Information:**
When asked, fill in this information:
```
Your Name: pcs
Your Server Name: yundera
Pick a username: pcs
Password: erf56gh98 # this is a dev password to access the template (it's not a secret and will not be used on VMs derived from this template - password changed automatically in later process)
```

**SSH Configuration:**
Tick the "Install OpenSSH Server"

### Once the installation is completed:

1. Remove the ISO used for installation in hardware and reboot
2. Add this to the template notes:

```
# Base Ubuntu 24 VM Image

Base ubuntu-24.04.2-live-server-amd64.iso image

Hostname: yundera
Username: pcs
Password: erf56gh98

## Modifications

+ QEMU agent installed
+ SSH installed
```

### Update System Packages

Now the VM is set up and running. Connect to the VM and update the package repository:

#### Step 1: Update System Packages
```bash
sudo apt update
```

#### Step 2: Install QEMU Guest Agent

Install the QEMU guest agent for improved VM management:

```bash
sudo apt install qemu-guest-agent
```

#### Step 3: Verify Network Configuration

After installing the guest agent, the VM should:
- Have an assigned IP address
- Be accessible via SSH jump connection (eliminating the need for noVNC)

### Checkpoint

Save the template as ubuntu-24.04-server.
Convert the configured VM to a template in Proxmox VE.

## Install Template Scripts and Data

Use the previously created template and clone it as yundera-template to continue.
As long as Ubuntu doesn't change version, this base template can be reused.
in hardware increase the size of the template by 8GB (should be 40Gb at the end)

connect to the vm:

```bash
sudo su -
apt-get install -y wget curl unzip
mkdir -p /DATA/AppData/casaos/apps/yundera

# use main if you want the latest
# https://github.com/Yundera/template-root/archive/refs/heads/main.zip
#otherwise use stable tagged version
# https://github.com/Yundera/template-root/archive/refs/tags/v1.1.0.zip

# Download the zip file (choose main or stable version)
wget https://github.com/Yundera/template-root/archive/refs/heads/stable.zip -O /tmp/yundera-template.zip
#wget https://github.com/Yundera/template-root/archive/refs/heads/main.zip -O /tmp/yundera-template.zip
# wget https://github.com/Yundera/template-root/archive/refs/tags/v1.1.0.zip -O /tmp/yundera-template.zip

# Extract, copy, and cleanup
unzip /tmp/yundera-template.zip -d /tmp
cp -r /tmp/template-root-*/root/* /DATA/AppData/casaos/apps/yundera/
rm /tmp/yundera-template.zip
rm -rf /tmp/template-root-*

# execute the init script
chmod +x /DATA/AppData/casaos/apps/yundera/scripts/template-init.sh
/DATA/AppData/casaos/apps/yundera/scripts/template-init.sh
```

## Finalize Template

1. **Convert VM to Template:**
   Shutdown and Convert the configured VM to a template in Proxmox VE

2. **Update PCS Orchestrator:**
   Update the template ID (YPM_TEMPLATE_ID) in the PCS Orchestrator configuration (.env)
   restart the PCS Orchestrator service to apply changes.
   Ensure the new template is available for deployment

## Verification

After completing the setup:
- [ ] VM is converted to template
- [ ] Template ID is updated in PCS Orchestrator
- [ ] Template is available for new deployments