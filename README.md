# Ensign AppFix

The public dashboard displays real GitHub issues labeled `appfix`. It reads all matching pages from the configured public repositories and excludes pull requests. Closed issues remain visible for seven days. A synchronization failure preserves the affected source's previous cards and shows a warning.

The AppFix skill and dispatcher are versioned in [skills/appfix-cis](skills/appfix-cis/SKILL.md). The dispatcher verifies GitHub access and repository visibility, creates required labels, assigns Rodrigo Moll, creates the issue with all labels, and reads it back. Repeating a stable request key reuses the same issue. Creation and dashboard verification are separate stages.

Private source issues are not fetched by the public dashboard. They require an explicitly approved public title and body, published as a tracking issue in this repository. The dispatcher never copies the private source title, body, attachment, or URL into that summary automatically. No GitHub token is sent to the browser. Do not use legacy in-memory API/MCP records as proof of GitHub creation or durable publication.

## Checks

```sh
python3 tests/test_dispatcher.py
node tests/test_dashboard.cjs
node --check app.js
```

The dispatcher tests use a fake GitHub process and do not create test issues. The dashboard tests cover pagination, pull-request exclusion, empty results, failures, summary mapping, and unknown app markers.

The four Ensign Career Coach stylesheets and reusable audit workflow are pinned together. See [ROLLOUT.md](ROLLOUT.md). Keep the root, `public/`, and `static/` web assets identical.
