# Penpot local stack for Codex MCP

This repo includes a local Penpot Docker Compose stack with Penpot MCP enabled.

## Start Penpot

```powershell
docker compose -f docker-compose.penpot.yml up -d
```

Open:

- Penpot: http://localhost:9001
- Mailcatch: http://localhost:1080

Stop:

```powershell
docker compose -f docker-compose.penpot.yml down
```

Reset local Penpot data:

```powershell
docker compose -f docker-compose.penpot.yml down -v
```

## Optional environment override

Create a local `.env` next to the compose file if you want to pin or override values:

```properties
PENPOT_VERSION=2.15
PENPOT_PUBLIC_URI=http://localhost:9001
PENPOT_HTTP_PORT=9001
PENPOT_MAILCATCH_PORT=1080
PENPOT_TELEMETRY_ENABLED=false
PENPOT_SECRET_KEY=replace-with-a-long-random-secret
```

For a real network or HTTPS deployment, change `PENPOT_PUBLIC_URI` to the external URL and remove the local-only cookie/email flags from `PENPOT_FLAGS` in `docker-compose.penpot.yml`.

## Connect Penpot MCP to Codex

1. Start the stack and log in to Penpot.
2. Open `Your account -> Integrations -> MCP Server`.
3. Enable MCP and generate/copy the MCP server URL.
4. Use that URL in Codex as an HTTP MCP server.

For this local compose stack, the URL should look like:

```text
http://localhost:9001/mcp/stream?userToken=YOUR_MCP_KEY
```

Generic Codex/OpenCode-style MCP config shape:

```json
{
  "servers": {
    "penpot": {
      "url": "http://localhost:9001/mcp/stream?userToken=YOUR_MCP_KEY",
      "transport": {
        "type": "http"
      }
    }
  }
}
```

After configuring Codex, open a Penpot file and use `File -> MCP Server -> Connect`. Penpot MCP operates on the currently focused page in the active Penpot tab.

config.toml
[mcp_servers.penpot]
url = "http://localhost:9001/mcp/stream?userToken=YOUR_MCP_KEY"
