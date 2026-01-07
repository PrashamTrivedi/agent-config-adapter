import { Hono } from 'hono';
import { FileStorageService } from '../services';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  EMAIL_SUBSCRIPTIONS: KVNamespace;
  EXTENSION_FILES: R2Bucket;
};

export const filesRouter = new Hono<{ Bindings: Bindings }>();

// List files for an extension
filesRouter.get('/extensions/:extensionId', async (c) => {
  const extensionId = c.req.param('extensionId');
  const service = new FileStorageService(c.env);

  try {
    const files = await service.listExtensionFiles(extensionId);
    return c.json({ files });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Upload file to extension
filesRouter.post('/extensions/:extensionId', async (c) => {
  const extensionId = c.req.param('extensionId');

  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get('file');
  const filePathParam = formData.get('file_path');

  if (!file || typeof file === 'string') {
    return c.json({ error: 'File is required and must be a file upload' }, 400);
  }

  const filePath = (filePathParam as string) || (file as File).name;

  const service = new FileStorageService(c.env);

  try {
    // Get file content as ArrayBuffer
    const uploadedFile = file as File;
    const fileContent = await uploadedFile.arrayBuffer();

    const fileMetadata = await service.uploadFile(extensionId, filePath, fileContent, {
      mimeType: uploadedFile.type,
    });

    return c.json({ file: fileMetadata }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get file metadata
filesRouter.get('/:fileId', async (c) => {
  const fileId = c.req.param('fileId');
  const service = new FileStorageService(c.env);

  try {
    const fileMetadata = await service.getFileMetadata(fileId);
    if (!fileMetadata) {
      return c.json({ error: 'File not found' }, 404);
    }

    return c.json({ file: fileMetadata });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Download file
filesRouter.get('/:fileId/download', async (c) => {
  const fileId = c.req.param('fileId');
  const service = new FileStorageService(c.env);

  try {
    const fileContent = await service.getFileContent(fileId);
    if (!fileContent) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Get file metadata for content type
    const metadata = await service.getFileMetadata(fileId);

    // Set response headers
    const headers: Record<string, string> = {
      'Content-Type': metadata?.mime_type || 'application/octet-stream',
    };

    if (metadata?.file_path) {
      const fileName = metadata.file_path.split('/').pop() || 'download';
      headers['Content-Disposition'] = `attachment; filename="${fileName}"`;
    }

    // Stream the file content
    return new Response(fileContent.body, {
      headers,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Delete file
filesRouter.delete('/:fileId', async (c) => {
  const fileId = c.req.param('fileId');
  const service = new FileStorageService(c.env);

  try {
    const success = await service.deleteFile(fileId);
    if (!success) {
      return c.json({ error: 'File not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get signed download URL
filesRouter.get('/:fileId/signed-url', async (c) => {
  const fileId = c.req.param('fileId');
  const expiresIn = parseInt(c.req.query('expires_in') || '3600', 10);

  const service = new FileStorageService(c.env);

  try {
    const signedUrl = await service.getSignedDownloadUrl(fileId, expiresIn);
    if (!signedUrl) {
      return c.json({ error: 'File not found' }, 404);
    }

    return c.json({ signed_url: signedUrl, expires_in: expiresIn });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
