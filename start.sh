#!/bin/bash

# Allie Agent - Quick Start Script
# For systems that already have Docker installed

set -e

echo "🚀 Allie Agent - Quick Start"
echo "============================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo ""
    echo "Please install Docker first:"
    echo "  sudo bash install-docker.sh"
    echo ""
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo ""
    echo "Please install Docker Compose first:"
    echo "  sudo bash install-docker.sh"
    echo ""
    exit 1
fi

echo "✅ Docker is installed"
docker --version

echo "✅ Docker Compose is installed"
if command -v docker-compose &> /dev/null; then
    docker-compose --version
else
    docker compose version
fi

echo ""
echo "🐳 Starting containers..."
echo ""

# Try docker compose (new) first, fallback to docker-compose (old)
if docker compose version &> /dev/null 2>&1; then
    docker compose up -d
else
    docker-compose up -d
fi

echo ""
echo "⏳ Waiting for containers to start (30 seconds)..."
sleep 30

echo ""
echo "✅ Containers started!"
echo ""
echo "📊 Container Status:"
echo "==================="

if docker compose version &> /dev/null 2>&1; then
    docker compose ps
else
    docker-compose ps
fi

echo ""
echo "🌐 Open your browser and go to:"
echo ""
echo "   http://localhost:3000"
echo "   (or http://YOUR_SERVER_IP:3000)"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo "1. Create your admin account"
echo "2. Login and complete onboarding"
echo "3. Start trading!"
echo ""
echo "🔍 View logs:"
if docker compose version &> /dev/null 2>&1; then
    echo "   docker compose logs -f"
else
    echo "   docker-compose logs -f"
fi
echo ""
echo "🛑 Stop containers:"
if docker compose version &> /dev/null 2>&1; then
    echo "   docker compose down"
else
    echo "   docker-compose down"
fi
echo ""
echo "Happy Trading! 🚀"
