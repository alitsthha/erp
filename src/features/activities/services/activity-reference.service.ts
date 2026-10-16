import { collection, getDocs, onSnapshot, type QuerySnapshot, type DocumentData } from "firebase/firestore";
import { db } from "@/firebase/config";
import { resolveActivityReferences, type ActivityDirectory, type ActivityReference } from "../utils/activity-reference";

function directory(snapshot: QuerySnapshot<DocumentData>): ActivityDirectory {
  return new Map(snapshot.docs.map((item) => [item.id, {
    activityName: String(item.data().activityName || ""),
    activityCode: String(item.data().activityCode || ""),
  }]));
}

function permissionDenied(error: unknown) {
  return (error as { code?: string })?.code === "permission-denied";
}

// Do not cache names across reads: a rename must apply to existing records too.
export async function getActivityDirectory(): Promise<ActivityDirectory> {
  try {
    return directory(await getDocs(collection(db, "activities")));
  } catch (error) {
    if (!permissionDenied(error)) throw error;
    // Staff can read this atomically maintained projection without seeing pricing.
    return directory(await getDocs(collection(db, "activity_colors")));
  }
}

export async function hydrateActivityReferences<T extends ActivityReference>(records: T[]): Promise<T[]> {
  if (!records.some((record) => record.activityId)) return records;
  return resolveActivityReferences(records, await getActivityDirectory());
}

export function subscribeActivityDirectory(onChange: (activities: ActivityDirectory) => void, onError: (error: Error) => void) {
  let stopProjection: (() => void) | undefined;
  const stopActivities = onSnapshot(collection(db, "activities"), (snapshot) => onChange(directory(snapshot)), (error) => {
    if (!permissionDenied(error)) return onError(error);
    stopProjection = onSnapshot(collection(db, "activity_colors"), (snapshot) => onChange(directory(snapshot)), onError);
  });
  return () => { stopActivities(); stopProjection?.(); };
}
