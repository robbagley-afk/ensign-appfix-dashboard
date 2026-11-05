/**
 * Ensign AppFix Dashboard
 * Continuous DevOps & Agile Improvement Pipeline
 * Team Lead: Rodrigo Moll (@Rodrigomoll)
 */

const SLUG_TO_APP = {
  'ens101':          'ENS 101 Guide',
  'readiness':       'Student Readiness Hub',
  'career-fair':     'Career Fair Coach',
  'career-explorer': 'Career Explorer',
  'mentor-explorer': 'Mentor Explorer',
  'local-suite':     'Local Agent Suite',
  'design-system':   'Design System',
  'appfix':          'AppFix Dashboard',
};

/**
 * Public repository registry.
 * isTracker: true  → issues carry <!-- appfix-app: slug --> body marker;
 *                    app name is resolved via SLUG_TO_APP, not entry.name.
 *                    Issues without a valid marker are dropped.
 * All repos here must be public. Never add a private repo.
 */
const REPOSITORIES = [
  { name: 'ENS 101 Guide',         repo: 'robbagley-afk/ENS-101-Guide' },
  { name: 'Career Fair Coach',     repo: 'robbagley-afk/ensign-career-fair-coach' },
  { name: 'Design System',         repo: 'robbagley-afk/ensign-design-system' },
  { name: 'AppFix Dashboard',      repo: 'robbagley-afk/ensign-appfix-dashboard', isTracker: true },
];

// One week in milliseconds (7 days)
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let state = {
  issues: [],
  filterApp: 'all',
  filterUrgency: 'all',
  searchQuery: '',
  showAllDone: false, // Default: false (falls off board after 1 week)
  loading: false
};

// DOM Elements
const searchInput = document.getElementById('search-input');
const filterApp = document.getElementById('filter-app');
const filterUrgency = document.getElementById('filter-urgency');
const refreshBtn = document.getElementById('refresh-btn');

const cardsBacklog = document.getElementById('cards-backlog');
const cardsProgress = document.getElementById('cards-progress');
const cardsTesting = document.getElementById('cards-testing');
const cardsDone = document.getElementById('cards-done');

const countTotal = document.getElementById('count-total');
const countCritical = document.getElementById('count-critical');
const countHigh = document.getElementById('count-high');
const countMedium = document.getElementById('count-medium');
const countDone = document.getElementById('count-done');

const countColBacklog = document.getElementById('count-col-backlog');
const countColProgress = document.getElementById('count-col-progress');
const countColTesting = document.getElementById('count-col-testing');
const countColDone = document.getElementById('count-col-done');

// Helper: Determine urgency from labels
function extractUrgency(labels) {
  for (const label of labels) {
    const name = typeof label === 'string' ? label : label.name;
    if (name.includes('critical')) return 'critical';
    if (name.includes('high')) return 'high';
    if (name.includes('medium')) return 'medium';
    if (name.includes('low')) return 'low';
  }
  return 'medium';
}

// Helper: Determine column status from labels or state
function extractStatus(issue) {
  if (issue.state === 'closed') return 'done';
  const labelNames = (issue.labels || []).map(l => typeof l === 'string' ? l : l.name);
  if (labelNames.includes('status:testing') || labelNames.includes('review')) return 'testing';
  if (labelNames.includes('status:in-progress') || labelNames.includes('in-progress')) return 'progress';
  return 'backlog';
}

