# Contributing to Allie Agent

Thank you for considering a contribution to Allie Agent. This guide will help you understand our development practices and how to contribute effectively.

---

## Code of Conduct

- Be respectful and professional
- Provide constructive feedback
- Report issues clearly with reproduction steps
- Respect intellectual property and licensing

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Docker and docker-compose (for containerized development)
- A Hyperliquid wallet with testnet access
- OpenRouter API key

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/allie-agent.git
   cd allie-agent
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. **Start database:**
   ```bash
   docker-compose up -d postgres
   ```

5. **Run migrations:**
   ```bash
   cd backend && npm run migrate
   ```

6. **Start development servers:**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

7. **Access application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000

---

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/activity-logging` – New features
- `fix/trade-execution-bug` – Bug fixes
- `docs/update-readme` – Documentation
- `refactor/simplify-risk-engine` – Code refactoring
- `perf/optimize-db-queries` – Performance improvements

### Commits

Write clear, descriptive commit messages:

```
feat: add comprehensive activity logging system

- Create activity_logs database table with indexing
- Add LoggingService methods for recording and retrieving logs
- Instrument TradingEngine with detailed cycle logging
- Add Activity Log frontend page with filtering and pagination
- Include audit trail for all trading decisions and execution

Fixes: #42
```

**Format:**
```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation
- `refactor` – Code refactoring without feature change
- `perf` – Performance improvement
- `test` – Test additions or modifications
- `chore` – Maintenance tasks
- `ci` – CI/CD configuration

### Pull Requests

1. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "feat: describe your change"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin feature/your-feature
   ```

4. **Create pull request** with description including:
   - What the change does
   - Why the change is needed
   - How to test the change
   - Any breaking changes

---

## Coding Standards

### TypeScript

- Enable strict mode: `"strict": true` in tsconfig.json
- Use explicit return types for functions
- Avoid `any` type – use proper typing
- Use interfaces for object shapes
- Prefer type safety over flexibility

```typescript
// Good
interface Trade {
  id: number;
  symbol: string;
  entryPrice: number;
  quantity: number;
}

function calculatePnL(trade: Trade, exitPrice: number): number {
  return (exitPrice - trade.entryPrice) * trade.quantity;
}

// Avoid
function calculatePnL(trade: any, exitPrice: any): any {
  return (exitPrice - trade.entryPrice) * trade.quantity;
}
```

### React Component Conventions

- Use functional components with hooks
- Name components descriptively
- Use proper TypeScript props interfaces
- Memoize expensive computations with `useMemo`
- Extract custom hooks for reusable logic

```typescript
// Good
interface DashboardProps {
  userId: string;
  onRefresh: () => void;
}

export function Dashboard({ userId, onRefresh }: DashboardProps) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData(userId).then(setData);
  }, [userId]);

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}

// Avoid
export function Dashboard(props) {
  // Unclear props usage
}
```

### Backend Code Style

- Use descriptive variable and function names
- Keep functions focused and single-responsibility
- Use async/await over callbacks
- Add JSDoc comments for public methods
- Handle errors explicitly

```typescript
// Good
async function executeTradeWithValidation(
  tradeRequest: TradeRequest,
  userId: string
): Promise<Trade> {
  validateTradeRequest(tradeRequest);
  await checkRiskLimits(userId, tradeRequest);
  const trade = await executeTrade(tradeRequest);
  await logActivity('TRADE_EXECUTED', trade);
  return trade;
}

// Avoid
async function execute(req) {
  const trade = await doTrade(req);
  return trade;
}
```

### CSS/Styling

- Use Tailwind CSS utilities for consistency
- Avoid inline styles
- Organize classes logically
- Use custom Tailwind classes for complex patterns
- Test responsiveness across breakpoints

```typescript
// Good
<div className="flex flex-col gap-4 p-6 bg-slate-900 rounded-lg border border-slate-700">
  <h2 className="text-xl font-bold text-white">Dashboard</h2>
  <p className="text-sm text-slate-400">Welcome back</p>
</div>

// Avoid
<div style={{ display: 'flex', padding: '24px', background: '#0F172A' }}>
  {/* Inline styles */}
