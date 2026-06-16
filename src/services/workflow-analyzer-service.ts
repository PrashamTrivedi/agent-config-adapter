import { WorkflowMetadata, WorkflowPhase } from '../domain/types';

/**
 * WorkflowAnalyzerService
 *
 * Extracts descriptive metadata from a Claude Code workflow file. Workflows are
 * single self-contained JS files that begin with a pure object literal:
 *
 *   export const meta = {
 *     name: 'my-workflow',
 *     description: '…',
 *     whenToUse: '…',
 *     phases: [ { title: 'Scan', detail: '…' }, { title: 'Fix' } ],
 *   }
 *   // orchestration logic follows…
 *
 * Parsing is intentionally TOLERANT and local (no AI, no `eval` — Cloudflare
 * Workers forbid dynamic code execution). It uses string-aware brace/bracket
 * matching plus regex field extraction. If anything cannot be read, the workflow
 * is still considered storable: `analyze()` returns `metadataUnreadable: true`
 * and never throws.
 */
export class WorkflowAnalyzerService {
  analyze(content: string): WorkflowMetadata {
    try {
      const metaObj = this.extractMetaObject(content);
      if (metaObj === null) {
        return { phases: [], metadataUnreadable: true };
      }

      const description = this.extractStringField(metaObj, 'description');
      const whenToUse = this.extractStringField(metaObj, 'whenToUse');
      const phases = this.extractPhases(metaObj);

      // If we found the meta block but could extract nothing useful, still treat
      // it as readable (an intentionally sparse meta is valid).
      return {
        description,
        phases,
        whenToUse,
        metadataUnreadable: false,
      };
    } catch (error) {
      console.error('[WorkflowAnalyzer] Metadata extraction failed:', error);
      return { phases: [], metadataUnreadable: true };
    }
  }

  /**
   * Locate `export const meta = { … }` and return the object literal substring
   * (including the surrounding braces). String-aware so braces inside string
   * values don't throw off the depth count. Returns null if not found/unbalanced.
   */
  private extractMetaObject(content: string): string | null {
    const declRe = /export\s+const\s+meta\s*=\s*\{/;
    const m = declRe.exec(content);
    if (!m) return null;

    const braceStart = content.indexOf('{', m.index);
    if (braceStart === -1) return null;

    const end = this.findMatching(content, braceStart, '{', '}');
    if (end === -1) return null;

    return content.slice(braceStart, end + 1);
  }

  /**
   * Given the index of an opening delimiter, return the index of its matching
   * closing delimiter, skipping over string literals ('...', "...", `...`) and
   * escaped characters. Returns -1 when unbalanced.
   */
  private findMatching(text: string, openIdx: number, open: string, close: string): number {
    let depth = 0;
    let inStr: string | null = null;

    for (let i = openIdx; i < text.length; i++) {
      const ch = text[i];

      if (inStr) {
        if (ch === '\\') {
          i++; // skip escaped char
          continue;
        }
        if (ch === inStr) inStr = null;
        continue;
      }

      if (ch === '"' || ch === "'" || ch === '`') {
        inStr = ch;
        continue;
      }

      if (ch === open) {
        depth++;
      } else if (ch === close) {
        depth--;
        if (depth === 0) return i;
      }
    }

    return -1;
  }

  /**
   * Extract a string value for `key` from an object-literal substring.
   * Respects the actual quote character and backslash escapes. Returns undefined
   * if the key is absent or its value isn't a string literal.
   */
  private extractStringField(objText: string, key: string): string | undefined {
    // Key must be at an object boundary (start, after `{`, `,`, or whitespace)
    // to avoid matching a longer key that ends with `key`.
    const re = new RegExp(`(?:^|[,{\\s])${key}\\s*:\\s*(['"\`])`);
    const m = re.exec(objText);
    if (!m) return undefined;

    const quote = m[1];
    const start = m.index + m[0].length; // first char after the opening quote
    let result = '';

    for (let i = start; i < objText.length; i++) {
      const ch = objText[i];
      if (ch === '\\') {
        const next = objText[i + 1];
        if (next !== undefined) result += next;
        i++;
        continue;
      }
      if (ch === quote) {
        const trimmed = result.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }
      result += ch;
    }

    return undefined; // unterminated string
  }

  /**
   * Extract the `phases` array as a list of {title, detail}. Tolerant: phases
   * missing a title are skipped; a missing/unparsable array yields [].
   */
  private extractPhases(objText: string): WorkflowPhase[] {
    const m = /(?:^|[,{\s])phases\s*:\s*\[/.exec(objText);
    if (!m) return [];

    const bracketStart = objText.indexOf('[', m.index);
    if (bracketStart === -1) return [];

    const bracketEnd = this.findMatching(objText, bracketStart, '[', ']');
    if (bracketEnd === -1) return [];

    const arrText = objText.slice(bracketStart + 1, bracketEnd);
    const phases: WorkflowPhase[] = [];

    // Walk each `{ … }` phase object within the array.
    let i = 0;
    while (i < arrText.length) {
      if (arrText[i] === '{') {
        const objEnd = this.findMatching(arrText, i, '{', '}');
        if (objEnd === -1) break;
        const phaseText = arrText.slice(i, objEnd + 1);
        const title = this.extractStringField(phaseText, 'title');
        if (title) {
          const detail = this.extractStringField(phaseText, 'detail');
          phases.push(detail ? { title, detail } : { title });
        }
        i = objEnd + 1;
      } else {
        i++;
      }
    }

    return phases;
  }
}
