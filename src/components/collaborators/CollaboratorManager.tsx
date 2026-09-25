"use client";

// Shared per-module COLLABORATOR management UI for ONE license (topic) — the single
// source of truth for the "list collaborators · add-by-email · grant/revoke modules"
// surface (#5). Used by BOTH:
//   • the licensee's Settings › Collaborators card (a topic they OWN), and
//   • the staff (admin/support) ACL console in the admin portal (any FOREIGN license
//     they're authorized to manage).
// It drives entirely off the existing `/me/topics/{id}/collaborators` endpoints, which
// authorize the caller server-side via TopicCollaboratorController::manageableLicense()
// (owner OR admin OR support) and enforce the no-privilege-escalation cap
// (User::canGrantRole) fail-closed — so this component is presentation only; the API is
// the authority. Adding a collaborator and editing grants are 2FA step-up gated (the
// guard runs enroll/verify on a 403 challenge and retries once cleared); revoking is
// not gated (it only removes access).

import { useCallback, useEffect, useState } from "react";
import { Loader2, SlidersHorizontal, Trash2, Users, Check, X, Lock } from "lucide-react";
import {
  useStepUpGuard,
  STEP_UP_CANCELLED,
} from "@/components/security/TwoFactor";
import {
  cytapi,
  ApiError,
  type Collaborator,
  type ModuleCatalogItem,
} from "@/lib/api";

