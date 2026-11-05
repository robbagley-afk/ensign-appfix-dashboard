# Design rollout

| App | Owner | Branch | Release / phase | Audit | Visual review | Publication |
|---|---|---|---|---|---|---|
| AppFix Dashboard | Codex + Rob's Coding Helper / Token Saver | codex/appfix-workflow-repair | ad39d14638afe6a707ef7c7b4a3af6e2becee060 / Phase 2 | Static: 0 FAIL, 0 WARN. Runtime dashboard and active dialog: 0 FAIL, 0 WARN at 320, 375, 768, 1440, 1920. | 375 and 1440 reviewed. Additional 1280 grid and modal keyboard checks pass. | Independent style and workflow reviews approved after targeted corrections; ready for publication. |

Audited November 4, 2026. Root, public, and static copies match. The active-dialog audit hides the obscured background in its fixture because the generic hover audit otherwise tries to interact with covered page controls. The background is audited independently at the same five widths.

Independent reviews: style104b05ee-de8a-4b55-945d-1b9dff3539d7 with resolution686622bf-fb87-4924-9e2d-bf88ca1f78f5; workflow62997f19-bca3-4332-b772-7bfbdab983c8 with resolutionc7858136-b6a3-40c5-845f-360fcd155725. Core private/public boundary reviewed by Opus0a2eaa8a-56dd-4143-b43c-a23f3d284bee.

Visual evidence uses fictional issue data: [dashboard375](docs/screenshots/dashboard-375.png), [dashboard1440](docs/screenshots/dashboard-1440.png), [dialog375](docs/screenshots/modal-375.png), [dialog1440](docs/screenshots/modal-1440.png).
