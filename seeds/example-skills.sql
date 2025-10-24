-- Example skill configs demonstrating skills feature
-- Skills are format-specific and NOT convertible between formats

-- Example Claude Code skill with YAML frontmatter
INSERT INTO configs (id, name, type, original_format, content) VALUES
('skill-claude-pdf', 'PDF Processing', 'skill', 'claude_code', '---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
license: Apache-2.0
allowed_tools:
  - Read
  - Bash
  - Write
---

# PDF Processing Skill

## Overview
This skill provides comprehensive PDF manipulation capabilities using Python libraries.

## Instructions

### 1. Text Extraction
Use pdfplumber to extract text from PDFs:
```bash
pip install pdfplumber
python -c "import pdfplumber; pdf = pdfplumber.open(''file.pdf''); print(pdf.pages[0].extract_text())"
```

### 2. Table Extraction
Use tabula-py for extracting tables:
```bash
pip install tabula-py
python -c "import tabula; df = tabula.read_pdf(''file.pdf'', pages=''all''); print(df)"
```

### 3. Form Filling
Use PyPDF2 to fill form fields:
```bash
pip install PyPDF2
python -c "from PyPDF2 import PdfReader, PdfWriter; # Fill form logic here"
```

## Examples

**Extract text from first page:**
```
Read the PDF at /path/to/file.pdf and extract all text from the first page.
```

**Extract tables:**
```
Find all tables in report.pdf and convert them to CSV format.
```

## Advanced Features
See reference documentation for more details on advanced PDF operations.
');

-- Example Gemini skill (simplified format)
INSERT INTO configs (id, name, type, original_format, content) VALUES
('skill-gemini-code-review', 'Code Review Helper', 'skill', 'gemini', '# Code Review Helper Skill

## Description
Automated code review assistant that checks for common issues, style violations, and potential bugs.

## Instructions

When the user asks for a code review:

1. **Read the code** - Use Read tool to access the files
2. **Check for common issues:**
   - Unused variables
   - Missing error handling
   - Security vulnerabilities
   - Performance bottlenecks
3. **Provide structured feedback** with severity levels
4. **Suggest improvements** with code examples

## Usage Examples

**Basic review:**
```
Review the code in src/api/users.ts
```

**Focused review:**
```
Check src/auth.ts for security issues
```

## Output Format

Always structure feedback as:
- **Critical**: Must fix before merge
- **Warning**: Should address soon
- **Suggestion**: Nice to have improvements
');

-- Example Codex skill
INSERT INTO configs (id, name, type, original_format, content) VALUES
('skill-codex-testing', 'Test Generation', 'skill', 'codex', '# Test Generation Skill

## Description
Automatically generate unit tests for functions and classes based on their implementation.

## Instructions

When asked to generate tests:

1. Analyze the function/class signature
2. Identify edge cases and normal cases
3. Generate comprehensive test cases using the project''s test framework
4. Include:
   - Happy path tests
   - Edge cases (null, empty, boundary values)
   - Error cases
   - Mock dependencies when needed

## Framework Detection

Auto-detect test framework from project:
- Jest (package.json has jest)
- Vitest (package.json has vitest)
- Pytest (requirements.txt has pytest)
- Go test (*.go files)

## Example Usage

```
Generate tests for the calculateTotal function in src/utils.ts
```

## Output

Generate complete test file with:
- Imports
- Test suite setup
- Individual test cases
- Teardown if needed
');
