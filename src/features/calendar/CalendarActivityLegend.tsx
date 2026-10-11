import { useId, useState } from "react";
import PaginatedList from "@/components/common/PaginatedList";
import type { ActivityColors } from "@/features/activities/utils/activity-color";
import type { CalendarItem } from "./calendar.types";

interface Props {
  activities: { id: string; name: string }[];
  colors: ActivityColors;
  byDate: Map<string, CalendarItem[]>;
}

export default function CalendarActivityLegend({ activities, colors, byDate }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const id = useId();
  const options = new Map(activities.map((activity) => [activity.id, activity]));
  const dates = new Map<string, Set<string>>();
  for (const [date, items] of byDate) {
    for (const item of items) {
      if (!item.activityId) continue;
      if (!options.has(item.activityId)) options.set(item.activityId, { id: item.activityId, name: item.activityName || item.title });
      if (!dates.has(item.activityId)) dates.set(item.activityId, new Set());
      dates.get(item.activityId)!.add(date);
    }
  }
  const entries = [...options.values()].sort((a, b) => a.name.localeCompare(b.name));
  const renderEntry = (activity: { id: string; name: string }) => {
    const color = colors[activity.id]?.color;
    const count = dates.get(activity.id)?.size || 0;
    const tooltipId = `${id}-${activity.id}`;
    return <li key={activity.id} onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpenId(activity.id); }} onPointerLeave={(event) => { if (event.pointerType === "mouse") setOpenId(null); }}>
      <button type="button" className="calendar-legend-chip" aria-expanded={openId === activity.id} aria-describedby={openId === activity.id ? tooltipId : undefined}
        onFocus={() => setOpenId(activity.id)} onBlur={() => setOpenId(null)} onClick={() => setOpenId(activity.id)} onKeyDown={(event) => { if (event.key === "Escape") setOpenId(null); }}>
        <span aria-hidden="true" className="calendar-legend-dot" style={{ backgroundColor: color || "#94A3B8" }} />
        <span className="calendar-legend-name">{activity.name}</span>
      </button>
      {openId === activity.id && <div id={tooltipId} role="tooltip" className="calendar-legend-tooltip">
        <strong>{activity.name}</strong>
        <span>{color || "Color unavailable"} · {count ? `${count} class date${count === 1 ? "" : "s"} in this view` : "No classes in this view"}</span>
      </div>}
    </li>;
  };
  return <footer className="calendar-legend" aria-label="Activity color legend">
    <h3 className="calendar-legend-heading">Activity colors</h3>
    {entries.length ? <ul className="calendar-legend-list">
      {entries.length > 10 ? <PaginatedList items={entries} list sortable={false} label="Activity colors">{renderEntry}</PaginatedList> : entries.map(renderEntry)}
    </ul> : <p className="text-xs text-slate-500">Activity colors will appear here when activities are available.</p>}
  </footer>;
}
