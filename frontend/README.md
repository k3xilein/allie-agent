# Frontend

## React 18 Dashboard and Control Interface

The frontend provides the user interface for monitoring and controlling the Allie Agent trading system.

---

## Architecture

### Core Pages

**Dashboard** – Trading engine control and overview
- Engine start/stop controls
- Real-time account balance and P&L
- Active positions display
- Trade history with filters
- Performance metrics

**Activity Log** – Real-time cycle monitoring
- Live trading cycle feed
- Category and severity filtering
- Expandable JSON details
- Live auto-refresh toggle
- Pagination and date range

**Settings** – Configuration management
- Trading parameter adjustment
- Risk management rules
- API key management
- Session management

**Authentication** – Account access
- Admin account creation (first visit)
- Login page with session persistence
- Secure logout

### Components

**Navigation** – AppShell with sidebar
- Dashboard, Activity Log, Settings links
- Logo and branding
- Session indicator
- Logout button

**Charts** – Data visualization (Recharts)
- Balance history
- Trade performance
- P&L trends

**Tables** – Trade and log display
- Pagination
- Sorting and filtering
- Expandable rows

**Modals** – Dialogs and confirmations
- Engine control confirmations
- Settings save confirmations
- Error notifications

**Alerts** – Toast notifications
- Trade execution alerts
- Error messages
- Success confirmations

---

## Technology Stack

**React 18** – Component framework
- Hooks for state management
- Functional components

**Vite 5** – Build tool
- Lightning-fast HMR
- Optimized production builds

**Zustand 4** – State management
- Lightweight store
- Persistent settings

**TypeScript 5** – Type safety
- Full type coverage
- IntelliSense support

**TailwindCSS 3** – Styling
- Utility-first CSS
- Dark mode support
- Custom theme colors

**Framer Motion** – Animations
- Smooth transitions
- Page animations
- Component lifecycle animations

**Lucide React** – Icons
- 450+ icons
- Consistent styling
- Customizable sizes

**Recharts** – Data visualization
- Line, area, bar charts
- Responsive sizing
- Tooltip support

---

## State Management

### Zustand Store (stores/useStore.ts)

**Authentication**
- currentUser
- isLoggedIn
- sessionExpiry

**Dashboard**
- activePositions
- tradeHistory
- accountMetrics
- engineStatus

**Settings**
- userSettings
- theme
- autoRefresh

**Activity Logs**
- currentLogs
- filters
- pagination

Methods:
- `setAuth(user)` – Update authentication
- `updateMetrics(data)` – Refresh metrics
- `updateSettings(config)` – Save settings
- `clearAuth()` – Logout

---

## API Integration

### Client (lib/client.ts)

**Authentication**
```typescript
auth.setup(adminName, password)
auth.login(password)
auth.logout()
auth.getSession()
```

**Dashboard**
```typescript
dashboard.getOverview()
dashboard.getActivePositions()
dashboard.getTradeHistory(page, limit)
```

**Agent Control**
```typescript
agent.start()
agent.stop()
agent.emergencyStop()
agent.getStatus()
```

**Activity Logs**
```typescript
activityLogsAPI.getLogs(page, limit, category, severity)
```

**Settings**
```typescript
settings.get()
settings.update(config)
```

---

## Pages

### Dashboard (pages/Dashboard.tsx)

```
┌─────────────────────────────────────┐
│  Overview Card                      │
│  • Balance: $10,234.56              │
│  • 24h P&L: +$234.50 (+2.34%)       │
│  • Open Positions: 2                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Engine Control                     │
│  [START] [STOP] [EMERGENCY STOP]    │
│  Status: Running (23 cycles)        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Active Positions                   │
│  BTC Position  Entry: $40,000       │
│               Current: $41,200      │
│               PnL: +$1,200 (+3%)    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Trade History (Last 10)            │
│  • BTC LONG 2m ago +$234.50 ✓       │
│  • ETH SHORT 5m ago -$12.30 ✓       │
└─────────────────────────────────────┘
```

### Activity Log (pages/ActivityLogs.tsx)

