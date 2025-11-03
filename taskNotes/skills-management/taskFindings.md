# Purpose

Implement comprehensive skills management system with multi-file support, gist-like editing, and ZIP upload/download functionality for AI coding agent skills.

## Original Ask

Skills have following structure:

One SKILLS.md file, required And then one or more files working as companion

Let's have a functionality to create/update existing skills as gist like view or a zip upload to upload additional files.

We would also like to make sure it's downloaded properly. Downloaded zip should not have different zip for skills. But they should also respect the uploaded files.

## Complexity and the reason behind it

**Complexity Score: 4/5**

**Reasoning:**
- Requires new database schema and migration (skill_files table)
- Multi-file management system similar to extensions but skill-specific
- ZIP upload/download with validation and file structure preservation
- Gist-like UI for editing main SKILL.md and companion files
- Integration with existing R2 storage and file generation services
- Updates to manifest generation for multi-file skills
- Extensive testing (REST API, file operations, ZIP handling, UI)
- Multiple services need coordination (Skills, FileStorage, ZipGeneration)

The task is not trivial but follows established patterns from extensions system. The main complexity comes from:
1. Multi-file coordination and validation
2. ZIP handling (upload parsing, download generation)
3. UI for gist-like editing experience
4. Ensuring backward compatibility with existing single-file skills

## Architectural changes required

### Database Schema Changes

**New Tables:**

1. **skill_files table** - Store metadata for skill companion files
   ```sql
   CREATE TABLE skill_files (
     id TEXT PRIMARY KEY,
     skill_id TEXT NOT NULL,  -- References configs.id where type='skill'
     file_path TEXT NOT NULL,  -- Relative path (e.g., "FORMS.md", "utils.js")
     r2_key TEXT NOT NULL,     -- R2 storage key
     file_size INTEGER,
     mime_type TEXT,
     created_at TEXT NOT NULL,
     FOREIGN KEY (skill_id) REFERENCES configs(id) ON DELETE CASCADE
   );

   CREATE INDEX idx_skill_files_skill_id ON skill_files(skill_id);
   CREATE UNIQUE INDEX idx_skill_files_skill_path ON skill_files(skill_id, file_path);
   ```

**R2 Storage Structure:**
- Main skill content: Stored in `configs.content` (SKILL.md content)
- Companion files: Stored in R2 at `skills/{skill_id}/files/{file_path}`
- Generated plugin files: `extensions/{extension_id}/{format}/skills/{skill_name}/`

### Service Layer Changes

**New Services:**

1. **SkillsService** - Business logic for skills management
   - `createSkill(input)` - Create skill with main content
   - `updateSkill(skillId, input)` - Update skill metadata/content
   - `getSkillWithFiles(skillId)` - Get skill with all companion files
   - `deleteSkill(skillId)` - Delete skill and all files
   - `uploadSkillFiles(skillId, files)` - Add companion files
   - `deleteSkillFile(skillId, fileId)` - Remove companion file
   - `getSkillFile(skillId, fileId)` - Get file metadata/content

2. **SkillZipService** - Handle ZIP operations
   - `parseUploadedZip(zipBuffer)` - Extract and validate ZIP structure
   - `generateSkillZip(skillId)` - Create downloadable ZIP
   - `validateSkillStructure(files)` - Ensure SKILL.md exists

**Updated Services:**

1. **FileGenerationService** - Update skill file generation
   - Modify `generateSkillFile()` to include companion files
   - Generate proper directory structure: `skills/{skill-name}/SKILL.md` + companions

2. **ManifestService** - Update manifests to reference skill files
   - Claude Code: List skill file paths in manifest
   - Gemini: Include skill references with file structure

### Repository Layer Changes

**New Repository:**

1. **SkillFilesRepository** - Database operations for skill_files table
   - CRUD operations for skill files metadata
   - Batch operations for multiple files

### Infrastructure Changes

**R2 Bucket Structure:**
- Extend `EXTENSION_FILES` bucket to also store skill files
- Pattern: `skills/{skill_id}/files/{file_path}`
- Keep existing `extensions/{extension_id}/...` pattern

**No changes to:**
- KV cache (CONFIG_CACHE) - continues to cache format conversions
- AI Gateway integration - skills use passthrough (no AI conversion)

## Backend changes required

### 1. Database Migration

