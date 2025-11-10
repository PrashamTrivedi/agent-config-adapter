export function layout(title: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} · Agent Config Adapter</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <style>
          * { box-sizing: border-box; }

          :root {
            color-scheme: dark;
            --bg-primary: #05070f;
            --bg-secondary: #0f172a;
            --bg-tertiary: rgba(30, 41, 59, 0.7);
            --bg-elevated: rgba(30, 41, 59, 0.85);
            --border-color: rgba(148, 163, 184, 0.25);
            --border-strong: rgba(148, 163, 184, 0.45);
            --surface-glow: rgba(59, 130, 246, 0.25);
            --accent-primary: #60a5fa;
            --accent-secondary: #8b5cf6;
            --accent-success: #34d399;
            --accent-warning: #fbbf24;
            --accent-danger: #f87171;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5f5;
            --text-muted: rgba(203, 213, 225, 0.65);
            --badge-bg: rgba(99, 102, 241, 0.18);
            --badge-text: #c7d2fe;
            --shadow-soft: 0 14px 45px rgba(15, 23, 42, 0.35);
            --shadow-strong: 0 18px 60px rgba(15, 23, 42, 0.55);
            --radius-sm: 8px;
            --radius-md: 14px;
            --radius-lg: 22px;
            --transition-fast: 120ms ease;
            --transition-medium: 220ms ease;
            --transition-slow: 420ms cubic-bezier(0.22, 1, 0.36, 1);
            --gradient-bg: radial-gradient(circle at 20% 20%, rgba(96, 165, 250, 0.18), transparent 55%),
              radial-gradient(circle at 80% 0%, rgba(139, 92, 246, 0.18), transparent 45%),
              radial-gradient(circle at 50% 70%, rgba(56, 189, 248, 0.2), transparent 55%);
          }

          body {
            margin: 0;
            min-height: 100vh;
            font-family: "Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            position: relative;
            overflow-x: hidden;
          }

          body::before {
            content: "";
            position: fixed;
            inset: 0;
            background: var(--gradient-bg);
            opacity: 0.9;
            pointer-events: none;
            z-index: 0;
          }

          .app-shell {
            position: relative;
            z-index: 1;
            max-width: 1280px;
            margin: 0 auto;
            padding: 32px clamp(16px, 4vw, 40px) 48px;
          }

          header.app-header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 18px clamp(18px, 4vw, 28px);
            background: linear-gradient(145deg, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.6));
            backdrop-filter: blur(18px);
            box-shadow: var(--shadow-soft);
            position: sticky;
            top: 18px;
            z-index: 5;
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .brand-logo {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: linear-gradient(135deg, rgba(96, 165, 250, 0.35), rgba(79, 70, 229, 0.6));
            display: grid;
            place-items: center;
            color: #fff;
            font-weight: 600;
            letter-spacing: 0.02em;
          }

          .brand h1 {
            font-size: clamp(1.35rem, 2vw, 1.75rem);
            margin: 0;
            letter-spacing: -0.01em;
          }

          nav.primary-nav {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
          }

          nav.primary-nav a {
            position: relative;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 9px 16px;
            border-radius: var(--radius-sm);
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.95rem;
            font-weight: 500;
            transition: all var(--transition-medium);
          }

          nav.primary-nav a::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            border: 1px solid transparent;
            background: linear-gradient(135deg, rgba(96, 165, 250, 0.18), transparent);
            opacity: 0;
            transition: opacity var(--transition-fast);
          }

          nav.primary-nav a:hover,
          nav.primary-nav a:focus-visible {
            color: var(--text-primary);
            background: rgba(96, 165, 250, 0.08);
          }

          nav.primary-nav a:hover::after,
          nav.primary-nav a:focus-visible::after,
          nav.primary-nav a.is-active::after {
            opacity: 1;
          }

          nav.primary-nav a.is-active {
            color: #fff;
            background: rgba(96, 165, 250, 0.16);
          }

          main.page {
            margin-top: clamp(26px, 5vw, 48px);
            display: flex;
            flex-direction: column;
            gap: 28px;
          }

          .page-header {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            padding: clamp(22px, 5vw, 34px);
            border-radius: var(--radius-lg);
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-soft);
          }

          .page-header .eyebrow {
            font-size: 0.8rem;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: var(--text-muted);
          }

          .page-header h2 {
            margin: 4px 0 6px;
            font-size: clamp(1.6rem, 3vw, 2rem);
            letter-spacing: -0.02em;
          }

          .page-header p.lead {
            margin: 0;
            font-size: 1rem;
            color: var(--text-secondary);
            max-width: 580px;
          }

          .action-bar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
          }

          .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 18px;
          }

          .card {
            position: relative;
            padding: 22px;
            border-radius: var(--radius-md);
            background: var(--bg-elevated);
            border: 1px solid transparent;
            transition: transform var(--transition-slow), border-color var(--transition-fast), box-shadow var(--transition-medium);
            overflow: hidden;
          }

          .card::before {
            content: "";
            position: absolute;
            inset: -30% 0 0;
            background: linear-gradient(120deg, rgba(96, 165, 250, 0.24), transparent 60%);
            opacity: 0;
            transition: opacity var(--transition-medium);
          }

          .card:hover::before,
          .card:focus-within::before {
            opacity: 1;
          }

          .card:hover,
          .card:focus-within {
            transform: translateY(-4px);
            border-color: rgba(96, 165, 250, 0.35);
            box-shadow: var(--shadow-soft);
          }

          .card h3 {
            margin: 0;
            font-size: 1.15rem;
            letter-spacing: -0.01em;
          }

          .card p {
            color: var(--text-muted);
            margin-top: 8px;
            margin-bottom: 0;
            font-size: 0.95rem;
          }

          .link-muted {
            color: var(--text-secondary);
            text-decoration: none;
            transition: color var(--transition-fast), text-decoration var(--transition-fast);
          }

          .link-muted:hover,
          .link-muted:focus-visible {
            color: var(--text-primary);
            text-decoration: underline;
          }

          .card-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 16px;
          }

          .btn,
          button.btn,
          a.btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 18px;
            border-radius: var(--radius-sm);
            border: 1px solid transparent;
            background: rgba(96, 165, 250, 0.18);
            color: #f8fafc;
            font-weight: 600;
            font-size: 0.95rem;
            text-decoration: none;
            cursor: pointer;
            transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
          }

          .btn:hover,
          .btn:focus-visible {
            transform: translateY(-1px);
            box-shadow: 0 12px 24px rgba(96, 165, 250, 0.16);
            background: rgba(96, 165, 250, 0.28);
          }

          .btn-primary {
            background: linear-gradient(135deg, rgba(96, 165, 250, 0.9), rgba(59, 130, 246, 0.9));
            box-shadow: 0 12px 30px rgba(37, 99, 235, 0.35);
          }

          .btn-primary:hover,
          .btn-primary:focus-visible {
            background: linear-gradient(135deg, rgba(96, 165, 250, 1), rgba(59, 130, 246, 1));
          }

          .btn-secondary {
            background: rgba(148, 163, 184, 0.18);
            border-color: rgba(148, 163, 184, 0.35);
          }

          .btn-tertiary {
            background: transparent;
            border-color: rgba(148, 163, 184, 0.28);
            color: var(--text-secondary);
          }

          .btn-danger {
            background: rgba(248, 113, 113, 0.18);
            color: #fecaca;
            border-color: rgba(248, 113, 113, 0.35);
          }

          .btn-ghost {
            background: transparent;
            color: var(--text-secondary);
          }

          .btn-sm {
            padding: 7px 12px;
            font-size: 0.85rem;
          }

          .btn.is-busy {
            pointer-events: none;
            opacity: 0.7;
          }

          .btn.is-busy .spinner.inline {
            width: 16px;
            height: 16px;
          }

          button:focus-visible,
          a.btn:focus-visible {
            outline: 2px solid rgba(96, 165, 250, 0.55);
            outline-offset: 2px;
          }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 999px;
            background: var(--badge-bg);
            color: var(--badge-text);
            font-size: 0.78rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .status-success { background: rgba(52, 211, 153, 0.18); color: #bbf7d0; }
          .status-error { background: rgba(248, 113, 113, 0.22); color: #fecaca; }
          .status-warning { background: rgba(251, 191, 36, 0.2); color: #fef3c7; }
          .status-info { background: rgba(56, 189, 248, 0.18); color: #bae6fd; }

          .panel {
            background: var(--bg-elevated);
            border-radius: var(--radius-lg);
            border: 1px solid rgba(148, 163, 184, 0.25);
            padding: clamp(20px, 4vw, 28px);
            box-shadow: var(--shadow-soft);
          }

          .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 18px;
          }

          .panel-title {
            font-size: 1.15rem;
            letter-spacing: -0.01em;
            margin: 0;
          }

          .divider {
            height: 1px;
            width: 100%;
            background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.4), transparent);
            margin: 18px 0;
          }

          form {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }

          .form-section {
            display: grid;
            gap: 18px;
          }

          .form-row {
            display: grid;
            gap: 18px;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          label {
            font-weight: 600;
            font-size: 0.9rem;
            color: var(--text-secondary);
          }

          input,
          select,
          textarea {
            border-radius: var(--radius-md);
            border: 1px solid rgba(148, 163, 184, 0.25);
            background: rgba(15, 23, 42, 0.6);
            padding: 12px 14px;
            color: var(--text-primary);
            font: inherit;
            transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          }

          input:focus,
          select:focus,
          textarea:focus {
            outline: none;
            border-color: rgba(96, 165, 250, 0.65);
            box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.15);
          }

          .form-helper {
            font-size: 0.8rem;
            color: var(--text-muted);
          }

          .error-text {
            font-size: 0.8rem;
            color: #fda4af;
          }

          textarea {
            min-height: 220px;
            resize: vertical;
            font-family: "JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            line-height: 1.55;
          }

          pre {
            margin: 0;
            padding: 16px 18px;
            background: rgba(15, 23, 42, 0.75);
            border-radius: var(--radius-md);
            border: 1px solid rgba(148, 163, 184, 0.25);
            overflow-x: auto;
            font-size: 0.85rem;
            line-height: 1.6;
            font-family: "JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            background: rgba(15, 23, 42, 0.6);
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-soft);
          }

          table th,
          table td {
            text-align: left;
            padding: 14px 18px;
          }

          table thead {
            background: rgba(96, 165, 250, 0.08);
          }

          table tbody tr {
            border-bottom: 1px solid rgba(148, 163, 184, 0.12);
            transition: background var(--transition-fast);
          }

          table tbody tr:hover {
            background: rgba(96, 165, 250, 0.08);
          }

          table[data-sortable] th {
            cursor: pointer;
            user-select: none;
          }

          table[data-sortable] th .sort-indicator {
            margin-left: 6px;
            opacity: 0.5;
            transition: opacity var(--transition-fast);
          }

          table[data-sortable] th.is-active .sort-indicator {
            opacity: 1;
          }

          .tabs {
            display: inline-flex;
            padding: 6px;
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.65);
            border: 1px solid rgba(148, 163, 184, 0.2);
            margin-bottom: 20px;
          }

          .tab-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            padding: 10px 18px;
            border-radius: 999px;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-fast);
          }

          .tab-btn.active {
            color: var(--text-primary);
            background: rgba(96, 165, 250, 0.16);
            box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.3);
          }

          .tab-content {
            display: none;
            animation: fadeIn var(--transition-slow);
          }

          .tab-content.active {
            display: block;
          }

          details {
            background: rgba(15, 23, 42, 0.6);
            border-radius: var(--radius-md);
            border: 1px solid rgba(148, 163, 184, 0.2);
            padding: 18px 22px;
          }

          details + details {
            margin-top: 14px;
          }

          summary {
            cursor: pointer;
            font-weight: 600;
            color: var(--text-secondary);
          }

          .toast-container {
            position: fixed;
            right: clamp(16px, 4vw, 32px);
            top: clamp(18px, 6vw, 32px);
            display: grid;
            gap: 12px;
            z-index: 40;
          }

          .toast {
            min-width: 260px;
            max-width: 360px;
            padding: 14px 16px;
            border-radius: var(--radius-md);
            background: rgba(15, 23, 42, 0.92);
            border: 1px solid rgba(148, 163, 184, 0.25);
            box-shadow: var(--shadow-soft);
            display: grid;
            gap: 8px;
            animation: slideUp 260ms cubic-bezier(0.16, 1, 0.3, 1);
          }

          .toast[data-type="success"] { border-color: rgba(52, 211, 153, 0.45); }
          .toast[data-type="error"] { border-color: rgba(248, 113, 113, 0.45); }
          .toast[data-type="warning"] { border-color: rgba(251, 191, 36, 0.45); }

          .toast .title {
            font-weight: 600;
          }

          .progress-bar {
            width: 100%;
            height: 6px;
            border-radius: 999px;
            background: rgba(148, 163, 184, 0.2);
            overflow: hidden;
          }

          .progress-bar .progress {
            height: 100%;
            background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
            border-radius: inherit;
            transform-origin: left;
            transition: transform 180ms ease;
          }

          .spinner {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 3px solid rgba(148, 163, 184, 0.25);
            border-top-color: rgba(96, 165, 250, 0.8);
            animation: spin 720ms linear infinite;
          }

          .spinner.inline {
            width: 18px;
            height: 18px;
          }

          .skeleton {
            position: relative;
            overflow: hidden;
            background: rgba(148, 163, 184, 0.08);
            border-radius: var(--radius-sm);
          }

          .upload-zone {
            border-radius: var(--radius-lg);
            background: rgba(15, 23, 42, 0.55);
            border: 2px dashed rgba(96, 165, 250, 0.25);
            transition: border-color var(--transition-fast), background var(--transition-fast);
            cursor: pointer;
          }

          .upload-zone:hover,
          .upload-zone.is-dragging {
            border-color: rgba(96, 165, 250, 0.6);
            background: rgba(96, 165, 250, 0.12);
          }

          .skeleton::after {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.2), transparent);
            animation: shimmer 1.8s infinite;
          }

          [data-loading-target] .skeleton { display: none; }
          [data-loading-target].is-loading .skeleton { display: block; }
          [data-loading-target].is-loading .dynamic-content { opacity: 0.25; pointer-events: none; }

          .fade-in { animation: fadeIn var(--transition-slow); }
          .slide-up { animation: slideUp var(--transition-slow); }
          .scale-in { animation: scaleIn var(--transition-slow); }

          .chip-group {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .chip {
            padding: 6px 12px;
            border-radius: 999px;
            background: rgba(96, 165, 250, 0.15);
            color: var(--text-secondary);
            font-size: 0.85rem;
          }

          .empty-state {
            text-align: center;
            padding: 54px 24px;
            border-radius: var(--radius-lg);
            border: 1px dashed rgba(148, 163, 184, 0.25);
            background: rgba(15, 23, 42, 0.45);
            display: grid;
            gap: 14px;
          }

          .empty-state h3 {
            margin: 0;
            font-size: 1.35rem;
          }

          .empty-state p {
            color: var(--text-muted);
            margin: 0;
          }

          .toolbar {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            gap: 16px;
            align-items: center;
          }

          .toolbar .filters {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }

          .filter-chip {
            display: inline-flex;
            gap: 8px;
            align-items: center;
            padding: 6px 12px;
            border-radius: 999px;
            background: rgba(59, 130, 246, 0.18);
          }

          .file-tree {
            border-radius: var(--radius-md);
            border: 1px solid rgba(148, 163, 184, 0.18);
            overflow: hidden;
            background: rgba(15, 23, 42, 0.6);
          }

          .file-tree ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .file-tree li {
            padding: 10px 16px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.12);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .file-tree li:last-child { border-bottom: none; }

          .resource-grid {
            display: grid;
            gap: 16px;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          }

          .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(2, 6, 23, 0.78);
            display: grid;
            place-items: center;
            z-index: 50;
          }

          .modal {
            width: min(520px, calc(100vw - 32px));
            background: rgba(15, 23, 42, 0.94);
            border-radius: var(--radius-lg);
            border: 1px solid rgba(148, 163, 184, 0.25);
            padding: 26px;
            box-shadow: var(--shadow-strong);
            animation: scaleIn var(--transition-slow);
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }

          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          @media (max-width: 768px) {
            header.app-header {
              position: static;
              padding: 18px;
            }

            nav.primary-nav {
              width: 100%;
            }

            .card-grid {
              grid-template-columns: 1fr;
            }

            .page-header {
              padding: 20px;
            }

            .toolbar {
              flex-direction: column;
              align-items: flex-start;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 1ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0ms !important;
              scroll-behavior: auto !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="app-shell">
          <header class="app-header">
            <div class="brand">
              <div class="brand-logo">AC</div>
              <div>
                <h1>Agent Config Adapter</h1>
                <p style="margin: 0; color: var(--text-muted); font-size: 0.9rem;">Modern tooling for multi-agent configuration workflows</p>
              </div>
            </div>
            <nav class="primary-nav" aria-label="Primary">
              <a href="/" data-route="/">Home</a>
              <a href="/configs" data-route="/configs">Configs</a>
              <a href="/slash-commands/convert" data-route="/slash-commands/convert">Converter</a>
              <a href="/extensions" data-route="/extensions">Extensions</a>
              <a href="/marketplaces" data-route="/marketplaces">Marketplaces</a>
              <a href="/skills" data-route="/skills">Skills</a>
              <a href="/plugins" data-route="/plugins">Plugin Browser</a>
            </nav>
          </header>
          <main class="page fade-in">
            ${content}
          </main>
        </div>
        <div class="toast-container" id="toast-container" role="status" aria-live="polite"></div>
        <script>
          (function() {
            const navLinks = document.querySelectorAll('nav.primary-nav a[data-route]');
            const currentPath = window.location.pathname;
            navLinks.forEach(link => {
              const route = link.getAttribute('data-route');
              if (!route) return;
              if (route === '/' && currentPath === '/') {
                link.classList.add('is-active');
              } else if (route !== '/' && currentPath.startsWith(route)) {
                link.classList.add('is-active');
              }
            });

            const toastContainer = document.getElementById('toast-container');

            function showToast(message, type = 'info', options = {}) {
              if (!toastContainer) return;
              const toast = document.createElement('div');
              toast.className = 'toast';
              toast.dataset.type = type;
              toast.setAttribute('role', 'status');
              toast.innerHTML = `
                <div class="title">${options.title || type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div class="message">${message}</div>
              `;

              toastContainer.appendChild(toast);
              const duration = options.duration ?? 4000;
              setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-6px)';
                toast.addEventListener('transitionend', () => toast.remove(), { once: true });
              }, duration);
            }

            function setLoading(target, isLoading) {
              const element = typeof target === 'string' ? document.querySelector(target) : target;
              if (!element) return;
              element.classList.toggle('is-loading', Boolean(isLoading));
              element.setAttribute('aria-busy', String(Boolean(isLoading)));
            }

            function copyWithFeedback(text, trigger, successMessage = 'Copied to clipboard') {
              if (!navigator?.clipboard) {
                showToast('Clipboard access not available in this browser', 'warning');
                return Promise.resolve(false);
              }

              return navigator.clipboard.writeText(text).then(() => {
                if (trigger) {
                  trigger.classList.add('copied');
                  setTimeout(() => trigger.classList.remove('copied'), 1600);
                }
                showToast(successMessage, 'success');
                return true;
              }).catch(() => {
                showToast('Unable to copy to clipboard', 'error');
                return false;
              });
            }

            function validateForm(form) {
              if (!form) return true;
              let isValid = true;
              const elements = Array.from(form.querySelectorAll('[required]'));
              elements.forEach((el) => {
                const field = el;
                const formGroup = field.closest('.form-group');
                if (!formGroup) return;
                let errorEl = formGroup.querySelector('.error-text');
                if (!field.checkValidity()) {
                  isValid = false;
                  if (!errorEl) {
                    errorEl = document.createElement('div');
                    errorEl.className = 'error-text';
                    formGroup.appendChild(errorEl);
                  }
                  errorEl.textContent = field.validationMessage || 'Please fill out this field';
                } else if (errorEl) {
                  errorEl.remove();
                }
              });
              if (!isValid) {
                showToast('Please fix highlighted fields before submitting.', 'warning');
              }
              return isValid;
            }

            function setBusyButton(button, isBusy) {
              if (!button) return;
              const btn = button;
              if (isBusy) {
                if (!btn.dataset.originalLabel) {
                  btn.dataset.originalLabel = btn.innerHTML;
                }
                const label = btn.dataset.busyLabel || 'Working…';
                btn.innerHTML = `<span class="spinner inline" aria-hidden="true"></span><span>${label}</span>`;
                btn.classList.add('is-busy');
                btn.setAttribute('aria-busy', 'true');
                btn.disabled = true;
              } else {
                if (btn.dataset.originalLabel) {
                  btn.innerHTML = btn.dataset.originalLabel;
                  delete btn.dataset.originalLabel;
                }
                btn.classList.remove('is-busy');
                btn.removeAttribute('aria-busy');
                btn.disabled = false;
              }
            }

            function initSortableTables() {
              document.querySelectorAll('table[data-sortable] th[data-sort]').forEach((header) => {
                header.addEventListener('click', () => {
                  const table = header.closest('table');
                  if (!table) return;
                  const tbody = table.querySelector('tbody');
                  if (!tbody) return;
                  const column = Array.from(header.parentElement?.children || []).indexOf(header);
                  const direction = header.dataset.direction === 'asc' ? 'desc' : 'asc';
                  header.dataset.direction = direction;
                  table.querySelectorAll('th[data-sort]').forEach((th) => th.classList.remove('is-active'));
                  header.classList.add('is-active');
                  const rows = Array.from(tbody.querySelectorAll('tr'));
                  rows.sort((a, b) => {
                    const valueA = a.children[column]?.textContent?.trim() ?? '';
                    const valueB = b.children[column]?.textContent?.trim() ?? '';
                    return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
                  });
                  rows.forEach((row) => tbody.appendChild(row));
                });
              });
            }

            function handleHtmxLoading(event, isLoading) {
              const target = event.detail?.target;
              if (!target) return;
              const loadingTarget = target.closest('[data-loading-target]') || target;
              if (loadingTarget) {
                setLoading(loadingTarget, isLoading);
              }
            }

            document.body.addEventListener('htmx:beforeRequest', (event) => handleHtmxLoading(event, true));
            document.body.addEventListener('htmx:afterSwap', (event) => handleHtmxLoading(event, false));
            document.body.addEventListener('htmx:responseError', (event) => {
              handleHtmxLoading(event, false);
              showToast('Something went wrong while processing the request.', 'error');
            });

            document.body.addEventListener('htmx:afterSwap', () => {
              initSortableTables();
            });

            document.addEventListener('click', (event) => {
              const trigger = event.target instanceof HTMLElement ? event.target.closest('[data-copy], [data-copy-target]') : null;
              if (!trigger) return;
              event.preventDefault();
              const direct = trigger.getAttribute('data-copy');
              const targetSelector = trigger.getAttribute('data-copy-target');
              let text = direct || '';
              if (targetSelector && !direct) {
                const targetNode = document.querySelector(targetSelector);
                text = targetNode?.textContent?.trim() || '';
              }
              if (text) {
                copyWithFeedback(text, trigger);
              } else {
                showToast('Nothing to copy from this element', 'warning');
              }
            });

            initSortableTables();

            window.UI = {
              showToast,
              setLoading,
              copyWithFeedback,
              validateForm,
              setBusyButton,
            };
          })();
        </script>
      </body>
    </html>
  `;
}
