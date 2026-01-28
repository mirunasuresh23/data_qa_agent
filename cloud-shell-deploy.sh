#!/bin/bash
# Automated deployment script for Google Cloud Shell
# This script clones the repo and deploys from the feature_leyin_fix branch

set -e

echo "========================================="
echo "Automated Deployment from Cloud Shell"
echo "========================================="

# Configuration
REPO_URL="https://github.com/mirunasuresh23/data_qa_agent.git"
BRANCH="feature_leyin_fix"
WORK_DIR="$HOME/data_qa_agent_deploy"

# Clean up any existing directory
if [ -d "$WORK_DIR" ]; then
    echo "Removing existing directory..."
    rm -rf "$WORK_DIR"
fi

# Clone the repository
echo "Cloning repository..."
git clone "$REPO_URL" "$WORK_DIR"

# Navigate to the directory
cd "$WORK_DIR"

# Checkout the feature branch
echo "Checking out branch: $BRANCH"
git checkout "$BRANCH"

# Make deploy script executable
chmod +x deploy-all.sh

# Run the deployment
echo ""
echo "Starting deployment..."
./deploy-all.sh

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