**File:** `migrations/0006_add_skill_files.sql`

```sql
-- Create skill_files table for multi-file skill support
CREATE TABLE skill_files (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (skill_id) REFERENCES configs(id) ON DELETE CASCADE
);

CREATE INDEX idx_skill_files_skill_id ON skill_files(skill_id);
CREATE UNIQUE INDEX idx_skill_files_skill_path ON skill_files(skill_id, file_path);
```

### 2. Domain Types

**File:** `src/domain/types.ts`

Add new types:

```typescript
// Skill file metadata
export interface SkillFile {
  id: string;
  skill_id: string;
  file_path: string;
  r2_key: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

// Skill with files
export interface SkillWithFiles extends Config {
  type: 'skill';
  files: SkillFile[];
}

// Skill file upload input
export interface UploadSkillFileInput {
  skill_id: string;
  file_path: string;
  content: ArrayBuffer | ReadableStream;
  mime_type?: string;
}

// ZIP upload structure
export interface SkillZipStructure {
  skillContent: string;  // SKILL.md content
  companionFiles: Array<{
    path: string;
    content: ArrayBuffer;
    mimeType: string;
  }>;
}
```

### 3. Repository Layer

**New File:** `src/infrastructure/skill-files-repository.ts`

```typescript
export class SkillFilesRepository {
  constructor(private db: D1Database) {}

  async create(input: CreateSkillFileInput): Promise<SkillFile>
  async findById(id: string): Promise<SkillFile | null>
  async findBySkillId(skillId: string): Promise<SkillFile[]>
  async findBySkillIdAndPath(skillId: string, path: string): Promise<SkillFile | null>
  async delete(id: string): Promise<boolean>
  async deleteBySkillId(skillId: string): Promise<void>
}
```

### 4. Service Layer

**New File:** `src/services/skills-service.ts`

```typescript
export class SkillsService {
  constructor(
    private env: { DB: D1Database; EXTENSION_FILES: R2Bucket }
  ) {}

  // Core CRUD
  async createSkill(input: CreateConfigInput): Promise<Config>
  async getSkillWithFiles(skillId: string): Promise<SkillWithFiles | null>
  async updateSkill(skillId: string, input: UpdateConfigInput): Promise<Config>
  async deleteSkill(skillId: string): Promise<boolean>

  // File management
  async uploadCompanionFile(skillId: string, file: UploadSkillFileInput): Promise<SkillFile>
  async uploadCompanionFiles(skillId: string, files: UploadSkillFileInput[]): Promise<SkillFile[]>
  async getCompanionFile(skillId: string, fileId: string): Promise<R2ObjectBody | null>
  async deleteCompanionFile(skillId: string, fileId: string): Promise<boolean>
  async listCompanionFiles(skillId: string): Promise<SkillFile[]>

  // ZIP operations
  async uploadFromZip(zipBuffer: ArrayBuffer, metadata: CreateConfigInput): Promise<SkillWithFiles>
  async downloadAsZip(skillId: string): Promise<ArrayBuffer>
}
```

**New File:** `src/services/skill-zip-service.ts`

```typescript
export class SkillZipService {
  // Parse uploaded ZIP
  async parseZip(zipBuffer: ArrayBuffer): Promise<SkillZipStructure>

  // Validate structure (SKILL.md must exist)
  validateStructure(structure: SkillZipStructure): boolean

  // Generate ZIP for download
  async generateZip(skill: SkillWithFiles, r2: R2Bucket): Promise<ArrayBuffer>
}
```

**Update:** `src/services/file-generation-service.ts`

Modify `generateSkillFile()` method:

```typescript
private async generateSkillFile(config: Config): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];

  // Main SKILL.md file
  files.push({
    path: 'SKILL.md',
    content: config.content,
    mimeType: 'text/markdown'
  });

  // Add companion files if this is a multi-file skill
  const skillFiles = await this.skillFilesRepo.findBySkillId(config.id);
  for (const file of skillFiles) {
    const content = await this.r2.get(file.r2_key);
    if (content) {
      files.push({
        path: file.file_path,
        content: await content.text(),
        mimeType: file.mime_type || 'application/octet-stream'
      });
    }
  }

  return files;
}
```

### 5. REST API Routes

**New File:** `src/routes/skills.ts`

