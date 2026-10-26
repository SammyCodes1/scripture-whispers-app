// Saves one reader's bookmarks, highlights, notes, streak, plans, and reminder.
// The library code is the secret. The table has no anon policy.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CODE_RE = /^[abcdefghijkmnpqrstuvwxyz23456789]{4}(?:-[abcdefghijkmnpqrstuvwxyz23456789]{4}){3}$/;
const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function newCode() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let raw = "";
  for (const byte of bytes) raw += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}
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

const PLAN_ID_RE = /^[a-z0-9-]{1,40}$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_DATES = 5000;
const MAX_PLANS = 20;
const MAX_PLAN_DAYS = 400;
const MAX_PLAN_TOMBS = 50;

function parseDate(value: unknown) {
  if (typeof value !== "string") return null;
  const match = DATE_RE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const stamp = Date.UTC(year, month - 1, day);
  const check = new Date(stamp);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  if (stamp < Date.UTC(2000, 0, 1) || stamp > Date.now() + 2 * 86_400_000) return null;
  return value;
}

function utcDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function longestRun(dates: string[]) {
  let best = 0;
  let run = 0;
  let prev = -1;
  for (const date of dates) {
    const day = utcDay(date);
    run = prev >= 0 && day === prev + 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = day;
  }
  return best;
}

