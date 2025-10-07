import type {
  AgentConfig,
  ConfigCreateInput,
  ConfigFormat,
  ConfigUpdateInput,
  ConfigWithConversions,
} from './config';
import type { ConfigRepository } from '@infrastructure/d1Repository';
import type { ConfigCache } from '@infrastructure/kvCache';

import { adapters } from '@adapters/registry';

export class ConfigService {
  constructor(private readonly repository: ConfigRepository, private readonly cache: ConfigCache) {}

  list(): Promise<AgentConfig[]> {
    return this.repository.list();
  }

  get(id: string): Promise<AgentConfig | null> {
    return this.repository.get(id);
  }

  async create(input: ConfigCreateInput): Promise<AgentConfig> {
    return this.repository.create(input);
  }

  async update(id: string, input: ConfigUpdateInput): Promise<AgentConfig | null> {
    const updated = await this.repository.update(id, input);
    if (updated) {
      await this.cache.invalidate(id);
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
    await this.cache.invalidate(id);
  }

  async getWithConversions(config: AgentConfig): Promise<ConfigWithConversions> {
    const formats: ConfigFormat[] = ['claude_code', 'codex_agents', 'jules_manifest'];
    const conversions: Record<ConfigFormat, string> = {
      claude_code: '',
      codex_agents: '',
      jules_manifest: '',
    };

    conversions[config.originalFormat] = config.content;

    await Promise.all(
      formats
        .filter((format) => format !== config.originalFormat)
        .map(async (format) => {
          const cached = await this.cache.get(config.id, format);
          if (cached) {
            conversions[format] = cached;
            return;
          }

          const converted = adapters.convert(config.originalFormat, format, config.content);
          conversions[format] = converted;
          await this.cache.put(config.id, format, converted);
        })
    );

    return {
      ...config,
      conversions,
    };
  }
}
