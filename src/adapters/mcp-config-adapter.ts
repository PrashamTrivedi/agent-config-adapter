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
      const serverDef: MCPServerConfig = {
        startup_timeout_ms: config.startup_timeout_ms,
        env: config.env,
      };

      // Check if it's an HTTP server or stdio server
      // Codex uses 'url' field for HTTP servers
      if (config.url) {
        serverDef.url = config.url;
      } else {
        serverDef.command = config.command;
        serverDef.args = config.args;
      }

      mcpServers[serverName] = serverDef;
    }

    return { mcpServers };
  }

  private toClaudeCode(parsed: MCPConfig): string {
    const claudeConfig: Record<string, MCPServerConfig> = {};

    for (const [serverName, serverConfig] of Object.entries(parsed.mcpServers)) {
      const config: MCPServerConfig = {};

      // Determine server type and set appropriate fields
      const url = serverConfig.url || serverConfig.httpUrl;
      if (url) {
        // HTTP/SSE server
        config.type = serverConfig.type || 'http';
        config.url = url;
        if (serverConfig.env) config.env = serverConfig.env;
      } else {
        // stdio server
        config.type = 'stdio';
        config.command = serverConfig.command;
        if (serverConfig.args) config.args = serverConfig.args;
        if (serverConfig.env) config.env = serverConfig.env;
      }

      claudeConfig[serverName] = config;
    }

    return JSON.stringify({ mcpServers: claudeConfig }, null, 2);
  }

  private toGemini(parsed: MCPConfig): string {
    const geminiConfig: Record<string, MCPServerConfig> = {};

    for (const [serverName, serverConfig] of Object.entries(parsed.mcpServers)) {
      const config: MCPServerConfig = {};

      // Gemini uses httpUrl for remote servers
      const url = serverConfig.url || serverConfig.httpUrl;
      if (url) {
        config.httpUrl = url;
        if (serverConfig.env) config.env = serverConfig.env;
      } else {
        // stdio server
        config.command = serverConfig.command;
        if (serverConfig.args) config.args = serverConfig.args;
        if (serverConfig.env) config.env = serverConfig.env;
      }

      geminiConfig[serverName] = config;
    }

    return JSON.stringify({ mcpServers: geminiConfig }, null, 2);
  }

  private toCodex(parsed: MCPConfig): string {
    const tomlData: any = {
      mcp_servers: {}
    };

    for (const [serverName, serverConfig] of Object.entries(parsed.mcpServers)) {
      const config: any = {
        startup_timeout_ms: serverConfig.startup_timeout_ms || 20000,
        env: serverConfig.env || {},
      };

      // Codex uses different fields for http vs stdio servers
      const url = serverConfig.url || serverConfig.httpUrl;
      if (url) {
        // HTTP/SSE server - Codex uses 'url' field
        config.url = url;
      } else {
        // stdio server
        config.command = serverConfig.command;
        config.args = serverConfig.args || [];
      }

      tomlData.mcp_servers[serverName] = config;
    }

    return stringifyTOML(tomlData);
  }
}
