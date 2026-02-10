# 🚀 Production Deployment Guide - allie.memero.store

**Deployment-Typ:** Docker Container auf VPS  
**Domain:** allie.memero.store  
**Security:** SSL/HTTPS mit Let's Encrypt  
**Datum:** 10. Februar 2026

---

## 📋 VORAUSSETZUNGEN

### VPS/Server Anforderungen
- **OS:** Ubuntu 22.04 LTS oder Debian 11+
- **RAM:** Mindestens 2GB (empfohlen 4GB)
- **CPU:** 2 Cores
- **Disk:** 20GB SSD
- **Provider:** z.B. Hetzner, DigitalOcean, AWS, etc.

### Lokal auf deinem Mac
- Git installiert
- SSH-Zugang zum Server

---

## 🔧 SCHRITT 1: SERVER VORBEREITEN

### 1.1 SSH-Verbindung zum Server
```bash
# Ersetze SERVER_IP mit deiner Server-IP
ssh root@YOUR_SERVER_IP
```

### 1.2 System aktualisieren
```bash
apt update && apt upgrade -y
```

### 1.3 Docker installieren
```bash
# Docker Installation
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose installieren
apt install docker-compose -y

# Docker starten
systemctl start docker
systemctl enable docker

# Testen
docker --version
docker-compose --version
```

### 1.4 Firewall konfigurieren (UFW)
```bash
# UFW installieren und konfigurieren
apt install ufw -y

# Wichtige Ports erlauben
ufw allow 22/tcp      # SSH (WICHTIG: Sonst ausgesperrt!)
ufw allow 80/tcp      # HTTP (für Let's Encrypt)
ufw allow 443/tcp     # HTTPS
ufw allow 5432/tcp    # PostgreSQL (nur wenn extern benötigt)

# Firewall aktivieren
ufw --force enable

# Status prüfen
ufw status verbose
```

### 1.5 Fail2Ban installieren (zusätzliche Sicherheit)
```bash
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 🌐 SCHRITT 2: DOMAIN KONFIGURIEREN

### 2.1 DNS-Einträge bei memero.store setzen

Gehe zu deinem Domain-Provider und erstelle einen A-Record:

```
Type: A
Name: allie
Value: YOUR_SERVER_IP
TTL: 3600
```

**Beispiel:**
```
allie.memero.store → 123.45.67.89
```

### 2.2 DNS-Propagation testen
```bash
# Auf deinem Mac
dig allie.memero.store

# Oder online: https://dnschecker.org/
```

⏱️ **Warte 5-15 Minuten bis DNS propagiert ist.**

---

## 📦 SCHRITT 3: PROJEKT AUF SERVER KLONEN

### 3.1 Git installieren (falls nicht vorhanden)
```bash
apt install git -y
```

### 3.2 Projekt-Verzeichnis erstellen
```bash
# In /opt für Production-Apps
mkdir -p /opt/allie-agent
cd /opt/allie-agent
```

### 3.3 GitHub Repository klonen
```bash
# Ersetze mit deinem GitHub-Repo
git clone https://github.com/k3xilein/allie-agent.git .

# Branch prüfen
git branch
git status
```

---

## 🔐 SCHRITT 4: SSL-ZERTIFIKAT MIT LET'S ENCRYPT

### 4.1 Certbot installieren
```bash
apt install certbot python3-certbot-nginx -y
```

### 4.2 Nginx für Certbot vorbereiten
```bash
# Temporären Nginx-Container starten für Certbot
docker run -d \
  --name nginx-temp \
  -p 80:80 \
  -p 443:443 \
  -v /opt/allie-agent/ssl-certs:/etc/letsencrypt \
  nginx:alpine

# Kurz warten
sleep 5
```

### 4.3 SSL-Zertifikat erstellen
```bash
# Certbot im Standalone-Modus
docker stop nginx-temp
docker rm nginx-temp

certbot certonly --standalone \
  --email YOUR_EMAIL@example.com \
  --agree-tos \
  --no-eff-email \
  -d allie.memero.store