function sanitizeHabits(input: unknown) {
  const row = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const dates = new Set<string>();
  if (Array.isArray(row.readDates)) {
    for (const value of row.readDates) {
      const date = parseDate(value);
      if (date) dates.add(date);
    }
  }
  let readDates = [...dates].sort();
  if (readDates.length > MAX_DATES) readDates = readDates.slice(readDates.length - MAX_DATES);

  const plans = new Map<string, Record<string, unknown>>();
  if (Array.isArray(row.plans)) {
    for (const item of row.plans) {
      if (!item || typeof item !== "object") continue;
      const plan = item as Record<string, unknown>;
      const planId = typeof plan.planId === "string" ? plan.planId : "";
      const startedAt = cleanTime(plan.startedAt);
      if (!PLAN_ID_RE.test(planId) || startedAt === null || startedAt < 1_500_000_000_000) continue;
      const stamped = cleanTime(plan.updatedAt);
      const updatedAt = stamped === null || stamped === 0 ? startedAt : stamped;
      const days = new Set<number>();
      if (Array.isArray(plan.completedDays)) {
        for (const day of plan.completedDays) {
          if (!Number.isInteger(day) || day < 1 || day > MAX_PLAN_DAYS) continue;
          days.add(day as number);
          if (days.size >= MAX_PLAN_DAYS) break;
        }
      }
      const current = plans.get(planId);
      if (current && Number(current.updatedAt) > updatedAt) continue;
      plans.set(planId, {
        planId,
        startedAt,
        completedDays: [...days].sort((a, b) => a - b),
        updatedAt,
      });
      if (plans.size > MAX_PLANS) break;
    }
  }

  const removed = new Map<string, number>();
  if (Array.isArray(row.removedPlans)) {
    for (const item of row.removedPlans) {
      if (!item || typeof item !== "object") continue;
      const tomb = item as Record<string, unknown>;
      const planId = typeof tomb.planId === "string" ? tomb.planId : "";
      const at = cleanTime(tomb.at);
      if (!PLAN_ID_RE.test(planId) || at === null) continue;
      const prev = removed.get(planId);
      if (prev === undefined || at > prev) removed.set(planId, at);
    }
  }
  for (const [planId, at] of removed) {
    const plan = plans.get(planId);
    if (plan && at >= Number(plan.updatedAt)) plans.delete(planId);
    const kept = plans.get(planId);
    if (kept && Number(kept.updatedAt) > at) removed.delete(planId);
  }

  const claimed = Number.isInteger(row.longestStreak) ? Number(row.longestStreak) : 0;
  let reminder: Record<string, unknown> | null = null;
  if (row.reminder && typeof row.reminder === "object") {
    const item = row.reminder as Record<string, unknown>;
    const hour = item.hour;
    const minute = item.minute;
    if (
      typeof item.enabled === "boolean" &&
      Number.isInteger(hour) && hour >= 0 && hour <= 23 &&
      Number.isInteger(minute) && minute >= 0 && minute <= 59
    ) {
      const updatedAt = cleanTime(item.updatedAt) ?? 0;
      if (item.enabled || hour !== 8 || minute !== 0 || updatedAt !== 0) {
        reminder = { enabled: item.enabled, hour, minute, updatedAt };
      }
    }
  }

  return {
    readDates,
    longestStreak: Math.min(MAX_DATES, Math.max(0, claimed, longestRun(readDates))),
    plans: [...plans.values()].sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt)).slice(0, MAX_PLANS),
    removedPlans: [...removed.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_PLAN_TOMBS).map(([planId, at]) => ({ planId, at })),
    reminder,
  };
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
    habits: sanitizeHabits(row.habits),
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
    const record = body as Record<string, unknown>;
    const action = record.action;
    const code = typeof record.code === "string" ? record.code : "";

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Library is not configured" }, 500);

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const header = req.headers.get("Authorization") ?? "";
    const token = header.replace(/^Bearer\s+/i, "").trim();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    let userId: string | null = null;
    if (token && token !== anonKey) {
      const { data, error } = await admin.auth.getUser(token);
      if (!error && data.user) userId = data.user.id;
    }
    if (!userId && !CODE_RE.test(code)) return json({ error: "Invalid library code" }, 400);

    const rowFields = "code, payload, revision, user_id";
    const rowByCode = async (libraryCode: string) => {
      const { data, error } = await admin.from("verse_libraries").select(rowFields).eq("code", libraryCode).maybeSingle();
      if (error) throw error;
      return data;
    };
    const rowByUser = async (id: string) => {
      const { data, error } = await admin.from("verse_libraries").select(rowFields).eq("user_id", id).maybeSingle();
      if (error) throw error;
      return data;
    };
    const libraryFor = async () => {
      if (!userId) return rowByCode(code);
      const owned = await rowByUser(userId);
      if (owned) return owned;
      if (!CODE_RE.test(code)) return null;
      const byCode = await rowByCode(code);
      if (!byCode || byCode.user_id) return null;
      const { data, error } = await admin
        .from("verse_libraries")
        .update({ user_id: userId })
        .eq("code", code)
        .is("user_id", null)
        .select(rowFields)
        .maybeSingle();
      if (error) throw error;
      return data ?? await rowByUser(userId);
    };
    const saved = (row: { code: string; payload: unknown; revision: number }, status = 200) =>
      json({ empty: false, revision: row.revision, payload: row.payload, code: row.code }, status);

    if (action === "pull") {
      const row = await libraryFor();
      if (!row) return json({ empty: true });
      return saved(row);
    }

    if (action === "delete") {
      const query = userId
        ? admin.from("verse_libraries").delete().eq("user_id", userId)
        : admin.from("verse_libraries").delete().eq("code", code);
      const { error } = await query;
      if (error) throw error;
      return json({ deleted: true });
    }

    if (action !== "push") return json({ error: "Unknown action" }, 400);

    const rawPayload = JSON.stringify(record.payload ?? null);
    if (rawPayload.length > MAX_BODY) return json({ error: "Library is too large" }, 413);
    const payload = sanitize(record.payload);
    const sent = record.payload;
    const sentHabits = sent && typeof sent === "object" && Object.prototype.hasOwnProperty.call(sent, "habits");
    const baseRevision = record.baseRevision;
    const base = typeof baseRevision === "number" && Number.isInteger(baseRevision) ? baseRevision : null;

    const existing = await libraryFor();
    if (existing && !sentHabits) {
      const previous = existing.payload && typeof existing.payload === "object"
        ? (existing.payload as Record<string, unknown>).habits
        : null;
      payload.habits = sanitizeHabits(previous);
    }
    if (!existing) {
      let insertCode = newCode();
      if (CODE_RE.test(code)) {
        const taken = await rowByCode(code);
        if (!taken) insertCode = code;
      }
      const { data, error } = await admin
        .from("verse_libraries")
        .insert({ code: insertCode, payload, revision: 1, user_id: userId })
        .select(rowFields)
        .maybeSingle();
      if (error && error.code === "23505") {
        const current = userId ? await rowByUser(userId) : await rowByCode(insertCode);
        if (!current) throw error;
        return saved(current, 409);
      }
      if (error || !data) throw error ?? new Error("insert failed");
      return saved(data);
    }

    if (base !== Number(existing.revision)) {
      return saved(existing, 409);
    }

    const next = Number(existing.revision) + 1;
    const { data, error } = await admin
      .from("verse_libraries")
      .update({ payload, revision: next, updated_at: new Date().toISOString() })
      .eq("code", existing.code)
      .eq("revision", existing.revision)
      .select(rowFields)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const current = await libraryFor();
      if (!current) throw new Error("library changed");
      return saved(current, 409);
    }
    return saved(data);
  } catch (err) {
    console.error("verse-library", err instanceof Error ? err.message : "failed");
    return json({ error: "Could not save the library" }, 500);
  }
});
