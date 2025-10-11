import { AgentFormat, ConfigType } from '../domain/types';
import { FormatAdapter } from './types';
import { SlashCommandAdapter } from './slash-command-adapter';

// Factory to get appropriate adapter based on config type
export function getAdapter(type: ConfigType): FormatAdapter {
  switch (type) {
    case 'slash_command':
      return new SlashCommandAdapter();
    case 'agent_definition':
      // For MVP, we'll use a simple passthrough
      return new PassthroughAdapter();
    case 'mcp_config':
      // For MVP, we'll use a simple passthrough
      return new PassthroughAdapter();
    default:
      throw new Error(`Unsupported config type: ${type}`);
  }
}

// Simple passthrough adapter for types not yet implemented
class PassthroughAdapter implements FormatAdapter {
  convert(content: string, _sourceFormat: AgentFormat, _targetFormat: AgentFormat): string {
    return content;
  }

  validate(_content: string, _format: AgentFormat): boolean {
    return true;
  }
}

export { FormatAdapter } from './types';
export { SlashCommandAdapter } from './slash-command-adapter';
