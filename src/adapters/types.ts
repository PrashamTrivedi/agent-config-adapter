import { AgentFormat, ConfigType } from '../domain/types';

export interface FormatAdapter {
  // Convert from source format to target format
  convert(content: string, sourceFormat: AgentFormat, targetFormat: AgentFormat, type: ConfigType): string;

  // Validate if content matches expected format
  validate(content: string, format: AgentFormat, type: ConfigType): boolean;
}