```typescript
// Skills CRUD
GET    /api/skills                    // List all skills
GET    /api/skills/:id                // Get skill with files
POST   /api/skills                    // Create skill (JSON or form-data)
POST   /api/skills/upload-zip         // Create skill from ZIP
PUT    /api/skills/:id                // Update skill metadata/content
DELETE /api/skills/:id                // Delete skill and all files

// Skill files management
GET    /api/skills/:id/files          // List all companion files
POST   /api/skills/:id/files          // Upload companion file(s)
GET    /api/skills/:id/files/:fileId  // Download companion file
DELETE /api/skills/:id/files/:fileId  // Delete companion file

// Skill download
GET    /api/skills/:id/download       // Download skill as ZIP
```

**Update:** `src/index.ts`

```typescript
import { skillsRouter } from './routes/skills';

// Mount routes
app.route('/api/skills', skillsRouter);
app.route('/skills', skillsRouter);  // UI routes
```

### 6. Request/Response Handling

**ZIP Upload:**
- Accept `multipart/form-data` with ZIP file
- Parse ZIP using `fflate` library (already in dependencies)
- Validate SKILL.md exists at root
- Extract and store companion files to R2
- Create skill config in database

**ZIP Download:**
- Fetch skill content and all companion files from R2
- Generate ZIP with proper structure:
  ```
  skill-name.zip
  ├── SKILL.md          (main content)
  ├── FORMS.md          (companion)
  ├── utils/
  │   └── helper.js     (companion)
  └── examples/
      └── demo.md       (companion)
  ```

**Gist View Data:**
- Return skill with all file contents
- Format for multi-tab editor UI

### 7. Integration Points

**With Extensions:**
- When extension includes a skill config, plugin generation should include all companion files
- Update `FileGenerationService.generateClaudeCodeFiles()` and `generateGeminiFiles()`

**With Manifests:**
- Claude Code manifest should list skill directory with all files
- Gemini manifest should reference skill with files

### 8. Validation Rules

1. **SKILL.md is required** - Cannot create skill without main content
2. **File path uniqueness** - No duplicate file paths per skill
3. **File size limits** - Max 10MB per file, max 50MB total per skill
4. **File name restrictions** - No special characters, proper extensions
5. **ZIP structure validation** - SKILL.md must be at root level

### 9. Error Handling

- `400 Bad Request` - Missing SKILL.md, invalid ZIP structure
- `404 Not Found` - Skill or file not found
- `409 Conflict` - Duplicate file path
- `413 Payload Too Large` - File size exceeds limits
- `500 Internal Server Error` - R2 upload failures

### 10. Caching Strategy

**No caching changes needed:**
- Skills use passthrough conversion (no AI)
- File content served directly from R2
- KV cache only used for format conversions (not applicable to skills)

## Frontend changes required

### 1. Skills Management UI

**New File:** `src/views/skills.ts`

**Pages:**

1. **List View** (`/skills`)
   - Table with skill name, format, file count, created date
   - Actions: Edit, Download ZIP, Delete
   - Button: "Create New Skill"

2. **Create/Edit View** (`/skills/new`, `/skills/:id/edit`)
   - **Gist-like multi-file editor:**
     - Tab interface for files
     - Main tab: "SKILL.md" (required, not deletable)
     - Additional tabs for companion files
     - "Add File" button to create new tabs
   - Form fields:
     - Name (text input)
     - Format (dropdown: claude_code, gemini, codex)
     - Description (textarea)
   - File editor for each tab:
     - File name input (editable for new files)
     - Code/markdown editor (textarea with syntax highlighting if possible)
     - Delete button (for companion files only)
   - ZIP upload option:
     - File upload input
     - "Upload ZIP" button
     - Auto-populates editor tabs with ZIP contents
   - Actions: "Save", "Cancel"

3. **Detail View** (`/skills/:id`)
   - Display skill metadata
   - Show all files with content preview
   - Download ZIP button
   - Edit button
   - Delete button

### 2. HTMX Integration

Follow existing pattern from configs/extensions:

```html
<!-- List view with HTMX -->
<button
  hx-get="/skills/:id/edit"
  hx-target="#main-content"
  hx-swap="innerHTML">
  Edit
</button>

<!-- Form submission -->
<form
  hx-post="/api/skills"
  hx-encoding="multipart/form-data"
  hx-target="#main-content">
  <!-- Form fields -->
</form>

<!-- File upload -->
<input
  type="file"
  name="companion_files"
  multiple
  hx-post="/api/skills/:id/files"
  hx-trigger="change">
```

