#!/usr/bin/env python3
"""scripts/appfix_dispatch.py — appfix-cis skill dispatcher."""
import argparse, json, os, re, subprocess, sys, tempfile
from pathlib import Path

OWNER    = "robbagley-afk"
DASH     = "ensign-appfix-dashboard"
ASSIGNEE = "Rodrigomoll"
REPOS    = ["ENS-101-Guide","ensign-student-readiness-hub","ensign-career-fair-coach",
            "major-career-explorer-coach-ai","ai-agents-local-llm","ensign-design-system",DASH]
APPS     = ["ens101","readiness","career-fair","career-explorer","mentor-explorer",
            "local-suite","design-system","appfix"]
APP_REPO = {
    "ens101":          "ENS-101-Guide",
    "readiness":       "ensign-student-readiness-hub",
    "career-fair":     "ensign-career-fair-coach",
    "career-explorer": "major-career-explorer-coach-ai",
    "mentor-explorer": "major-career-explorer-coach-ai",
    "local-suite":     "ai-agents-local-llm",
    "design-system":   "ensign-design-system",
    "appfix":          DASH,
}
KEY_RE = re.compile(r'^[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]$')

# ---------------------------------------------------------------------------
# gh wrapper — raises RuntimeError; never calls sys.exit; network checked first
# ---------------------------------------------------------------------------

def gh(*args, check=True):
    try:
        r = subprocess.run(["gh", *args], capture_output=True, text=True)
    except FileNotFoundError:
        raise RuntimeError("FATAL: gh CLI not found — install from https://cli.github.com/")
    if check and r.returncode != 0:
        e = r.stderr.strip()
        # Network / DNS / connectivity MUST be diagnosed before auth
        if any(t in e.lower() for t in
               ("network","dial","timeout","connect","tls","dns",
                "no such host","connection refused","unreachable","i/o timeout")):
            raise RuntimeError(
                "NETWORK ERROR: Cannot reach GitHub API.\n"
                "Diagnostic steps:\n"
                "  1. Verify internet connectivity.\n"
                "  2. Confirm DNS resolves api.github.com.\n"
                "  3. Check firewall / proxy / VPN settings.\n"
                "Do NOT modify credentials — this is a network/DNS issue, not an auth issue.\n"
                f"Detail: {e}"
            )
        if any(t in e.lower() for t in
               ("authentication","401","token","credential","unauthorized")):
            raise RuntimeError(
                "AUTH ERROR: gh token may be invalid, expired, or missing host permission.\n"
                "Diagnostic: run `gh auth status` to inspect supported hosts and scopes.\n"
                "If the host is listed and scopes appear correct, contact the repo owner.\n"
                "Do NOT run `gh auth login` without real evidence of token expiry or missing host.\n"
                f"Detail: {e}"
            )
        raise RuntimeError(f"gh({r.returncode}): {e}")
    return r


def api_slurp(path):
    r = gh("api", "--paginate", "--slurp", path)
    raw = json.loads(r.stdout)
    return [item for page in raw for item in (page if isinstance(page, list) else [page])]


def preflight(repo):
    r = gh("api", f"repos/{OWNER}/{repo}", check=False)
    if r.returncode:
        e = r.stderr.strip()
        tag = "REPO NOT FOUND" if "404" in e else "PREFLIGHT FAILED"
        raise RuntimeError(f"{tag}: {OWNER}/{repo}\n{e}")
    m = json.loads(r.stdout)
    if not m.get("has_issues"):
        raise RuntimeError(
            f"Issues disabled on {OWNER}/{repo} — enable in repo Settings › Features."
        )
    return m


# label for type is bare itype value, not "type:{itype}"
def ensure_labels(repo, urgency, itype, dry_run):
    want = {
        "appfix":          "0075ca",
        f"urgency:{urgency}": "e4e669",
        itype:             "d93f0b",   # e.g. "bug", not "type:bug"
    }
    have = {l["name"] for l in api_slurp(f"repos/{OWNER}/{repo}/labels")}
    for name, color in want.items():
        if name not in have:
            if dry_run:
                print(f"  [dry-run] would create label '{name}' on {repo}")
            else:
                gh("api", "--method", "POST", f"repos/{OWNER}/{repo}/labels",
                   "-f", f"name={name}", "-f", f"color={color}", "-f", "description=")
    return list(want.keys())


# exclude pull_request entries from duplicate scan
def find_dup(repo, key):
    marker = f"<!-- appfix-request: {key} -->"
    for iss in api_slurp(
        f"repos/{OWNER}/{repo}/issues?state=all&labels=appfix&per_page=100"
    ):
        if "pull_request" in iss:          # skip PRs
            continue
        if marker in (iss.get("body") or ""):
            return iss
    return None


