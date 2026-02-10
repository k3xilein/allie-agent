# HTTPS Setup Guide für allie.memero.store

## Voraussetzungen
- Server läuft auf memero.store
- Zugriff auf DNS-Einstellungen deiner Domain
- Root/sudo-Zugriff auf den Server

## Schritt 1: DNS A-Record erstellen

Gehe zu deinem DNS-Provider (z.B. Cloudflare, GoDaddy, etc.) und erstelle einen neuen A-Record:

```
Type: A
Name: allie
Value: [DEINE-SERVER-IP]
TTL: Auto oder 300
```

**Überprüfung:**
```bash
# Warte 5-15 Minuten und teste dann:
dig allie.memero.store
# oder
nslookup allie.memero.store
```

## Schritt 2: HTTPS-Setup-Script ausführen

Sobald der DNS-Record propagiert ist:

```bash
# 1. SSH auf deinen Server
ssh root@memero.store

# 2. Zum Projekt-Verzeichnis wechseln
cd allie-agent

# 3. Neueste Änderungen pullen
git pull origin main

# 4. Setup-Script ausführen
sudo bash setup-https.sh
```

Das Script wird:
- ✅ Nginx installieren
- ✅ Certbot installieren
- ✅ Reverse Proxy konfigurieren
- ✅ SSL-Zertifikat von Let's Encrypt holen
- ✅ Auto-Renewal einrichten

**Hinweis:** Certbot wird nach deiner E-Mail-Adresse fragen und du musst den Terms zustimmen.

## Schritt 3: Backend neu starten (wichtig!)

Nach dem HTTPS-Setup muss der Backend-Container neu gestartet werden, damit die neue CORS-Konfiguration geladen wird:

```bash
cd ~/allie-agent
docker compose restart backend
```

**Überprüfung:**
```bash
docker compose logs backend | tail -20
```

Du solltest sehen:
```
Security features enabled: Helmet, CORS, Rate Limiting, Input Sanitization
```

## Schritt 4: Zugriff testen

Öffne in deinem Browser:
```
https://allie.memero.store
```

Du solltest:
- ✅ Ein gültiges SSL-Zertifikat sehen (🔒 grünes Schloss)
- ✅ Die Setup-Seite laden können
- ✅ Den Admin-Account erstellen können

## Troubleshooting

### Problem: DNS-Record nicht erreichbar
```bash
# Cache leeren und erneut testen
sudo systemd-resolve --flush-caches
dig allie.memero.store @8.8.8.8
```

### Problem: Certbot schlägt fehl
```bash
# Nginx-Konfiguration testen
sudo nginx -t

# Nginx neu starten
sudo systemctl restart nginx

# Certbot erneut versuchen
sudo certbot --nginx -d allie.memero.store
```

### Problem: CORS-Fehler nach HTTPS-Setup
```bash
# Backend-Container neu starten
cd ~/allie-agent
docker compose restart backend

# Logs überprüfen
docker compose logs backend -f
```

### Problem: Port 80/443 bereits belegt
```bash
# Prozess finden
sudo lsof -i :80
sudo lsof -i :443

# Anderen Webserver stoppen (falls vorhanden)
sudo systemctl stop apache2
sudo systemctl stop nginx
```

## Nach erfolgreichem Setup

1. **Admin-Account erstellen**: Gehe zu https://allie.memero.store und erstelle deinen Admin-Account
2. **Onboarding durchlaufen**: Konfiguriere API-Keys, Risiko-Parameter, Trading-Strategie
3. **Trading starten**: Aktiviere den Agent im Dashboard

## SSL-Zertifikat Renewal

Das Zertifikat läuft nach 90 Tagen ab, wird aber automatisch erneuert durch:
```bash
# Certbot Auto-Renewal ist bereits konfiguriert
sudo certbot renew --dry-run
```

## Sicherheit

Nach dem Setup läuft dein System mit:
- 🔒 HTTPS/TLS Verschlüsselung
- 🔒 AES-256-GCM für sensible Daten
- 🔒 Helmet.js Security Headers
- 🔒 CORS Protection
- 🔒 Rate Limiting
- 🔒 Input Sanitization
- 🔒 Bcrypt Password Hashing

---

**Zusammenfassung der Befehle:**
```bash
# Auf Server
ssh root@memero.store
cd allie-agent
git pull origin main
sudo bash setup-https.sh
docker compose restart backend

# Im Browser
https://allie.memero.store
```
