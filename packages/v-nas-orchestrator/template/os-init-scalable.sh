#!/bin/bash
# Proxmox VM Vertical Scaling Setup Script
# This script configures a VM to support vertical scaling (CPU and RAM hotplug)
# Works for both Ubuntu 24 and Debian 12

set -e  # Exit on any error

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root. Please use sudo or run as root user."
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_NAME=$ID
    OS_VERSION=$VERSION_ID
    echo "Detected OS: $OS_NAME $OS_VERSION"
else
    echo "Cannot detect OS. Defaulting to Ubuntu configuration."
    OS_NAME="ubuntu"
fi

echo "Step 1: Configuring CPU and Memory hotplug"
# Create udev rules directory
mkdir -p /lib/udev/rules.d/

# Add CPU hotplug rule
echo 'SUBSYSTEM=="cpu", ACTION=="add", TEST=="online", ATTR{online}=="0", ATTR{online}="1"' > /lib/udev/rules.d/80-hotplug-cpu-mem.rules

# Add memory hotplug rule for Debian (or non-Ubuntu systems)
if [ "$OS_NAME" != "ubuntu" ] || [ "$OS_NAME" = "debian" ]; then
    echo "Adding memory hotplug rule for Debian/non-Ubuntu system"
    echo 'SUBSYSTEM=="memory", ACTION=="add", TEST=="state", ATTR{state}=="offline", ATTR{state}="online"' >> /lib/udev/rules.d/80-hotplug-cpu-mem.rules
fi

echo "Step 2: Modifying GRUB to add movable_node parameter"

# Check if movable_node is already in GRUB_CMDLINE_LINUX_DEFAULT
if grep -q "movable_node" /etc/default/grub; then
    echo "movable_node already present in GRUB configuration"
else
    # Add movable_node to GRUB_CMDLINE_LINUX_DEFAULT
    sed -i 's/GRUB_CMDLINE_LINUX_DEFAULT="\([^"]*\)"/GRUB_CMDLINE_LINUX_DEFAULT="\1 movable_node"/' /etc/default/grub
    echo "Added movable_node to GRUB configuration"
fi

# Update grub
echo "Updating GRUB..."
update-grub

echo "===== VM SCALABLE preparation complete ====="