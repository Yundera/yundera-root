#!/bin/bash
echo "Step 4: Cleaning image for template use"

set -e  # Exit on any error

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root. Please use sudo or run as root user."
    exit 1
fi

# Clean apt cache
apt clean

# Delete temp files
rm -rf /tmp/*
rm -rf /var/tmp/*

# Reset machine-id
truncate -s 0 /etc/machine-id
rm -f /var/lib/dbus/machine-id

# Remove random seed files
rm -f /var/lib/systemd/random-seed
rm -f /loader/random-seed

# Remove system identity files
rm -f /var/lib/dbus/machine-id
rm -rf /var/lib/cloud/instances/*

# Remove credential secret
rm -f /var/lib/systemd/credential.secret

# Reset SSH host keys
# rm -f /etc/ssh/ssh_host_*

# Clean command history
echo "Cleaning command history..."
# Clear root user history
cat /dev/null > /root/.bash_history
# Clear history for all other users
for user_home in /home/*; do
  if [ -d "$user_home" ]; then
    cat /dev/null > "$user_home/.bash_history" 2>/dev/null
  fi
done
# Clear history in memory for current session
history -c

echo "===== VM preparation complete ====="
echo "The VM is now configured to support vertical scaling (CPU and RAM hotplug)."
echo "You can now shut down this VM and convert it to a template using the Proxmox GUI."
echo "Note: After cloning a VM from this template, you must run 'sudo dpkg-reconfigure openssh-server' to generate new SSH host keys."