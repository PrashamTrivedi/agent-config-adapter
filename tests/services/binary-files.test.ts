import { describe, it, expect, beforeEach } from 'vitest';
import { SkillZipService } from '../../src/services/skill-zip-service';
import { createMockR2Bucket } from '../test-utils';
import type { SkillWithFiles } from '../../src/domain/types';

describe('Binary File Preservation', () => {
  let mockR2: R2Bucket;
  let zipService: SkillZipService;

  beforeEach(() => {
    mockR2 = createMockR2Bucket();
    zipService = new SkillZipService();
  });

  it('should preserve binary files without UTF-8 corruption in ZIP downloads', async () => {
    // Create a binary file (PNG-like header)
    const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    // Mock R2 to return binary data
    const mockObject = {
      arrayBuffer: async () => binaryData.buffer,
      text: async () => {
        throw new Error('Should not call .text() on binary files');
      },
    };

    mockR2.get = async () => mockObject as any;

    const skill: SkillWithFiles = {
      id: 'test-skill',
      name: 'Test Skill',
      type: 'skill',
      original_format: 'claude_code',
      content: '# Test Skill',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      files: [
        {
          id: 'file-1',
          skill_id: 'test-skill',
          file_path: 'logo.png',
          r2_key: 'skills/test-skill/files/logo.png',
          file_size: binaryData.length,
          mime_type: 'image/png',
          created_at: new Date().toISOString(),
        },
      ],
    };

    // Generate ZIP
    const zipBytes = await zipService.generateZip(skill, mockR2);

    // Verify ZIP was created
    expect(zipBytes).toBeInstanceOf(Uint8Array);
    expect(zipBytes.length).toBeGreaterThan(0);

    // Verify it starts with ZIP magic number
    expect(zipBytes[0]).toBe(0x50); // 'P'
    expect(zipBytes[1]).toBe(0x4b); // 'K'
  });

  it('should handle text files correctly in ZIPs', async () => {
    const textData = 'Hello, World!';
    const textBytes = new TextEncoder().encode(textData);

    const mockObject = {
      arrayBuffer: async () => textBytes.buffer,
    };

    mockR2.get = async () => mockObject as any;

    const skill: SkillWithFiles = {
      id: 'test-skill-2',
      name: 'Test Skill 2',
      type: 'skill',
      original_format: 'claude_code',
      content: '# Test Skill',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      files: [
        {
          id: 'file-2',
          skill_id: 'test-skill-2',
          file_path: 'FORMS.md',
          r2_key: 'skills/test-skill-2/files/FORMS.md',
          file_size: textBytes.length,
          mime_type: 'text/markdown',
          created_at: new Date().toISOString(),
        },
      ],
    };

    const zipBytes = await zipService.generateZip(skill, mockR2);

    expect(zipBytes).toBeInstanceOf(Uint8Array);
    expect(zipBytes.length).toBeGreaterThan(0);
  });
});
