#!/bin/bash

ENV_FILE=/DATA/AppData/casaos/apps/yundera/.env
TEMPLATE_FILE=/DATA/AppData/casaos/apps/yundera/compose-template.yml
OUTPUT_FILE=/DATA/AppData/casaos/apps/yundera/docker-compose.yml

# Create a copy of the template file to work with
cp "$TEMPLATE_FILE" "$OUTPUT_FILE"

# Read the environment file and apply substitutions
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ || -z $key ]] && continue

    # Remove any surrounding quotes from the value
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

    # Replace %KEY% with value in the output file
    sed -i "s|%${key}%|${value}|g" "$OUTPUT_FILE"

done < "$ENV_FILE"

echo "Successfully generated $OUTPUT_FILE from template using environment variables from $ENV_FILE"

# Check if docker compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "Error: docker compose is not installed or not in PATH"
    exit 1
fi

# Execute docker compose up -d on the generated file with reduced output
echo "Starting containers with docker compose..."
# Redirect stdout to /dev/null but keep stderr to capture errors
if ! docker compose -f "$OUTPUT_FILE" up --quiet-pull -d; then
    echo "Error: Failed to start docker containers"
    exit 1
fi

echo "Docker containers successfully started"