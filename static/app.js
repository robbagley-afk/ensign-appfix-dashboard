/**
 * Ensign AppFix Dashboard
 * Continuous DevOps & Agile Improvement Pipeline
 * Team Lead: Rodrigo Moll (@Rodrigomoll)
 */

const REPOSITORIES = [
  { name: 'ENS 101 Guide', repo: 'robbagley-afk/ENS-101-Guide' },
  { name: 'Student Readiness Hub', repo: 'robbagley-afk/ensign-student-readiness-hub' },
  { name: 'Career Fair Coach', repo: 'robbagley-afk/ensign-career-fair-coach' },
  { name: 'Career Explorer', repo: 'robbagley-afk/major-career-explorer-coach-ai' },
  { name: 'Local Agent Suite', repo: 'robbagley-afk/ai-agents-local-llm' }
];

// Fallback / Initial Seed Dataset
const SEED_ISSUES = [
  {
    id: 'ens101-28',
    repo: 'robbagley-afk/ENS-101-Guide',
    app: 'ENS 101 Guide',
    number: 28,
    title: 'Next Step button: Amazon orange and completion glow',
    description: 'Update the Next Step button to Amazon orange (#FF9900) and have it light up when all tasks/checklists on each page of the ENS 101 app are completed.',
    url: 'https://github.com/robbagley-afk/ENS-101-Guide/issues/28',
    urgency: 'high',
    status: 'backlog',
    assignee: 'Rodrigomoll',
    assigneeAvatar: 'https://github.com/Rodrigomoll.png',
    createdAt: '2026-10-26T20:41:37Z',
    labels: ['appfix', 'urgency:high', 'enhancement']
  },
  {
    id: 'srh-mock-1',
    repo: 'robbagley-afk/ensign-student-readiness-hub',
    app: 'Student Readiness Hub',
    number: 27,
    title: 'VMock Full Module Ingestion: LinkedIn, Aspire, Resume Opt, Pitch',
    description: 'Expanded student readiness scoring to ingest all 6 VMock reporting modules from 9.7MB production export.',
    url: 'https://github.com/robbagley-afk/ensign-student-readiness-hub/pull/27',
    urgency: 'medium',
    status: 'done',
    assignee: 'Rodrigomoll',
    assigneeAvatar: 'https://github.com/Rodrigomoll.png',
    createdAt: '2026-10-26T12:00:00Z',
    labels: ['appfix', 'urgency:medium']
  },
  {
    id: 'suite-mock-2',
    repo: 'robbagley-afk/ai-agents-local-llm',
    app: 'Local Agent Suite',
    number: 23,
    title: 'Gemini Cloud Fallback Removal from Local AI Suite',
    description: 'Decommission external Gemini cloud fallback across portfolio endpoints; route strictly to local LM Studio resident models.',
    url: 'https://github.com/robbagley-afk/ai-agents-local-llm/pull/23',
    urgency: 'high',
    status: 'done',
    assignee: 'Rodrigomoll',
    assigneeAvatar: 'https://github.com/Rodrigomoll.png',
    createdAt: '2026-10-26T15:30:00Z',
    labels: ['appfix', 'urgency:high']
  }
];

let state = {
  issues: [...SEED_ISSUES],
  filterApp: 'all',
  filterUrgency: 'all',
  searchQuery: '',
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

// Fetch live issues from GitHub public API
async function fetchLiveIssues() {
  state.loading = true;
  refreshBtn.disabled = true;
  refreshBtn.style.opacity = '0.7';

  try {
    const fetchPromises = REPOSITORIES.map(async ({ name, repo }) => {
      try {
        const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=all&per_page=50`, {
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        if (!res.ok) return [];
        const data = await res.json();
        
        return data
          .filter(item => {
            const labelNames = (item.labels || []).map(l => l.name);
            return labelNames.includes('appfix') || item.title.toLowerCase().includes('next step');
          })
          .map(item => ({
            id: `${repo}-${item.number}`,
            repo: repo,
            app: name,
            number: item.number,
            title: item.title,
            description: item.body ? item.body.slice(0, 180) + '...' : 'No description provided.',
            url: item.html_url,
            urgency: extractUrgency(item.labels),
            status: extractStatus(item),
            assignee: item.assignees?.[0]?.login || item.assignee?.login || 'Rodrigomoll',
            assigneeAvatar: item.assignees?.[0]?.avatar_url || 'https://github.com/Rodrigomoll.png',
            createdAt: item.created_at,
            labels: item.labels.map(l => l.name)
          }));
      } catch (err) {
        console.warn(`Error fetching ${repo}:`, err);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    const liveIssues = results.flat();

    if (liveIssues.length > 0) {
      // Merge with seed issues, prefer live
      const existingMap = new Map();
      liveIssues.forEach(iss => existingMap.set(iss.id, iss));
      SEED_ISSUES.forEach(iss => {
        if (!existingMap.has(iss.id)) existingMap.set(iss.id, iss);
      });
      state.issues = Array.from(existingMap.values());
    }
  } catch (err) {
    console.error('Failed to refresh issues:', err);
  } finally {
    state.loading = false;
    refreshBtn.disabled = false;
    refreshBtn.style.opacity = '1';
    render();
  }
}

// Render cards and metrics
function render() {
  const filtered = state.issues.filter(issue => {
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
    const dateFormatted = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });

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
          <img src="${item.assigneeAvatar}" alt="${item.assignee}" class="avatar">
          <span>@${escapeHTML(item.assignee)}</span>
        </div>
        <a href="${item.url}" target="_blank" rel="noopener" class="card-meta-link">
          <span>GitHub</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
        </a>
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