// A checkbox grid for picking which of a topic's modules to grant. Presentational —
// the parent owns the selected-slug set.
export function ModuleChecklist({
  catalog,
  selected,
  onToggle,
  disabled,
}: {
  catalog: ModuleCatalogItem[];
  selected: string[];
  onToggle: (slug: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {catalog.map((m) => {
        const on = selected.includes(m.slug);
        return (
          <button
            key={m.slug}
            type="button"
            role="checkbox"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onToggle(m.slug)}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[12.5px] transition-colors disabled:opacity-60 ${
              on
                ? "border-brand bg-brand/5 text-ink"
                : "border-line bg-panel text-mut hover:border-[#31384c]"
            }`}
          >
            <span
              className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded border ${
                on ? "border-brand bg-brand" : "border-line"
              }`}
            >
              {on ? <Check size={10} className="text-bg" /> : null}
            </span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

// Pull the friendliest message out of a 422 validation error (falls back to a
// generic line for anything else).
function grantErrorText(e: unknown): string {
  if (e instanceof ApiError && e.status === 422) {
    const body = e.message.replace(/^API \d+: /, "");
    try {
      const j = JSON.parse(body);
      const first = j?.errors?.email?.[0] ?? j?.errors?.modules?.[0] ?? j?.message;
      if (typeof first === "string" && first) return first;
    } catch {
      /* not JSON — fall through */
    }
    return "Check the email and modules, then try again.";
  }
  if (e instanceof ApiError && e.status === 403) {
    // The no-escalation cap (or ACL authority) blocked this grant fail-closed.
    return "You can't grant access above your own level on this license.";
  }
  return "Couldn't save that. Please try again.";
}

/**
 * Manage the collaborators of ONE license (topic). `topicId` null renders nothing
 * (the parent hasn't selected a license yet). `ceilingNote`, when provided, is shown
 * above the add form to reflect the no-escalation rule in the UI (e.g. "this grants
 * collaborator-level module access only"). The whole surface is empty-safe and
 * fail-closed: a topic the caller can't manage 404s server-side and shows the error.
 */
export function CollaboratorManager({
  topicId,
  ceilingNote,
}: {
  topicId: number | null;
  ceilingNote?: React.ReactNode;
}) {
  const [catalog, setCatalog] = useState<ModuleCatalogItem[]>([]);
  const [collabs, setCollabs] = useState<Collaborator[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [newModules, setNewModules] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<number | null>(null);
  const [editModules, setEditModules] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Grant/edit is 2FA-gated — guard() prompts enroll/verify + retries once cleared.
  const { guard, modal: stepUpModal } = useStepUpGuard();

  const loadCollabs = useCallback(async (id: number) => {
    setCollabs(null);
    try {
      const res = await cytapi.collaborators.list(id);
      setCatalog(res.modules_catalog);
      setCollabs(res.collaborators);
      setLoadErr(null);
    } catch (e) {
      setCollabs([]);
      setLoadErr(
        e instanceof ApiError && e.status === 404
          ? "You're not authorized to manage this license, or it no longer exists."
          : "Couldn't load collaborators for this license.",
      );
    }
  }, []);

  // Reset the transient add/edit state whenever the selected license changes, then load.
  useEffect(() => {
    setEditing(null);
    setEmail("");
    setNewModules([]);
    setMsg(null);
    if (topicId != null) loadCollabs(topicId);
    else setCollabs(null);
  }, [topicId, loadCollabs]);

  function toggle(list: string[], slug: string): string[] {
    return list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
  }

  async function grant() {
    if (topicId == null || !email.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await guard(() =>
        cytapi.collaborators.grant(topicId, {
          email: email.trim(),
          modules: newModules,
        }),
      );
      setEmail("");
      setNewModules([]);
      await loadCollabs(topicId);
      setMsg({ ok: true, text: "Collaborator added." });
    } catch (e) {
      if (e instanceof Error && e.message === STEP_UP_CANCELLED) return;
      setMsg({ ok: false, text: grantErrorText(e) });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(c: Collaborator) {
    setEditing(c.id);
    setEditModules(c.modules);
    setMsg(null);
  }

  async function saveEdit(id: number) {
    if (topicId == null || savingEdit) return;
    setSavingEdit(true);
    setMsg(null);
    try {
      await guard(() => cytapi.collaborators.setModules(topicId, id, editModules));
      setEditing(null);
      await loadCollabs(topicId);
      setMsg({ ok: true, text: "Grants updated." });
    } catch (e) {
      if (e instanceof Error && e.message === STEP_UP_CANCELLED) return;
      setMsg({ ok: false, text: grantErrorText(e) });
    } finally {
      setSavingEdit(false);
    }
  }

  async function revoke(id: number) {
    if (topicId == null || revoking != null) return;
    setRevoking(id);
    setMsg(null);
    try {
      await cytapi.collaborators.revoke(topicId, id);
      await loadCollabs(topicId);
      setMsg({ ok: true, text: "Collaborator revoked." });
    } catch {
      setMsg({ ok: false, text: "Couldn't revoke that collaborator. Please try again." });
    } finally {
      setRevoking(null);
    }
  }

  if (topicId == null) return null;

  return (
    <>
      {/* Current collaborators */}
      <div className="mb-5">
        <div className="mb-2 text-[12px] uppercase tracking-wider text-dim">
          Collaborators on this license
        </div>
        {collabs == null ? (
          <div className="flex items-center gap-2 text-[13px] text-mut">
            <Loader2 size={14} className="animate-spin" /> Loading collaborators…
          </div>
        ) : collabs.length === 0 ? (
          <p className="rounded-xl border border-line bg-panel2 px-3 py-3 text-[13px] text-mut">
            {loadErr ?? "No collaborators yet. Add one below to grant module access."}
          </p>
        ) : (
          <ul className="grid gap-2">
            {collabs.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-line bg-panel2 px-3.5 py-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-ink">
                        {c.name || c.email || `User #${c.user_id}`}
                      </span>
                      {c.email && c.name && (
                        <span className="text-[12px] text-dim">{c.email}</span>
                      )}
                      {!c.active && (
                        <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-dim">
                          Revoked
                        </span>
                      )}
                    </div>
                    {editing !== c.id && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {c.modules.length === 0 ? (
                          <span className="text-[11.5px] text-dim">
                            No modules granted
                          </span>
                        ) : (
                          c.modules.map((m) => (
                            <span
                              key={m}
                              className="rounded-full border border-line px-2 py-0.5 text-[10.5px] text-mut"
                            >
                              {catalog.find((x) => x.slug === m)?.label ?? m}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {editing !== c.id && c.active && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-[#31384c]"
                      >
                        <SlidersHorizontal size={14} /> Edit modules
                      </button>
                      <button
                        type="button"
                        onClick={() => revoke(c.id)}
                        disabled={revoking === c.id}
                        className="flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-[13px] font-semibold text-bad transition-colors hover:border-[#3a1a1a] disabled:opacity-60"
                      >
                        {revoking === c.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Revoke
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline per-module editor (2FA-gated on save). */}
                {editing === c.id && (
                  <div className="mt-3 rounded-lg border border-line bg-panel p-3">
                    <div className="mb-2 text-[11.5px] uppercase tracking-wider text-dim">
                      Modules {c.name || c.email} may access
                    </div>
                    <ModuleChecklist
                      catalog={catalog}
                      selected={editModules}
                      onToggle={(s) => setEditModules((cur) => toggle(cur, s))}
                      disabled={savingEdit}
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(c.id)}
                        disabled={savingEdit}
                        className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-[13px] font-bold text-bg disabled:opacity-60"
                      >
                        {savingEdit ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Save grants
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        disabled={savingEdit}
                        className="flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-[13px] font-semibold text-mut transition-colors hover:text-ink disabled:opacity-60"
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add a collaborator */}
      <div className="rounded-xl border border-line bg-panel2 p-4">
        <div className="mb-3 text-[13px] font-semibold text-ink">
          Add a collaborator
        </div>
        {ceilingNote && <div className="mb-3">{ceilingNote}</div>}
        <div className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-[12px] uppercase tracking-wider text-dim">
              Their ChooseYourTopic account email
            </span>
            <input
              className="cyt-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="collaborator@example.com"
            />
          </label>
          <div>
            <span className="mb-1 block text-[12px] uppercase tracking-wider text-dim">
              Modules to grant
            </span>
            <ModuleChecklist
              catalog={catalog}
              selected={newModules}
              onToggle={(s) => setNewModules((cur) => toggle(cur, s))}
              disabled={busy}
            />
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-dim">
              <Lock size={11} /> Fail-closed — a collaborator can only touch the
              modules you check here, and nothing on any other license.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={grant}
              disabled={busy || !email.trim()}
              className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Users size={15} />
              )}
              Add collaborator
            </button>
            {msg && (
              <span className={`text-[13px] ${msg.ok ? "text-good" : "text-bad"}`}>
                {msg.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Fresh-2FA step-up prompt (shown when adding/editing grants needs verification). */}
      {stepUpModal}
    </>
  );
}
