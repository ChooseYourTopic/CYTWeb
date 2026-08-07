"use client";

import { useEffect, useRef, useState } from "react";
import { Users, Search, Plus, X, Loader2, Shield } from "lucide-react";
import {
  cytapi,
  type AgentTeam,
  type TeamAgent,
  type AvailableAgent,
} from "@/lib/api";
import { AGENT_DISPLAY_NAMES } from "@/lib/utils";

function pretty(type: string): string {
  return (
    AGENT_DISPLAY_NAMES[type] ||
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Header control for a topic's agent team. The stock 9 always work the topic (shown
 * as "Core"); the owner can search for and ADD optional agents (e.g. Winslow Prime)
 * and remove the ones they added. Opens a popover panel.
 */
export function AgentTeamButton({ topicId }: { topicId?: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AgentTeam | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  async function load() {
    if (!topicId) return;
    try {
      setData(await cytapi.topicTeam(topicId));
    } catch {
      /* fail soft */
    }
  }

  useEffect(() => {
    if (open && !data) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function add(type: string) {
    if (!topicId || busy) return;
    setBusy(type);
    try {
      setData(await cytapi.addTopicAgent(topicId, type));
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  }
  async function remove(type: string) {
    if (!topicId || busy) return;
    setBusy(type);
    try {
      setData(await cytapi.removeTopicAgent(topicId, type));
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  }

  const needle = q.trim().toLowerCase();
  const match = (a: { agent_type: string; role: string }) =>
    !needle ||
    pretty(a.agent_type).toLowerCase().includes(needle) ||
    a.role.toLowerCase().includes(needle);
  const team = (data?.team ?? []).filter(match);
  const available = (data?.available ?? []).filter(match);
  const count = data?.team.length ?? 9;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Manage this topic's agent team"
        className="flex items-center gap-2 rounded-xl border border-line bg-panel2 px-3.5 py-2 text-[13px] text-mut transition-colors hover:text-ink"
      >
        <Users size={14} />
        <span className="hidden sm:inline">Agent team</span>
        <span className="rounded-full bg-panel px-1.5 text-[11px] font-bold text-ink">
          {count}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-[300px] overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
          <div className="border-b border-line p-2">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-panel2 px-2.5 py-1.5">
              <Search size={13} className="text-dim" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search agents by name…"
                className="w-full bg-transparent text-[13px] text-ink placeholder:text-dim focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[340px] overflow-y-auto p-1.5">
            {!data && (
              <div className="flex items-center gap-2 px-2 py-3 text-[12.5px] text-dim">
                <Loader2 size={13} className="animate-spin" /> Loading team…
              </div>
            )}

            {available.length > 0 && (
              <>
                <div className="px-2 py-1 text-[10.5px] uppercase tracking-wide text-dim">
                  Add to team
                </div>
                {available.map((a: AvailableAgent) => (
                  <Row
                    key={a.agent_type}
                    label={pretty(a.agent_type)}
                    role={a.role}
                    action={
                      <button
                        type="button"
                        onClick={() => add(a.agent_type)}
                        disabled={busy === a.agent_type}
                        className="cyt-gradient-bg inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-bold text-bg disabled:opacity-60"
                      >
                        {busy === a.agent_type ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Plus size={11} />
                        )}
                        Add
                      </button>
                    }
                  />
                ))}
              </>
            )}

            {team.length > 0 && (
              <>
                <div className="mt-1 px-2 py-1 text-[10.5px] uppercase tracking-wide text-dim">
                  On the team ({data?.team.length ?? 0})
                </div>
                {team.map((m: TeamAgent) => (
                  <Row
                    key={m.agent_type}
                    label={pretty(m.agent_type)}
                    role={m.role}
                    action={
                      m.removable ? (
                        <button
                          type="button"
                          onClick={() => remove(m.agent_type)}
                          disabled={busy === m.agent_type}
                          title="Remove from team"
                          className="rounded-lg border border-line px-1.5 py-1 text-mut transition-colors hover:border-bad/50 hover:text-bad disabled:opacity-60"
                        >
                          {busy === m.agent_type ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <X size={12} />
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-dim">
                          <Shield size={11} /> Core
                        </span>
                      )
                    }
                  />
                ))}
              </>
            )}

            {data && team.length === 0 && available.length === 0 && (
              <p className="px-2 py-3 text-[12.5px] text-dim">
                No agents match “{q}”.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  role,
  action,
}: {
  label: string;
  role: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-panel2">
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-ink">{label}</div>
        <div className="truncate text-[11px] text-dim">{role}</div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
