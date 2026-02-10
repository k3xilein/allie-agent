#!/bin/bash

echo "🚀 Allie Agent - Installation Script"
echo "====================================="
echo ""

# Backend Installation
echo "📦 Installing Backend Dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Backend installation failed"
    exit 1
fi
echo "✅ Backend dependencies installed"
cd ..

# Frontend Installation
echo ""
echo "📦 Installing Frontend Dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Frontend installation failed"
    exit 1
fi
echo "✅ Frontend dependencies installed"
cd ..

# Environment Setup
echo ""
echo "⚙️  Setting up environment files..."

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env (please configure with your keys)"
else
    echo "ℹ️  backend/.env already exists"
fi

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env (please configure for Docker)"
else
    echo "ℹ️  .env already exists"
fi

echo ""
echo "🎉 Installation Complete!"
echo ""
echo "Next steps:"
echo "1. Configure backend/.env with your API keys:"
echo "   - DATABASE_URL"
echo "   - SESSION_SECRET (generate with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\")"
echo "   - HYPERLIQUID_API_KEY (optional for mock testing)"
echo "   - OPENROUTER_API_KEY (optional for mock testing)"
echo ""
echo "2. Start PostgreSQL:"
echo "   docker run -d -p 5432:5432 -e POSTGRES_DB=allie_agent -e POSTGRES_USER=allie_user -e POSTGRES_PASSWORD=allie_password postgres:16"
echo ""
echo "3. Run migrations:"
echo "   cd backend && psql postgresql://allie_user:allie_password@localhost:5432/allie_agent -f migrations/*.sql"
echo ""
echo "4. Start development servers:"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "5. Or use Docker:"
echo "   docker-compose up --build"
echo ""
echo "📖 See README.md and SETUP.md for more details"
