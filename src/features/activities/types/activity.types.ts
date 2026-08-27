export type ActivityStatus = "Active" | "Inactive";

export interface Activity {
  id?: string;
  activityCode: string;
  activityName: string;
  category: string;
  coachStaffId?: string;
  coachName?: string;
  feePerSession?: number;
  fee?: number;
  sessionFee?: number;
  description?: string;
  status: ActivityStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}
