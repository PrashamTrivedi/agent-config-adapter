import { Hono } from 'hono';
import { SkillsService } from '../services/skills-service';
import { CreateConfigInput, UpdateConfigInput } from '../domain/types';
import { skillsListView, skillDetailView, skillCreateView, skillEditView } from '../views/skills';
import { emailGateMiddleware } from '../middleware/email-gate';

type Bindings = {
  DB: D1Database;
  EXTENSION_FILES: R2Bucket;
  EMAIL_SUBSCRIPTIONS: KVNamespace;
};

export const skillsRouter = new Hono<{ Bindings: Bindings }>();

// List all skills
skillsRouter.get('/', async (c) => {
  const service = new SkillsService(c.env);
  const skills = await service.listSkills();

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ skills });
  }

  return c.html(skillsListView(skills));
});

// Create new skill form (UI)
skillsRouter.get('/new', async (c) => {
  return c.html(skillCreateView());
});

// Edit skill form (UI)
skillsRouter.get('/:id/edit', async (c) => {
  const id = c.req.param('id');
  const service = new SkillsService(c.env);
  const skill = await service.getSkillWithFiles(id);

  if (!skill) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  return c.html(skillEditView(skill));
});

// Get skill with all files
skillsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const service = new SkillsService(c.env);
  const skill = await service.getSkillWithFiles(id);

  if (!skill) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ skill });
  }

  return c.html(skillDetailView(skill));
});

// Create new skill (JSON or form)
skillsRouter.post('/', emailGateMiddleware, async (c) => {
  let body: CreateConfigInput;

  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json<CreateConfigInput>();
  } else {
    const formData = await c.req.parseBody();
    body = {
      name: formData.name as string,
      type: 'skill',
      original_format: (formData.original_format as any) || 'claude_code',
      content: formData.content as string,
    };
  }

  const service = new SkillsService(c.env);

  try {
    const skill = await service.createSkill(body);
    return c.json({ skill }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Upload skill from ZIP (protected by email gate)
skillsRouter.post('/upload-zip', emailGateMiddleware, async (c) => {
  const contentType = c.req.header('Content-Type') || '';

  if (!contentType.includes('multipart/form-data')) {
    return c.json({ error: 'Content-Type must be multipart/form-data' }, 400);
  }

  const formData = await c.req.parseBody();
  const zipFile = formData.skill_zip as File;

  if (!zipFile) {
    return c.json({ error: 'Missing skill_zip file' }, 400);
  }

  // Read ZIP file
  const zipBuffer = await zipFile.arrayBuffer();

  // Metadata from form
  const metadata: CreateConfigInput = {
    name: (formData.name as string) || 'Untitled Skill',
    type: 'skill',
    original_format: (formData.original_format as any) || 'claude_code',
    content: '', // Will be set from ZIP
  };

  const service = new SkillsService(c.env);

  try {
    const skill = await service.uploadFromZip(zipBuffer, metadata);
    return c.json({ skill }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Update skill
skillsRouter.put('/:id', emailGateMiddleware, async (c) => {
  const id = c.req.param('id');
  let body: UpdateConfigInput;

  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json<UpdateConfigInput>();
  } else {
    const formData = await c.req.parseBody();
    body = {
      name: formData.name as string | undefined,
      type: formData.type as any | undefined,
      original_format: formData.original_format as any | undefined,
      content: formData.content as string | undefined,
    };
  }

  const service = new SkillsService(c.env);

  try {
    const skill = await service.updateSkill(id, body);
    if (!skill) {
      return c.json({ error: 'Skill not found' }, 404);
    }
    return c.json({ skill });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Delete skill
skillsRouter.delete('/:id', emailGateMiddleware, async (c) => {
  const id = c.req.param('id');
  const service = new SkillsService(c.env);

  try {
    const success = await service.deleteSkill(id);
    if (!success) {
      return c.json({ error: 'Skill not found' }, 404);
    }
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// List companion files
skillsRouter.get('/:id/files', async (c) => {
  const id = c.req.param('id');
  const service = new SkillsService(c.env);

  try {
    const files = await service.listCompanionFiles(id);
    return c.json({ files });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Upload companion file(s) (protected by email gate)
skillsRouter.post('/:id/files', emailGateMiddleware, async (c) => {
  const id = c.req.param('id');
  const contentType = c.req.header('Content-Type') || '';

  if (!contentType.includes('multipart/form-data')) {
    return c.json({ error: 'Content-Type must be multipart/form-data' }, 400);
  }

  const formData = await c.req.parseBody();
  const service = new SkillsService(c.env);

  try {
    // Support single or multiple file uploads
    const files: Array<{ file_path: string; content: ArrayBuffer; mime_type: string }> = [];

    // Handle single file upload
    if (formData.file_path && formData.file_content) {
      const file = formData.file_content as File;
      const content = await file.arrayBuffer();
      files.push({
        file_path: formData.file_path as string,
        content,
        mime_type: file.type || 'application/octet-stream',
      });
    }

    // Handle multiple files (file_path_N, file_content_N pattern)
    for (let i = 0; i < 100; i++) {
      const pathKey = `file_path_${i}`;
      const contentKey = `file_content_${i}`;

      if (formData[pathKey] && formData[contentKey]) {
        const file = formData[contentKey] as File;
        const content = await file.arrayBuffer();
        files.push({
          file_path: formData[pathKey] as string,
          content,
          mime_type: file.type || 'application/octet-stream',
        });
      }
    }

    if (files.length === 0) {
      return c.json({ error: 'No files provided' }, 400);
    }

    // Upload all files
    const uploadInputs = files.map((f) => ({
      skill_id: id,
      file_path: f.file_path,
      content: f.content,
      mime_type: f.mime_type,
    }));

    const uploadedFiles = await service.uploadCompanionFiles(id, uploadInputs);
    return c.json({ files: uploadedFiles }, 201);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return c.json({ error: 'Skill not found' }, 404);
    }
    if (error.message.includes('already exists')) {
      return c.json({ error: error.message }, 409);
    }
    if (error.message.includes('exceeds maximum size')) {
      return c.json({ error: error.message }, 413);
    }
    return c.json({ error: error.message }, 400);
  }
});

// Get companion file content
skillsRouter.get('/:id/files/:fileId', async (c) => {
  const id = c.req.param('id');
  const fileId = c.req.param('fileId');
  const service = new SkillsService(c.env);

  try {
    const file = await service.getCompanionFile(id, fileId);
    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Stream file content
    return new Response(file.body, {
      headers: {
        'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Length': file.size.toString(),
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Delete companion file
skillsRouter.delete('/:id/files/:fileId', emailGateMiddleware, async (c) => {
  const id = c.req.param('id');
  const fileId = c.req.param('fileId');
  const service = new SkillsService(c.env);

  try {
    const success = await service.deleteCompanionFile(id, fileId);
    if (!success) {
      return c.json({ error: 'File not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Download skill as ZIP
skillsRouter.get('/:id/download', async (c) => {
  const id = c.req.param('id');
  const service = new SkillsService(c.env);

  try {
    const zipData = await service.downloadAsZip(id);

    // Get skill name for filename
    const skill = await service.getSkillWithFiles(id);
    const fileName = skill
      ? `${skill.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.zip`
      : 'skill.zip';

    return new Response(zipData, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': zipData.length.toString(),
      },
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return c.json({ error: 'Skill not found' }, 404);
    }
    return c.json({ error: error.message }, 500);
  }
});
