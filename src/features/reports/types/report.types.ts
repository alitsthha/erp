export interface ReportSummary {
  totalStudents: number;
  activeStudents: number;

  totalActivities: number;
  activeActivities: number;

  totalEnrollments: number;
  activeEnrollments: number;
  inactiveEnrollments: number;
}

export interface ActivityEnrollmentReport {
  activityId: string;
  activityCode: string;
  activityName: string;
  enrollmentCount: number;
  activeEnrollmentCount: number;
}

export interface RecentEnrollmentReport {
  id?: string;
  enrollmentCode: string;
  studentName: string;
  studentCode: string;
  activityName: string;
  activityCode: string;
  enrollmentDate: string;
  sessionFee?: number;
  status: "Active" | "Inactive";
}

export interface ReportData {
  summary: ReportSummary;
  activityEnrollments: ActivityEnrollmentReport[];
  recentEnrollments: RecentEnrollmentReport[];
}