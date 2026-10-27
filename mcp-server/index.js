#!/usr/bin/env node
/**
 * Ensign AppFix Dashboard - MCP Server
 * Continuous Agile App Improvement & DevOps Issue Pipeline
 * Team Lead: Rodrigo Moll (@Rodrigomoll)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATA_FILE = path.join(__dirname, '..', 'data', 'appfixes.json');

function loadIssues() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading data/appfixes.json:', err);
  }
  return [];
}

function saveIssues(issues) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(issues, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving data/appfixes.json:', err);
  }
}

// Tool Definitions
const TOOLS = [
  {
    name: 'list_appfix_issues',
    description: 'List application bug fixes, improvements, and feature requests from the Ensign AppFix dashboard.',
    inputSchema: {
      type: 'object',
      properties: {
        app: { type: 'string', description: 'Filter by Ensign application name (e.g. "ENS 101 Guide", "Student Readiness Hub", "Local Agent Suite").' },
        repo: { type: 'string', description: 'Filter by GitHub repository (e.g. "robbagley-afk/ENS-101-Guide").' },
        status: { type: 'string', enum: ['all', 'backlog', 'in-progress', 'qa', 'done'], description: 'Filter by sprint/board status.' },
        urgency: { type: 'string', enum: ['all', 'critical', 'high', 'medium', 'low'], description: 'Filter by urgency level.' }
      }
    }
  },
  {
    name: 'get_appfix_issue',
    description: 'Fetch complete details for a specific AppFix issue by ID or issue number.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique issue ID or GitHub issue number.' }
      },
      required: ['id']
    }
  },
  {
    name: 'submit_appfix_issue',
    description: 'Submit a new bug fix, UI polish, or feature request to Rodrigo Moll (@Rodrigomoll) and the AppFix dashboard.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Clear, concise issue title (e.g. "Orange Next Step button glow").' },
        app: { type: 'string', description: 'Target Ensign application (e.g. "ENS 101 Guide", "Career Fair Coach").' },
        repo: { type: 'string', description: 'Target GitHub repository (e.g. "robbagley-afk/ENS-101-Guide").' },
        description: { type: 'string', description: 'Detailed problem description and acceptance criteria.' },
        urgency: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Urgency priority (default: high).' },
        assignee: { type: 'string', description: 'DevOps lead assignee (default: "Rodrigomoll").' },
        url: { type: 'string', description: 'GitHub issue or PR URL.' }
      },
      required: ['title', 'app']
    }
  },
  {
    name: 'update_appfix_status',
    description: 'Update the sprint/kanban status of an AppFix issue.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Issue ID or number.' },
        status: { type: 'string', enum: ['backlog', 'in-progress', 'qa', 'done'], description: 'New workflow status.' },
        notes: { type: 'string', description: 'Optional progress notes or resolution summary.' }
      },
      required: ['id', 'status']
    }
  },
  {
    name: 'get_appfix_kanban_board',
    description: 'Get the full AppFix Kanban sprint board organized into columns (Backlog, In Progress, QA / Testing, Completed).',
    inputSchema: {
      type: 'object',
      properties: {
        app: { type: 'string', description: 'Filter board by specific application (optional).' }
      }
    }
  }
];

function handleToolCall(name, args) {
  const issues = loadIssues();

  switch (name) {
    case 'list_appfix_issues': {
      let filtered = issues;
      if (args.app && args.app !== 'all') {
        const a = args.app.toLowerCase();
        filtered = filtered.filter(i => (i.app || '').toLowerCase().includes(a));
      }
      if (args.repo && args.repo !== 'all') {
        const r = args.repo.toLowerCase();
        filtered = filtered.filter(i => (i.repo || '').toLowerCase().includes(r));
      }
      if (args.status && args.status !== 'all') {
        filtered = filtered.filter(i => (i.status || '').toLowerCase() === args.status.toLowerCase());
      }
      if (args.urgency && args.urgency !== 'all') {
        filtered = filtered.filter(i => (i.urgency || '').toLowerCase() === args.urgency.toLowerCase());
      }

      return {
        total: filtered.length,
        issues: filtered.map(i => ({
          id: i.id,
          app: i.app,
          number: i.number,
          title: i.title,
          urgency: i.urgency,
          status: i.status,
          assignee: i.assignee,
          url: i.url
        }))
      };
    }

    case 'get_appfix_issue': {
      const found = issues.find(i => i.id === args.id || String(i.number) === String(args.id));
      if (!found) return { error: `Issue not found: ${args.id}` };
      return found;
    }

    case 'submit_appfix_issue': {
      const id = `appfix-${Date.now()}`;
      const newIssue = {
        id,
        repo: args.repo || 'robbagley-afk/ensign-appfix-dashboard',
        app: args.app,
        number: issues.length + 101,
        title: args.title,
        description: args.description || '',
        url: args.url || `https://github.com/${args.repo || 'robbagley-afk/ensign-appfix-dashboard'}/issues`,
        urgency: args.urgency || 'high',
        status: 'backlog',
        assignee: args.assignee || 'Rodrigomoll',
        assigneeAvatar: 'https://github.com/Rodrigomoll.png',
        createdAt: new Date().toISOString(),
        completedAt: null,
        labels: ['appfix', `urgency:${args.urgency || 'high'}`]
      };

      issues.unshift(newIssue);
      saveIssues(issues);
      return { success: true, message: `Submitted AppFix issue "${newIssue.title}" to Rodrigo Moll (@Rodrigomoll)`, issue: newIssue };
    }

    case 'update_appfix_status': {
      const issue = issues.find(i => i.id === args.id || String(i.number) === String(args.id));
      if (!issue) return { error: `Issue not found: ${args.id}` };

      issue.status = args.status;
      if (args.status === 'done' && !issue.completedAt) {
        issue.completedAt = new Date().toISOString();
      } else if (args.status !== 'done') {
        issue.completedAt = null;
      }
      if (args.notes) {
        issue.description = (issue.description || '') + `\n\n[Update ${new Date().toISOString().split('T')[0]}]: ${args.notes}`;
      }

      saveIssues(issues);
      return { success: true, message: `Updated issue #${issue.number} status to "${args.status}"`, issue };
    }

    case 'get_appfix_kanban_board': {
      let filtered = issues;
      if (args.app && args.app !== 'all') {
        const a = args.app.toLowerCase();
        filtered = filtered.filter(i => (i.app || '').toLowerCase().includes(a));
      }

      const backlog = filtered.filter(i => i.status === 'backlog');
      const inProgress = filtered.filter(i => i.status === 'in-progress' || i.status === 'progress');
      const qa = filtered.filter(i => i.status === 'qa' || i.status === 'testing');
      const done = filtered.filter(i => i.status === 'done' || i.status === 'completed');

      return {
        board: 'Ensign AppFix DevOps Kanban Board',
        teamLead: 'Rodrigo Moll (@Rodrigomoll)',
        total: filtered.length,
        counts: {
          backlog: backlog.length,
          inProgress: inProgress.length,
          qa: qa.length,
          done: done.length
        },
        columns: {
          backlog,
          inProgress,
          qa,
          done
        }
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// JSON-RPC stdio protocol
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;

  try {
    const req = JSON.parse(line);

    if (req.method === 'initialize') {
      const resp = {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'ensign-appfix',
            version: '1.0.0'
          }
        }
      };
      process.stdout.write(JSON.stringify(resp) + '\n');
      return;
    }

    if (req.method === 'notifications/initialized') return;

    if (req.method === 'tools/list') {
      const resp = {
        jsonrpc: '2.0',
        id: req.id,
        result: { tools: TOOLS }
      };
      process.stdout.write(JSON.stringify(resp) + '\n');
      return;
    }

    if (req.method === 'tools/call') {
      const toolName = req.params.name;
      const toolArgs = req.params.arguments || {};
      const resultData = handleToolCall(toolName, toolArgs);

      const resp = {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resultData, null, 2)
            }
          ]
        }
      };
      process.stdout.write(JSON.stringify(resp) + '\n');
      return;
    }

    if (req.id !== undefined) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32601, message: `Method not found: ${req.method}` }
      }) + '\n');
    }
  } catch (err) {
    if (line.includes('"id":')) {
      try {
        const idMatch = line.match(/"id":\s*(\d+|"[^"]+")/);
        const id = idMatch ? JSON.parse(idMatch[1]) : null;
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id,
          error: { code: -32700, message: `Parse error: ${err.message}` }
        }) + '\n');
      } catch (_) {}
    }
  }
});
