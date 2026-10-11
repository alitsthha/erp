import { CalendarDays, Sun } from "lucide-react";
import type { ActivityColors } from "@/features/activities/utils/activity-color";
import type { CalendarItem } from "./calendar.types";

export default function CalendarActivityDots({ items, colors }: { items: CalendarItem[]; colors: ActivityColors }) {
  const activities = new Map(items.filter((item) => item.activityId).map((item) => [item.activityId, item]));
  const events = items.filter((item) => !item.activityId && item.type === "event");
  const holidays = items.filter((item) => !item.activityId && item.type === "holiday");
  return <span className="calendar-activity-dots mt-2 flex min-h-3 flex-wrap items-center gap-1.5 px-2">
    {[...activities.values()].map((item) => <span key={item.activityId} role="img" aria-label={item.activityName || item.title} title={item.activityName || item.title}
      className="calendar-activity-dot inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-black/20 shadow-sm" style={{ backgroundColor: colors[item.activityId]?.color || "#94A3B8" }} />)}
    {events.length > 0 && <CalendarDays role="img" aria-label={events.map((item) => item.title).join(", ")} size={12} className="text-brand-600" />}
    {holidays.length > 0 && <Sun role="img" aria-label={holidays.map((item) => item.title).join(", ")} size={12} className="text-slate-500" />}
  </span>;
}
