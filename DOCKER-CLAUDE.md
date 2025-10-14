# Claude Code Docker Container

This directory contains Docker setup for running Claude Code in a containerized environment.

## Prerequisites

- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- Docker Compose installed (usually comes with Docker Desktop)
- Anthropic API key ([Get one here](https://console.anthropic.com/))

## Quick Start

### 1. Set up environment variables

Create a `.env` file in the project root:

```bash
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env
```

Or export it in your shell:

```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

### 2. Build and start the container

```bash
docker-compose up -d --build
```

### 3. Access the shell

```bash
docker-compose exec claude-code zsh
```

Or use the convenience script:

```bash
./docker-shell.sh
```

## Usage Scripts

### Start container and access shell
```bash
./docker-shell.sh
```

### Stop container
```bash
docker-compose down
```

### Rebuild container (after Dockerfile changes)
```bash
docker-compose up -d --build
```

### View container logs
```bash
docker-compose logs -f claude-code
```

## What's Included

- **Node.js 20** (Bookworm/Debian base)
- **Claude Code CLI** (latest version from npm)
- **Git** (for version control)
- **Zsh + Oh My Zsh** (enhanced shell experience)
- **vim, nano** (text editors)
- **Project mounted at /workspace**

## Container Features

### Persistent Volumes

- `node_modules`: Persisted across container restarts
- `claude-config`: Persisted Claude Code configuration
- `.:/workspace`: Your project files (live-mounted)

### Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)
- `CLAUDE_CODE_ENABLED`: Enables Claude Code features

## Working with Claude Code

Once inside the container:

```bash
# Start Claude Code
claude

# Install project dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Access wrangler
npx wrangler dev
```

## Accessing Host Machine Services

When you need to access services running on your **host machine** (like a dev server at `localhost:8787`), use:

### From Inside the Container

Use `host.docker.internal` instead of `localhost`:

```bash
# Example: Access host's dev server at localhost:8787
curl http://host.docker.internal:8787

# Example: Configure MCP client to connect to host service
{
  "mcpServers": {
    "agent-config-adapter": {
      "type": "http",
      "url": "http://host.docker.internal:8787/mcp"
    }
  }
}
```

### Common Host URLs

| Host Machine URL | Container URL |
|-----------------|---------------|
| `http://localhost:8787` | `http://host.docker.internal:8787` |
| `http://localhost:3000` | `http://host.docker.internal:3000` |
| `http://127.0.0.1:8080` | `http://host.docker.internal:8080` |

### Why This Works

- **Mac/Windows**: `host.docker.internal` is automatically available
- **Linux**: Added via `extra_hosts` in [docker-compose.yml](docker-compose.yml)
- This special hostname resolves to your host machine's IP from within the container

### Alternative: Host Network Mode (Linux only)

For direct `localhost` access on Linux, you can use host network mode. Edit [docker-compose.yml](docker-compose.yml):

```yaml
services:
  claude-code:
    # Comment out extra_hosts and networks
    # extra_hosts:
    #   - "host.docker.internal:host-gateway"
    # networks:
    #   - claude-network

    # Add this instead
    network_mode: "host"
```

**Note**: With `network_mode: host`, you can use `localhost` directly, but port mappings don't work.

## Git Configuration (Optional)

To use your host machine's Git credentials:

1. Uncomment these lines in [docker-compose.yml](docker-compose.yml):
```yaml
# - ~/.gitconfig:/root/.gitconfig:ro
# - ~/.ssh:/root/.ssh:ro
```

2. Restart the container:
```bash
docker-compose down && docker-compose up -d
```

## Troubleshooting

### Claude Code not found
```bash
# Rebuild the container
docker-compose up -d --build
```

### Permission issues with mounted volumes
```bash
# On Linux, you may need to adjust permissions
sudo chown -R $USER:$USER .
```

### API key not recognized
```bash
# Check if .env file exists and contains the key
cat .env

# Restart container to pick up new environment variables
docker-compose restart
```

### Container won't start
```bash
# Check logs
docker-compose logs claude-code

# Remove and recreate
docker-compose down -v
docker-compose up -d --build
```

## Advanced Usage

### Custom Node Version

Edit [Dockerfile](Dockerfile) line 1:
```dockerfile
FROM node:18-bookworm  # or node:21-bookworm
```

### Install Additional Tools

Add to [Dockerfile](Dockerfile) after the apt-get install line:
```dockerfile
RUN apt-get install -y \
    python3 \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*
```

### Mount Additional Directories

Add to `volumes:` in [docker-compose.yml](docker-compose.yml):
```yaml
volumes:
  - ~/other-project:/other-project
```

## Security Notes

- Never commit `.env` file with real API keys
- `.env` is already in `.gitignore`
- Consider using Docker secrets for production deployments
- Mounted SSH keys are read-only (`:ro` flag)

## Clean Up

Remove all containers, volumes, and images:

```bash
# Stop and remove containers and volumes
docker-compose down -v

# Remove the image
docker rmi agent-config-adapter-claude-code

# Or remove all unused Docker resources
docker system prune -a
```