// Fetch live issues from /api/appfixes or GitHub public API
async function fetchLiveIssues() {
  state.loading = true;
  refreshBtn.disabled = true;

  const failures = [];

  try {
    // One promise per repo; inner try/catch means Promise.all never rejects.
    const fetchPromises = REPOSITORIES.map(async ({ name, repo, isTracker }) => {
      try {
        // Paginate until GitHub returns a short page (< per_page).
        const items = [];
        let page = 1;
        while (true) {
          const res = await fetch(
            `https://api.github.com/repos/${repo}/issues?state=all&labels=appfix&per_page=100&page=${page}`,
            { headers: { 'Accept': 'application/vnd.github.v3+json' } }
            // No Authorization header — public API only; tokens must never
            // reach the client bundle or the public dashboard network tab.
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const batch = await res.json();
          // Exclude pull requests surfaced by the issues endpoint.
          items.push(...batch.filter(item => !item.pull_request));
          if (batch.length < 100) break; // last page
          page++;
        }

        return items.map(item => {
          // Resolve the display-name for this card.
          let appName = name;
          if (isTracker) {
            // Tracker issues MUST carry the exact body marker.
            // Private-repo slugs reach the board only through this path
            // after a human has sanitised and published the issue here.
            const match = (item.body || '').match(
              /<!--\s*appfix-app:\s*([\w-]+)\s*-->/
            );
            if (!match) return null; // no marker → drop silently
            const slug = match[1];
            appName = Object.hasOwn(SLUG_TO_APP, slug) ? SLUG_TO_APP[slug] : null;
            if (!appName) return null; // slug not allowlisted → drop
          }

          const summary = (item.body || "").replace(/<!--[\s\S]*?-->/g, "").trim();
          // Show a short public preview; internal dispatch markers are not reader content.
          return {
            id:            `${repo}-${item.number}`,
            repo,
            app:           appName,
            number:        item.number,
            title:         item.title,
            description:   summary ? (summary.length > 180 ? summary.slice(0, 177) + '…' : summary) : 'No description provided.',
            url:           item.html_url,
            urgency:       extractUrgency(item.labels),
            status:        extractStatus(item),
            assignee:      item.assignees?.[0]?.login || item.assignee?.login || 'Unassigned',
            assigneeAvatar:item.assignees?.[0]?.avatar_url || item.assignee?.avatar_url || '',
            createdAt:     item.created_at,
            completedAt:   item.closed_at || (item.state === 'closed' ? item.updated_at : null),
            labels:        item.labels.map(l => l.name),
          };
        }).filter(Boolean);

      } catch (err) {
        // Per-repo failure: warn, record, and return whatever cards this
        // repo already contributed to the board so stale data is preserved
        // only for the failed source, not wiped globally.
        console.warn(`AppFix: failed to fetch ${repo}:`, err.message);
        failures.push(repo);
        return (state.issues || []).filter(iss => iss.repo === repo);
      }
    });

    // All promises fulfil (failures are caught above).
    const results = await Promise.all(fetchPromises);

    // Board initialises empty; SEED_ISSUES are intentionally excluded.
    // Live GitHub issues are the sole source of truth.
    state.issues = results.flat();

    // Surface stale-data identity on the button tooltip for any failed repo.
    refreshBtn.title = failures.length
      ? `Stale data — failed: ${failures.join(', ')}`
      : '';
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) syncStatus.textContent = failures.length ? 'Some sources could not refresh. Previously loaded requests may be out of date.' : 'Requests are up to date.';

  } catch (err) {
    console.error('AppFix: unexpected refresh error:', err);
  } finally {
    state.loading = false;
    refreshBtn.disabled = false;
    render(); // single render path; renderBoard() removed with obsolete backend
  }
}

// Render cards and metrics
function render() {
  const now = Date.now();

  const filtered = state.issues.filter(issue => {
    // 7-day rule for completed cards:
    // If completed and more than 7 days old, fall off the active board unless explicitly showing archive
    if (issue.status === 'done' && !state.showAllDone) {
      const completedTime = issue.completedAt ? new Date(issue.completedAt).getTime() : new Date(issue.createdAt).getTime();
      const ageMs = now - completedTime;
      if (ageMs > ONE_WEEK_MS) {
        return false; // Auto-prune / fall off the board after 1 week
      }
    }

    // App filter
    if (state.filterApp !== 'all' && issue.app !== state.filterApp) return false;
    // Urgency filter
    if (state.filterUrgency !== 'all' && issue.urgency !== state.filterUrgency) return false;
    // Search query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchTitle = issue.title.toLowerCase().includes(q);
      const matchDesc = issue.description.toLowerCase().includes(q);
      const matchNum = issue.number.toString().includes(q);
      const matchApp = issue.app.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchNum && !matchApp) return false;
    }
    return true;
  });

  // Calculate metrics
  countTotal.textContent = filtered.length;
  countCritical.textContent = filtered.filter(i => i.urgency === 'critical').length;
  countHigh.textContent = filtered.filter(i => i.urgency === 'high').length;
  countMedium.textContent = filtered.filter(i => i.urgency === 'medium').length;
  countDone.textContent = filtered.filter(i => i.status === 'done').length;

  // Split into columns
  const cols = {
    backlog: filtered.filter(i => i.status === 'backlog'),
    progress: filtered.filter(i => i.status === 'progress'),
    testing: filtered.filter(i => i.status === 'testing'),
    done: filtered.filter(i => i.status === 'done')
  };

  countColBacklog.textContent = cols.backlog.length;
  countColProgress.textContent = cols.progress.length;
  countColTesting.textContent = cols.testing.length;
  countColDone.textContent = cols.done.length;

  renderColumn(cardsBacklog, cols.backlog);
  renderColumn(cardsProgress, cols.progress);
  renderColumn(cardsTesting, cols.testing);
  renderColumn(cardsDone, cols.done);
}