### 3. File Upload UI

**ZIP Upload Interface:**
```html
<div class="upload-section">
  <input type="file" accept=".zip" id="skill-zip" name="skill_zip">
  <button type="button" onclick="uploadZip()">Upload ZIP</button>
  <p class="help-text">
    ZIP must contain SKILL.md at root level.
    Companion files will be preserved in their directory structure.
  </p>
</div>
```

**Multi-file Editor Interface:**
```html
<div class="file-tabs">
  <div class="tab active" data-file="SKILL.md">SKILL.md *</div>
  <div class="tab" data-file="FORMS.md">FORMS.md</div>
  <button class="add-tab">+ Add File</button>
</div>

<div class="file-editors">
  <div class="editor" data-file="SKILL.md">
    <textarea name="skill_content" required>...</textarea>
  </div>
  <div class="editor" data-file="FORMS.md" style="display:none">
    <input type="text" name="file_path_1" value="FORMS.md">
    <textarea name="file_content_1">...</textarea>
    <button class="delete-file">Delete</button>
  </div>
</div>
```

### 4. JavaScript for Editor

**Minimal JS for tab switching and file management:**
```javascript
// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // Hide all editors
    // Show selected editor
    // Update active tab
  });
});

// Add new file tab
document.querySelector('.add-tab').addEventListener('click', () => {
  // Create new tab
  // Create new editor
  // Switch to new tab
});

// Delete file
document.querySelectorAll('.delete-file').forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove tab and editor
  });
});

// ZIP upload
async function uploadZip() {
  const file = document.getElementById('skill-zip').files[0];
  // Upload ZIP
  // Parse response
  // Populate editor tabs with files
}
```

### 5. Styling

**Follow existing CSS patterns:**
- Use same `.btn`, `.form-group`, `.table` classes
- Add new classes:
  - `.file-tabs` - Tab bar styling
  - `.tab` - Individual tab style
  - `.editor` - Editor container
  - `.upload-section` - ZIP upload area

### 6. Navigation Updates

**Update home page** (`src/index.ts`):
```html
<a href="/skills" class="btn">Browse Skills</a>
```

**Update navigation menu** (if exists in layout):
```html
<nav>
  <a href="/configs">Configs</a>
  <a href="/extensions">Extensions</a>
  <a href="/skills">Skills</a>
  <a href="/marketplaces">Marketplaces</a>
</nav>
```

### 7. Form Handling

**Create Skill Form:**
- Standard form submission with HTMX
- Support both JSON and multipart/form-data
- Multiple file inputs for companion files
- Client-side validation (SKILL.md required)

**Edit Skill Form:**
- Pre-populate with existing skill data
- Load all companion files into tabs
- Support adding/deleting files
- Update existing files

### 8. Download Interface

**Download button:**
```html
<a
  href="/api/skills/:id/download"
  download="skill-name.zip"
  class="btn">
  Download ZIP
</a>
```

### 9. Validation Feedback

**Client-side validation:**
- Ensure SKILL.md tab exists and has content
- Validate file names (no special chars)
- Check file sizes before upload

**Server-side error display:**
```html
<div class="error-message" style="display:none">
  <!-- Error text from server -->
</div>
```

### 10. Responsive Design

- Tables should scroll horizontally on mobile
- Tab interface should work on small screens
- File editor should be full-width on mobile

## Acceptance Criteria

1. **Database and Storage:**
   - [ ] Migration creates `skill_files` table successfully
   - [ ] Skill files stored in R2 at `skills/{skill_id}/files/{file_path}`
   - [ ] Foreign key cascade deletes work (deleting skill deletes files)

2. **REST API:**
   - [ ] Create skill via JSON with content field
   - [ ] Create skill via ZIP upload with validation
   - [ ] Upload companion files (single and multiple)
   - [ ] Download skill as ZIP with all files
   - [ ] Update skill content and metadata
   - [ ] Delete skill removes all files from R2 and DB
   - [ ] List skills shows file count
   - [ ] Get skill returns all companion files

