#!/bin/bash

# Check if swap is already active
if [ "$(sudo swapon --show | wc -l)" -gt 0 ]; then
    echo "Swap is already active. Exiting."
    sudo swapon --show
    exit 0
fi

# Check if swap.img already exists
if [ -f /swap.img ]; then
    echo "/swap.img already exists. Removing existing file."
    sudo rm /swap.img
fi

# Setup swap
echo "Setting up swap..."
sudo fallocate -l 4G /swap.img
sudo chmod 600 /swap.img
sudo mkswap /swap.img
sudo swapon /swap.img

# Add to fstab if not already present
if ! grep -q "/swap.img" /etc/fstab; then
    echo "Adding swap to /etc/fstab"
    sudo sh -c 'echo "/swap.img none swap sw 0 0" >> /etc/fstab'
else
    echo "Swap entry already exists in /etc/fstab"
fi

# Set swappiness
sudo sysctl vm.swappiness=10

# Add swappiness to sysctl.conf if not already present
if ! grep -q "vm.swappiness=10" /etc/sysctl.conf; then
    echo "Adding swappiness setting to /etc/sysctl.conf"
    sudo sh -c 'echo "vm.swappiness=10" >> /etc/sysctl.conf'
else
    echo "Swappiness setting already exists in /etc/sysctl.conf"
fi

# Show current swap status
echo "Swap setup complete:"
sudo swapon --show