```
┌─────────────────────────────────────┐
│  Filters                            │
│  Category: [ALL] ▼  Severity: [ALL] ▼
│  [⟳ Auto-refresh]                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  2026-02-17 17:45:23 | CYCLE #45    │
│  [MARKET] - MARKET_DATA             │
│  Fetched BTC price: $42,150         │
│                                     │
│  2026-02-17 17:45:24 | CYCLE #45    │
│  [AI] - AI_DECISION                 │
│  Confidence: 72% - Action: LONG     │
│  ▼ Show Details                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Pagination                         │
│  [← 1 2 [3] 4 5 →]                  │
│  Showing 50 of 1,247 logs           │
└─────────────────────────────────────┘
```

### Settings (pages/Settings.tsx)

```
┌─────────────────────────────────────┐
│  Trading Parameters                 │
│                                     │
│  Analysis Interval: [2] minutes     │
│  Max Position Size: [20] %          │
│  Max Leverage: [10] x               │
│  Min Confidence: [55] %             │
│                                     │
│  [SAVE CHANGES]                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Risk Management                    │
│                                     │
│  Stop Loss: [3] %                   │
│  Take Profit: [6] %                 │
│  Max Daily Loss: [8] %              │
│  Max Drawdown: [15] %               │
│                                     │
│  [SAVE CHANGES]                     │
└─────────────────────────────────────┘
```

---

## Development

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Server runs on port 5173 with HMR enabled.

### Build

```bash
npm run build
```

Generates optimized build in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

Checks TypeScript and ESLint rules.

---

## Project Structure

```
src/
├── components/           UI components
│   ├── AppShell.tsx      Navigation layout
│   ├── Dashboard/        Dashboard components
│   ├── ActivityLogs/     Log viewing components
│   └── ...
├── pages/                Page components
│   ├── Dashboard.tsx
│   ├── ActivityLogs.tsx
│   ├── Settings.tsx
│   └── Auth.tsx
├── stores/               Zustand stores
│   └── useStore.ts
├── lib/                  Utilities
│   ├── client.ts         API client
│   ├── http.ts           Fetch wrapper
│   └── utils.ts          Helpers
├── styles/               Global styles
│   └── globals.css       Tailwind CSS
├── App.tsx               Router setup
└── main.tsx              React entry point
```

---

## Styling

### Tailwind CSS

Utility-first CSS framework with custom configuration:

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    colors: {
      primary: '#3B82F6',      // Blue
      success: '#10B981',      // Green
      warning: '#F59E0B',      // Amber
      error: '#EF4444',        // Red
      background: '#0F172A',   // Slate-900
      surface: '#1E293B',      // Slate-800
    },
  },
}
```

### Dark Mode

Enabled by default, uses system preference detection.

---

## Responsive Design

Breakpoints:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

All pages are fully responsive with Tailwind CSS.

---

## Performance

### Optimizations

- Code splitting with React Router
- Lazy loading for pages
- Image optimization
- CSS minification
- JavaScript minification
- Tree shaking

### Bundle Size

Target: < 200KB gzipped

Current: ~150KB gzipped

---

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: Latest versions

---

## Security

### Frontend Security

- No sensitive data in localStorage (use sessionStorage for temporary data)
- Secure cookie handling for sessions
- XSS prevention through React's escaping
- CSRF protection via session tokens

### API Security

- All requests over HTTPS
- Authorization headers on protected endpoints
- Session-based authentication
- Rate limiting on client side

---

## Troubleshooting

### Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Hot Module Replacement Not Working

```bash
# Restart dev server
npm run dev
```

### Styling Issues

1. Ensure Tailwind CSS is imported in `styles/globals.css`
2. Check custom Tailwind config in `tailwind.config.js`
3. Verify class names are correctly spelled

### API Connection Errors

1. Check backend is running: `http://localhost:4000`
2. Verify CORS configuration in backend
3. Check browser console for network errors

---

## Contributing

- Follow ESLint configuration
- Use TypeScript for type safety
- Component-driven development
- Test responsiveness across devices
- Update documentation for new pages

---

**Frontend** – Allie Agent Dashboard