def decorated_body(text, key, app):
    return (
        f"{text}\n\n"
        f"<!-- appfix-request: {key} -->\n"
        f"<!-- appfix-app: {app} -->\n"
    )


# readback verifies required labels + Rodrigomoll assignee
def verify_issue_readback(repo, number, expected_labels):
    """Returns (issue_dict, warnings_list). Warnings are non-empty when verification fails."""
    m = json.loads(gh("api", f"repos/{OWNER}/{repo}/issues/{number}").stdout)
    actual_labels    = {l["name"] for l in m.get("labels", [])}
    actual_assignees = {a["login"] for a in m.get("assignees", [])}
    warnings = []
    missing = set(expected_labels) - actual_labels
    if missing:
        warnings.append(f"missing_labels: {sorted(missing)}")
    if ASSIGNEE not in actual_assignees:
        warnings.append(
            f"assignee '{ASSIGNEE}' not set; actual: {sorted(actual_assignees)}"
        )
    return m, warnings


# RuntimeError propagates to main; never sys.exit here
def make_issue(repo, title, body, labels, dry_run):
    if dry_run:
        # no body or sensitive private title in dry-run output
        print(f"  [dry-run] would create issue in {OWNER}/{repo} "
              f"labels={labels} assignee={ASSIGNEE}")
        return None
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as tf:
        tf.write(body)
        tf_name = tf.name
    created_url = None
    try:
        r = gh("issue", "create",
               "--repo",       f"{OWNER}/{repo}",
               "--title",      title,
               "--body-file",  tf_name,
               "--assignee",   ASSIGNEE,
               "--label",      ",".join(labels))
        num = r.stdout.strip().rstrip("/").split("/")[-1]
        created_url = f"https://github.com/{OWNER}/{repo}/issues/{num}"
        m, warnings = verify_issue_readback(repo, num, labels)
        if warnings:
            raise RuntimeError(
                f"Issue #{num} in {OWNER}/{repo} created but readback failed: "
                + "; ".join(warnings)
            )
        return m
    except RuntimeError as exc:
        # Preserve the created issue receipt even if verification is unavailable.
        if created_url:
            exc.created_url = created_url
        raise
    finally:
        os.unlink(tf_name)


# normalize --repo; accept short or owner/name; validate against allowlist
def normalize_repo(repo_arg):
    if "/" in repo_arg:
        owner_part, repo_arg = repo_arg.split("/", 1)
        if owner_part != OWNER:
            sys.exit(f"--repo owner must be '{OWNER}', got '{owner_part}'.")
    if repo_arg not in REPOS:
        sys.exit(f"--repo '{repo_arg}' not in allowlist: {REPOS}")
    return repo_arg


