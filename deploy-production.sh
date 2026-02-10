#!/bin/bash

# 🚀 Allie Agent - Production Deployment Script
# Domain: allie.memero.store
# Datum: 10. Februar 2026

set -e  # Exit on error

echo "🚀 Allie Agent Production Deployment"
echo "====================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root (sudo)${NC}"
    exit 1
fi

# Variables
DOMAIN="allie.memero.store"
PROJECT_DIR="/opt/allie-agent"
EMAIL=""  # Will be asked

echo "📋 Pre-Deployment Checks"
echo "------------------------"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not installed${NC}"
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not installed${NC}"
    apt install docker-compose -y
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

# Check Git
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    apt install git -y
fi

echo ""
echo "🔐 Security Setup"
echo "-----------------"

# Setup Firewall
if ! command -v ufw &> /dev/null; then
    apt install ufw -y
fi

echo "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

echo -e "${GREEN}✅ Firewall configured${NC}"

# Install Fail2Ban
if ! command -v fail2ban-server &> /dev/null; then
    echo "Installing Fail2Ban..."
    apt install fail2ban -y
    systemctl enable fail2ban
    systemctl start fail2ban
    echo -e "${GREEN}✅ Fail2Ban installed${NC}"
fi

echo ""
echo "📂 Project Setup"
echo "----------------"

# Create project directory
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Clone or update repository
if [ -d ".git" ]; then
    echo "Updating existing repository..."
    git pull origin main
else
    echo "Enter your GitHub username:"
    read GITHUB_USER
    echo "Cloning repository..."
    git clone https://github.com/${GITHUB_USER}/allie-agent.git .
fi

echo -e "${GREEN}✅ Repository ready${NC}"

echo ""
echo "🔐 SSL Certificate Setup"
echo "------------------------"

# Get email for Let's Encrypt
echo "Enter your email for Let's Encrypt notifications:"
read EMAIL

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt install certbot -y
fi

# Check DNS before getting certificate
echo "Checking DNS for $DOMAIN..."
if host $DOMAIN > /dev/null 2>&1; then
    echo -e "${GREEN}✅ DNS is configured correctly${NC}"
    
    # Get SSL certificate
    if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        echo "Getting SSL certificate..."
        certbot certonly --standalone \
            --email $EMAIL \
            --agree-tos \
            --no-eff-email \
            --domain $DOMAIN \
            --non-interactive
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ SSL certificate obtained${NC}"
        else
            echo -e "${RED}❌ Failed to get SSL certificate${NC}"
            echo "Make sure port 80 is accessible and DNS is configured"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ SSL certificate already exists${NC}"
    fi
else
    echo -e "${RED}❌ DNS not configured for $DOMAIN${NC}"
    echo "Please configure your DNS A record to point to this server's IP"
    echo "Current IP: $(curl -s ifconfig.me)"
    exit 1
fi

# Setup auto-renewal
echo "Setting up automatic SSL renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker-compose -f $PROJECT_DIR/docker-compose.prod.yml restart frontend") | crontab -
echo -e "${GREEN}✅ Auto-renewal configured${NC}"

echo ""
echo "🔑 Environment Configuration"
echo "----------------------------"

# Check if .env exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "Creating .env file..."
    
    # Generate SESSION_SECRET
    SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    
    # Generate DB_PASSWORD
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    cat > $PROJECT_DIR/.env << EOF
# Auto-generated on $(date)

# Database
DB_PASSWORD=$DB_PASSWORD

# Session Security
SESSION_SECRET=$SESSION_SECRET

# Hyperliquid (optional - add your keys later)
HYPERLIQUID_API_KEY=
HYPERLIQUID_PRIVATE_KEY=
HYPERLIQUID_TESTNET=true

# OpenRouter AI (optional - add your key later)
OPENROUTER_API_KEY=
AI_MODEL=moonshot/kimi-k2
EOF
    
    echo -e "${GREEN}✅ .env file created with secure secrets${NC}"
    echo -e "${YELLOW}⚠️  You can add API keys later by editing $PROJECT_DIR/.env${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists - skipping${NC}"
fi

echo ""
echo "🐳 Docker Deployment"
echo "--------------------"

# Build Docker images
echo "Building Docker images (this may take a few minutes)..."
docker-compose -f docker-compose.prod.yml build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker images built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build Docker images${NC}"
    exit 1
fi

# Start containers
echo "Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Containers started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start containers${NC}"
    exit 1
fi

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check container status
echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🧪 Running Health Checks"
echo "------------------------"

# Health check backend
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

# Health check HTTPS
if curl -f -k https://$DOMAIN > /dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTPS is working${NC}"
else
    echo -e "${YELLOW}⚠️  HTTPS might take a moment to start${NC}"
fi

echo ""
echo "═══════════════════════════════════════"
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "═══════════════════════════════════════"
echo ""
echo "🌐 Your app is now running at:"
echo "   https://$DOMAIN"
echo ""
echo "📋 Next Steps:"
echo "   1. Visit https://$DOMAIN/setup"
echo "   2. Create your admin account"
echo "   3. Login and start using Allie Agent"
echo ""
echo "🔑 API Keys (optional):"
echo "   Edit $PROJECT_DIR/.env to add:"
echo "   - HYPERLIQUID_API_KEY"
echo "   - OPENROUTER_API_KEY"
echo ""
echo "📊 Useful Commands:"
echo "   - View logs:    docker-compose -f $PROJECT_DIR/docker-compose.prod.yml logs -f"
echo "   - Restart:      docker-compose -f $PROJECT_DIR/docker-compose.prod.yml restart"
echo "   - Stop:         docker-compose -f $PROJECT_DIR/docker-compose.prod.yml down"
echo ""
echo "🔐 Security:"
echo "   - Firewall:     ufw status"
echo "   - SSL Rating:   https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo "   - Fail2Ban:     fail2ban-client status"
echo ""
echo "═══════════════════════════════════════"