// Prompt Runner Modal Elements
const promptModal = document.getElementById('prompt-modal');
const promptModalClose = document.getElementById('prompt-modal-close');
const promptModalTitle = document.getElementById('prompt-modal-title');
const promptModalSubtitle = document.getElementById('prompt-modal-subtitle');
const promptDocLink = document.getElementById('prompt-doc-link');
const promptCopyBtn = document.getElementById('prompt-copy-btn');
const promptContentPre = document.getElementById('prompt-content-pre');
const promptCopyFeedback = document.getElementById('prompt-copy-feedback');

let currentActivePromptText = '';

// ── Prompt-modal: opener capture + focus helpers ───────────────────────────
let _promptModalOpener = null;
const _promptModalBackground = new Map();

/**
 * Returns every visible, enabled focusable element inside promptModal.
 * "Visible" = offsetParent !== null (display:none chain excluded).
 * "Enabled" = not the disabled attribute/property.
 */
function _promptModalFocusable() {
  if (!promptModal) return [];
  return Array.from(
    promptModal.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    el =>
      !el.disabled &&
      el.getAttribute('disabled') === null &&
      el.offsetParent !== null
  );
}

// ── openAppfixPromptModal ──────────────────────────────────────────────────
window.openAppfixPromptModal = async function (id) {
  const item = state.issues.find(iss => iss.id === id);
  if (!item) return;

  // Capture opener before display changes (must be before style change)
  _promptModalOpener = document.activeElement;
  // Custom dialogs must make background content inert for assistive technology.
  document.querySelectorAll("body > header, body > main, body > footer").forEach(el => {
    if (!_promptModalBackground.has(el)) _promptModalBackground.set(el, el.inert);
    el.inert = true;
  });

  const docFile = item.number === 28 && item.repo === 'robbagley-afk/ENS-101-Guide' ? 'ens101-issue-28.md' : 'appfix-dispatch.md';
  const docUrl  = `prompts/${docFile}`;

  // No emoji — textContent is inherently XSS-safe
  promptModalTitle.textContent =
    `Prompt to Run: #${item.number} ${item.title}`;
  promptModalSubtitle.textContent = `App: ${item.app} · Assigned to: ${item.assignee === 'Unassigned' ? 'Unassigned' : '@' + item.assignee}`;
  promptDocLink.href = docUrl;

  promptContentPre.textContent   = 'Loading prompt document...';
  promptCopyFeedback.style.display = 'none';
  promptModal.style.display        = 'flex';

  // Focus the close button; fall back to first focusable element in the modal.
  const closeBtn = promptModalClose || _promptModalFocusable()[0] || null;
  if (closeBtn) closeBtn.focus();

  try {
    const res = await fetch(docUrl);
    if (res.ok) {
      const text = await res.text();
      currentActivePromptText      = text;
      promptContentPre.textContent = text;
    } else {
      currentActivePromptText =
        `# Start Prompt: Fix #${item.number} on ${item.app}\n\n` +
        `Role: DevOps Coding Engineer / Lead (${item.assignee === 'Unassigned' ? 'Unassigned' : '@' + item.assignee})\n` +
        `Repository: ${item.repo}\n` +
        `Issue URL: ${item.url}\n\n` +
        `Task:\n${item.description}\n\n` +
        `1. Check out branch for issue #${item.number}.\n` +
        `2. Implement fix matching Ensign design system.\n` +
        `3. Test locally and submit PR closing #${item.number}.`;
      promptContentPre.textContent = currentActivePromptText;
    }
  } catch (err) {
    currentActivePromptText =
      `# Start Prompt: #${item.number} ${item.title}\n\n` +
      `Repository: ${item.repo}\n` +
      `Task: ${item.description}`;
    promptContentPre.textContent = currentActivePromptText;
  }
};

