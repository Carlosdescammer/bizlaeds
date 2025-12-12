#!/bin/bash

# BizLeads - Simple Setup Script
# One command to set everything up

set -e

echo "🚀 BizLeads Setup"
echo "================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Visit https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18 or higher is required. You have $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v)"
echo "✅ npm $(npm -v)"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  No .env.local file found. Creating from .env.example..."

    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ Created .env.local"
        echo ""
        echo "⚠️  IMPORTANT: Edit .env.local and add your API keys:"
        echo "   - DATABASE_URL (Neon PostgreSQL)"
        echo "   - OPENAI_API_KEY (for OCR)"
        echo "   - GOOGLE_MAPS_API_KEY (for location)"
        echo "   - HUNTER_API_KEY (for email finding)"
        echo "   - GMAIL_USER & GMAIL_APP_PASSWORD (for sending emails)"
        echo ""
        read -p "Press Enter when you've added your API keys to .env.local..."
    else
        echo "❌ No .env.example file found. Please create .env.local manually."
        exit 1
    fi
else
    echo "✅ Found .env.local"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🗄️  Setting up database..."
npx prisma generate
npx prisma db push

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 You can now start the app with:"
echo "   npm run dev"
echo ""
echo "📱 The app will be available at:"
echo "   http://localhost:3000"
echo ""
