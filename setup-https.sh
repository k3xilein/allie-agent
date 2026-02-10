#!/bin/bash

# Allie Agent - HTTPS Setup Script
# Sets up Nginx reverse proxy with Let's Encrypt SSL

set -e

echo "🔧 Allie Agent - HTTPS Setup for allie.memero.store"
echo "=================================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use: sudo bash setup-https.sh)"
    exit 1
fi

# Install Nginx
echo "📦 Installing Nginx..."
apt update
apt install nginx -y

# Install Certbot
echo "🔒 Installing Certbot for SSL..."
apt install certbot python3-certbot-nginx -y

# Create Nginx configuration
echo "📝 Creating Nginx configuration..."
cat > /etc/nginx/sites-available/allie.memero.store <<'EOF'
server {
    listen 80;
    server_name allie.memero.store;

    # Reverse Proxy to Frontend Container
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
echo "✅ Enabling site..."
ln -sf /etc/nginx/sites-available/allie.memero.store /etc/nginx/sites-enabled/

# Test Nginx config
echo "🧪 Testing Nginx configuration..."
nginx -t

# Reload Nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx

# Setup SSL with Certbot
echo ""
echo "🔒 Setting up SSL certificate..."
echo "=================================================="
echo ""
echo "Certbot will now:"
echo "1. Ask for your email (for renewal notifications)"
echo "2. Ask you to agree to Terms of Service"
echo "3. Automatically configure HTTPS"
echo ""
read -p "Press Enter to continue..."

certbot --nginx -d allie.memero.store

echo ""
echo "=================================================="
echo "✅ Setup Complete!"
echo "=================================================="
echo ""
echo "Your Allie Agent is now available at:"
echo "🌐 https://allie.memero.store"
echo ""
echo "Note: DNS propagation may take a few minutes."
echo "If you get an error, wait 5-10 minutes and try again."
echo ""
echo "Backend will be automatically updated after next deployment."
echo "Run: cd ~/allie-agent && git pull && docker compose restart backend"
echo ""
