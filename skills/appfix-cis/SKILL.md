---
name: appfix-cis
description: "Dispatch verified Ensign app improvement requests as GitHub issues assigned to Rodrigo Moll, and verify their visibility on the public AppFix dashboard."
---

# AppFix CIS

Use this skill to dispatch real AppFix issues. Do not implement application code unless separately requested.
## Routing

Route only from explicit app identity confirmed by the request, video/UI, or source evidence. Ask when uncertain; never infer an app from roadmap terminology.
Verify the target repository exists, is accessible, and has the expected visibility with a real gh api repos/OWNER/REPO call.
Supported GitHub host: github.com
Owner: robbagley-afk
App registry:
ens101 -> ENS-101-Guide
readiness -> ensign-student-readiness-hub
career-fair -> ensign-career-fair-coach
career-explorer -> major-career-explorer-coach-ai
mentor-explorer -> major-career-explorer-coach-ai (Mentor Career Explorer variant)
local-suite -> ai-agents-local-llm
design-system -> ensign-design-system
appfix -> ensign-appfix-dashboard
Never route Mentor Career Explorer to a nonexistent standalone repository.
## GitHub Access

Prefer GitHub MCP when it provides the required capability. gh is available for actual issue creation when a connector is read-only.
Before browser fallback, test CLI host/network access. Network-sandbox gh auth errors do not prove a token expired: retry with supported host permissions first.
Never reauthenticate or reconfigure GitHub without evidence that credentials are invalid. Never place tokens in browser flows or make repositories public.
## Preferred Dispatcher

Prefer bundled scripts/appfix_dispatch.py.
Resolve the script path from this skill folder and use that folder as the working directory. Use the available Python 3 executable.

Exact base invocation:
python3 scripts/appfix_dispatch.py --repo REPO --app APP --title TITLE --body-file BODY_FILE --request-key REQUEST_KEY --urgency URGENCY --type TYPE
Optional: --dry-run
For an approved public summary, rerun the same request key with:
--approved-public-title TITLE --approved-public-body-file BODY_FILE
Pass issue bodies through files; never interpolate them into shell commands.
For every public repository, use a minimal non-sensitive summary. Keep private recordings, attachments, private issue text, and student records out of public bodies. Obtain explicit approval before publishing any material whose public disclosure is uncertain.
Use an app-prefixed request key that stays unchanged for retries. The command accepts a short repo name or owner/repo.
The dispatcher must preflight labels, create atomically with labels and assignee Rodrigomoll, use an idempotent request marker, and read back the created issue.
If the script is absent, a capable gh CLI or connector may execute the same contract. Do not claim unsupported capabilities.
## Private Sources and Dashboard

The public dashboard cannot anonymously read private GitHub source issues.
For a private primary issue, leave dashboard_status as needs_public_summary_approval until the user approves a public title/body and the same request key is rerun with the approval arguments.
Never automatically copy a private issue body, recording, attachment, or sourceURL into a public issue.
An approved public mirror belongs only in ensign-appfix-dashboard and contains only approved text plus app metadata. Public primary issues can display directly.
Legacy /api/appfixes calls or MCP-local records alone do not constitute a GitHub issue or durable deployment.
## UI Criteria

For applicable UI requests, include Ensign design criteria:
Controls: 56px
Navigation: 48px
States: focus, default, hover, active, disabled
## Verification

Before claiming completion:
Verify the source issue number, labels, and assignee from GitHub.
Verify the correct urgency labels.
Open https://ensign-appfix-dashboard.vercel.app.
Use Refresh Live and verify the displayed item links to the expected GitHub issue.
Report source creation and dashboard publication as separate stages. State the exact blocker when either stage is pending.
Final reporting must include the issue link, confirmation of assignment to Rodrigo, urgency labels, and dashboard status as verified or pending.
Create no sample/test issues unless a real task explicitly requests them.
