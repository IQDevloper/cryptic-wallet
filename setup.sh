#!/bin/bash

# CRYPTIC GATEWAY - CLEAN SETUP SCRIPT
# This script sets up everything from scratch

echo "🚀 CRYPTIC GATEWAY - CLEAN SETUP"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create .env from .env.example first"
    exit 1
fi

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate --schema=./prisma/schema-clean.prisma

# Step 3: Reset database with new schema
echo ""
echo "🗄️ Resetting database with clean schema..."
npx prisma db push --force-reset --schema=./prisma/schema-clean.prisma

# Step 4: Run setup script
echo ""
echo "🎯 Setting up database and KMS wallets..."
npx tsx scripts/setup-clean-database.ts

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. Create a test user and merchant"
echo "3. Test invoice creation"
echo ""