import { AgentFormat, MCPConfig, MCPServerConfig } from '../domain/types';
import { FormatAdapter } from './types';
import { parse as parseTOML, stringify as stringifyTOML } from 'smol-toml';

export class MCPConfigAdapter implements FormatAdapter {
  convert(content: string, sourceFormat: AgentFormat, targetFormat: AgentFormat): string {
    if (sourceFormat === targetFormat) return content;

    // Parse source format
    let parsed: MCPConfig;

    if (sourceFormat === 'codex') {
      parsed = this.parseTOML(content);
    } else {
      // Both claude_code and gemini use JSON
      parsed = this.parseJSON(content);
    }

    // Convert to target format
    if (targetFormat === 'codex') {
      return this.toCodex(parsed);
    } else if (targetFormat === 'claude_code') {
      return this.toClaudeCode(parsed);
    } else if (targetFormat === 'gemini') {
      return this.toGemini(parsed);
    } else {
      throw new Error(`Unsupported target format: ${targetFormat}`);
    }
  }

  validate(content: string, format: AgentFormat): boolean {
    try {
      if (format === 'codex') {
        this.parseTOML(content);
      } else {
        this.parseJSON(content);
      }
      return true;
    } catch {
      return false;
    }
  }

  private parseJSON(content: string): MCPConfig {
    const data = JSON.parse(content);

    if (!data.mcpServers || typeof data.mcpServers !== 'object') {
      throw new Error('Invalid MCP config: missing mcpServers object');
    }

    return data as MCPConfig;
  }

  private parseTOML(content: string): MCPConfig {
    const data = parseTOML(content) as any;

    if (!data.mcp_servers || typeof data.mcp_servers !== 'object') {
      throw new Error('Invalid TOML MCP config: missing mcp_servers section');
    }

    // Convert TOML format to our internal MCPConfig format
    const mcpServers: Record<string, MCPServerConfig> = {};

    for (const [serverName, serverConfig] of Object.entries(data.mcp_servers)) {
      const config = serverConfig as any;
      mcpServers[serverName] = {
        command: config.command,
        args: config.args,
        env: config.env,
        startup_timeout_ms: config.startup_timeout_ms,
      };
    }

    return { mcpServers };
  }

  private toClaudeCode(parsed: MCPConfig): string {
    const claudeConfig: Record<string, MCPServerConfig> = {};

    for (const [serverName, serverConfig] of Object.entries(parsed.mcpServers)) {
      claudeConfig[serverName] = {
        type: serverConfig.type || 'stdio', // Add type field for Claude Code
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env,
        // Strip startup_timeout_ms (Codex-specific)
      };

      // If httpUrl exists, set type to http
      if (serverConfig.httpUrl) {
        claudeConfig[serverName].type = 'http';
      }
    }

    return JSON.stringify({ mcpServers: claudeConfig }, null, 2);
  }

  private toGemini(parsed: MCPConfig): string {
    const geminiConfig: Record<string, MCPServerConfig> = {};

    for (const [serverName, serverConfig] of Object.entries(parsed.mcpServers)) {
      geminiConfig[serverName] = {
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env,
        httpUrl: serverConfig.httpUrl,
        // Strip type (Claude-specific) and startup_timeout_ms (Codex-specific)
      };
    }

    return JSON.stringify({ mcpServers: geminiConfig }, null, 2);
  }

  private toCodex(parsed: MCPConfig): string {
    const tomlData: any = {
      mcp_servers: {}
    };

    for (const [serverName, serverConfig] of Object.entries(parsed.mcpServers)) {
      tomlData.mcp_servers[serverName] = {
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env || {},
        startup_timeout_ms: serverConfig.startup_timeout_ms || 20000, // Default timeout
      };
    }

    return stringifyTOML(tomlData);
  }
}
