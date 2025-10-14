#!/bin/bash

# Convenience script to start and access Claude Code container

set -e

echo "🐳 Claude Code Docker Manager"
echo "=============================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "   Please start Docker and try again"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Creating .env template..."
    cat > .env << 'EOF'
# Add your Anthropic API key here
# Get one at: https://console.anthropic.com/
ANTHROPIC_API_KEY=your-api-key-here
EOF
    echo "✅ Created .env file"
    echo "   Please edit .env and add your ANTHROPIC_API_KEY"
    echo ""
    read -p "Press Enter to continue or Ctrl+C to exit..."
fi

# Check if container is running
if docker-compose ps | grep -q "claude-code.*Up"; then
    echo "✅ Container is already running"
    echo ""
else
    echo "🚀 Starting container..."
    docker-compose up -d
    echo "✅ Container started"
    echo ""
fi

echo "🔗 Connecting to container shell..."
echo ""

# Access the container shell
docker-compose exec claude-code zsh

# If exec fails, try attach
if [ $? -ne 0 ]; then
    echo "Trying alternative connection method..."
    docker-compose exec -it claude-code /bin/zsh
fi
