# AgentBaton 🏃

**Pass context between AI coding agents without starting from scratch.**

---

## The problem

You're deep in a feature with Claude Code. You switch to Cursor to write tests. You open Codex to refactor something. Each new session has **zero memory** of the last one.

You end up pasting context manually, writing "here's where we left off…" in every prompt, and watching agents repeat decisions that were already made.

## What AgentBaton does

It's an MCP server that lets any AI coding agent drop a **baton** — a structured context snapshot — and any other agent pick it up instantly.

```
Claude Code →  baton_pass(tag="auth-feature", summary="…")  →  Supabase
Cursor      →  baton_receive(tag="auth-feature")             →  full briefing
```

No copy-paste. No "summarize what we did." No context re-explaining.

---

## Demo

```
┌─ Claude Code (just finished auth module) ──────────────────────────────────┐
│  baton_pass(                                                                │
│    tag="auth-feature",                                                      │
│    summary="Implemented JWT auth with refresh token rotation",              │
│    completed=["login endpoint", "token refresh", "logout"],                 │
│    pending=["email verification", "password reset"],                        │
│    key_decisions=["Used httpOnly cookies, not localStorage"],               │
│    files_touched=["src/auth/index.ts", "src/middleware/jwt.ts"],            │
│    next_agent_needs=["Test all 3 token expiry edge cases in Cursor"]        │
│  )                                                                          │
│  → Saved. ID: 3fa85164-… | Dashboard: https://rlasaf12.github.io/…        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ Cursor (next session) ────────────────────────────────────────────────────┐
│  baton_receive(tag="auth-feature")                                          │
│                                                                             │
│  # 🏃 Baton: auth-feature                                                   │
│  **From:** Claude Code  |  **When:** 2 hours ago                            │
│                                                                             │
│  ## Summary                                                                 │
│  Implemented JWT auth with refresh token rotation                           │
│                                                                             │
│  ## ✅ Completed                                                             │
│  - login endpoint                                                           │
│  - token refresh                                                            │
│  - logout                                                                   │
│                                                                             │
│  ## 🔲 Pending                                                              │
│  - email verification                                                       │
│  - password reset                                                           │
│                                                                             │
│  ## 📌 You need to                                                          │
│  - Test all 3 token expiry edge cases in Cursor                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Install

```bash
npm install -g agent-baton
```

Or run directly without installing:

```bash
npx agent-baton
```

### 2. Add to your MCP config

**Claude Code** — `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "agent-baton": {
      "command": "npx",
      "args": ["-y", "agent-baton"]
    }
  }
}
```

**Cursor** — `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "agent-baton": {
      "command": "npx",
      "args": ["-y", "agent-baton"]
    }
  }
}
```

**Cline** — add to your MCP server list in VS Code settings with the same `npx -y agent-baton` command.

### 3. Restart your editor

The 3 tools appear automatically: `baton_pass`, `baton_receive`, `list_batons`.

---

## The 3 tools

### `baton_pass` — save context before switching agents

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `tag` | string | ✅ | Identifier for this feature/task (e.g. `"auth-feature"`) |
| `summary` | string | ✅ | What you accomplished in this session |
| `project` | string | | Project name for grouping (default: `"default"`) |
| `agent_name` | string | | Who's passing it (e.g. `"claude-code"`, `"cursor"`) |
| `completed` | string[] | | What was finished |
| `pending` | string[] | | What still needs to be done |
| `key_decisions` | string[] | | Architecture/design choices made |
| `files_touched` | string[] | | Files created or modified |
| `blockers` | string[] | | What's blocked and why |
| `next_agent_needs` | string[] | | Specific instructions for whoever picks this up |

### `baton_receive` — pick up context in a new session

```
baton_receive(tag="auth-feature")
```

Returns a formatted markdown briefing with everything the previous agent left you. Always gets the most recent baton for that tag.

### `list_batons` — see all handoffs for a project

```
list_batons(project="my-app", limit=20)
```

---

## Use your own Supabase backend

By default, AgentBaton uses a shared demo instance (read/write, RLS enforced). To use your own:

1. Create a Supabase project
2. Run the schema (see `server/index.js` — the `CREATE TABLE` is in the comments)
3. Set env vars:

```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your_anon_key_here
```

Or copy `.env.example` → `.env` and fill in the values.

---

## Dashboard

View all your handoffs in the live web dashboard:

**[https://rlasaf12.github.io/agent-baton](https://rlasaf12.github.io/agent-baton)**

- Timeline of all batons per project
- Click any entry to see full context
- One-click copy of `baton_receive()` command
- Bring-your-own Supabase — configure via localStorage, no server needed

---

## What's inside

```
agent-baton/
├── server/
│   ├── index.js        # MCP server (3 tools: pass, receive, list)
│   ├── package.json    # npm package
│   └── .env.example    # bring-your-own Supabase
├── docs/
│   └── index.html      # static dashboard (GitHub Pages)
└── .github/
    └── workflows/
        └── pages.yml   # auto-deploy dashboard on push
```

---

## Why not just paste context manually?

You will. Until you've done it 50 times and started dreading mid-task agent switches. AgentBaton makes handoffs zero-friction — no more losing state just because you opened a different tool.

---

## License

MIT. Built in one night by [Ben at RLASAF12](https://github.com/RLASAF12).