// ── closePromptModal ───────────────────────────────────────────────────────
function closePromptModal() {
  if (!promptModal) return;
  promptModal.style.display = 'none';
  _promptModalBackground.forEach((wasInert, el) => { el.inert = wasInert; });
  _promptModalBackground.clear();
  // Restore focus only if the opener is still part of the live DOM
  if (_promptModalOpener && _promptModalOpener.isConnected) {
    _promptModalOpener.focus();
  }
  _promptModalOpener = null;
}

// ── Modal keyboard handler: Escape + Tab/Shift+Tab focus trap ──────────────
// role=dialog aria-modal=true aria-labelledby=prompt-modal-title applied
// to the wrapper element via supervisor HTML transform (not here).
promptModal.addEventListener('keydown', function (e) {
  // Skip entirely while modal is hidden (belt-and-suspenders guard)
  if (promptModal.style.display === 'none') return;

  // Escape → close and restore opener
  if (e.key === 'Escape') {
    e.preventDefault();
    closePromptModal();
    return;
  }

  // Tab / Shift+Tab → trap within visible+enabled interactive elements
  if (e.key === 'Tab') {
    const focusable = _promptModalFocusable();

    if (!focusable.length) {
      e.preventDefault();   // nothing to tab to; keep focus from leaving
      return;
    }

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      // Shift+Tab at first element (or focus escaped the modal) → wrap to last
      if (active === first || !promptModal.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab at last element (or focus escaped the modal) → wrap to first
      if (active === last || !promptModal.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  }
});

if (promptModalClose) promptModalClose.addEventListener('click', closePromptModal);

if (promptCopyBtn) {
  promptCopyBtn.addEventListener('click', () => {
    if (!currentActivePromptText) return;
    navigator.clipboard.writeText(currentActivePromptText).then(() => {
      promptCopyFeedback.style.display = 'inline-block';
      setTimeout(() => {
        promptCopyFeedback.style.display = 'none';
      }, 3500);
    }).catch(err => {
      console.error('Clipboard copy failed:', err);
    });
  });
}

function renderColumn(container, items) {
  container.innerHTML = '';
  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state">No requests in this lane</div>';
    return;
  }

  // Sort items by urgency weight: critical > high > medium > low
  const weights = { critical: 4, high: 3, medium: 2, low: 1 };
  const sorted = [...items].sort((a, b) => (weights[b.urgency] || 0) - (weights[a.urgency] || 0));

  sorted.forEach(item => {
    const card = document.createElement('div');
    card.className = 'task-card';

    const urgencyClass = `badge-urgency-${item.urgency}`;
    const dateFormatted = new Date(item.completedAt || item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });

    const isDone = item.status === 'done';
    const dateLabel = isDone ? `Completed ${dateFormatted}` : `Opened ${dateFormatted}`;

    card.innerHTML = `
      <div class="card-top">
        <span class="badge badge-app">${escapeHTML(item.app)}</span>
        <span class="badge ${urgencyClass}">${escapeHTML(item.urgency.toUpperCase())}</span>
      </div>
      <h3 class="card-title">
        <a href="${item.url}" target="_blank" rel="noopener">
          #${item.number}: ${escapeHTML(item.title)}
        </a>
      </h3>
      <p class="card-desc">${escapeHTML(item.description)}</p>
      <div class="card-footer">
        <div class="card-assignee">
          ${item.assigneeAvatar ? `<img src="${item.assigneeAvatar}" alt="" class="avatar">` : '<span class="avatar" aria-hidden="true"></span>'}
          <span>${item.assignee === 'Unassigned' ? 'Unassigned' : '@' + escapeHTML(item.assignee)}</span>
        </div>
        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <button class="btn-start-prompt" onclick="event.stopPropagation(); openAppfixPromptModal('${item.id}')" title="Run start prompt for this issue">
            Run Prompt
          </button>
          <span class="card-date">${dateLabel}</span>
          <a href="${item.url}" target="_blank" rel="noopener" class="card-meta-link">
            <span>GitHub</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
          </a>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Event Listeners
searchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  render();
});

filterApp.addEventListener('change', (e) => {
  state.filterApp = e.target.value;
  render();
});

filterUrgency.addEventListener('change', (e) => {
  state.filterUrgency = e.target.value;
  render();
});

refreshBtn.addEventListener('click', () => {
  fetchLiveIssues();
});

// Initial Render and Live Fetch
render();
fetchLiveIssues();
