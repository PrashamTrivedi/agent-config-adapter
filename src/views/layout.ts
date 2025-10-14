export function layout(title: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Agent Config Adapter</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #21262d;
            --border-color: #30363d;
            --text-primary: #e6edf3;
            --text-secondary: #8b949e;
            --accent-primary: #58a6ff;
            --accent-hover: #79c0ff;
            --badge-bg: #1f6feb;
            --badge-text: #ffffff;
            --pre-bg: #161b22;
            --input-bg: #0d1117;
            --input-border: #30363d;
            --danger: #f85149;
            --danger-hover: #da3633;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--bg-primary);
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }

          header {
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 10px;
            margin-bottom: 20px;
          }

          h1 {
            color: var(--accent-primary);
            margin-bottom: 10px;
          }

          h2, h3 {
            margin-top: 20px;
            margin-bottom: 10px;
            color: var(--text-primary);
          }

          nav a {
            display: inline-block;
            margin-right: 15px;
            color: var(--accent-primary);
            text-decoration: none;
            transition: color 0.2s ease;
          }

          nav a:hover {
            color: var(--accent-hover);
            text-decoration: underline;
          }

          .config-list { list-style: none; }

          .config-list li {
            border: 1px solid var(--border-color);
            background: var(--bg-secondary);
            margin-bottom: 10px;
            padding: 15px;
            border-radius: 6px;
            transition: background 0.2s ease;
          }

          .config-list li:hover {
            background: var(--bg-tertiary);
          }

          .config-list a {
            color: var(--accent-primary);
            text-decoration: none;
          }

          .config-list a:hover {
            color: var(--accent-hover);
          }

          .btn {
            display: inline-block;
            padding: 8px 16px;
            background: var(--accent-primary);
            color: var(--badge-text);
            text-decoration: none;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            margin-right: 10px;
            margin-bottom: 10px;
            transition: background 0.2s ease;
            font-weight: 500;
          }

          .btn:hover {
            background: var(--accent-hover);
          }

          .btn-secondary {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
          }

          .btn-secondary:hover {
            background: var(--border-color);
          }

          .btn-danger {
            background: var(--danger);
          }

          .btn-danger:hover {
            background: var(--danger-hover);
          }

          form { margin-top: 20px; }

          .form-group {
            margin-bottom: 15px;
          }

          label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: var(--text-primary);
          }

          input, select, textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--input-border);
            border-radius: 6px;
            font-family: inherit;
            background: var(--input-bg);
            color: var(--text-primary);
            transition: border-color 0.2s ease;
          }

          input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: var(--accent-primary);
          }

          textarea {
            min-height: 200px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }

          pre {
            background: var(--pre-bg);
            border: 1px solid var(--border-color);
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 10px 0;
            color: var(--text-primary);
          }

          .badge {
            display: inline-block;
            padding: 3px 8px;
            background: var(--badge-bg);
            color: var(--badge-text);
            border-radius: 3px;
            font-size: 0.875em;
            margin-left: 8px;
            font-weight: 500;
          }

          p {
            color: var(--text-secondary);
            margin-bottom: 10px;
          }

          ul {
            color: var(--text-secondary);
          }

          code {
            background: var(--bg-secondary);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>Agent Config Adapter</h1>
          <nav>
            <a href="/">Home</a>
            <a href="/configs">Configs</a>
            <a href="/extensions">Extensions</a>
            <a href="/marketplaces">Marketplaces</a>
          </nav>
        </header>
        <main>
          ${content}
        </main>
      </body>
    </html>
  `;
}
