#!/bin/bash

# 🚀 Allie Agent HTTPS Deployment Script
# Dieses Script deployt automatisch HTTPS auf deinem Server

set -e  # Bei Fehler abbrechen

echo "🚀 Starte HTTPS-Deployment für allie.memero.store..."

# Zum Projekt-Verzeichnis
echo "📁 Wechsle zu ~/allie-agent..."
cd ~/allie-agent || cd /root/allie-agent || { echo "❌ Projekt-Verzeichnis nicht gefunden!"; exit 1; }

# Git Pull
echo "⬇️  Hole neueste Version von GitHub..."
git pull origin main

# HTTPS Setup ausführen
echo "🔒 Starte HTTPS-Setup (Nginx + SSL)..."
echo "⚠️  WICHTIG: Certbot wird gleich nach deiner E-Mail-Adresse fragen!"
echo "⚠️  Gib deine E-Mail ein und bestätige mit 'Y' für Terms of Service"
echo ""
echo "Drücke ENTER um fortzufahren..."
read

sudo bash setup-https.sh

# Backend neu starten
echo "🔄 Starte Backend neu (lädt neue CORS-Config)..."
docker compose restart backend

# Status prüfen
echo ""
echo "✅ Deployment abgeschlossen!"
echo ""
echo "📊 Container Status:"
docker compose ps

echo ""
echo "🎉 HTTPS sollte jetzt funktionieren!"
echo "🌐 Öffne in deinem Browser: https://allie.memero.store"
echo ""
echo "📝 Backend Logs ansehen:"
echo "   docker compose logs backend -f"
