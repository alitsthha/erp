export type ActivityStatus = "Active" | "Inactive";

export interface Activity {
  id?: string;
  activityCode: string;
  activityName: string;
  /** Required on new saves; legacy records are assigned a color automatically. */
  color?: string;
  category: string;
  coachStaffId?: string;
  coachName?: string;
  countedMonthly?: boolean;
  feePerMonth?: number;
  feePerSession?: number;
  fee?: number;
  sessionFee?: number;
  description?: string;
  status: ActivityStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}
