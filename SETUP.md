# Setup Instructions

This document explains how to install and configure the Antigravity Local Adapter for Paperclip AI.

Repository:

* @weslleycapelari/adapter-antigravity-local

---

## Prerequisites

Before starting, ensure the following tools are installed and working:

* Node.js 20+
* npm
* Paperclip AI
* Antigravity CLI (`agy`)

Verify installation:

```bash
node --version
npm --version
agy --version
```

---

## Install the Adapter

Navigate to the Paperclip extensions directory:

```bash
cd ~/.paperclip/extensions
```

Install the package:

```bash
npm install @weslleycapelari/adapter-antigravity-local
```

---

## Register the Adapter

Edit:

```text
~/.paperclip/adapter-plugins.json
```

If the file already contains other adapters, append this entry to the existing JSON array:

```json
[
  {
    "id": "agy",
    "type": "antigravity_local",
    "packageName": "@weslleycapelari/adapter-antigravity-local",
    "localPath": "~/.paperclip/extensions/node_modules/@weslleycapelari/adapter-antigravity-local"
  }
]
```

### Important

The property:

```json
"type": "antigravity_local"
```

is required.

Without it, Paperclip may classify the adapter as a builtin adapter and it may not appear correctly in the frontend UI.

---

## Running in Docker / Container Environments

### 1. Install Antigravity CLI in Container
Add the following to your `Dockerfile` or run inside the container:

```bash
curl -sSL https://antigravity.google/install.sh | bash
export PATH="$HOME/.gemini/antigravity-cli/bin:$HOME/.local/bin:$PATH"
```

### 2. Persisting Authentication Across Container Restarts

Antigravity stores OAuth tokens and configuration in `~/.gemini/`.

#### Approach A: Host Mount (Recommended)
Mount your host's authenticated `~/.gemini` folder into the container's home directory:

```yaml
# docker-compose.yml
services:
  paperclip:
    image: paperclip:latest
    volumes:
      - ~/.gemini:/root/.gemini
      - ~/.paperclip:/root/.paperclip
      - ./workspace:/workspace
    environment:
      - PATH=/root/.gemini/antigravity-cli/bin:/usr/local/bin:/usr/bin:/bin
```

#### Approach B: In-Container Login with Named Volume
If running on an isolated server:

1. Map a named volume to `/root/.gemini` (e.g. `agy-auth-data:/root/.gemini`).
2. Run `agy --print "hello" --dangerously-skip-permissions` inside the container.
3. Open the OAuth link in your browser, complete Google login, and credentials will persist to the volume.

---

## Restart Paperclip

Stop the server:

```bash
Ctrl + C
```

Start again:

```bash
npx paperclipai run
```

---

## Verify Installation

Open the Paperclip Web UI.

Create or edit an agent.

Verify that:

* **Antigravity Local** appears in the Adapter dropdown.
* Modern models (`Gemini 3.7 Flash (High/Med/Low)`, `Claude Sonnet 4.6 (Thinking)`, etc.) are displayed correctly.
* Multi-turn conversations resume seamlessly and token spend is tracked.

---

## Troubleshooting

### Adapter does not appear

Verify:

```json
"type": "antigravity_local"
```

is present in `adapter-plugins.json`.

### Package not found

Reinstall:

```bash
npm install @weslleycapelari/adapter-antigravity-local
```

### Changes not applied

Restart the Paperclip server. Paperclip caches adapter metadata during startup.

---

## Acknowledgements

Special thanks to Ryan Lee for helping test the Paperclip integration, identifying adapter registration requirements, and contributing setup documentation and feedback.

