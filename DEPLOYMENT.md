# Deployment Guide

Instructions for deploying Allie Agent to production and managing the deployment.

---

## Prerequisites

- Ubuntu 20.04 LTS or later
- Docker and docker-compose installed
- Domain name with DNS configured
- SSL certificate (auto-provisioned with Let's Encrypt)
- Hyperliquid testnet wallet with API keys
- OpenRouter API key with Gemini access

---

## Local Development Deployment

### Quick Start

1. **Clone repository:**
   ```bash
   git clone https://github.com/k3xilein/allie-agent.git
   cd allie-agent
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services:**
   ```bash
   docker-compose up -d
   ```

4. **Access application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - Database: localhost:5432

5. **View logs:**
   ```bash
   docker-compose logs -f
   ```

6. **Stop services:**
   ```bash
   docker-compose down
   ```

---

## Production Deployment

### Server Setup

1. **SSH into production server:**
   ```bash
   ssh ubuntu@your-domain.com
   ```

2. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. **Install docker-compose:**
   ```bash
   sudo apt update
   sudo apt install docker-compose-plugin
   ```

4. **Create app directory:**
   ```bash
   mkdir -p /opt/allie-agent
   cd /opt/allie-agent
   ```

### Clone and Configure

1. **Clone repository:**
   ```bash
   git clone https://github.com/k3xilein/allie-agent.git .
   ```

2. **Create environment file:**
   ```bash
   cat > .env << 'EOF'
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=postgresql://allie:secure_password@allie-postgres:5432/allie_trading
   SESSION_SECRET=$(openssl rand -hex 32)
   HYPERLIQUID_WALLET_ADDRESS=your_wallet_address
   HYPERLIQUID_PRIVATE_KEY=your_private_key
   HYPERLIQUID_TESTNET=true
   OPENROUTER_API_KEY=your_openrouter_key
   AI_MODEL=google/gemini-2.0-flash-001
   EOF
   ```

3. **Update docker-compose.yml for production:**
   ```yaml
   version: '3.8'
   services:
     backend:
       image: allie-agent-backend:latest
       ports:
         - "4000:4000"
       environment:
         NODE_ENV: production
         DATABASE_URL: postgresql://allie:${DB_PASSWORD}@postgres:5432/allie_trading
       depends_on:
         - postgres
       restart: unless-stopped

     frontend:
       image: allie-agent-frontend:latest
       ports:
         - "3000:3000"
       restart: unless-stopped

     postgres:
       image: postgres:15-alpine
       environment:
         POSTGRES_USER: allie
         POSTGRES_PASSWORD: ${DB_PASSWORD}
         POSTGRES_DB: allie_trading
       volumes:
         - postgres_data:/var/lib/postgresql/data
       restart: unless-stopped

   volumes:
     postgres_data:
   ```

### SSL/TLS Configuration with Nginx

1. **Install Nginx:**
   ```bash
   sudo apt update
   sudo apt install nginx certbot python3-certbot-nginx
   ```

2. **Create Nginx configuration:**
   ```bash
   sudo cat > /etc/nginx/sites-available/allie-agent << 'EOF'
   server {
     listen 80;
     server_name your-domain.com;

     location / {
       return 301 https://$server_name$request_uri;
     }
   }

   server {
     listen 443 ssl http2;
     server_name your-domain.com;

     ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

     ssl_protocols TLSv1.2 TLSv1.3;
     ssl_ciphers HIGH:!aNULL:!MD5;
     ssl_prefer_server_ciphers on;

     client_max_body_size 10M;

     # Frontend
     location / {
       proxy_pass http://localhost:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }

     # Backend API
     location /api/ {
       proxy_pass http://localhost:4000/api/;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_buffering off;
     }

     # WebSocket support (for future real-time features)
     location /ws/ {
       proxy_pass http://localhost:4000/ws/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_read_timeout 86400;
     }
   }
   EOF
   ```

3. **Enable Nginx site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/allie-agent /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Obtain SSL certificate:**
   ```bash
   sudo certbot certonly --nginx -d your-domain.com
   ```

---

## Deployment Process

### Automated Deployment (CI/CD)

GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker images
        run: |
          docker build -t allie-agent-backend:latest ./backend
          docker build -t allie-agent-frontend:latest ./frontend

      - name: Push to registry
        run: |
          docker login -u ${{ secrets.DOCKER_USERNAME }} -p ${{ secrets.DOCKER_PASSWORD }}
          docker push allie-agent-backend:latest
          docker push allie-agent-frontend:latest

      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/allie-agent
            docker-compose pull
            docker-compose up -d --build
            docker-compose exec -T backend npm run migrate
```

### Manual Deployment

1. **SSH into production server:**
   ```bash
   ssh ubuntu@your-domain.com
   cd /opt/allie-agent
   ```

2. **Pull latest code:**
   ```bash
   git pull origin main
   ```

3. **Build and start containers:**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. **Run database migrations:**
   ```bash
   docker-compose exec backend npm run migrate
   ```

5. **Verify deployment:**
   ```bash
   curl https://your-domain.com/api/health/status
   ```

---

## Post-Deployment

### Verify Services

```bash
# Check all containers running
docker-compose ps

# View backend logs
docker-compose logs backend -f

# View frontend logs
docker-compose logs frontend -f

# Check database connection
docker-compose exec backend npm run health-check
```

### Create Initial Admin Account

1. **Access web interface:**
   - Navigate to https://your-domain.com

2. **Setup admin account:**
   - Enter admin name and password
   - This can only be done once

3. **Login with credentials:**
   - Use admin account to access dashboard

### Configure Trading Parameters

1. **Access Settings:**
   - Login to dashboard → Settings

2. **Set trading parameters:**
   - Analysis interval: 2 minutes
   - Max position size: 20%
   - Max leverage: 10x
   - Min confidence: 55%
   - Stop loss: 3%
   - Take profit: 6%

3. **Configure risk limits:**
   - Max daily loss: 8%
   - Max drawdown: 15%

4. **Save settings:**
   - Settings are encrypted and stored in database

---

## Maintenance

### Database Backups

Automatic backups (add to crontab):

```bash
# Daily backup at 3 AM
0 3 * * * docker-compose exec -T postgres pg_dump -U allie allie_trading | gzip > /backups/allie_trading_$(date +\%Y\%m\%d).sql.gz
```

### Log Rotation

Configure logrotate:

```bash
sudo cat > /etc/logrotate.d/allie-agent << 'EOF'
/opt/allie-agent/logs/*.log {
  daily
  rotate 14
  compress
  delaycompress
  notifempty
  create 0640 docker docker
  sharedscripts
}
EOF
```

### Security Updates

```bash
# Update base images monthly
docker pull postgres:15-alpine
docker pull node:20-alpine

# Update Node dependencies
docker-compose exec backend npm update
docker-compose exec frontend npm update
```

---

## Monitoring

### Health Checks

Add to monitoring service (Uptime Robot, Datadog, etc.):

```
Endpoint: https://your-domain.com/api/health/status
Interval: Every 5 minutes
Timeout: 30 seconds
```

### Log Monitoring

View real-time logs:

```bash
docker-compose logs -f --tail=100 backend
docker-compose logs -f --tail=100 frontend
docker-compose logs -f --tail=100 postgres
```

### Resource Monitoring

Check container resource usage:

```bash
docker stats
```

Monitor with Docker stats or prometheus:

```bash
# CPU/Memory usage
docker-compose stats

# Disk usage
df -h /
docker system df
```

---

## Troubleshooting

### Database Connection Failed

```bash
# Check if database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify connection string
docker-compose exec backend env | grep DATABASE_URL

# Test connection
docker-compose exec postgres psql -U allie -c "SELECT 1"
```

### Backend Not Starting

```bash
# View error logs
docker-compose logs backend

# Rebuild image
docker-compose build --no-cache backend

# Restart service
docker-compose restart backend

# Check migrations
docker-compose logs backend | grep "migration"
```

### Frontend Not Loading

```bash
# Check frontend logs
docker-compose logs frontend

# Verify Nginx reverse proxy
docker-compose logs nginx

# Test direct backend access
curl http://localhost:4000/api/health/check
```

### Performance Issues

```bash
# Check container resource usage
docker stats

# Restart containers
docker-compose restart

# Clear database cache (if applicable)
docker-compose exec postgres vacuumdb -U allie allie_trading
```

### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew --nginx

# Manual renewal if needed
sudo certbot renew --nginx --force-renewal

# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -noout -dates
```

---

## Scaling

### Horizontal Scaling

For high-traffic production:

1. **Add load balancer:**
   - AWS ELB, DigitalOcean Load Balancer, or Nginx load balancer

2. **Multiple backend instances:**
   ```yaml
   backend-1:
     image: allie-agent-backend:latest
     ports: ["4001:4000"]
   backend-2:
     image: allie-agent-backend:latest
     ports: ["4002:4000"]
   ```

3. **Database replication:**
   - PostgreSQL primary/replica setup
   - Read replicas for analytics

### Vertical Scaling

Increase server resources:

```bash
# Upgrade docker-compose memory limits
backend:
  mem_limit: 2g
```

---

## Disaster Recovery

### Backup and Restore

```bash
# Backup database
docker-compose exec postgres pg_dump -U allie allie_trading > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U allie allie_trading < backup.sql

# Backup configuration files
tar -czf config_backup.tar.gz .env docker-compose.yml
```

### Disaster Recovery Plan

1. **Document current state:**
   - Save .env file
   - Export database
   - Note current settings

2. **Test recovery:**
   - Monthly full system restore test
   - Document recovery time
   - Identify bottlenecks

3. **Failover procedure:**
   - Automated: AWS RDS with failover
   - Manual: Restore from backup on new instance

---

## Security Checklist

- [ ] Enable firewall (UFW)
- [ ] SSH key-based authentication only
- [ ] Update all system packages
- [ ] Use strong database password
- [ ] Rotate API keys quarterly
- [ ] Enable SSL/TLS (Let's Encrypt)
- [ ] Configure rate limiting
- [ ] Enable CORS restrictions
- [ ] Regular security audits
- [ ] Monitor for suspicious activity

---

## Support and Issues

### Getting Help

- **Documentation**: See README.md and API.md
- **Issues**: GitHub Issues for bugs and features
- **Logs**: Check docker-compose logs for detailed errors

### Common Issues

See Troubleshooting section above for solutions to:
- Database connection failures
- Backend startup issues
- Frontend loading problems
- SSL certificate issues
- Performance degradation

---

**Deployment Guide** – Allie Agent v1.0
**Last Updated**: February 2026
