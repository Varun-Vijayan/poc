#!/bin/bash

echo "🔧 Setting up Codespaces environment..."

# Make scripts executable
chmod +x scripts/*.sh

# Install dependencies
npm install

echo "✅ Codespaces setup complete!"
echo ""
echo "🚀 To start production environment:"
echo "   ./scripts/start-production.sh" 