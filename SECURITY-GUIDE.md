# 🔐 Security Best Practices - Quick Reference

## 🚨 BEFORE GOING TO PRODUCTION

### 1. Generate Strong SESSION_SECRET
```bash
# Run this command to generate a cryptographically secure secret:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copy the output to backend/.env as SESSION_SECRET
```

### 2. Enable HTTPS
```nginx
# In nginx.conf, add:
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Force HTTPS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

### 3. Update Environment Variables
```bash
# backend/.env
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
DATABASE_URL=postgresql://user:STRONG_PASSWORD@localhost:5432/allie_agent
SESSION_SECRET=<YOUR_GENERATED_SECRET>
```

### 4. Database Security
```sql
-- Create dedicated database user with limited permissions
CREATE USER allie_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
GRANT CONNECT ON DATABASE allie_agent TO allie_user;
GRANT USAGE ON SCHEMA public TO allie_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO allie_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO allie_user;

-- Revoke unnecessary privileges
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```

### 5. Firewall Rules
```bash
# Allow only necessary ports
ufw allow 80/tcp   # HTTP (will redirect to HTTPS)
ufw allow 443/tcp  # HTTPS
ufw allow 22/tcp   # SSH (consider changing default port)

# Deny everything else
ufw default deny incoming
ufw default allow outgoing
ufw enable
```

---

## 🛡️ SECURITY FEATURES ENABLED

### Authentication & Authorization
- ✅ bcrypt password hashing (10 rounds)
- ✅ HTTP-only secure cookies
- ✅ Session expiration (24 hours)
- ✅ Automatic session cleanup
- ✅ Maximum 5 concurrent sessions per user
- ✅ Strong password requirements (12+ chars, mixed case, numbers, special)

### Attack Prevention
- ✅ Timing attack prevention (constant-time user lookup)
- ✅ User enumeration prevention
- ✅ SQL injection protection (parameterized queries)
- ✅ XSS protection (input sanitization)
- ✅ CSRF protection (SameSite cookies)
- ✅ HPP protection (HTTP parameter pollution)
- ✅ DoS protection (request size limits: 10KB)

### Rate Limiting
- ✅ Login attempts: 5 per 15 minutes
- ✅ API requests: 60 per minute
- ✅ Control actions: 10 per minute
- ✅ Suspicious activity detection (1000+ requests/5min)

### Security Headers (Helmet.js)
- ✅ Content-Security-Policy
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection
- ✅ Strict-Transport-Security (HSTS)
- ✅ Referrer-Policy

### CORS Policy
- ✅ Whitelist-based origin validation
- ✅ Credentials allowed only for trusted origins
- ✅ Restricted HTTP methods

### Logging & Monitoring
- ✅ All authentication events logged
- ✅ IP address tracking
- ✅ User action audit trail
- ✅ System event logging
- ✅ Error logging (Winston)

---

## 🔍 SECURITY TESTING

### Before Deployment
```bash
# 1. Check for known vulnerabilities
npm audit

# 2. Fix vulnerabilities
npm audit fix

# 3. Check for outdated packages
npm outdated

# 4. Update dependencies
npm update
```

### Test Security Headers
```bash
# Test with curl
curl -I https://yourdomain.com

# Should see headers:
# - Strict-Transport-Security
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
```

### Test Rate Limiting
```bash
# Try multiple failed logins
for i in {1..6}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done

# 6th request should return 429 Too Many Requests
```

---

## 🚫 SECURITY DON'TS

### ❌ Never Do This:
1. **Don't hardcode secrets** in source code
   ```javascript
   // BAD
   const SECRET = "my-secret-123";
   
   // GOOD
   const SECRET = process.env.SESSION_SECRET;
   ```

2. **Don't log sensitive data**
   ```javascript
   // BAD
   logger.info('User logged in', { password: req.body.password });
   
   // GOOD
   logger.info('User logged in', { username: req.body.username });
   ```

3. **Don't expose error details** in production
   ```javascript
   // BAD
   res.status(500).json({ error: error.stack });
   
   // GOOD
   res.status(500).json({ error: 'Internal server error' });
   ```

4. **Don't trust user input**
   ```javascript
   // BAD
   const query = `SELECT * FROM users WHERE id = ${req.params.id}`;
   
   // GOOD
   const query = 'SELECT * FROM users WHERE id = $1';
   const result = await pool.query(query, [req.params.id]);
   ```

5. **Don't use weak passwords** in production
   ```bash
   # BAD
   DATABASE_URL=postgresql://admin:password123@localhost/db
   
   # GOOD
   DATABASE_URL=postgresql://admin:xK9$mP2#nQ8@wL5!vT7^jR4&localhost/db
   ```

---

## ✅ SECURITY CHECKLIST

### Pre-Deployment
- [ ] Generate strong SESSION_SECRET (64 bytes random)
- [ ] Change default database password
- [ ] Set NODE_ENV=production
- [ ] Configure FRONTEND_URL to production domain
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall rules
- [ ] Set up log rotation
- [ ] Enable database backups
- [ ] Test all security features
- [ ] Run `npm audit` and fix vulnerabilities

### Post-Deployment
- [ ] Monitor logs for suspicious activity
- [ ] Set up uptime monitoring
- [ ] Configure alerts for rate limit triggers
- [ ] Regular security updates
- [ ] Periodic security audits
- [ ] Review access logs weekly
- [ ] Test backup restoration
- [ ] Update dependencies monthly

---

## 📚 ADDITIONAL RESOURCES

### Security Tools
- **OWASP ZAP** - Web application security scanner
- **Snyk** - Dependency vulnerability scanner
- **npm audit** - Built-in vulnerability checker
- **SSL Labs** - Test SSL/TLS configuration
- **SecurityHeaders.com** - Check security headers

### Best Practices
- **OWASP Top 10** - https://owasp.org/www-project-top-ten/
- **Node.js Security Checklist** - https://blog.risingstack.com/node-js-security-checklist/
- **Express Security Best Practices** - https://expressjs.com/en/advanced/best-practice-security.html

### Monitoring Services
- **Sentry** - Error tracking and monitoring
- **LogRocket** - Frontend monitoring
- **New Relic** - Application performance monitoring
- **Datadog** - Infrastructure monitoring

---

## 🆘 INCIDENT RESPONSE

### If You Suspect a Security Breach:

1. **Immediately:**
   - Stop the affected service
   - Invalidate all sessions: `DELETE FROM sessions;`
   - Change all passwords and API keys
   - Enable maintenance mode

2. **Investigate:**
   - Check logs for suspicious activity
   - Review database for unauthorized changes
   - Check file system for modifications
   - Analyze network traffic

3. **Remediate:**
   - Patch the vulnerability
   - Restore from clean backup if needed
   - Update all secrets
   - Notify affected users

4. **Prevent:**
   - Document the incident
   - Update security measures
   - Conduct security training
   - Implement additional monitoring

---

## 📞 SECURITY CONTACTS

### Report Security Issues
- **Internal:** Security team email
- **External:** security@yourdomain.com
- **Bug Bounty:** Consider HackerOne or Bugcrowd

### Emergency Procedures
1. Disable application: `docker-compose down`
2. Notify security team
3. Preserve logs and evidence
4. Follow incident response plan

---

**Last Updated:** 10. Februar 2026  
**Version:** 1.0.0  
**Maintained by:** DevOps & Security Team
