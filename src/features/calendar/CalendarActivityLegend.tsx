import { getMonthlyActivityCounts } from "./calendar.utils";
import { useId, useState } from "react";
import PaginatedList from "@/components/common/PaginatedList";
import type { ActivityColors } from "@/features/activities/utils/activity-color";
import type { CalendarItem } from "./calendar.types";

interface Props {
  activities: { id: string; name: string }[];
  colors: ActivityColors;
  items: CalendarItem[];
  month: string;
  selectedActivity: string;
  onActivityChange?: (activityId: string) => void;
  loading?: boolean;
}

export default function CalendarActivityLegend({ activities, colors, items, month, selectedActivity, onActivityChange, loading = false }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const id = useId();
  const options = new Map(activities.map((activity) => [activity.id, activity]));
  const counts = getMonthlyActivityCounts(items, month);
  for (const item of items) {
    if (item.activityId && !options.has(item.activityId)) options.set(item.activityId, { id: item.activityId, name: item.activityName || item.title });
  }
  const entries = [...options.values()].sort((a, b) => a.name.localeCompare(b.name));
  const renderEntry = (activity: { id: string; name: string }) => {
    const color = colors[activity.id]?.color;
    const count = counts.get(activity.id) || 0;
    const countLabel = loading ? "…" : count;
    const tooltipId = `${id}-${activity.id}`;
    return <li key={activity.id} onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpenId(activity.id); }} onPointerLeave={(event) => { if (event.pointerType === "mouse") setOpenId(null); }}>
      <button type="button" className="calendar-legend-chip" aria-pressed={selectedActivity === activity.id} aria-expanded={openId === activity.id} aria-describedby={openId === activity.id ? tooltipId : undefined}
        onFocus={() => setOpenId(activity.id)} onBlur={() => setOpenId(null)} onClick={() => { setOpenId(activity.id); onActivityChange?.(selectedActivity === activity.id ? "all" : activity.id); }} onKeyDown={(event) => { if (event.key === "Escape") setOpenId(null); }}>
        <span aria-hidden="true" className="calendar-legend-dot" style={{ backgroundColor: color || "#94A3B8" }} />
        <span className="calendar-legend-name">{activity.name} ({countLabel})</span>
      </button>
      {openId === activity.id && <div id={tooltipId} role="tooltip" className="calendar-legend-tooltip">
        <strong>{activity.name} ({countLabel})</strong>
        <span>{loading ? "Loading monthly counts…" : `${count} class date${count === 1 ? "" : "s"} this month (recorded or scheduled).`} Click to {selectedActivity === activity.id ? "clear the filter" : "filter this activity"}.</span>
      </div>}
    </li>;
  };
  return <footer className="calendar-legend" aria-label="Activity color legend">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="calendar-legend-heading">Activities · monthly class dates</h3>
      {onActivityChange && <button type="button" className="calendar-legend-chip" aria-pressed={selectedActivity === "all"} onClick={() => onActivityChange("all")}>All activities</button>}
    </div>
    {entries.length ? <ul className="calendar-legend-list">
      {entries.length > 10 ? <PaginatedList items={entries} list sortable={false} label="Activity colors">{renderEntry}</PaginatedList> : entries.map(renderEntry)}
    </ul> : <p className="text-xs text-slate-500">Activity colors will appear here when activities are available.</p>}
  </footer>;
}
