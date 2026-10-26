// Saves one reader's bookmarks, highlights, and notes.
// The library code is the secret. The table has no anon policy.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CODE_RE = /^[abcdefghijkmnpqrstuvwxyz23456789]{4}(?:-[abcdefghijkmnpqrstuvwxyz23456789]{4}){3}$/;
const TOMB_RE = /^(bookmark|highlight|note):.{1,80}$/;
const MAX_ITEMS = 2000;
const MAX_TOMBS = 4000;
const MAX_BODY = 500_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanString(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function cleanTime(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > Date.now() + 86_400_000) return null;
  return rounded;
}

function sanitize(input: unknown) {
  const row = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const saved = new Map<string, Record<string, unknown>>();
  const notes = new Map<string, Record<string, unknown>>();
  const removed = new Map<string, number>();

  if (Array.isArray(row.saved)) {
    for (const item of row.saved) {
      if (!item || typeof item !== "object") continue;
      const verse = item as Record<string, unknown>;
      const ref = cleanString(verse.ref, 80);
      const type = verse.type === "highlight" ? "highlight" : verse.type === "bookmark" ? "bookmark" : null;
      const createdAt = cleanTime(verse.createdAt);
      if (!ref || !type || createdAt === null) continue;
      const key = `${type}:${ref}`;
      const current = saved.get(key);
      if (current && Number(current.createdAt) > createdAt) continue;
      const next: Record<string, unknown> = {
        id: cleanString(verse.id, 80) || key,
        ref,
        text: cleanString(verse.text, 2000),
        type,
        createdAt,
      };
      if (typeof verse.color === "string" && /^[a-z]{3,20}$/.test(verse.color)) next.color = verse.color;
      saved.set(key, next);
    }
  }

  if (Array.isArray(row.notes)) {
    for (const item of row.notes) {
      if (!item || typeof item !== "object") continue;
      const note = item as Record<string, unknown>;
      const ref = cleanString(note.ref, 80);
      const body = cleanString(note.note, 4000);
      const updatedAt = cleanTime(note.updatedAt) ?? cleanTime(note.createdAt);
      if (!ref || !body || updatedAt === null) continue;
      const key = `note:${ref}`;
      const current = notes.get(key);
      if (current && Number(current.updatedAt) > updatedAt) continue;
      notes.set(key, {
        id: cleanString(note.id, 80) || key,
        ref,
        verseText: cleanString(note.verseText, 2000),
        note: body,
        createdAt: cleanTime(note.createdAt) ?? updatedAt,
        updatedAt,
      });
    }
  }

  if (Array.isArray(row.removed)) {
    for (const item of row.removed) {
      if (!item || typeof item !== "object") continue;
      const tomb = item as Record<string, unknown>;
      const key = cleanString(tomb.key, 100);
      const at = cleanTime(tomb.at);
      if (!TOMB_RE.test(key) || at === null) continue;
      const prev = removed.get(key);
      if (prev === undefined || at > prev) removed.set(key, at);
    }
  }

  for (const [key, at] of removed) {
    const verse = saved.get(key);
    if (verse && at >= Number(verse.createdAt)) saved.delete(key);
    const note = notes.get(key);
    if (note && at >= Number(note.updatedAt)) notes.delete(key);
    const kept = saved.get(key) ?? notes.get(key);
    const keptAt = kept ? Number(kept.updatedAt ?? kept.createdAt) : undefined;
    if (keptAt !== undefined && keptAt > at) removed.delete(key);
  }

  let savedList = [...saved.entries()].sort((a, b) => Number(b[1].createdAt) - Number(a[1].createdAt));
  if (savedList.length > MAX_ITEMS) {
    for (const [key, item] of savedList.slice(MAX_ITEMS)) removed.set(key, Number(item.createdAt));
    savedList = savedList.slice(0, MAX_ITEMS);
  }
  let noteList = [...notes.entries()].sort((a, b) => Number(b[1].updatedAt) - Number(a[1].updatedAt));
  if (noteList.length > MAX_ITEMS) {
    for (const [key, item] of noteList.slice(MAX_ITEMS)) removed.set(key, Number(item.updatedAt));
    noteList = noteList.slice(0, MAX_ITEMS);
  }

  return {
    saved: savedList.map(([, item]) => item),
    notes: noteList.map(([, item]) => item),
    removed: [...removed.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_TOMBS).map(([key, at]) => ({ key, at })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const length = Number(req.headers.get("content-length") || 0);
    if (length > MAX_BODY) return json({ error: "Library is too large" }, 413);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request" }, 400);
    const action = (body as Record<string, unknown>).action;
    const code = typeof (body as Record<string, unknown>).code === "string"
      ? (body as Record<string, unknown>).code as string
      : "";
    if (!CODE_RE.test(code)) return json({ error: "Invalid library code" }, 400);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Library is not configured" }, 500);

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const readRow = async () => {
      const { data, error } = await admin
        .from("verse_libraries")
        .select("payload, revision")
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      return data;
    };

    if (action === "pull") {
      const row = await readRow();
      if (!row) return json({ empty: true });
      return json({ empty: false, revision: row.revision, payload: row.payload });
    }

    if (action === "delete") {
      const { error } = await admin.from("verse_libraries").delete().eq("code", code);
      if (error) throw error;
      return json({ deleted: true });
    }

    if (action !== "push") return json({ error: "Unknown action" }, 400);

    const rawPayload = JSON.stringify((body as Record<string, unknown>).payload ?? null);
    if (rawPayload.length > MAX_BODY) return json({ error: "Library is too large" }, 413);
    const payload = sanitize((body as Record<string, unknown>).payload);
    const baseRevision = (body as Record<string, unknown>).baseRevision;
    const base = typeof baseRevision === "number" && Number.isInteger(baseRevision) ? baseRevision : null;

    const existing = await readRow();
    if (!existing) {
      const { data, error } = await admin
        .from("verse_libraries")
        .insert({ code, payload, revision: 1 })
        .select("payload, revision")
        .maybeSingle();
      if (error && error.code === "23505") {
        const current = await readRow();
        return json({ revision: current?.revision ?? 1, payload: current?.payload ?? payload }, 409);
      }
      if (error || !data) throw error ?? new Error("insert failed");
      return json({ revision: data.revision, payload: data.payload });
    }

    if (base !== existing.revision) {
      return json({ revision: existing.revision, payload: existing.payload }, 409);
    }

    const next = Number(existing.revision) + 1;
    const { data, error } = await admin
      .from("verse_libraries")
      .update({ payload, revision: next, updated_at: new Date().toISOString() })
      .eq("code", code)
      .eq("revision", existing.revision)
      .select("payload, revision")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const current = await readRow();
      return json({ revision: current?.revision ?? existing.revision, payload: current?.payload ?? existing.payload }, 409);
    }
    return json({ revision: data.revision, payload: data.payload });
  } catch (err) {
    console.error("verse-library", err instanceof Error ? err.message : "failed");
    return json({ error: "Could not save the library" }, 500);
  }
});
