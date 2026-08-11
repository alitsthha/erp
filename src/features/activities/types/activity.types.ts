export type ActivityStatus = "Active" | "Inactive";

export interface Activity {
  id?: string;
  activityCode: string;
  activityName: string;
  category: string;
  coachName?: string;
  fee?: number;
  sessionFee?: number;
  description?: string;
  status: ActivityStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}
