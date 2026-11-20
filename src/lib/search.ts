import { supabase } from "@/integrations/supabase/client";

export type SearchHit = {
  id: string;
  kind: "notice" | "note" | "event" | "item" | "assignment" | "paper";
  title: string;
  subtitle: string;
};

function clean(q: string) {
  return q.replace(/[%,()]/g, " ").trim();
}

export async function globalSearch(raw: string, limit = 6): Promise<SearchHit[]> {
  const q = clean(raw);
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const [notices, notes, events, items, assignments, papers] = await Promise.all([
    supabase.from("notices").select("id,title,category").or(`title.ilike.${like},content.ilike.${like}`).limit(limit),
    supabase.from("notes").select("id,title,subject,branch,semester").or(`title.ilike.${like},subject.ilike.${like},description.ilike.${like}`).limit(limit),
    supabase.from("events").select("id,title,venue,event_date").or(`title.ilike.${like},description.ilike.${like},organizer.ilike.${like}`).limit(limit),
    supabase.from("lost_found").select("id,item_name,category,location_found").neq("status", "archived").or(`item_name.ilike.${like},description.ilike.${like},category.ilike.${like}`).limit(limit),
    supabase.from("assignments").select("id,title,subject,due_date").or(`title.ilike.${like},subject.ilike.${like},description.ilike.${like}`).limit(limit),
    supabase.from("question_papers").select("id,subject,branch,semester,academic_year").or(`subject.ilike.${like},academic_year.ilike.${like},branch.ilike.${like}`).limit(limit),
  ]);
  return [
    ...(notices.data ?? []).map((n) => ({ id: n.id, kind: "notice" as const, title: n.title, subtitle: n.category })),
    ...(notes.data ?? []).map((n) => ({ id: n.id, kind: "note" as const, title: n.title, subtitle: `${n.subject} · ${n.branch} · Sem ${n.semester}` })),
    ...(events.data ?? []).map((e) => ({ id: e.id, kind: "event" as const, title: e.title, subtitle: `${e.venue} · ${e.event_date}` })),
    ...(items.data ?? []).map((i) => ({ id: i.id, kind: "item" as const, title: i.item_name, subtitle: `${i.category} · found at ${i.location_found}` })),
    ...(assignments.data ?? []).map((a) => ({ id: a.id, kind: "assignment" as const, title: a.title, subtitle: `${a.subject} · due ${a.due_date.slice(0, 10)}` })),
    ...(papers.data ?? []).map((p) => ({ id: p.id, kind: "paper" as const, title: p.subject, subtitle: `${p.branch} · Sem ${p.semester} · ${p.academic_year}` })),
  ];
}