3. **ZIP Handling:**
   - [ ] Parse uploaded ZIP correctly
   - [ ] Validate SKILL.md exists at root
   - [ ] Extract companion files preserving directory structure
   - [ ] Generate downloadable ZIP with proper structure
   - [ ] No nested ZIPs in downloads
   - [ ] Uploaded files preserved in downloads

4. **UI - Gist-like Editor:**
   - [ ] Tab interface for multiple files
   - [ ] SKILL.md tab always present and required
   - [ ] Add/delete companion file tabs
   - [ ] Switch between tabs shows correct editor
   - [ ] File name editable for new files
   - [ ] Delete button only on companion files, not SKILL.md

5. **UI - ZIP Upload:**
   - [ ] File input accepts .zip files
   - [ ] Upload button triggers parsing
   - [ ] Successful upload populates editor tabs
   - [ ] Error messages for invalid ZIP structure
   - [ ] Shows progress/loading during upload

6. **UI - Forms:**
   - [ ] Create form accepts skill metadata and content
   - [ ] Edit form pre-populates existing skill data
   - [ ] Form validation (required fields, file sizes)
   - [ ] Success/error messages after submission
   - [ ] Redirect to skill detail after creation

7. **Integration:**
   - [ ] Skills with files correctly generated in plugin downloads
   - [ ] Extension plugin ZIPs include skill directories with all files
   - [ ] Marketplace downloads include complete skills
   - [ ] Manifests reference skill files correctly

8. **Validation:**
   - [ ] Cannot create skill without SKILL.md
   - [ ] Cannot create duplicate file paths per skill
   - [ ] File size limits enforced (10MB per file, 50MB total)
   - [ ] Invalid file names rejected
   - [ ] ZIP without SKILL.md rejected

9. **Error Handling:**
   - [ ] 400 for missing SKILL.md or invalid ZIP
   - [ ] 404 for non-existent skills/files
   - [ ] 409 for duplicate file paths
   - [ ] 413 for oversized files
   - [ ] 500 with proper logging for R2 failures

10. **Testing:**
    - [ ] Unit tests for SkillsService
    - [ ] Unit tests for SkillZipService
    - [ ] Integration tests for skills routes
    - [ ] Test ZIP parsing and generation
    - [ ] Test file upload/download
    - [ ] Test cascade deletes
    - [ ] Test validation rules

## Validation

### Backend Testing

**1. Unit Tests (`tests/services/skills-service.test.ts`):**
```bash
npm test -- skills-service
```

Test cases:
- Create skill with content
- Get skill with files
- Upload companion files
- Delete skill cascades to files
- Update skill content

**2. Integration Tests (`tests/routes/skills.test.ts`):**
```bash
npm test -- routes/skills
```

Test cases:
- POST /api/skills (JSON)
- POST /api/skills/upload-zip (multipart)
- GET /api/skills/:id
- PUT /api/skills/:id
- DELETE /api/skills/:id
- POST /api/skills/:id/files
- GET /api/skills/:id/download

**3. ZIP Handling Tests (`tests/services/skill-zip-service.test.ts`):**
```bash
npm test -- skill-zip-service
```

Test cases:
- Parse valid ZIP with SKILL.md
- Reject ZIP without SKILL.md
- Handle nested directories
- Generate downloadable ZIP
- Preserve file structure

### API Testing (Manual)

**1. Create Skill (JSON):**
```bash
curl -X POST http://localhost:8787/api/skills \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Skill",
    "type": "skill",
    "original_format": "claude_code",
    "content": "# Test Skill\n\nThis is a test skill."
  }'
```

**Expected:** 201 Created with skill object

**2. Upload ZIP:**
```bash
curl -X POST http://localhost:8787/api/skills/upload-zip \
  -F "skill_zip=@test-skill.zip" \
  -F "name=ZIP Skill" \
  -F "original_format=claude_code"
```

**Expected:** 201 Created with skill object containing files array

**3. Upload Companion File:**
```bash
curl -X POST http://localhost:8787/api/skills/{SKILL_ID}/files \
  -F "file_path=FORMS.md" \
  -F "file_content=@FORMS.md"
```

**Expected:** 201 Created with file metadata

**4. Download Skill ZIP:**
```bash
curl -X GET http://localhost:8787/api/skills/{SKILL_ID}/download \
  -o skill-download.zip
```

**Expected:** 200 OK with valid ZIP file

**5. Verify ZIP Contents:**
```bash
unzip -l skill-download.zip
```

