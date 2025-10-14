# Docker + Claude Code Quick Start

## TL;DR

```bash
# 1. Setup
cp .env.sample .env
# Edit .env and add your ANTHROPIC_API_KEY

# 2. Start and enter container
./docker-shell.sh

# 3. Inside container, access host services
curl http://host.docker.internal:8787
```

## Accessing Your Host Machine

### The Problem
Your Docker container is isolated and can't access `localhost` directly.

### The Solution
Use `http://host.docker.internal` instead of `http://localhost`

### Examples

#### Before (Won't Work in Container)
```bash
curl http://localhost:8787/api/configs
```

#### After (Works in Container)
```bash
curl http://host.docker.internal:8787/api/configs
```

#### MCP Client Configuration
```json
{
  "mcpServers": {
    "agent-config-adapter": {
      "type": "http",
      "url": "http://host.docker.internal:8787/mcp"
    }
  }
}
```

#### Environment Variables
```bash
# In your .env file
API_URL=http://host.docker.internal:8787
DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/db
```

## Common Ports

| Service | Host URL | Container URL |
|---------|----------|---------------|
| Dev Server | `localhost:8787` | `host.docker.internal:8787` |
| Next.js | `localhost:3000` | `host.docker.internal:3000` |
| PostgreSQL | `localhost:5432` | `host.docker.internal:5432` |
| Redis | `localhost:6379` | `host.docker.internal:6379` |

## Testing the Connection

```bash
# From inside the container, test if host service is reachable
ping host.docker.internal

# Test HTTP connection
curl http://host.docker.internal:8787

# Or use netcat
nc -zv host.docker.internal 8787
```

## Platform-Specific Notes

### macOS & Windows
- `host.docker.internal` works automatically
- No additional configuration needed

### Linux
- Configured via `extra_hosts` in [docker-compose.yml](docker-compose.yml)
- Already set up in this project
- Alternative: Use `network_mode: host` (see [DOCKER-CLAUDE.md](DOCKER-CLAUDE.md))

## Troubleshooting

### "Could not resolve host: host.docker.internal"

**On Linux**, restart the container:
```bash
docker-compose down
docker-compose up -d
```

**On Mac/Windows**, this shouldn't happen. Check Docker Desktop is running.

### Connection refused

Make sure the service is actually running on your host:
```bash
# On your host machine (not in container)
curl http://localhost:8787
```

If this fails, your service isn't running on the host.

### Port not accessible

Check if the port is listening on all interfaces (0.0.0.0) not just localhost (127.0.0.1):

```bash
# On your host machine
netstat -tuln | grep 8787
```

For development servers, ensure they bind to `0.0.0.0`:
```bash
# Example: wrangler dev
npx wrangler dev --ip 0.0.0.0

# Example: Next.js
next dev -H 0.0.0.0
```

## Full Documentation

See [DOCKER-CLAUDE.md](DOCKER-CLAUDE.md) for complete setup and usage instructions.
