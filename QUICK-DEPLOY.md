# 🚀 QUICK START - Production Deployment

## Deployment auf Server in 3 Schritten

### 1️⃣ GitHub Repository vorbereiten

```bash
# Auf deinem Mac - Code zu GitHub pushen
cd /Users/mac/allie-agent-1
git add .
git commit -m "Production-ready deployment"
git push origin main
```

### 2️⃣ DNS konfigurieren

Gehe zu deinem DNS-Provider für `memero.store` und erstelle:

```
Type: A
Name: allie
Value: [DEINE_SERVER_IP]
TTL: 3600
```

**Ergebnis:** `allie.memero.store` → Deine Server-IP

### 3️⃣ Auf Server deployen

```bash
# SSH zum Server
ssh root@YOUR_SERVER_IP

# Automatisches Deployment starten
curl -fsSL https://raw.githubusercontent.com/k3xilein/allie-agent/main/deploy-production.sh | sudo bash
```

**ODER manuell:**

```bash
# SSH zum Server
ssh root@YOUR_SERVER_IP

# Script herunterladen
cd /opt
git clone https://github.com/k3xilein/allie-agent.git
cd allie-agent

# Script ausführbar machen
chmod +x deploy-production.sh

# Deployment starten
sudo ./deploy-production.sh
```

---

## ✅ Das war's!

Nach 5-10 Minuten läuft deine App auf:
**https://allie.memero.store**

---

## 🔧 Manuelle Installation (falls Probleme)

Falls das automatische Script Probleme hat:

```bash
# 1. Server vorbereiten
ssh root@YOUR_SERVER_IP
apt update && apt upgrade -y

# 2. Docker installieren
curl -fsSL https://get.docker.com | sh
apt install docker-compose -y

# 3. Firewall
apt install ufw -y
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable

# 4. Projekt klonen
mkdir -p /opt/allie-agent
cd /opt/allie-agent
git clone https://github.com/k3xilein/allie-agent.git .

# 5. SSL-Zertifikat
apt install certbot -y
certbot certonly --standalone -d allie.memero.store --email YOUR_EMAIL

# 6. Environment erstellen
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" > session.txt
openssl rand -base64 32 > dbpass.txt

cat > .env << 'EOF'
DB_PASSWORD=$(cat dbpass.txt)
SESSION_SECRET=$(cat session.txt)
HYPERLIQUID_API_KEY=
HYPERLIQUID_PRIVATE_KEY=
HYPERLIQUID_TESTNET=true
OPENROUTER_API_KEY=
AI_MODEL=moonshot/kimi-k2
EOF

# 7. Deployen
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 8. Logs prüfen
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 📱 Nach dem Deployment

### Admin-Account erstellen
```
1. Gehe zu: https://allie.memero.store/setup
2. Erstelle Admin-Account
3. Login
```

### API-Keys hinzufügen (optional)
```bash
# Auf Server
nano /opt/allie-agent/.env

# Füge hinzu:
HYPERLIQUID_API_KEY=dein-key
OPENROUTER_API_KEY=dein-key

# Restart
docker-compose -f /opt/allie-agent/docker-compose.prod.yml restart
```

---

## 🔍 Monitoring

### Logs ansehen
```bash
ssh root@YOUR_SERVER_IP
docker-compose -f /opt/allie-agent/docker-compose.prod.yml logs -f
```

### Container Status
```bash
docker ps
docker-compose -f /opt/allie-agent/docker-compose.prod.yml ps
```

### Restart
```bash
docker-compose -f /opt/allie-agent/docker-compose.prod.yml restart
```

---

## 🆘 Troubleshooting

### "502 Bad Gateway"
```bash
docker-compose -f /opt/allie-agent/docker-compose.prod.yml logs backend
docker-compose -f /opt/allie-agent/docker-compose.prod.yml restart backend
```

### SSL-Probleme
```bash
certbot certificates
certbot renew --dry-run
```

### Firewall-Probleme
```bash
ufw status
ufw allow 443/tcp
```

---

## 🔐 Security Check

Nach Deployment prüfen:

1. **SSL-Rating:** https://www.ssllabs.com/ssltest/analyze.html?d=allie.memero.store
2. **Security Headers:** https://securityheaders.com/?q=allie.memero.store
3. **Firewall:** `ufw status`
4. **Fail2Ban:** `fail2ban-client status`

---

## 📞 Quick Commands

```bash
# Status
docker ps

# Logs
docker-compose -f /opt/allie-agent/docker-compose.prod.yml logs -f

# Restart
docker-compose -f /opt/allie-agent/docker-compose.prod.yml restart

# Stop
docker-compose -f /opt/allie-agent/docker-compose.prod.yml down

# Update
cd /opt/allie-agent
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Backup DB
docker exec allie-postgres-prod pg_dump -U allie_user allie_agent > backup.sql
```

---

## ✅ Erfolg!

Deine App läuft sicher auf:
**https://allie.memero.store**

Mit:
- ✅ SSL/HTTPS (A+ Rating)
- ✅ Firewall (UFW)
- ✅ Fail2Ban (Brute-Force Schutz)
- ✅ Rate Limiting
- ✅ Security Headers
- ✅ Docker Container
- ✅ Auto SSL-Renewal

**Viel Erfolg! 🎉**