**Expected Output:**
```
Archive:  skill-download.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
      123  2025-01-15 10:00   SKILL.md
       45  2025-01-15 10:00   FORMS.md
       78  2025-01-15 10:00   utils/helper.js
---------                     -------
      246                     3 files
```

### UI Testing (Manual)

**1. Navigate to Skills:**
- Go to http://localhost:8787/skills
- Verify list of skills displayed
- Check file count column shows correct number

**2. Create New Skill:**
- Click "Create New Skill" button
- Fill in name and select format
- Enter content in SKILL.md tab
- Click "Add File" button
- Enter file name and content in new tab
- Click "Save"
- Verify redirect to skill detail page

**3. Upload ZIP:**
- Go to "Create New Skill"
- Use ZIP upload section
- Select test-skill.zip file
- Click "Upload ZIP"
- Verify editor tabs populated with ZIP contents
- Verify SKILL.md tab shows content
- Verify companion file tabs created
- Click "Save"

**4. Edit Skill:**
- From skills list, click "Edit" on a skill
- Verify all tabs populated with existing files
- Modify SKILL.md content
- Add new companion file
- Delete existing companion file
- Click "Save"
- Verify changes persisted

**5. Download Skill:**
- From skill detail page, click "Download ZIP"
- Verify ZIP file downloads
- Extract ZIP and verify structure
- Check SKILL.md and companion files present

### Integration Testing

**1. Extension with Skills:**
```bash
# Create extension with skill configs
curl -X POST http://localhost:8787/api/extensions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Extension",
    "version": "1.0.0",
    "config_ids": ["skill-id-1", "skill-id-2"]
  }'

# Download extension plugin
curl -X GET http://localhost:8787/plugins/{EXTENSION_ID}/claude_code/download \
  -o extension-plugin.zip

# Verify ZIP structure
unzip -l extension-plugin.zip
```

**Expected:** Skills directory with all skill files present

**2. Marketplace with Skills:**
```bash
# Download marketplace with extensions containing skills
curl -X GET http://localhost:8787/plugins/marketplaces/{MARKETPLACE_ID}/download?format=claude_code \
  -o marketplace-bundle.zip

# Verify structure
unzip -l marketplace-bundle.zip
```

**Expected:** All skill directories with complete file sets

### Error Cases Testing

**1. Upload ZIP without SKILL.md:**
```bash
curl -X POST http://localhost:8787/api/skills/upload-zip \
  -F "skill_zip=@invalid-skill.zip"
```

**Expected:** 400 Bad Request with error message

**2. Duplicate File Path:**
```bash
curl -X POST http://localhost:8787/api/skills/{SKILL_ID}/files \
  -F "file_path=FORMS.md" \
  -F "file_content=@FORMS.md"

# Try to upload same path again
curl -X POST http://localhost:8787/api/skills/{SKILL_ID}/files \
  -F "file_path=FORMS.md" \
  -F "file_content=@FORMS2.md"
```

**Expected:** 409 Conflict on second request

**3. Oversized File:**
```bash
# Create 15MB file
dd if=/dev/zero of=large.bin bs=1M count=15

curl -X POST http://localhost:8787/api/skills/{SKILL_ID}/files \
  -F "file_path=large.bin" \
  -F "file_content=@large.bin"
```

**Expected:** 413 Payload Too Large

### Performance Testing

**1. Large ZIP Upload:**
- Create ZIP with 20 files, total 40MB
- Upload and measure time
- Verify all files stored correctly

**2. Large Skill Download:**
- Create skill with 30 companion files
- Download as ZIP and measure time
- Verify ZIP contains all files

**3. Concurrent Operations:**
- Upload multiple files simultaneously
- Verify no race conditions or data corruption

### Test Coverage

Run test coverage:
```bash
npm test -- --run --coverage
```

**Target coverage:**
- Overall: >= 80%
- SkillsService: >= 90%
- SkillZipService: >= 90%
- Skills routes: >= 85%

### Validation Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] API manual tests pass
- [ ] UI manual tests pass
- [ ] Integration tests pass
- [ ] Error cases handled correctly
- [ ] Performance acceptable (< 5s for 50MB ZIP)
- [ ] Test coverage meets targets
- [ ] No regressions in existing functionality
- [ ] Documentation updated (CLAUDE.md, README.md)
