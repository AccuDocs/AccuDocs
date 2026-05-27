export const renderBackupPortal = (): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AccuDocs Database Backups</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07111f;
      --panel: #0f1f34;
      --panel-2: #13243b;
      --line: rgba(148, 163, 184, .22);
      --text: #f8fafc;
      --muted: #9fb2ca;
      --accent: #60a5fa;
      --accent-2: #2563eb;
      --good: #86efac;
      --warn: #fcd34d;
      --bad: #fca5a5;
    }
    * { box-sizing: border-box; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0;
      min-height: 100vh;
    }
    main {
      display: grid;
      gap: 18px;
      margin: 0 auto;
      max-width: 1180px;
      padding: 28px;
    }
    header, section, .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 14px;
    }
    header {
      align-items: center;
      display: flex;
      gap: 18px;
      justify-content: space-between;
      padding: 22px;
    }
    h1, h2, p { margin: 0; }
    h1 { font-size: 28px; line-height: 1.1; }
    h2 { font-size: 16px; }
    p, label, small { color: var(--muted); }
    .subline { margin-top: 8px; }
    .actions, .row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    button, input, select {
      border-radius: 10px;
      font: inherit;
      height: 40px;
    }
    input, select {
      background: var(--panel-2);
      border: 1px solid var(--line);
      color: var(--text);
      outline: none;
      padding: 0 12px;
    }
    input { min-width: 230px; }
    button {
      align-items: center;
      background: var(--accent-2);
      border: 1px solid var(--accent-2);
      color: white;
      cursor: pointer;
      display: inline-flex;
      font-weight: 800;
      justify-content: center;
      padding: 0 14px;
    }
    button.secondary {
      background: var(--panel-2);
      border-color: var(--line);
    }
    button.danger {
      background: rgba(239, 68, 68, .16);
      border-color: rgba(248, 113, 113, .35);
      color: var(--bad);
    }
    button.small {
      font-size: 12px;
      height: 32px;
      padding: 0 10px;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: .55;
    }
    .status-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .card {
      display: grid;
      gap: 8px;
      min-height: 112px;
      padding: 16px;
    }
    .card span {
      color: var(--muted);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .card strong {
      font-size: 21px;
      overflow-wrap: anywhere;
    }
    .card.warn { border-color: rgba(252, 211, 77, .5); }
    .panel {
      display: grid;
      gap: 14px;
      padding: 18px;
    }
    .notice {
      border: 1px solid rgba(252, 211, 77, .35);
      border-radius: 12px;
      color: var(--warn);
      display: none;
      padding: 12px;
    }
    .notice.show { display: block; }
    .history { overflow: hidden; }
    .history-head {
      align-items: center;
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      padding: 16px 18px;
    }
    .table-wrap { overflow-x: auto; }
    table {
      border-collapse: collapse;
      min-width: 860px;
      width: 100%;
    }
    th, td {
      border-top: 1px solid var(--line);
      padding: 12px 14px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
    }
    td { color: #dbeafe; font-size: 13px; }
    td small { display: block; margin-top: 4px; max-width: 360px; overflow-wrap: anywhere; }
    .pill {
      border-radius: 999px;
      display: inline-flex;
      font-size: 11px;
      font-weight: 900;
      padding: 5px 9px;
      text-transform: uppercase;
    }
    .success { background: rgba(34, 197, 94, .16); color: var(--good); }
    .running { background: rgba(96, 165, 250, .16); color: #bfdbfe; }
    .failed { background: rgba(248, 113, 113, .16); color: var(--bad); }
    a { color: var(--accent); font-weight: 800; text-decoration: none; }
    .muted { color: var(--muted); }
    .file-actions { align-items: center; display: flex; gap: 8px; }
    #message {
      border-radius: 10px;
      color: var(--muted);
      min-height: 20px;
    }
    #message.good { color: var(--good); }
    #message.bad { color: var(--bad); }
    @media (max-width: 900px) {
      header { align-items: stretch; flex-direction: column; }
      .status-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      button, input, select { width: 100%; }
    }
    @media (max-width: 560px) {
      main { padding: 16px; }
      .status-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Database Backups</h1>
        <p class="subline">Backend portal for daily schema and full PostgreSQL backups.</p>
      </div>
      <div class="actions">
        <button type="button" class="secondary" id="refreshBtn">Refresh</button>
        <button type="button" class="secondary" id="testBtn">Test Drive</button>
        <button type="button" id="runBtn">Run Backup</button>
      </div>
    </header>

    <div id="message"></div>

    <div class="status-grid">
      <article class="card">
        <span>Schedule</span>
        <strong id="scheduleValue">-</strong>
        <small id="scheduleMeta">-</small>
      </article>
      <article class="card" id="driveCard">
        <span>Google Drive</span>
        <strong id="driveValue">-</strong>
        <small id="driveMeta">-</small>
      </article>
      <article class="card" id="dumpCard">
        <span>pg_dump</span>
        <strong id="dumpValue">-</strong>
        <small id="dumpMeta">-</small>
      </article>
      <article class="card">
        <span>Last Backup</span>
        <strong id="lastValue">-</strong>
        <small id="lastMeta">-</small>
      </article>
    </div>

    <section class="panel">
      <div>
        <h2>Manual Backup</h2>
        <p>Manual runs use the same backend service as the daily scheduler.</p>
      </div>
      <div class="row">
        <select id="kind">
          <option value="both">Schema and full database</option>
          <option value="schema">Schema only</option>
          <option value="full">Full database only</option>
        </select>
        <select id="destination">
          <option value="local">File manager only</option>
          <option value="drive">Google Drive and file manager</option>
        </select>
        <button type="button" id="runSelectedBtn">Start</button>
      </div>
      <div class="notice" id="notice"></div>
    </section>

    <section class="history">
      <div class="history-head">
        <div>
          <h2>File Manager</h2>
          <p id="filesMeta">No data loaded</p>
        </div>
        <button type="button" class="secondary" id="filesRefreshBtn">Refresh Files</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Type</th>
              <th>Size</th>
              <th>Modified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="filesBody">
            <tr><td colspan="5" class="muted">Refresh to load local backup files.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="history">
      <div class="history-head">
        <div>
          <h2>Backup History</h2>
          <p id="historyMeta">No data loaded</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Status</th>
              <th>File</th>
              <th>Size</th>
              <th>Started</th>
              <th>Drive</th>
            </tr>
          </thead>
          <tbody id="historyBody">
            <tr><td colspan="6" class="muted">Refresh to load backups.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>

  <script>
    const apiRoot = window.location.pathname.replace(/\\/backups\\/portal\\/?$/, '');
    const backupBase = apiRoot + '/backups';

    const el = (id) => document.getElementById(id);

    function setMessage(text, kind) {
      const node = el('message');
      node.className = kind || '';
      node.textContent = text || '';
    }

    function setBusy(busy) {
      ['refreshBtn', 'testBtn', 'runBtn', 'runSelectedBtn', 'filesRefreshBtn'].forEach((id) => {
        el(id).disabled = busy;
      });
    }

    async function request(path, options = {}) {
      const response = await fetch(backupBase + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.success === false) {
        const message = json.message || json.error?.message || response.statusText || 'Request failed';
        throw new Error(message);
      }
      return json.data;
    }

    async function refresh() {
      setBusy(true);
      try {
        const [status, runs, files] = await Promise.all([
          request('/status'),
          request('/history?limit=30'),
          request('/files'),
        ]);
        renderStatus(status);
        renderHistory(runs);
        renderFiles(files);
        setMessage('Backup status loaded.', 'good');
      } catch (error) {
        setMessage(error.message, 'bad');
      } finally {
        setBusy(false);
      }
    }

    async function testDrive() {
      setBusy(true);
      try {
        await request('/test-drive', { method: 'POST', body: '{}' });
        setMessage('Google Drive connection verified.', 'good');
        await refresh();
      } catch (error) {
        setMessage(error.message, 'bad');
      } finally {
        setBusy(false);
      }
    }

    async function runBackup() {
      const kind = el('kind').value;
      const destination = el('destination').value;
      setBusy(true);
      try {
        await request('/run', { method: 'POST', body: JSON.stringify({ kind, destination }) });
        setMessage('Backup completed.', 'good');
        await refresh();
      } catch (error) {
        setMessage(error.message, 'bad');
      } finally {
        setBusy(false);
      }
    }

    async function downloadLocalFile(fileName) {
      setBusy(true);
      try {
        const response = await fetch(backupBase + '/files/' + encodeURIComponent(fileName) + '/download', {
          headers: {},
        });
        if (!response.ok) {
          const json = await response.json().catch(() => ({}));
          throw new Error(json.message || json.error?.message || response.statusText || 'Download failed');
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setMessage('Download started.', 'good');
      } catch (error) {
        setMessage(error.message, 'bad');
      } finally {
        setBusy(false);
      }
    }

    async function deleteLocalFile(fileName) {
      if (!confirm('Delete local backup file ' + fileName + '?')) return;
      setBusy(true);
      try {
        await request('/files/' + encodeURIComponent(fileName), { method: 'DELETE' });
        setMessage('Local backup file deleted.', 'good');
        await refresh();
      } catch (error) {
        setMessage(error.message, 'bad');
      } finally {
        setBusy(false);
      }
    }

    function renderStatus(status) {
      el('scheduleValue').textContent = status.enabled ? 'Enabled' : 'Disabled';
      el('scheduleMeta').textContent = (status.cron || '-') + ' / ' + (status.timezone || '-') + ' / ' + (status.destination || 'local');
      el('driveValue').textContent = status.driveConfigured ? 'Connected' : 'Missing config';
      el('driveMeta').textContent = status.destination === 'local'
        ? 'Optional when using file manager only'
        : (status.serviceAccountEmail || 'Service account not configured');
      el('dumpValue').textContent = status.pgDumpAvailable ? 'Available' : 'Unavailable';
      el('dumpMeta').textContent = status.pgDumpResolvedPath || status.pgDumpPath || 'pg_dump';
      el('driveCard').classList.toggle('warn', status.destination === 'drive' && !status.driveConfigured);
      el('dumpCard').classList.toggle('warn', !status.pgDumpAvailable);
      el('destination').value = status.destination || 'local';

      const last = status.lastRun;
      el('lastValue').textContent = last ? last.kind + ' ' + last.status : 'None';
      el('lastMeta').textContent = last?.completedAt ? new Date(last.completedAt).toLocaleString() : 'No completed run yet';

      const missing = [];
      if (status.destination === 'drive' && !status.driveConfigured) missing.push('Google Drive folder and service account credentials, or choose File manager only');
      if (!status.pgDumpAvailable) missing.push('PostgreSQL pg_dump client');
      const notice = el('notice');
      notice.textContent = missing.length ? missing.join(' and ') + ' must be configured before backups can run.' : '';
      notice.classList.toggle('show', missing.length > 0);
    }

    function renderHistory(runs) {
      el('historyMeta').textContent = runs.length + ' recent artifacts';
      if (!runs.length) {
        el('historyBody').innerHTML = '<tr><td colspan="6" class="muted">No backup runs recorded.</td></tr>';
        return;
      }
      el('historyBody').innerHTML = runs.map((run) => {
        const status = escapeHtml(run.status);
        const file = escapeHtml(run.fileName || 'Pending');
        const meta = escapeHtml(run.checksumSha256 ? run.checksumSha256.slice(0, 12) + '...' : (run.errorMessage || '-'));
        const drive = run.driveWebUrl
          ? '<a href="' + escapeAttr(run.driveWebUrl) + '" target="_blank" rel="noopener">Open</a>'
          : '<span class="muted">-</span>';
        return '<tr>' +
          '<td>' + escapeHtml(run.kind) + '</td>' +
          '<td><span class="pill ' + escapeAttr(run.status) + '">' + status + '</span></td>' +
          '<td><strong>' + file + '</strong><small>' + meta + '</small></td>' +
          '<td>' + formatBytes(run.sizeBytes) + '</td>' +
          '<td>' + (run.startedAt ? new Date(run.startedAt).toLocaleString() : '-') + '</td>' +
          '<td>' + drive + '</td>' +
        '</tr>';
      }).join('');
    }

    function renderFiles(files) {
      el('filesMeta').textContent = files.length + ' local files';
      if (!files.length) {
        el('filesBody').innerHTML = '<tr><td colspan="5" class="muted">No local backup files found.</td></tr>';
        return;
      }
      el('filesBody').innerHTML = files.map((file) => {
        const fileName = escapeHtml(file.fileName);
        const fileAttr = escapeAttr(file.fileName);
        const kind = escapeHtml(file.kind || 'unknown');
        return '<tr>' +
          '<td><strong>' + fileName + '</strong></td>' +
          '<td>' + kind + '</td>' +
          '<td>' + formatBytes(file.sizeBytes) + '</td>' +
          '<td>' + (file.modifiedAt ? new Date(file.modifiedAt).toLocaleString() : '-') + '</td>' +
          '<td><div class="file-actions">' +
            '<button type="button" class="secondary small" data-action="download" data-file="' + fileAttr + '">Download</button>' +
            '<button type="button" class="danger small" data-action="delete" data-file="' + fileAttr + '">Delete</button>' +
          '</div></td>' +
        '</tr>';
      }).join('');
    }

    function formatBytes(value) {
      if (!value) return '-';
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = Number(value);
      let unit = 0;
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
      }
      return size.toFixed(unit === 0 ? 0 : 1) + ' ' + units[unit];
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]);
    }

    function escapeAttr(value) {
      return escapeHtml(value).replace(new RegExp(String.fromCharCode(96), 'g'), '&#96;');
    }

    el('refreshBtn').addEventListener('click', refresh);
    el('filesRefreshBtn').addEventListener('click', refresh);
    el('testBtn').addEventListener('click', testDrive);
    el('runBtn').addEventListener('click', runBackup);
    el('runSelectedBtn').addEventListener('click', runBackup);
    el('filesBody').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const fileName = button.getAttribute('data-file');
      if (!fileName) return;
      if (button.getAttribute('data-action') === 'download') {
        downloadLocalFile(fileName);
      } else if (button.getAttribute('data-action') === 'delete') {
        deleteLocalFile(fileName);
      }
    });

    refresh();
  </script>
</body>
</html>`;
