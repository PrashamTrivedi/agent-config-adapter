import type { ConfigFormat } from '@domain/config';

export type Adapter = (input: string) => string;

interface AdapterKey {
  from: ConfigFormat;
  to: ConfigFormat;
}

const adapterKey = ({ from, to }: AdapterKey): string => `${from}::${to}`;

class AdapterRegistry {
  private adapters = new Map<string, Adapter>();

  register(from: ConfigFormat, to: ConfigFormat, adapter: Adapter): void {
    if (from === to) {
      throw new Error('Use passthrough for identical formats');
    }

    this.adapters.set(adapterKey({ from, to }), adapter);
  }

  convert(from: ConfigFormat, to: ConfigFormat, input: string): string {
    if (from === to) {
      return input;
    }

    const adapter = this.adapters.get(adapterKey({ from, to }));

    if (!adapter) {
      throw new Error(`No adapter registered for ${from} -> ${to}`);
    }

    return adapter(input);
  }

  supportedTargets(from: ConfigFormat): ConfigFormat[] {
    return Array.from(this.adapters.keys())
      .filter((key) => key.startsWith(`${from}::`))
      .map((key) => key.split('::')[1] as ConfigFormat);
  }
}

export const adapters = new AdapterRegistry();
