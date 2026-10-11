import { collection, doc, getDocs, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { nextActivityColor, normalizeActivityColor, type ActivityColors } from "../utils/activity-color";

export class ActivityColorConflict extends Error {
  constructor() { super("This color belongs to another activity. Choose a different color or use Auto-select."); }
}

export function subscribeActivityColors(onChange: (colors: ActivityColors) => void, onError: () => void) {
  return onSnapshot(collection(db, "activity_colors"), (snapshot) => {
    const colors: ActivityColors = {};
    snapshot.docs.forEach((item) => {
      const data = item.data();
      const color = normalizeActivityColor(data.color);
      if (color) colors[item.id] = { color, activityName: data.activityName || "Activity", activityCode: data.activityCode || "" };
    });
    onChange(colors);
  }, onError);
}

// Color ownership and the activity are saved atomically, including concurrent admin edits.
export async function writeColoredActivity(id: string, payload: Record<string, unknown>, color: string, options: { create?: boolean; migrate?: boolean; used?: string[] } = {}) {
  if (!normalizeActivityColor(color)) throw new Error("Choose a valid six-digit hex color, for example #2563EB.");
  return runTransaction(db, async (transaction) => {
    const activityRef = doc(db, "activities", id);
    const current = await transaction.get(activityRef);
    if (!options.create && !current.exists()) {
      if (options.migrate) return;
      throw new Error("Activity no longer exists.");
    }
    const existing = current.data() || {};
    const oldColor = normalizeActivityColor(existing.color);
    const used = new Set(options.used || []);
    let selected = options.migrate ? oldColor || normalizeActivityColor(color)! : normalizeActivityColor(color)!;
    let lockRef = doc(db, "activity_color_locks", selected.slice(1));
    let lock = await transaction.get(lockRef);
    while (lock.exists() && lock.data().activityId !== id) {
      if (!options.migrate) throw new ActivityColorConflict();
      used.add(selected);
      selected = nextActivityColor(used);
      lockRef = doc(db, "activity_color_locks", selected.slice(1));
      lock = await transaction.get(lockRef);
    }
    const oldLockRef = oldColor && oldColor !== selected ? doc(db, "activity_color_locks", oldColor.slice(1)) : null;
    const oldLock = oldLockRef ? await transaction.get(oldLockRef) : null;
    const data: Record<string, unknown> = { ...existing, ...payload, color: selected, updatedAt: serverTimestamp() };
    transaction.set(activityRef, data);
    transaction.set(lockRef, { activityId: id });
    transaction.set(doc(db, "activity_colors", id), { color: selected, activityName: data.activityName || "Activity", activityCode: data.activityCode || "" });
    if (oldLockRef && oldLock?.exists() && oldLock.data().activityId === id) transaction.delete(oldLockRef);
    return selected;
  });
}

// Run only for administrators. Existing data is repaired on opening Activities or Calendar.
export async function ensureActivityColors(): Promise<ActivityColors> {
  const [activities, palette] = await Promise.all([getDocs(collection(db, "activities")), getDocs(collection(db, "activity_colors"))]);
  const colors: ActivityColors = {};
  palette.docs.forEach((item) => { colors[item.id] = item.data() as ActivityColors[string]; });
  const used = new Set([...Object.values(colors).map((item) => item.color), ...activities.docs.map((item) => normalizeActivityColor(item.data().color)).filter((color): color is string => Boolean(color))]);
  for (const activity of activities.docs.sort((a, b) => a.id.localeCompare(b.id))) {
    const data = activity.data();
    if (normalizeActivityColor(data.color) && colors[activity.id]?.color === normalizeActivityColor(data.color)) continue;
    const color = await writeColoredActivity(activity.id, {}, normalizeActivityColor(data.color) || nextActivityColor(used), { migrate: true, used: [...used] });
    if (color) {
      used.add(color);
      colors[activity.id] = { color, activityName: data.activityName || "Activity", activityCode: data.activityCode || "" };
    }
  }
  return colors;
}
