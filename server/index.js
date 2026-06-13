#!/usr/bin/env node
// AgentBaton MCP Server v1.0.0
// Pass structured context between AI coding agents (Claude Code, Cursor, Codex, Cline).
// Stop explaining your project from scratch every session.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// Demo instance (public anon key — safe to embed, RLS enforced).
// Override with your own via SUPABASE_URL + SUPABASE_ANON_KEY env vars.
const SUPABASE_URL = process.env.SUPABASE_URL ||
  'https://beseparjuerxjygszlta.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlc2VwYXJqdWVyeGp5Z3N6bHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODY2OTYsImV4cCI6MjA5Njk2MjY5Nn0.olesTppkswAP5360f2A5Qn9w5pRHTPt0POGfqKtfI3Y';

async function supa(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const server = new Server(
  { name: 'agent-baton', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'baton_pass',
      description:
        'Save a structured context snapshot so the NEXT agent session picks up exactly where you left off. Call at the END of a work session.',
      inputSchema: {
        type: 'object',
        properties: {
          tag: {
            type: 'string',
            description: 'Short handoff identifier, e.g. "auth-module" or "week-12-sprint"'
          },
          project: {
            type: 'string',
            description: 'Project name for grouping (default: "default")'
          },
          agent_name: {
            type: 'string',
            description: 'Which agent/tool is passing the baton, e.g. "cursor", "claude-code", "codex"'
          },
          summary: {
            type: 'string',
            description: 'One-paragraph description of what was worked on and the current state'
          },
          completed: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tasks completed this session'
          },
          pending: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tasks still to do'
          },
          key_decisions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Architectural or design decisions made'
          },
          files_touched: {
            type: 'array',
            items: { type: 'string' },
            description: 'Files created or modified'
          },
          blockers: {
            type: 'array',
            items: { type: 'string' },
            description: 'Known blockers or open questions'
          },
          next_agent_needs: {
            type: 'array',
            items: { type: 'string' },
            description: 'What the next agent must know or have access to'
          }
        },
        required: ['tag', 'summary']
      }
    },
    {
      name: 'baton_receive',
      description:
        'Retrieve the latest context snapshot for a tag. Call at the START of a new session to get full context from the previous agent.',
      inputSchema: {
        type: 'object',
        properties: {
          tag: {
            type: 'string',
            description: 'The handoff tag to retrieve, e.g. "auth-module"'
          },
          project: {
            type: 'string',
            description: 'Project name (default: "default")'
          }
        },
        required: ['tag']
      }
    },
    {
      name: 'list_batons',
      description: 'List recent handoff snapshots for a project.',
      inputSchema: {
        type: 'object',
        properties: {
          project: {
            type: 'string',
            description: 'Project name to list (default: "default")'
          },
          limit: {
            type: 'number',
            description: 'Max results (default: 10)'
          }
        }
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // ── baton_pass ─────────────────────────────────────────────────────────
    if (name === 'baton_pass') {
      const record = {
        tag: args.tag,
        project: args.project || 'default',
        agent_name: args.agent_name || 'unknown',
        summary: args.summary,
        completed: args.completed || [],
        pending: args.pending || [],
        key_decisions: args.key_decisions || [],
        files_touched: args.files_touched || [],
        blockers: args.blockers || [],
        next_agent_needs: args.next_agent_needs || []
      };
      const result = await supa('POST', '/batons', record);
      const b = Array.isArray(result) ? result[0] : result;
      const dash = `https://rlasaf12.github.io/agent-baton/?project=${encodeURIComponent(b.project)}`;
      return {
        content: [{
          type: 'text',
          text: [
            `✅ Baton passed!`,
            ``,
            `Tag:       ${b.tag}`,
            `Project:   ${b.project}`,
            `Agent:     ${b.agent_name}`,
            `ID:        ${b.id}`,
            `At:        ${b.created_at}`,
            ``,
            `Next agent receives this with:`,
            `  baton_receive(tag="${b.tag}", project="${b.project}")`,
            ``,
            `Dashboard: ${dash}`
          ].join('\n')
        }]
      };
    }

    // ── baton_receive ──────────────────────────────────────────────────────
    if (name === 'baton_receive') {
      const project = args.project || 'default';
      const data = await supa(
        'GET',
        `/batons?tag=eq.${encodeURIComponent(args.tag)}&project=eq.${encodeURIComponent(project)}&order=created_at.desc&limit=1&select=*`
      );
      if (!data || data.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No baton found for tag="${args.tag}" project="${project}".\nUse list_batons() to see what's available.`
          }]
        };
      }
      const b = data[0];
      const lines = [
        `🏁 Baton received: "${b.tag}" from ${b.agent_name}`,
        `Passed at: ${new Date(b.created_at).toISOString()}`,
        ``
      ];
      lines.push(`## Summary\n${b.summary}\n`);
      if (b.completed?.length)       lines.push(`## ✅ Completed\n${b.completed.map(x=>`- ${x}`).join('\n')}\n`);
      if (b.pending?.length)         lines.push(`## 🔲 Still Pending\n${b.pending.map(x=>`- ${x}`).join('\n')}\n`);
      if (b.key_decisions?.length)   lines.push(`## 🧠 Key Decisions\n${b.key_decisions.map(x=>`- ${x}`).join('\n')}\n`);
      if (b.files_touched?.length)   lines.push(`## 📁 Files Touched\n${b.files_touched.map(x=>`- ${x}`).join('\n')}\n`);
      if (b.blockers?.length)        lines.push(`## 🚧 Blockers\n${b.blockers.map(x=>`- ${x}`).join('\n')}\n`);
      if (b.next_agent_needs?.length) lines.push(`## 📌 What You Need\n${b.next_agent_needs.map(x=>`- ${x}`).join('\n')}\n`);
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    // ── list_batons ────────────────────────────────────────────────────────
    if (name === 'list_batons') {
      const project = args.project || 'default';
      const limit = Math.min(args.limit || 10, 50);
      const data = await supa(
        'GET',
        `/batons?project=eq.${encodeURIComponent(project)}&order=created_at.desc&limit=${limit}&select=id,tag,agent_name,summary,created_at`
      );
      if (!data || data.length === 0) {
        return { content: [{ type: 'text', text: `No batons found for project="${project}".` }] };
      }
      const lines = [`📋 Batons in project "${project}" (${data.length}):\n`];
      for (const b of data) {
        const when = new Date(b.created_at).toLocaleString();
        lines.push(`• [${b.tag}] from ${b.agent_name} @ ${when}`);
        lines.push(`  ${b.summary.slice(0, 120)}${b.summary.length > 120 ? '…' : ''}`);
      }
      lines.push(`\nDashboard: https://rlasaf12.github.io/agent-baton/?project=${encodeURIComponent(project)}`);
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };

  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