# Zertifikate werden gespeichert in:
# /etc/letsencrypt/live/allie.memero.store/
```

### 4.4 Automatische Renewal einrichten
```bash
# Cron-Job für automatisches Renewal
echo "0 3 * * * certbot renew --quiet && docker-compose -f /opt/allie-agent/docker-compose.prod.yml restart frontend" | crontab -
```

---

## 📝 SCHRITT 5: PRODUCTION KONFIGURATION

### 5.1 Production Docker Compose erstellen
```bash
cd /opt/allie-agent
nano docker-compose.prod.yml
```

**Inhalt von `docker-compose.prod.yml`:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: allie-postgres-prod
    environment:
      POSTGRES_DB: allie_agent
      POSTGRES_USER: allie_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata-prod:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
    networks:
      - allie-network
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U allie_user -d allie_agent"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: allie-backend-prod
    environment:
      DATABASE_URL: postgresql://allie_user:${DB_PASSWORD}@postgres:5432/allie_agent
      SESSION_SECRET: ${SESSION_SECRET}
      HYPERLIQUID_API_KEY: ${HYPERLIQUID_API_KEY}
      HYPERLIQUID_PRIVATE_KEY: ${HYPERLIQUID_PRIVATE_KEY}
      HYPERLIQUID_TESTNET: ${HYPERLIQUID_TESTNET:-true}
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      AI_MODEL: ${AI_MODEL:-moonshot/kimi-k2}
      PORT: 4000
      NODE_ENV: production
      FRONTEND_URL: https://allie.memero.store
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - allie-network
    restart: always
    volumes:
      - ./backend/logs:/app/logs

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: allie-frontend-prod
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - allie-network
    restart: always
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro

volumes:
  pgdata-prod:
    driver: local

networks:
  allie-network:
    driver: bridge
```

### 5.2 Production Nginx Config erstellen
```bash
nano nginx.prod.conf
```

**Inhalt von `nginx.prod.conf`:**
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name allie.memero.store;
        
        # Let's Encrypt ACME Challenge
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name allie.memero.store;

        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/allie.memero.store/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/allie.memero.store/privkey.pem;
        
        # SSL Security Settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_stapling on;
        ssl_stapling_verify on;

        # Frontend (React App)
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # Backend API Proxy
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
        
        # Login Rate Limiting
        location /api/auth/login {
            limit_req zone=login_limit burst=3 nodelay;
            
            proxy_pass http://backend:4000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health Check (ohne Rate Limit)
        location /health {
            proxy_pass http://backend:4000;
            access_log off;
        }
    }
}
```

### 5.3 Production Frontend Dockerfile
```bash
nano frontend/Dockerfile.prod
```

**Inhalt:**
```dockerfile
# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build for production
RUN npm run build

# Production Stage
FROM nginx:alpine

# Copy nginx config
COPY nginx.prod.conf /etc/nginx/nginx.conf

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### 5.4 Environment Variables erstellen
```bash
nano .env
```

**Inhalt von `.env`:**
```bash
# Database
DB_PASSWORD=GENERATE_STRONG_PASSWORD_HERE

# Session (WICHTIG: Generiere mit crypto.randomBytes!)
SESSION_SECRET=GENERATE_WITH_NODE_CRYPTO_RANDOM_BYTES

# Hyperliquid (optional für Testphase)
HYPERLIQUID_API_KEY=your-api-key-or-leave-empty
HYPERLIQUID_PRIVATE_KEY=your-private-key-or-leave-empty
HYPERLIQUID_TESTNET=true

# OpenRouter AI (optional)
OPENROUTER_API_KEY=your-openrouter-key-or-leave-empty
AI_MODEL=moonshot/kimi-k2
```

### 5.5 Secrets generieren
```bash
# SESSION_SECRET generieren (auf Server)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# DB_PASSWORD generieren
openssl rand -base64 32

# Trage diese Werte in .env ein!
nano .env
```

---

## 🚀 SCHRITT 6: DEPLOYMENT

### 6.1 Build und Start
```bash
cd /opt/allie-agent

# Docker Images bauen
docker-compose -f docker-compose.prod.yml build

# Container starten
docker-compose -f docker-compose.prod.yml up -d

# Logs prüfen
docker-compose -f docker-compose.prod.yml logs -f
```

### 6.2 Container-Status prüfen
```bash
# Alle Container sollten "Up" sein
docker ps

# Erwartete Container:
# - allie-postgres-prod
# - allie-backend-prod
# - allie-frontend-prod
```

### 6.3 Health Check
```bash
# Backend Health Check
curl http://localhost:4000/health

# Frontend Check (sollte SSL Redirect geben)
curl -I http://allie.memero.store

# HTTPS Check
curl -I https://allie.memero.store
```

---

## ✅ SCHRITT 7: VERIFIZIERUNG

