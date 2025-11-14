import { icons } from './icons';

export function layout(title: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Agent Config Adapter</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          :root {
            /* Neural Lab Color System */
            --bg-primary: #0a0e1a;
            --bg-secondary: #111827;
            --bg-tertiary: #1a2332;
            --bg-elevated: #202938;
            --bg-overlay: #0f1419;

            /* Neural Cyan - Primary (cognitive processing) */
            --accent-primary: #06b6d4;
            --accent-hover: #22d3ee;
            --accent-glow: rgba(6, 182, 212, 0.15);

            /* Transform Amber (configuration/conversion) */
            --accent-amber: #f59e0b;
            --accent-amber-glow: rgba(245, 158, 11, 0.15);

            /* AI Violet (LLM intelligence) */
            --accent-violet: #8b5cf6;
            --accent-violet-glow: rgba(139, 92, 246, 0.15);

            /* Success Teal */
            --success: #14b8a6;
            --success-glow: rgba(20, 184, 166, 0.15);

            /* Data Blue */
            --accent-blue: #3b82f6;

            /* Agent Identity Colors */
            --agent-claude: #e67e22;
            --agent-gemini: #8b5cf6;
            --agent-codex: #06b6d4;

            /* Text Hierarchy */
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --text-tertiary: #64748b;
            --text-muted: #475569;

            /* Borders */
            --border-dim: #1e293b;
            --border-medium: #334155;
            --border-light: #475569;
            --border-accent: #06b6d4;

            /* Status Colors */
            --danger: #ef4444;
            --danger-hover: #f87171;
            --warning: #f59e0b;

            /* Specialized Backgrounds */
            --pre-bg: #0f1419;
            --input-bg: #0f1419;
            --input-border: #1e293b;
            --input-focus: #06b6d4;
            --badge-bg: rgba(6, 182, 212, 0.1);
            --badge-text: #06b6d4;

            /* Shadows & Glows */
            --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
            --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
            --shadow-lg: 0 10px 24px rgba(0, 0, 0, 0.5);
            --shadow-xl: 0 20px 40px rgba(0, 0, 0, 0.6);
            --glow-cyan: 0 0 20px rgba(6, 182, 212, 0.3);
            --glow-violet: 0 0 20px rgba(139, 92, 246, 0.3);
            --glow-amber: 0 0 20px rgba(245, 158, 11, 0.3);
          }

          body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--bg-primary);
            max-width: 1400px;
            margin: 0 auto;
            padding: 0;
            font-size: 15px;
            font-weight: 400;
            letter-spacing: 0.01em;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            position: relative;
            overflow-x: hidden;
          }

          /* Neural Network Background Pattern */
          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image:
              radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(6, 182, 212, 0.02) 0%, transparent 50%);
            pointer-events: none;
            z-index: 0;
          }

          /* Neural Mesh Pattern (subtle node connections) */
          body::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image:
              linear-gradient(90deg, rgba(6, 182, 212, 0.02) 1px, transparent 1px),
              linear-gradient(0deg, rgba(6, 182, 212, 0.02) 1px, transparent 1px);
            background-size: 100px 100px;
            pointer-events: none;
            z-index: 0;
            opacity: 0.3;
          }

          header {
            background: rgba(17, 24, 39, 0.9);
            border-bottom: 1px solid var(--border-accent);
            box-shadow: 0 4px 16px rgba(6, 182, 212, 0.1);
            padding: 20px 40px;
            margin-bottom: 32px;
            position: sticky;
            top: 0;
            z-index: 1000;
            backdrop-filter: blur(12px) saturate(180%);
            -webkit-backdrop-filter: blur(12px) saturate(180%);
          }

          .header-container {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 32px;
            flex-wrap: wrap;
          }

          .header-logo {
            display: flex;
            align-items: center;
            gap: 14px;
            text-decoration: none;
            color: var(--text-primary);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
          }

          .header-logo:hover {
            transform: translateY(-1px);
          }

          .header-logo .icon {
            filter: drop-shadow(0 2px 8px rgba(6, 182, 212, 0.4));
            transition: filter 0.3s ease;
          }

          .header-logo:hover .icon {
            filter: drop-shadow(0 2px 12px rgba(139, 92, 246, 0.6));
          }

          h1 {
            font-size: 1.5em;
            font-weight: 700;
            margin: 0;
            color: var(--text-primary);
            letter-spacing: -0.02em;
            font-family: 'Bricolage Grotesque', sans-serif;
            background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-violet) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          h2, h3 {
            margin-top: 28px;
            margin-bottom: 14px;
            color: var(--text-primary);
            font-weight: 600;
            letter-spacing: -0.02em;
            font-family: 'Bricolage Grotesque', sans-serif;
          }

          h2 {
            font-size: 1.85em;
            line-height: 1.3;
            border-left: 4px solid var(--accent-primary);
            padding-left: 18px;
            position: relative;
          }

          h2::before {
            content: '';
            position: absolute;
            left: -4px;
            top: 0;
            bottom: 0;
            width: 4px;
            background: linear-gradient(180deg, var(--accent-primary) 0%, var(--accent-violet) 100%);
            border-radius: 2px;
          }

          h3 {
            font-size: 1.3em;
            line-height: 1.4;
            color: var(--text-secondary);
            font-weight: 600;
          }

          nav {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
          }

          nav a {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            color: var(--text-tertiary);
            text-decoration: none;
            border-radius: 8px;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 0.9em;
            font-weight: 500;
            position: relative;
            overflow: hidden;
            border: 1px solid transparent;
            background: transparent;
            font-family: 'Outfit', sans-serif;
          }

          nav a::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
            opacity: 0;
            transition: opacity 0.25s ease;
          }

          nav a:hover {
            color: var(--text-primary);
            background: var(--bg-elevated);
            border-color: var(--border-dim);
            transform: translateY(-1px);
          }

          nav a:hover::before {
            opacity: 1;
          }

          nav a.active {
            color: var(--accent-primary);
            background: var(--bg-elevated);
            border: 1px solid var(--border-accent);
            box-shadow: 0 0 12px rgba(6, 182, 212, 0.2);
          }

          nav a.active::before {
            opacity: 1;
          }

          main {
            padding: 0 40px 40px 40px;
            position: relative;
            z-index: 1;
          }

          @media (max-width: 768px) {
            header {
              padding: 16px 20px;
            }

            .header-container {
              flex-direction: column;
              gap: 16px;
              align-items: flex-start;
            }

            nav {
              width: 100%;
              justify-content: flex-start;
            }

            nav a {
              font-size: 0.9em;
              padding: 6px 12px;
            }

            main {
              padding: 0 20px 20px 20px;
            }
          }

          .config-list {
            list-style: none;
          }

          .config-list li {
            border: 1px solid var(--border-dim);
            border-left: 4px solid var(--accent-primary);
            background: var(--bg-secondary);
            margin-bottom: 14px;
            padding: 22px;
            border-radius: 8px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }

          .config-list li::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, var(--accent-primary) 0%, var(--accent-violet) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .config-list li:hover {
            background: var(--bg-tertiary);
            border-color: var(--border-medium);
            border-left-color: var(--accent-primary);
            box-shadow: var(--shadow-md), 0 0 24px rgba(6, 182, 212, 0.1);
            transform: translateY(-2px);
          }

          .config-list li:hover::before {
            opacity: 1;
          }

          .config-list a {
            color: var(--accent-primary);
            text-decoration: none;
            transition: color 0.2s ease;
          }

          .config-list a:hover {
            color: var(--accent-hover);
          }

          .btn {
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-violet) 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            margin-right: 10px;
            margin-bottom: 10px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 600;
            font-size: 0.9em;
            box-shadow: var(--shadow-sm), var(--glow-cyan);
            position: relative;
            overflow: hidden;
            font-family: 'Outfit', sans-serif;
          }

          .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.5s ease;
          }

          .btn:hover {
            background: linear-gradient(135deg, var(--accent-hover) 0%, var(--accent-violet) 100%);
            transform: translateY(-2px);
            box-shadow: var(--shadow-md), var(--glow-cyan);
          }

          .btn:hover::before {
            left: 100%;
          }

          .btn:active {
            transform: translateY(0);
            box-shadow: var(--shadow-sm);
          }

          .btn-secondary {
            background: var(--bg-elevated);
            border: 1px solid var(--border-dim);
            color: var(--text-primary);
            box-shadow: var(--shadow-sm);
          }

          .btn-secondary:hover {
            background: var(--bg-tertiary);
            border-color: var(--border-light);
            box-shadow: var(--shadow-md);
          }

          .btn-danger {
            background: var(--danger);
            color: white;
            border: none;
          }

          .btn-danger:hover {
            background: var(--danger-hover);
            box-shadow: var(--shadow-md);
          }

          form {
            margin-top: 20px;
          }

          .form-group {
            margin-bottom: 20px;
          }

          label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.95em;
            letter-spacing: -0.01em;
          }

          input, select, textarea {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid var(--input-border);
            border-radius: 6px;
            font-family: 'IBM Plex Mono', monospace;
            background: var(--input-bg);
            color: var(--text-primary);
            transition: all 0.2s ease;
            font-size: 0.9em;
          }

          input:hover, select:hover, textarea:hover {
            border-color: var(--border-light);
          }

          input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: var(--input-focus);
            box-shadow: 0 0 0 3px var(--accent-glow);
            background: var(--bg-secondary);
          }

          textarea {
            min-height: 200px;
            font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
            font-size: 0.9em;
            line-height: 1.6;
            resize: vertical;
          }

          pre {
            background: var(--pre-bg);
            border: 1px solid var(--border-dim);
            border-left: 3px solid var(--accent-primary);
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 16px 0;
            color: var(--text-secondary);
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85em;
            line-height: 1.6;
            box-shadow: var(--shadow-sm);
          }

          .badge {
            display: inline-block;
            padding: 4px 10px;
            background: var(--badge-bg);
            color: var(--badge-text);
            border-radius: 6px;
            font-size: 0.8em;
            margin-left: 8px;
            font-weight: 600;
            border: 1px solid var(--border-accent);
            font-family: 'JetBrains Mono', monospace;
            letter-spacing: 0.02em;
          }

          /* Agent Identity Badges */
          .badge-claude {
            background: rgba(230, 126, 34, 0.15);
            color: var(--agent-claude);
            border-color: var(--agent-claude);
          }

          .badge-gemini {
            background: rgba(139, 92, 246, 0.15);
            color: var(--agent-gemini);
            border-color: var(--agent-gemini);
          }

          .badge-codex {
            background: rgba(6, 182, 212, 0.15);
            color: var(--agent-codex);
            border-color: var(--agent-codex);
          }

          .badge-config {
            background: rgba(245, 158, 11, 0.15);
            color: var(--accent-amber);
            border-color: var(--accent-amber);
          }

          p {
            color: var(--text-secondary);
            margin-bottom: 12px;
            line-height: 1.7;
          }

          ul {
            color: var(--text-secondary);
            line-height: 1.7;
          }

          code {
            background: var(--bg-elevated);
            padding: 3px 6px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.88em;
            border: 1px solid var(--border-dim);
            color: var(--accent-blue);
          }

          /* Filter Controls Styling */
          .filter-container {
            background: var(--bg-secondary);
            border: 1px solid var(--border-accent);
            border-radius: 10px;
            padding: 24px;
            margin: 24px 0;
            box-shadow: 0 0 20px rgba(6, 182, 212, 0.08);
          }

          .filter-row {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            align-items: flex-end;
          }

          .filter-group {
            display: flex;
            flex-direction: column;
            min-width: 200px;
            flex: 1;
          }

          .filter-group label {
            font-size: 0.875em;
            margin-bottom: 5px;
            color: var(--text-secondary);
          }

          .filter-group input,
          .filter-group select {
            width: 100%;
          }

          .filter-group input::placeholder {
            color: var(--text-secondary);
            opacity: 0.6;
          }

          .active-filters {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid var(--border-color);
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
          }

          .filter-badge {
            display: inline-block;
            padding: 4px 10px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            border-radius: 12px;
            font-size: 0.875em;
            font-weight: 500;
          }

          .no-results {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 20px;
            text-align: center;
            color: var(--text-secondary);
            font-style: italic;
            margin-top: 20px;
          }

          /* Responsive Design */
          @media (max-width: 768px) {
            .filter-row {
              flex-direction: column;
            }

            .filter-group {
              width: 100%;
              min-width: unset;
            }
          }

          /* Slash Command Converter Styles */
          .converter-form {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 20px;
          }

          .analysis-info {
            background: rgba(88, 166, 255, 0.1);
            border: 1px solid rgba(88, 166, 255, 0.3);
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
          }

          .analysis-info p {
            color: var(--text-primary);
            margin-bottom: 5px;
          }

          .analysis-info ul {
            color: var(--text-secondary);
          }

          .analysis-info li {
            margin: 5px 0;
          }

          .result-success {
            border: 2px solid #238636;
            padding: 20px;
            border-radius: 6px;
            background: rgba(35, 134, 54, 0.1);
            margin-top: 20px;
          }

          .result-success h3 {
            color: #3fb950;
            margin-top: 0;
          }

          .result-needs-input {
            border: 2px solid #d29922;
            padding: 20px;
            border-radius: 6px;
            background: rgba(210, 153, 34, 0.1);
            margin-top: 20px;
          }

          .result-needs-input .warning {
            color: #f0b72f;
            font-weight: 500;
            margin-bottom: 10px;
          }

          .converted-content {
            margin-top: 20px;
          }

          .output-textarea {
            font-family: 'Monaco', 'Courier New', monospace;
            width: 100%;
            resize: vertical;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            padding: 12px;
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 0.9em;
            line-height: 1.5;
            cursor: text;
            min-height: 300px;
          }

          .output-textarea:focus {
            outline: none;
            border-color: var(--accent-primary);
          }

          .help-text {
            display: block;
            margin-top: 5px;
            font-size: 0.875em;
            color: var(--text-secondary);
            font-style: italic;
          }

          /* ===== LOADING STATES ===== */
          .skeleton {
            background: linear-gradient(
              90deg,
              var(--bg-secondary) 25%,
              var(--bg-tertiary) 50%,
              var(--bg-secondary) 75%
            );
            background-size: 200% 100%;
            animation: skeleton-loading 1.5s ease-in-out infinite;
            border-radius: 6px;
            min-height: 20px;
          }

          .skeleton-card {
            height: 100px;
            margin-bottom: 10px;
          }

          .skeleton-text {
            height: 16px;
            margin-bottom: 8px;
            width: 100%;
          }

          .skeleton-text.short {
            width: 60%;
          }

          @keyframes skeleton-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }

          .spinner {
            border: 3px solid var(--bg-elevated);
            border-top: 3px solid var(--accent-primary);
            border-right: 3px solid var(--accent-violet);
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: neural-spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            display: inline-block;
            vertical-align: middle;
            margin-right: 8px;
            box-shadow: 0 0 12px rgba(6, 182, 212, 0.3);
          }

          .spinner-large {
            width: 48px;
            height: 48px;
            border-width: 4px;
          }

          @keyframes neural-spin {
            0% {
              transform: rotate(0deg);
              box-shadow: 0 0 12px rgba(6, 182, 212, 0.3);
            }
            50% {
              transform: rotate(180deg);
              box-shadow: 0 0 16px rgba(139, 92, 246, 0.4);
            }
            100% {
              transform: rotate(360deg);
              box-shadow: 0 0 12px rgba(6, 182, 212, 0.3);
            }
          }

          .progress-bar {
            width: 100%;
            height: 8px;
            background: var(--bg-tertiary);
            border-radius: 4px;
            overflow: hidden;
            position: relative;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
          }

          .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-violet) 100%);
            transition: width 0.3s ease;
            box-shadow: 0 0 12px rgba(6, 182, 212, 0.5);
          }

          .progress-bar.indeterminate .progress-bar-fill {
            width: 40%;
            background: linear-gradient(90deg,
              transparent 0%,
              var(--accent-primary) 30%,
              var(--accent-violet) 50%,
              var(--accent-primary) 70%,
              transparent 100%
            );
            animation: neural-flow 1.5s ease-in-out infinite;
          }

          @keyframes neural-flow {
            0% {
              transform: translateX(-100%);
              box-shadow: 0 0 12px rgba(6, 182, 212, 0.3);
            }
            50% {
              box-shadow: 0 0 16px rgba(139, 92, 246, 0.5);
            }
            100% {
              transform: translateX(350%);
              box-shadow: 0 0 12px rgba(6, 182, 212, 0.3);
            }
          }

          .btn-loading {
            opacity: 0.7;
            cursor: not-allowed;
            position: relative;
          }

          .btn-loading::before {
            content: '';
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            border: 2px solid transparent;
            border-top: 2px solid currentColor;
            border-radius: 50%;
            width: 14px;
            height: 14px;
            animation: spin 0.8s linear infinite;
          }

          .htmx-request .htmx-indicator {
            display: inline-block !important;
          }

          .htmx-indicator {
            display: none;
          }

          /* ===== TOAST NOTIFICATIONS ===== */
          .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
          }

          .toast {
            background: var(--bg-elevated);
            border: 1px solid var(--border-light);
            border-radius: 8px;
            padding: 16px;
            box-shadow: var(--shadow-lg);
            display: flex;
            align-items: flex-start;
            gap: 12px;
            animation: toast-in 0.3s ease-out;
            position: relative;
            min-width: 320px;
            font-family: 'IBM Plex Mono', monospace;
          }

          .toast.toast-out {
            animation: toast-out 0.3s ease-in forwards;
          }

          .toast-success {
            border-left: 3px solid var(--success);
          }

          .toast-error {
            border-left: 3px solid var(--danger);
          }

          .toast-warning {
            border-left: 3px solid var(--warning);
          }

          .toast-info {
            border-left: 3px solid var(--accent-blue);
          }

          .toast-icon {
            font-size: 20px;
            line-height: 1;
            flex-shrink: 0;
          }

          .toast-content {
            flex: 1;
          }

          .toast-title {
            font-weight: 600;
            margin-bottom: 4px;
            color: var(--text-primary);
          }

          .toast-message {
            font-size: 0.9em;
            color: var(--text-secondary);
            margin: 0;
          }

          .toast-close {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 20px;
            line-height: 1;
            padding: 0;
            margin-left: auto;
            flex-shrink: 0;
          }

          .toast-close:hover {
            color: var(--text-primary);
          }

          @keyframes toast-in {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          @keyframes toast-out {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(400px);
              opacity: 0;
            }
          }

          /* ===== ANIMATIONS & TRANSITIONS ===== */
          .fade-in {
            animation: fade-in 0.4s ease-out;
          }

          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .slide-up {
            animation: slide-up 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }

          @keyframes slide-up {
            from {
              transform: translateY(24px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          .scale-in {
            animation: scale-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }

          @keyframes scale-in {
            from {
              transform: scale(0.92);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }

          /* Neural Data Pulse */
          .data-pulse {
            animation: data-pulse 2s ease-in-out infinite;
          }

          @keyframes data-pulse {
            0%, 100% {
              box-shadow: 0 0 8px rgba(6, 182, 212, 0.3);
            }
            50% {
              box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
            }
          }

          /* ===== ICON SYSTEM ===== */
          .icon {
            width: 18px;
            height: 18px;
            stroke: currentColor;
            fill: none;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
            flex-shrink: 0;
          }

          .icon-lg {
            width: 28px;
            height: 28px;
            stroke: currentColor;
            fill: none;
            stroke-width: 1.5;
            stroke-linecap: round;
            stroke-linejoin: round;
            flex-shrink: 0;
          }

          .header-logo .icon-lg {
            stroke: var(--accent-primary);
          }

          nav a .icon {
            transition: all 0.25s ease;
          }

          nav a:hover .icon,
          nav a.active .icon {
            filter: drop-shadow(0 0 4px currentColor);
          }

          /* ===== CARD ENHANCEMENTS ===== */
          .card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-dim);
            border-radius: 12px;
            padding: 24px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }

          .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-violet) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .card-hover:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-md), 0 0 24px rgba(6, 182, 212, 0.15);
            border-color: var(--border-accent);
            background: var(--bg-tertiary);
          }

          .card-hover:hover::before {
            opacity: 1;
          }

          .card-interactive {
            cursor: pointer;
          }

          .card-interactive:active {
            transform: translateY(-1px);
          }

          /* ===== STATUS INDICATORS ===== */
          .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 500;
            font-family: 'IBM Plex Mono', monospace;
          }

          .status-success {
            background: rgba(61, 214, 140, 0.15);
            color: var(--success);
            border: 1px solid rgba(61, 214, 140, 0.3);
          }

          .status-error {
            background: rgba(248, 81, 73, 0.15);
            color: var(--danger);
            border: 1px solid rgba(248, 81, 73, 0.3);
          }

          .status-warning {
            background: rgba(245, 158, 11, 0.15);
            color: var(--warning);
            border: 1px solid rgba(245, 158, 11, 0.3);
          }

          .status-info {
            background: rgba(96, 165, 250, 0.15);
            color: var(--accent-blue);
            border: 1px solid rgba(96, 165, 250, 0.3);
          }

          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
          }

          .status-success .status-dot {
            background: #3fb950;
          }

          .status-error .status-dot {
            background: var(--danger);
          }

          .status-warning .status-dot {
            background: #d29922;
          }

          .status-info .status-dot {
            background: var(--accent-primary);
          }

          /* ===== MICRO-INTERACTIONS ===== */
          .ripple {
            position: relative;
            overflow: hidden;
          }

          .ripple::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
          }

          .ripple:active::after {
            width: 300px;
            height: 300px;
          }

          .copy-btn {
            position: relative;
            transition: all 0.2s ease;
          }

          .copy-btn.copied {
            background: #3fb950 !important;
          }

          .copy-btn.copied::after {
            content: '✓ Copied!';
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-tertiary);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            white-space: nowrap;
            animation: fade-in 0.2s ease-out;
          }

          /* ===== ENHANCED FORMS ===== */
          .form-field-error {
            border-color: var(--danger) !important;
          }

          .form-error-message {
            color: var(--danger);
            font-size: 0.875em;
            margin-top: 4px;
            display: none;
          }

          .form-field-error + .form-error-message {
            display: block;
            animation: slide-up 0.2s ease-out;
          }

          .char-count {
            font-size: 0.875em;
            color: var(--text-secondary);
            text-align: right;
            margin-top: 4px;
          }

          .char-count.limit-warning {
            color: #d29922;
          }

          .char-count.limit-exceeded {
            color: var(--danger);
          }

          /* ===== RESPONSIVE ENHANCEMENTS ===== */
          @media (max-width: 640px) {
            .toast-container {
              right: 10px;
              left: 10px;
              max-width: none;
            }

            .toast {
              min-width: unset;
            }
          }

          /* ===== ACCESSIBILITY ===== */
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
          }

          *:focus-visible {
            outline: 2px solid var(--accent-primary);
            outline-offset: 2px;
          }

          /* ===== MODAL/OVERLAY ===== */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(13, 17, 23, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9998;
            animation: fade-in 0.2s ease-out;
            backdrop-filter: blur(8px);
          }

          .modal {
            background: var(--bg-secondary);
            border: 1px solid var(--border-light);
            border-radius: 12px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: scale-in 0.3s ease-out;
            box-shadow: var(--shadow-xl);
          }

          .modal-header {
            padding: 20px;
            border-bottom: 1px solid var(--border-dim);
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .modal-title {
            margin: 0;
            color: var(--text-primary);
          }

          .modal-body {
            padding: 20px;
          }

          .modal-footer {
            padding: 20px;
            border-top: 1px solid var(--border-color);
            display: flex;
            justify-content: flex-end;
            gap: 10px;
          }
        </style>
      </head>
      <body>
        <div id="toast-container" class="toast-container"></div>
        <header>
          <div class="header-container">
            <a href="/" class="header-logo">
              <svg class="icon icon-lg" viewBox="0 0 24 24">
                <path d="M21.5 2v6m-19-6v6m9-9v22m-8 2h16a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-16a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2z"/>
                <circle cx="12" cy="12" r="3"/>
                <path d="m8 16-1.5 1.5M16 16l1.5 1.5M8 8 6.5 6.5M16 8l1.5-1.5"/>
              </svg>
              <h1>Agent Config Adapter</h1>
            </a>
            <nav>
              <a href="/" class="${title === 'Home' ? 'active' : ''}">
                ${icons.home('icon')}
                <span>Home</span>
              </a>
              <a href="/configs" class="${title === 'Configs' || title === 'Config Detail' || title === 'Edit Config' || title === 'New Config' ? 'active' : ''}">
                ${icons.file('icon')}
                <span>Configs</span>
              </a>
              <a href="/slash-commands/convert" class="${title === 'Slash Command Converter' ? 'active' : ''}">
                ${icons.repeat('icon')}
                <span>Converter</span>
              </a>
              <a href="/skills" class="${title === 'Skills' || title === 'Skill Detail' || title === 'Edit Skill' || title === 'New Skill' ? 'active' : ''}">
                ${icons.star('icon')}
                <span>Skills</span>
              </a>
              <a href="/extensions" class="${title === 'Extensions' || title === 'Extension Detail' || title === 'Edit Extension' || title === 'New Extension' ? 'active' : ''}">
                ${icons.package('icon')}
                <span>Extensions</span>
              </a>
              <a href="/marketplaces" class="${title === 'Marketplaces' || title === 'Marketplace Detail' || title === 'Edit Marketplace' || title === 'New Marketplace' ? 'active' : ''}">
                ${icons.grid('icon')}
                <span>Marketplaces</span>
              </a>
              <a href="/mcp/info" class="${title === 'MCP Server' || title === 'MCP Info' ? 'active' : ''}">
                ${icons.link('icon')}
                <span>MCP</span>
              </a>
            </nav>
          </div>
        </header>
        <main>
          ${content}
        </main>
        <script>
          // ===== TOAST NOTIFICATION SYSTEM =====
          window.showToast = function(message, type = 'info', duration = 5000) {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = \`toast toast-\${type}\`;

            const icons = {
              success: '✓',
              error: '✗',
              warning: '⚠',
              info: 'ℹ'
            };

            const titles = {
              success: 'Success',
              error: 'Error',
              warning: 'Warning',
              info: 'Info'
            };

            toast.innerHTML = \`
              <span class="toast-icon" role="img" aria-label="\${type}">\${icons[type] || 'ℹ'}</span>
              <div class="toast-content">
                <div class="toast-title">\${titles[type]}</div>
                <p class="toast-message">\${message}</p>
              </div>
              <button class="toast-close" aria-label="Close" onclick="this.parentElement.remove()">×</button>
            \`;

            container.appendChild(toast);

            if (duration > 0) {
              setTimeout(() => {
                toast.classList.add('toast-out');
                setTimeout(() => toast.remove(), 300);
              }, duration);
            }
          };

          // ===== LOADING STATE MANAGEMENT =====
          window.setLoading = function(elementId, isLoading) {
            const element = document.getElementById(elementId);
            if (!element) return;

            if (isLoading) {
              element.classList.add('btn-loading');
              element.disabled = true;
            } else {
              element.classList.remove('btn-loading');
              element.disabled = false;
            }
          };

          // ===== FORM VALIDATION =====
          window.validateForm = function(formElement) {
            const inputs = formElement.querySelectorAll('input[required], textarea[required], select[required]');
            let isValid = true;

            inputs.forEach(input => {
              const errorMsg = input.nextElementSibling;

              if (!input.value.trim()) {
                input.classList.add('form-field-error');
                if (errorMsg && errorMsg.classList.contains('form-error-message')) {
                  errorMsg.textContent = 'This field is required';
                }
                isValid = false;
              } else {
                input.classList.remove('form-field-error');
              }
            });

            return isValid;
          };

          // Clear validation errors on input
          document.addEventListener('input', function(e) {
            if (e.target.matches('input, textarea, select')) {
              e.target.classList.remove('form-field-error');
            }
          });

          // ===== COPY TO CLIPBOARD WITH FEEDBACK =====
          window.copyToClipboard = async function(text, button) {
            try {
              await navigator.clipboard.writeText(text);

              if (button) {
                const originalText = button.textContent;
                button.classList.add('copied');
                button.textContent = '✓ Copied!';

                setTimeout(() => {
                  button.classList.remove('copied');
                  button.textContent = originalText;
                }, 2000);
              }

              window.showToast('Copied to clipboard', 'success', 2000);
            } catch (err) {
              window.showToast('Failed to copy to clipboard', 'error');
            }
          };

          // ===== CHARACTER COUNT FOR TEXTAREAS =====
          window.addCharCount = function(textareaId, maxLength) {
            const textarea = document.getElementById(textareaId);
            if (!textarea) return;

            const counter = document.createElement('div');
            counter.className = 'char-count';
            counter.id = textareaId + '-count';
            textarea.parentNode.insertBefore(counter, textarea.nextSibling);

            const updateCount = () => {
              const length = textarea.value.length;
              counter.textContent = \`\${length}\${maxLength ? ' / ' + maxLength : ''} characters\`;

              if (maxLength) {
                counter.classList.toggle('limit-warning', length > maxLength * 0.9);
                counter.classList.toggle('limit-exceeded', length > maxLength);
              }
            };

            textarea.addEventListener('input', updateCount);
            updateCount();
          };

          // ===== HTMX EVENT HANDLERS =====
          document.addEventListener('htmx:beforeRequest', function(evt) {
            // Show loading indicator for the element making the request
            const target = evt.target;
            if (target.classList.contains('btn')) {
              target.classList.add('btn-loading');
              target.disabled = true;
            }
          });

          document.addEventListener('htmx:afterRequest', function(evt) {
            // Hide loading indicator
            const target = evt.target;
            if (target.classList.contains('btn')) {
              target.classList.remove('btn-loading');
              target.disabled = false;
            }

            // Show success/error toasts based on response
            if (evt.detail.successful) {
              const successMsg = target.getAttribute('data-success-message');
              if (successMsg) {
                window.showToast(successMsg, 'success');
              }
            } else {
              const errorMsg = target.getAttribute('data-error-message') || 'Request failed';
              window.showToast(errorMsg, 'error');
            }
          });

          document.addEventListener('htmx:afterSettle', function(evt) {
            // Add fade-in animation to newly loaded content
            const newContent = evt.target;
            if (newContent && newContent.children.length > 0) {
              Array.from(newContent.children).forEach(child => {
                if (child.classList.contains('config-list') || child.classList.contains('card')) {
                  child.classList.add('fade-in');
                }
              });
            }
          });

          // ===== KEYBOARD SHORTCUTS =====
          document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + K: Focus search input
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
              e.preventDefault();
              const searchInput = document.querySelector('input[type="search"], input[name="name"]');
              if (searchInput) searchInput.focus();
            }

            // Escape: Close modals
            if (e.key === 'Escape') {
              const modals = document.querySelectorAll('.modal-overlay');
              modals.forEach(modal => modal.remove());
            }
          });

          // ===== DEBOUNCE UTILITY =====
          window.debounce = function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
              const later = () => {
                clearTimeout(timeout);
                func(...args);
              };
              clearTimeout(timeout);
              timeout = setTimeout(later, wait);
            };
          };

          // ===== AUTO-SAVE INDICATOR =====
          window.showAutoSaving = function() {
            const indicator = document.getElementById('autosave-indicator') || (() => {
              const div = document.createElement('div');
              div.id = 'autosave-indicator';
              div.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999;';
              document.body.appendChild(div);
              return div;
            })();

            indicator.innerHTML = '<span class="status-indicator status-info"><span class="spinner"></span> Saving...</span>';
            indicator.style.display = 'block';
          };

          window.showAutoSaved = function() {
            const indicator = document.getElementById('autosave-indicator');
            if (!indicator) return;

            indicator.innerHTML = '<span class="status-indicator status-success"><span class="status-dot"></span> Saved</span>';

            setTimeout(() => {
              indicator.style.display = 'none';
            }, 2000);
          };

          // ===== CONFIRMATION DIALOGS =====
          window.confirmAction = function(message, onConfirm) {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = \`
              <div class="modal">
                <div class="modal-header">
                  <h3 class="modal-title">Confirm Action</h3>
                </div>
                <div class="modal-body">
                  <p>\${message}</p>
                </div>
                <div class="modal-footer">
                  <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                  <button class="btn btn-danger" id="confirm-btn">Confirm</button>
                </div>
              </div>
            \`;

            document.body.appendChild(overlay);

            overlay.querySelector('#confirm-btn').addEventListener('click', function() {
              overlay.remove();
              onConfirm();
            });

            overlay.addEventListener('click', function(e) {
              if (e.target === overlay) {
                overlay.remove();
              }
            });
          };
        </script>
      </body>
    </html>
  `;
}
