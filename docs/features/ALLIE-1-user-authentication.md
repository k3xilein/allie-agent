# ALLIE-1: User Authentication

**Status:** Spezifikation abgeschlossen  
**Erstellt:** 2026-02-10  
**Agent:** Requirements Engineer  

---

## Überblick

Implementierung eines sicheren Login-Systems, das beim ersten Start die Erstellung von Admin-Credentials erzwingt und danach authentifizierten Zugriff auf das System ermöglicht.

## Abhängigkeiten

Keine (Erstes Feature)

---

## User Stories

### US-1.1: Initiale Setup (Erste Nutzung)
**Als** neuer Nutzer  
**möchte ich** beim ersten Start des Systems aufgefordert werden, Admin-Credentials zu erstellen  
**damit** das System sicher initialisiert wird

**Acceptance Criteria:**
- System erkennt, wenn noch kein Admin-Account existiert
- Login-Seite zeigt Setup-Modus mit Formular für:
  - Benutzername (min. 3 Zeichen)
  - Passwort (min. 12 Zeichen, Komplexitätsprüfung)
  - Passwort-Bestätigung
- Nach erfolgreicher Erstellung:
  - Passwort wird mit bcrypt gehasht
  - Admin-Account wird in Datenbank gespeichert
  - User wird automatisch eingeloggt
  - Setup-Modus wird deaktiviert

### US-1.2: Login
**Als** registrierter Nutzer  
**möchte ich** mich mit meinen Credentials einloggen  
**damit** ich auf das Dashboard zugreifen kann

**Acceptance Criteria:**
- Login-Formular mit Username + Passwort
- Credentials werden gegen Datenbank validiert
- Bei erfolgreicher Validierung:
  - Session-Token wird erstellt
  - Token wird in HTTP-Only Cookie gespeichert
  - Redirect zum Dashboard
- Bei fehlgeschlagener Validierung:
  - Generische Fehlermeldung ("Ungültige Anmeldedaten")
  - Kein Hinweis, ob User oder Passwort falsch
  - Rate-Limiting: max. 5 Versuche / 15 Minuten

### US-1.3: Logout
**Als** eingeloggter Nutzer  
**möchte ich** mich sicher ausloggen  
**damit** meine Session beendet wird

**Acceptance Criteria:**
- Logout-Button im Header
- Session-Token wird invalidiert
- Cookie wird gelöscht
- Redirect zur Login-Seite

### US-1.4: Session-Validierung
**Als** System  
**möchte ich** bei jeder Anfrage die Session validieren  
**damit** nur authentifizierte Nutzer auf geschützte Ressourcen zugreifen

**Acceptance Criteria:**
- Middleware prüft Session-Token bei jeder API-Anfrage
- Ungültige/fehlende Tokens → 401 Unauthorized
- Abgelaufene Sessions → 401 + Cookie-Löschung
- Session-Timeout: 24 Stunden

---

## Edge Cases & Risiken

### Edge Cases
- Mehrfache Setup-Versuche (wenn DB nicht sauber initialisiert)
  - **Lösung:** DB-Migration mit UNIQUE Constraint auf Admin-User
- Browser-Session bleibt nach Server-Restart erhalten
  - **Lösung:** Session-Token wird in Datenbank gespeichert
- Passwort-Reset (zunächst außerhalb des MVP)
  - **Fallback:** Manuelle DB-Manipulation (dokumentiert)

### Risiken
- **Brute-Force-Angriffe**
  - Mitigation: Rate-Limiting (max. 5 Login-Versuche / 15 Min)
- **Session-Hijacking**
  - Mitigation: HTTP-Only Cookies, Secure Flag (HTTPS)
- **CSRF-Angriffe**
  - Mitigation: SameSite Cookie-Flag

---

## Technische Anforderungen

### Sicherheit
- Passwort-Hashing: bcrypt (min. 10 Rounds)
- Session-Token: kryptographisch sicher (crypto.randomBytes)
- Cookies: HttpOnly, Secure (in Produktion), SameSite=Strict

### Input-Validierung
- Benutzername: 3-50 Zeichen, alphanumerisch + Unterstrich
- Passwort: 12-128 Zeichen, mindestens:
  - 1 Großbuchstabe
  - 1 Kleinbuchstabe
  - 1 Zahl
  - 1 Sonderzeichen

### Performance
- Login-Response: < 500ms (unter Normallast)
- Session-Validierung: < 50ms

---

## API-Contracts (Referenz für Backend Developer)

**POST /api/auth/setup**
```json
Request:
{
  "username": "admin",
  "password": "SecurePass123!",
  "passwordConfirm": "SecurePass123!"
}

Response (200):
{
  "success": true,
  "message": "Admin account created successfully"
}

Response (400):
{
  "success": false,
  "error": "Password does not meet complexity requirements"
}

Response (409):
{
  "success": false,
  "error": "Setup already completed"
}
```

**POST /api/auth/login**
```json
Request:
{
  "username": "admin",
  "password": "SecurePass123!"
}

Response (200):
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin"
  }
}

Response (401):
{
  "success": false,
  "error": "Invalid credentials"
}

Response (429):
{
  "success": false,
  "error": "Too many login attempts. Try again in 15 minutes"
}
```

**POST /api/auth/logout**
```json
Response (200):
{
  "success": true,
  "message": "Logged out successfully"
}
```

**GET /api/auth/session**
```json
Response (200):
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "admin"
  }
}

Response (401):
{
  "authenticated": false
}
```

---

## UI-Anforderungen (Referenz für Frontend Developer)

### Setup-Screen (nur beim ersten Start)
- Zentriertes Formular
- Titel: "Welcome to Allie Agent - Initial Setup"
- Felder: Username, Password, Confirm Password
- Passwort-Stärke-Anzeige
- Submit-Button: "Create Admin Account"

### Login-Screen
- Minimalistisches Design
- Logo/Titel: "Allie Agent"
- Felder: Username, Password
- Submit-Button: "Login"
- Fehlermeldungen rot, zentriert unter Formular

### Session-Handling
- Bei jedem App-Start: Session-Validierung
- Bei 401: Redirect zu Login
- Logout-Button in Header (nur wenn eingeloggt)

---

## Definition of Done

- [ ] Backend-API implementiert (alle 4 Endpoints)
- [ ] Datenbank-Schema für Users + Sessions
- [ ] Frontend Login/Setup-UI implementiert
- [ ] Session-Middleware integriert
- [ ] Rate-Limiting aktiv
- [ ] Input-Validierung serverseitig + clientseitig
- [ ] QA: Manuelle Tests abgeschlossen
- [ ] Security-Review: bcrypt, HttpOnly Cookies, HTTPS
- [ ] Dokumentation: Setup-Anleitung für erste Nutzung
