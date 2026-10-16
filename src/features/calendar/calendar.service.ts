import { addDoc, collection, deleteDoc, doc, onSnapshot, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Attendance } from "@/features/attendance/types/attendance.types";
import { isValidBSDate } from "@/utils/calendar-date";
import { convertBSToAD } from "@/utils/nepali-date";
import type { CalendarEntry } from "./calendar.types";
import { mergeCalendarAttendance } from "./calendar.utils";
import { subscribeActivityDirectory } from "@/features/activities/services/activity-reference.service";
import { resolveActivityReferences, withoutActivityLabels, type ActivityDirectory } from "@/features/activities/utils/activity-reference";

export interface CalendarMonthData {
  records: Attendance[];
  entries: CalendarEntry[];
  loading: boolean;
  attendanceError: boolean;
  entriesError: boolean;
}

export function subscribeCalendarMonth(first: string, last: string, onChange: (data: CalendarMonthData) => void) {
  let individual: Attendance[] = [];
  let daily: Attendance[] = [];
  let entries: CalendarEntry[] = [];
  let activities: ActivityDirectory = new Map();
  const ready = new Set<string>();
  const errors = new Set<string>();
  const emit = () => onChange({
    records: resolveActivityReferences(mergeCalendarAttendance(individual, daily), activities),
    entries: resolveActivityReferences(entries, activities).map((entry) => entry.type === "class"
      ? { ...entry, title: entry.activityName || entry.title } : entry),
    loading: ready.size < 4,
    attendanceError: errors.has("attendances") || errors.has("daily_attendances") || errors.has("activities"),
    entriesError: errors.has("calendar_entries") || errors.has("activities"),
  });
  emit();
  const unsubscribe = ["attendances", "daily_attendances", "calendar_entries"].map((name) => {
    const field = name === "calendar_entries" ? "dateBS" : "sessionDateBS";
    return onSnapshot(query(collection(db, name), where(field, ">=", first), where(field, "<=", last)), (snapshot) => {
      if (name === "attendances") {
        individual = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Attendance);
      } else if (name === "daily_attendances") {
        daily = snapshot.docs.flatMap((item) => {
          const data = item.data();
          return (Array.isArray(data.attendances) ? data.attendances : []).map((record: Attendance) => ({
            ...record, sessionDateBS: record.sessionDateBS || data.sessionDateBS,
          }));
        });
      } else {
        entries = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as CalendarEntry);
      }
      ready.add(name);
      errors.delete(name);
      emit();
    }, (error) => {
      console.error(`Calendar could not load ${name}:`, error);
      ready.add(name);
      errors.add(name);
      emit();
    });
  });
  unsubscribe.push(subscribeActivityDirectory((directory) => {
    activities = directory;
    ready.add("activities");
    errors.delete("activities");
    emit();
  }, (error) => {
    console.error("Calendar could not load activity names:", error);
    ready.add("activities");
    errors.add("activities");
    emit();
  }));
  return () => unsubscribe.forEach((stop) => stop());
}

export async function createCalendarEntry(entry: Omit<CalendarEntry, "id" | "dateAD">) {
  if (!isValidBSDate(entry.dateBS)) throw new Error("Choose a valid Nepali date.");
  if (!["class", "event", "holiday"].includes(entry.type)) throw new Error("Choose an entry type.");
  if (!entry.title.trim() || entry.title.trim().length > 120) throw new Error("Enter a title of 1–120 characters.");
  if (entry.type === "class" && !entry.activityId) throw new Error("Choose an activity for this class.");
  if (entry.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time)) throw new Error("Choose a valid time.");
  if (entry.notes.length > 2000) throw new Error("Notes must be 2,000 characters or fewer.");
  const data = { ...withoutActivityLabels(entry), title: entry.type === "class" ? "Class" : entry.title.trim(), dateAD: convertBSToAD(entry.dateBS), createdAt: serverTimestamp() };
  if (entry.type === "class") {
    const reference = doc(db, "calendar_entries", `class_${entry.dateBS}_${encodeURIComponent(entry.activityId)}`);
    await runTransaction(db, async (transaction) => {
      if ((await transaction.get(reference)).exists()) throw new Error("This activity already has a scheduled class on this date.");
      transaction.set(reference, data);
    });
  } else {
    await addDoc(collection(db, "calendar_entries"), data);
  }
}

export async function deleteCalendarEntry(id: string) {
  await deleteDoc(doc(db, "calendar_entries", id));
}
