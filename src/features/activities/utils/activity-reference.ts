export interface ActivityReference {
  activityId?: string;
  activityName?: string;
  activityCode?: string;
}

export type ActivityIdentity = { activityName: string; activityCode: string };
export type ActivityDirectory = ReadonlyMap<string, ActivityIdentity>;

/** IDs are the relationship; legacy labels are only a fallback for deleted activities. */
export function resolveActivityReferences<T extends ActivityReference>(records: T[], activities: ActivityDirectory): T[] {
  return records.map((record) => {
    if (!record.activityId) return record;
    const activity = activities.get(record.activityId);
    return {
      ...record,
      activityName: activity?.activityName || record.activityName || `Unavailable activity (${record.activityId})`,
      activityCode: activity?.activityCode ?? record.activityCode ?? "",
    };
  });
}

/** Store only the reference for linked records; manual invoice labels have no ID. */
export function withoutActivityLabels<T extends ActivityReference>(record: T): Omit<T, "activityName" | "activityCode"> & ActivityReference {
  const stored = { ...record };
  if (stored.activityId) {
    delete stored.activityName;
    delete stored.activityCode;
  }
  return stored;
}