### 7.1 Website aufrufen
```
https://allie.memero.store
```

Du solltest sehen:
- ✅ SSL-Zertifikat (Grünes Schloss im Browser)
- ✅ Setup-Page oder Login-Page
- ✅ Keine Console-Errors

### 7.2 SSL-Rating testen
```
https://www.ssllabs.com/ssltest/analyze.html?d=allie.memero.store
```

Ziel: **A+ Rating**

### 7.3 Security Headers testen
```bash
curl -I https://allie.memero.store
```

Sollte enthalten:
- ✅ `Strict-Transport-Security`
- ✅ `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`

---

## 🔧 SCHRITT 8: ADMIN-ACCOUNT ERSTELLEN

### 8.1 Erste Anmeldung
```
https://allie.memero.store/setup
```

1. Username eingeben
2. **Starkes** Passwort (12+ Zeichen, mixed case, numbers, special chars)
3. Account erstellen
4. Login

---

## 📊 MONITORING & WARTUNG

### Container-Logs ansehen
```bash
# Alle Logs
docker-compose -f /opt/allie-agent/docker-compose.prod.yml logs -f

# Nur Backend
docker-compose -f /opt/allie-agent/docker-compose.prod.yml logs -f backend

# Nur Frontend
docker-compose -f /opt/allie-agent/docker-compose.prod.yml logs -f frontend
```

### Container neu starten
```bash
cd /opt/allie-agent
docker-compose -f docker-compose.prod.yml restart
```

### Updates deployen
```bash
cd /opt/allie-agent

# Git pull
git pull origin main

# Rebuild und restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Backup der Datenbank
```bash
# Backup erstellen
docker exec allie-postgres-prod pg_dump -U allie_user allie_agent > backup_$(date +%Y%m%d).sql

# Backup wiederherstellen
docker exec -i allie-postgres-prod psql -U allie_user allie_agent < backup_20260210.sql
```

---

## 🔐 SECURITY CHECKLIST

Nach Deployment prüfen:

- [x] HTTPS funktioniert (grünes Schloss)
- [x] HTTP → HTTPS Redirect aktiv
- [x] SSL Rating A+ auf ssllabs.com
- [x] Firewall (UFW) aktiviert
- [x] Fail2Ban läuft
- [x] Starkes DB-Passwort
- [x] SESSION_SECRET generiert (crypto.randomBytes)
- [x] .env Datei nicht in Git
- [x] Security Headers aktiv
- [x] Rate Limiting funktioniert
- [x] Backups eingerichtet

---

## 🆘 TROUBLESHOOTING

### Problem: "502 Bad Gateway"
```bash
# Backend-Logs prüfen
docker-compose -f docker-compose.prod.yml logs backend

# Backend neu starten
docker-compose -f docker-compose.prod.yml restart backend
```

### Problem: SSL-Zertifikat nicht gefunden
```bash
# Zertifikat neu erstellen
certbot certonly --standalone -d allie.memero.store

# Container neu starten
docker-compose -f docker-compose.prod.yml restart frontend
```

### Problem: Datenbank-Connection Error
```bash
# DB-Container prüfen
docker-compose -f docker-compose.prod.yml logs postgres

# .env prüfen
cat .env | grep DB_PASSWORD
```

### Problem: Rate Limit zu streng
```nginx
# In nginx.prod.conf anpassen:
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;  # statt 10r/s
```

---

## 📞 QUICK COMMANDS

```bash
# Status
docker ps
docker-compose -f /opt/allie-agent/docker-compose.prod.yml ps

# Logs
docker-compose -f /opt/allie-agent/docker-compose.prod.yml logs -f

# Restart
docker-compose -f /opt/allie-agent/docker-compose.prod.yml restart

# Stop
docker-compose -f /opt/allie-agent/docker-compose.prod.yml down

# Start
docker-compose -f /opt/allie-agent/docker-compose.prod.yml up -d

# Rebuild
docker-compose -f /opt/allie-agent/docker-compose.prod.yml build --no-cache
```

---

## ✅ DEPLOYMENT ABGESCHLOSSEN!

Deine App läuft jetzt sicher auf:
**https://allie.memero.store**

Mit:
- ✅ SSL/HTTPS (Let's Encrypt)
- ✅ Security Headers
- ✅ Rate Limiting
- ✅ Firewall
- ✅ Automatische SSL-Renewal
- ✅ Production-Ready Docker Setup

**Viel Erfolg! 🚀**