</div>
```

---

## Database Changes

### Adding Migrations

1. Create migration file in `backend/migrations/`:
   ```bash
   touch backend/migrations/010_add_column_to_trades.sql
   ```

2. Write migration:
   ```sql
   -- Up migration
   ALTER TABLE trades ADD COLUMN commission DECIMAL(10, 8) DEFAULT 0;
   CREATE INDEX idx_trades_commission ON trades(commission);

   -- Down migration (optional)
   -- ALTER TABLE trades DROP COLUMN commission;
   ```

3. Ensure migration is idempotent (safe to run multiple times)

4. Update TypeScript interfaces to match schema

5. Test migration:
   ```bash
   npm run migrate
   ```

### Schema Guidelines

- Use appropriate data types (INT, VARCHAR, DECIMAL, JSONB, etc.)
- Add constraints: NOT NULL, UNIQUE, CHECK
- Create indexes for frequently queried columns
- Include timestamps: created_at, updated_at
- Use JSONB for flexible data structures
- Document column purposes with comments

---

## Testing

### Unit Tests

```bash
npm test
```

Write tests for:
- Utility functions
- Business logic
- Data validation
- Error handling

### Integration Tests

```bash
npm run test:integration
```

Test:
- API endpoints
- Database operations
- Service interactions

### Manual Testing Checklist

Before submitting PR, verify:
- [ ] Feature works as intended
- [ ] No console errors or warnings
- [ ] UI is responsive (mobile, tablet, desktop)
- [ ] Performance is acceptable (< 100ms response time)
- [ ] Edge cases are handled
- [ ] Error messages are helpful
- [ ] Dark mode works correctly
- [ ] Navigation flows as expected

---

## Performance Guidelines

### Backend Performance

- Database queries should complete in < 100ms
- API responses should complete in < 500ms
- Implement caching for frequently accessed data
- Use connection pooling for database
- Profile code to identify bottlenecks

```bash
# Monitor performance
docker logs allie-backend-prod | grep "Duration:"
```

### Frontend Performance

- Page load should complete in < 2 seconds
- No JavaScript > 500KB before gzip
- Lazy load images and components
- Minimize re-renders with proper memoization
- Use Production build for testing

```bash
npm run build
npm run preview
```

---

## Security Considerations

### Code Security

- Never commit secrets, API keys, or passwords
- Use environment variables for sensitive config
- Validate and sanitize all user inputs
- Implement rate limiting for API endpoints
- Use HTTPS for all external communication
- Hash passwords with bcrypt
- Encrypt sensitive data at rest and in transit

### API Security

- Require authentication for sensitive endpoints
- Validate request signatures
- Implement CORS appropriately
- Log security events
- Use secure session management

### Dependency Security

```bash
# Check for vulnerabilities
npm audit

# Update to safe versions
npm audit fix
```

---

## Documentation

### Comments

Add comments for:
- Complex algorithms
- Non-obvious business logic
- Workarounds for known issues
- Important assumptions

```typescript
// Calculate optimal position size using Kelly Criterion
// Formula: f* = (p*b - q) / b where p=win%, q=loss%, b=avg win/loss ratio
const optimalSize = (winRate * avgWin - lossRate) / avgWin;
```

### Documentation Files

- Update README.md for user-facing changes
- Update API.md for endpoint changes
- Update ARCHITECTURE.md for major structural changes
- Keep CONTRIBUTING.md current with process changes

---

## Release Process

### Version Numbering

Use Semantic Versioning: MAJOR.MINOR.PATCH

- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

### Release Checklist

- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Create release branch
- [ ] Tag release: `git tag v1.2.3`
- [ ] Push tag: `git push origin v1.2.3`
- [ ] Deploy to staging
- [ ] Test all features
- [ ] Deploy to production

---

## Getting Help

### Resources

- **Issues**: GitHub Issues for bugs and features
- **Discussions**: GitHub Discussions for questions
- **Documentation**: See README.md and ARCHITECTURE.md
- **Community**: Reach out to maintainers

### Reporting Issues

Provide:
- Clear title describing the issue
- Step-by-step reproduction instructions
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots or error logs

---

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes for major contributions
- GitHub contributor graph

Thank you for contributing to Allie Agent!

---

**Last Updated**: February 2026
**Maintained By**: Allie Agent Team