def main():
    p = argparse.ArgumentParser(prog="appfix_dispatch")
    # no choices= here; normalize_repo validates against allowlist
    p.add_argument("--repo",                required=True)
    p.add_argument("--app",                 required=True, choices=APPS)
    p.add_argument("--title",               required=True)
    p.add_argument("--body-file",           required=True, dest="body_file")
    p.add_argument("--request-key",         required=True, dest="key")
    p.add_argument("--urgency",             required=True,
                   choices=["critical","high","medium","low"])
    p.add_argument("--type",                required=True,
                   choices=["bug","enhancement","ui-design"], dest="itype")
    p.add_argument("--approved-public-title",     dest="pub_title")
    p.add_argument("--approved-public-body-file", dest="pub_body_file")
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args()

    # --- Pre-write validation (sys.exit acceptable; no receipt exists yet) ---

    # normalize + allowlist check before any gh calls
    a.repo = normalize_repo(a.repo)

    if not KEY_RE.match(a.key):
        sys.exit(
            "--request-key must be a lowercase slug 3–50 chars: "
            "a-z0-9 plus hyphens, no leading/trailing hyphen."
        )

    # app->repo mismatch fails before gh
    if APP_REPO[a.app] != a.repo:
        sys.exit(
            f"APP/REPO MISMATCH: '{a.app}' requires --repo {APP_REPO[a.app]}, "
            f"got {a.repo}."
        )

    # reject only-one-public-approval-arg BEFORE any writes
    if bool(a.pub_title) != bool(a.pub_body_file):
        sys.exit(
            "--approved-public-title and --approved-public-body-file "
            "must be provided together or not at all."
        )

    # read and check all text files BEFORE source creation
    bf = Path(a.body_file)
    if not bf.is_file():
        sys.exit(f"--body-file not found: {bf}")
    body_text = bf.read_text()

    pub_body_text = None
    if a.pub_body_file:
        pbf = Path(a.pub_body_file)
        if not pbf.is_file():
            sys.exit(f"--approved-public-body-file not found: {pbf}")
        pub_body_text = pbf.read_text()
        if not pub_body_text.strip():
            sys.exit(f"--approved-public-body-file is empty: {pbf}")

    # --- Receipt object — populated progressively; always emitted on error ---
    out = {
        "request_key": a.key,
        "repo":        f"{OWNER}/{a.repo}",
        "duplicate":   False,
        "source_url":  None,
        "source_verified": False,
    }
    stage = "init"

    try:
        # Auth gate — diagnostic only; never modifies credentials
        stage = "auth_gate"
        gh("api", "user")

        stage = "source_preflight"
        src_meta  = preflight(a.repo)
        is_public = not src_meta.get("private", True)

        # dry-run prints planned ops; no body, no private title
        if a.dry_run:
            visibility = "public" if is_public else "private"
            print(f"[dry-run] {OWNER}/{a.repo} ({visibility})")
            print(f"[dry-run] key={a.key}  app={a.app}  "
                  f"urgency={a.urgency}  type={a.itype}")
            if is_public:
                print(f"[dry-run] title={a.title}")   # safe only for public repos

        stage = "ensure_labels"
        labels = ensure_labels(a.repo, a.urgency, a.itype, a.dry_run)

        stage = "find_dup"
        dup = find_dup(a.repo, a.key)

        if dup:
            if re.findall(r"<!--\s*appfix-app:\s*([\w-]+)\s*-->", dup.get("body") or "") != [a.app]:
                raise RuntimeError("Request key is bound to another app or ambiguous metadata; use a distinct app-prefixed key.")
            out["duplicate"]  = True
            out["source_url"] = dup["html_url"]
            # verify dup labels + assignee; do not falsely report verified
            _, dup_warnings = verify_issue_readback(a.repo, str(dup["number"]), labels)
            if dup_warnings:
                out["source_verification_warnings"] = dup_warnings
                raise RuntimeError("Source verification failed: " + "; ".join(dup_warnings))
            if a.dry_run:
                print(f"  [dry-run] duplicate found: {dup['html_url']}")
        else:
            stage = "create_source"
            m = make_issue(
                a.repo, a.title,
                decorated_body(body_text, a.key, a.app),
                labels, a.dry_run
            )
            if m:
                out["source_url"] = m["html_url"]

        out["source_verified"] = bool(out["source_url"])

        # --- Dashboard mirroring ---
        # status values never claim "visible"; use source_public /
        #          mirror_published_pending_verification only
        if is_public:
            out["dashboard_status"] = "source_public"
            out["dashboard_issue_url"] = out["source_url"]
        elif not (a.pub_title and pub_body_text is not None):
            out["dashboard_status"] = "needs_public_summary_approval"
        else:
            # verify dashboard repo is PUBLIC before mirroring
            stage = "dash_preflight"
            dash_meta = preflight(DASH)
            if dash_meta.get("private", True):
                raise RuntimeError(
                    f"Dashboard repo {OWNER}/{DASH} is not public — "
                    "mirroring requires a public dashboard. "
                    "Stop and select an approved public tracking repository; do not change repository visibility."
                )

            stage = "dash_ensure_labels"
            dl = ensure_labels(DASH, a.urgency, a.itype, a.dry_run)

            stage = "dash_find_dup"
            ddup = find_dup(DASH, a.key)

            if ddup:
                if re.findall(r"<!--\s*appfix-app:\s*([\w-]+)\s*-->", ddup.get("body") or "") != [a.app]:
                    raise RuntimeError("Public tracker request key is bound to another app or ambiguous metadata.")
                out["dashboard_issue_url"] = ddup["html_url"]
                _, dwarn = verify_issue_readback(DASH, str(ddup["number"]), dl)
                if dwarn:
                    raise RuntimeError("Public tracker verification failed: " + "; ".join(dwarn))
                out.update({
                    "dashboard_issue_url": ddup["html_url"],
                    "dashboard_status":    "existing_mirror",
                })
            else:
                stage = "dash_create_mirror"
                dm = make_issue(
                    DASH, a.pub_title,
                    decorated_body(pub_body_text, a.key, a.app),
                    dl, a.dry_run
                )
                if dm:
                    out.update({
                        "dashboard_issue_url": dm["html_url"],
                        # pending_verification — skill/browser must confirm
                        "dashboard_status":    "mirror_published_pending_verification",
                    })
                else:
                    out["dashboard_status"] = "dry_run"

    # any RuntimeError after init emits JSON with source_url + stage
    except RuntimeError as exc:
        if getattr(exc, "created_url", None):
            field = "source_url" if stage == "create_source" else "dashboard_issue_url"
            out[field] = exc.created_url
        out["stage"] = stage
        out["error"] = str(exc)
        print(json.dumps(out, indent=2))
        sys.exit(1)

    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
