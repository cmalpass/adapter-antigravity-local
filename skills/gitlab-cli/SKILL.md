---
name: gitlab-cli
description: Comprehensive guide and best practices for automating GitLab repositories, merge requests, issues, CI/CD pipelines, and API queries using the official GitLab CLI (glab).
---

# GitLab CLI (`glab`) Skill

This skill provides authoritative workflows, command recipes, and best practices for interacting with self-hosted and cloud GitLab instances via the official **`glab`** CLI binary.

---

## 1. Environment & Authentication

In this environment, `glab` is pre-authenticated against the self-hosted GitLab server:
* **Host URL**: `http://192.168.1.32:8929`
* **API Version**: REST `v4` / GraphQL
* **Default Protocol**: SSH (`port 2424`) for Git operations, HTTP for API requests
* **Authenticated User**: `@paperclip` (`glpat-GxGjzNGDusLfncG8oGGAPlKx`)

To check authentication status at any time:
```bash
glab auth status --hostname 192.168.1.32:8929
```

---

## 2. Project Target Resolution (`-R`)

* **Inside a cloned repository:** `glab` automatically discovers the remote project from git remotes (`origin`).
* **Outside a repository:** Specify the repository with `-R <namespace>/<project>`:
  ```bash
  glab mr list -R cmalpass/adapter-antigravity-local
  ```

---

## 3. Merge Requests (`glab mr`)

### Create a Merge Request
```bash
# Basic interactive-free creation
glab mr create \
  -b main \
  -s feature/new-logic \
  -t "feat: add user authentication flow" \
  -d "Detailed summary of changes implemented." \
  --remove-source-branch \
  --yes
```

### Inspect & Review Merge Requests
```bash
# List open merge requests
glab mr list -R cmalpass/<repo>

# View MR details and metadata
glab mr view <mr_id> -R cmalpass/<repo>

# View changes / git diff of an MR
glab mr diff <mr_id> -R cmalpass/<repo>

# Add a comment / review note
glab mr note <mr_id> -m "Changes look solid. Verified tests pass." -R cmalpass/<repo>
```

### Approve & Merge
```bash
# Approve an MR
glab mr approve <mr_id> -R cmalpass/<repo>

# Merge an MR automatically
glab mr merge <mr_id> --yes --remove-source-branch -R cmalpass/<repo>
```

---

## 4. Issues & Discussions (`glab issue`)

```bash
# List open issues
glab issue list -R cmalpass/<repo>

# Create a new issue
glab issue create \
  --title "Bug: rate limit exceeded on batch sync" \
  --description "Steps to reproduce..." \
  --label "bug" \
  -R cmalpass/<repo>

# View issue description and comments
glab issue view <issue_id> -R cmalpass/<repo>

# Comment on an issue
glab issue note <issue_id> -m "Investigating root cause in auth middleware." -R cmalpass/<repo>

# Close an issue
glab issue close <issue_id> -R cmalpass/<repo>
```

---

## 5. CI/CD Pipelines & Job Logs (`glab ci` / `glab pipeline`)

```bash
# Check current / latest pipeline status
glab pipeline status -R cmalpass/<repo>

# List recent pipeline runs
glab pipeline list -R cmalpass/<repo>

# View live pipeline trace / logs for a job
glab ci trace <job_id> -R cmalpass/<repo>

# Retry a failed job or pipeline
glab ci retry <job_id> -R cmalpass/<repo>
```

---

## 6. Repository Discovery & Cloning (`glab repo`)

```bash
# Clone a repository using SSH
glab repo clone cmalpass/<repo>

# Search repositories across the instance
glab repo search "search-term"

# View repository summary and README
glab repo view cmalpass/<repo>
```

---

## 7. Raw API Invocations (`glab api`)

For advanced operations not covered by dedicated subcommands, invoke GitLab's REST API directly:

```bash
# List repository branches via REST API
glab api projects/cmalpass%2F<repo>/repository/branches

# Fetch project commit history
glab api projects/cmalpass%2F<repo>/repository/commits

# Execute a GraphQL query
glab api graphql -f query='
  query {
    project(fullPath: "cmalpass/tiny-rex") {
      name
      pipelines(first: 3) {
        nodes {
          id
          status
        }
      }
    }
  }
'
```

---

## 8. Best Practices for Autonomous Agents

1. **Always Use `--yes` / Non-Interactive Flags:** Never run commands that prompt on terminal stdin (e.g. use `-t "title" -d "body" --yes` with `glab mr create`).
2. **Handle Special Characters:** When passing multiline descriptions or markdown in `--description` / `-d`, use proper shell escaping or temporary files.
3. **Verify Ref Updates:** After merging an MR or pushing code, run `glab pipeline status` to monitor CI test health before finalizing tasks.
