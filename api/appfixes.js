const fs = require('fs');
const path = require('path');

let memoryIssues = null;

function loadIssues() {
  if (memoryIssues) return memoryIssues;
  try {
    const dataPath = path.join(process.cwd(), 'data', 'appfixes.json');
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf8');
      memoryIssues = JSON.parse(raw);
      return memoryIssues;
    }
  } catch (err) {
    console.error('Error reading data/appfixes.json:', err);
  }
  return [];
}

function saveIssues(issues) {
  memoryIssues = issues;
  try {
    const dataPath = path.join(process.cwd(), 'data', 'appfixes.json');
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(issues, null, 2), 'utf8');
  } catch (err) {
    console.warn('Note: Persistent file write not available in lambda, state retained in-memory.');
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const issues = loadIssues();

  // GET: List, filter, or fetch issues
  if (req.method === 'GET') {
    const { id, app, repo, status, urgency, view, search } = req.query || {};

    if (id) {
      const found = issues.find(i => i.id === id || String(i.number) === String(id));
      if (!found) return res.status(404).json({ error: 'Issue not found', id });
      return res.status(200).json(found);
    }

    let results = [...issues];

    if (app && app !== 'all') {
      const a = app.toLowerCase();
      results = results.filter(i => (i.app || '').toLowerCase().includes(a));
    }

    if (repo && repo !== 'all') {
      const r = repo.toLowerCase();
      results = results.filter(i => (i.repo || '').toLowerCase().includes(r));
    }

    if (status && status !== 'all') {
      results = results.filter(i => (i.status || '').toLowerCase() === status.toLowerCase());
    }

    if (urgency && urgency !== 'all') {
      results = results.filter(i => (i.urgency || '').toLowerCase() === urgency.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(i => 
        (i.title || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.app || '').toLowerCase().includes(q)
      );
    }

    if (view && view.toLowerCase() === 'kanban') {
      const backlog = results.filter(i => i.status === 'backlog');
      const inProgress = results.filter(i => i.status === 'in-progress' || i.status === 'progress');
      const qa = results.filter(i => i.status === 'qa' || i.status === 'testing');
      const done = results.filter(i => i.status === 'done' || i.status === 'completed');

      return res.status(200).json({
        view: 'kanban',
        total: results.length,
        columns: {
          backlog,
          inProgress,
          qa,
          done
        },
        counts: {
          backlog: backlog.length,
          inProgress: inProgress.length,
          qa: qa.length,
          done: done.length
        }
      });
    }

    return res.status(200).json(results);
  }

  // POST: Create / Submit new AppFix Issue
  if (req.method === 'POST') {
    const body = req.body || {};
    if (!body.title) {
      return res.status(400).json({ error: 'Title is required for an appfix issue.' });
    }

    const id = body.id || `appfix-${Date.now()}`;
    const newIssue = {
      id,
      repo: body.repo || 'robbagley-afk/ensign-appfix-dashboard',
      app: body.app || 'Ensign College Portfolio',
      number: body.number || (issues.length + 100),
      title: body.title,
      description: body.description || '',
      url: body.url || `https://github.com/${body.repo || 'robbagley-afk/ensign-appfix-dashboard'}/issues`,
      urgency: body.urgency || 'medium', // critical, high, medium, low
      status: body.status || 'backlog', // backlog, in-progress, qa, done
      assignee: body.assignee || 'Rodrigomoll',
      assigneeAvatar: body.assigneeAvatar || 'https://github.com/Rodrigomoll.png',
      createdAt: new Date().toISOString(),
      completedAt: body.status === 'done' ? new Date().toISOString() : null,
      labels: Array.isArray(body.labels) ? body.labels : ['appfix', `urgency:${body.urgency || 'medium'}`]
    };

    issues.unshift(newIssue);
    saveIssues(issues);

    return res.status(201).json({ success: true, issue: newIssue });
  }

  // PATCH: Update AppFix Issue Status or Details
  if (req.method === 'PATCH') {
    const body = req.body || {};
    const id = body.id || req.query.id;
    if (!id) {
      return res.status(400).json({ error: 'Issue id is required.' });
    }

    const issue = issues.find(i => i.id === id || String(i.number) === String(id));
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found.', id });
    }

    if (body.status !== undefined) {
      issue.status = body.status;
      if (body.status === 'done' && !issue.completedAt) {
        issue.completedAt = new Date().toISOString();
      } else if (body.status !== 'done') {
        issue.completedAt = null;
      }
    }
    if (body.urgency !== undefined) issue.urgency = body.urgency;
    if (body.title !== undefined) issue.title = body.title;
    if (body.description !== undefined) issue.description = body.description;
    if (body.assignee !== undefined) issue.assignee = body.assignee;
    if (body.url !== undefined) issue.url = body.url;
    if (Array.isArray(body.labels)) issue.labels = body.labels;

    saveIssues(issues);
    return res.status(200).json({ success: true, issue });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
