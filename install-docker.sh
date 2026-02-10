#!/bin/bash

# Allie Agent - Automatic Installation Script
# This script installs Docker, Docker Compose, and starts the application

set -e  # Exit on error

echo "🚀 Allie Agent - Automatic Installation"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use: sudo bash install-docker.sh)"
    exit 1
fi

echo "📦 Step 1: Installing Docker..."
echo ""

# Update package index
apt-get update -qq

# Install prerequisites
apt-get install -y -qq \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "✅ Docker installed successfully"
echo ""

# Start and enable Docker
systemctl start docker
systemctl enable docker

echo "📦 Step 2: Installing Docker Compose..."
echo ""

# Docker Compose Plugin is already installed with docker-compose-plugin
# Create symbolic link for 'docker-compose' command
ln -sf /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose

# Verify installation
docker --version
docker compose version

echo "✅ Docker Compose installed successfully"
echo ""

echo "🐳 Step 3: Starting Allie Agent..."
echo ""

# Start containers
docker compose up -d

echo ""
echo "⏳ Waiting for containers to start (30 seconds)..."
sleep 30

echo ""
echo "✅ Installation Complete!"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Check container status:"
echo "   docker compose ps"
echo ""
echo "2. View logs:"
echo "   docker compose logs -f"
echo ""
echo "3. Open your browser and go to:"
echo "   http://YOUR_SERVER_IP:3000"
echo ""
echo "4. Create your admin account in the web interface"
echo ""
echo "📊 Container Status:"
echo "==================="
docker compose ps
echo ""
echo "🔍 To view backend logs:"
echo "   docker compose logs backend"
echo ""
echo "🔍 To view database logs:"
echo "   docker compose logs postgres"
echo ""
echo "🛑 To stop the application:"
echo "   docker compose down"
echo ""
echo "🔄 To restart the application:"
echo "   docker compose restart"
echo ""
echo "Happy Trading! 🚀"
