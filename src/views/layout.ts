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

          /* Filter Controls Styling */
          .filter-container {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
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
            border: 3px solid var(--bg-tertiary);
            border-top: 3px solid var(--accent-primary);
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 0.8s linear infinite;
            display: inline-block;
            vertical-align: middle;
            margin-right: 8px;
          }

          .spinner-large {
            width: 48px;
            height: 48px;
            border-width: 4px;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .progress-bar {
            width: 100%;
            height: 6px;
            background: var(--bg-tertiary);
            border-radius: 3px;
            overflow: hidden;
            position: relative;
          }

          .progress-bar-fill {
            height: 100%;
            background: var(--accent-primary);
            transition: width 0.3s ease;
          }

          .progress-bar.indeterminate .progress-bar-fill {
            width: 30%;
            animation: indeterminate-progress 1.5s ease-in-out infinite;
          }

          @keyframes indeterminate-progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
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
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: flex-start;
            gap: 12px;
            animation: toast-in 0.3s ease-out;
            position: relative;
            min-width: 300px;
          }

          .toast.toast-out {
            animation: toast-out 0.3s ease-in forwards;
          }

          .toast-success {
            border-left: 4px solid #3fb950;
          }

          .toast-error {
            border-left: 4px solid var(--danger);
          }

          .toast-warning {
            border-left: 4px solid #d29922;
          }

          .toast-info {
            border-left: 4px solid var(--accent-primary);
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
            animation: fade-in 0.3s ease-out;
          }

          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .slide-up {
            animation: slide-up 0.4s ease-out;
          }

          @keyframes slide-up {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          .scale-in {
            animation: scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }

          @keyframes scale-in {
            from {
              transform: scale(0.9);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }

          /* ===== CARD ENHANCEMENTS ===== */
          .card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 16px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .card-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            border-color: var(--accent-primary);
          }

          .card-interactive {
            cursor: pointer;
          }

          .card-interactive:active {
            transform: translateY(0);
          }

          /* ===== STATUS INDICATORS ===== */
          .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.875em;
            font-weight: 500;
          }

          .status-success {
            background: rgba(63, 185, 80, 0.15);
            color: #3fb950;
            border: 1px solid rgba(63, 185, 80, 0.3);
          }

          .status-error {
            background: rgba(248, 81, 73, 0.15);
            color: var(--danger);
            border: 1px solid rgba(248, 81, 73, 0.3);
          }

          .status-warning {
            background: rgba(210, 153, 34, 0.15);
            color: #d29922;
            border: 1px solid rgba(210, 153, 34, 0.3);
          }

          .status-info {
            background: rgba(88, 166, 255, 0.15);
            color: var(--accent-primary);
            border: 1px solid rgba(88, 166, 255, 0.3);
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
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9998;
            animation: fade-in 0.2s ease-out;
          }

          .modal {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: scale-in 0.3s ease-out;
          }

          .modal-header {
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
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
          <h1>Agent Config Adapter</h1>
          <nav>
            <a href="/">Home</a>
            <a href="/configs">Configs</a>
            <a href="/slash-commands/convert">Converter</a>
            <a href="/skills">Skills</a>
            <a href="/extensions">Extensions</a>
            <a href="/marketplaces">Marketplaces</a>
            <a href="/mcp/info">MCP</a>
          </nav>
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
