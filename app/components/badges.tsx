import { Badge } from '@/components/ui/badge';
import { formatLabel } from '@/lib/utils';

export function FormatBadge({ format }: { format: string }) {
  const tone = format === 'claude_code' ? 'claude' : format === 'gemini' ? 'violet' : 'cyan';
  return <Badge tone={tone}>{formatLabel(format)}</Badge>;
}

export function TypeBadge({ type }: { type: string }) {
  return <Badge tone="fog">{type.replaceAll('_', ' ')}</Badge>;
}
