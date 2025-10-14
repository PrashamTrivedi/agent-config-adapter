#!/bin/zsh

# Docker entrypoint script for Claude Code container

echo "🚀 Claude Code Development Container"
echo "====================================="
echo ""

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  Warning: ANTHROPIC_API_KEY is not set"
    echo "   Set it in .env file or docker-compose.yml"
    echo ""
fi

# Display Claude Code version
if command -v claude &> /dev/null; then
    echo "✅ Claude Code installed: $(claude --version 2>&1 || echo 'version unknown')"
else
    echo "❌ Claude Code not found"
fi

echo ""
echo "📁 Working directory: $(pwd)"
echo "🐚 Shell: $(echo $SHELL)"
echo ""
echo "Quick start:"
echo "  - Run 'claude' to start Claude Code"
echo "  - Run 'npm install' to install project dependencies"
echo "  - Run 'npm run dev' to start the development server"
echo ""
echo "====================================="
echo ""

# Execute the command passed to docker run
exec "$@"
