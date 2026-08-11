import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import type { Student } from "@/features/students/types/student.types";
import type { Activity } from "@/features/activities/types/activity.types";
import type { Enrollment } from "@/features/enrollments/types/enrollment.types";

import type {
  ActivityEnrollmentReport,
  ReportData,
  ReportSummary,
}  from "../types/report.types";

export async function getReportData(): Promise<ReportData> {
  const [studentsSnapshot, activitiesSnapshot, enrollmentsSnapshot] =
    await Promise.all([
      getDocs(collection(db, "students")),

      getDocs(collection(db, "activities")),

      getDocs(
        query(
          collection(db, "enrollments"),
          orderBy("createdAt", "desc"),
          limit(100)
        )
      ),
    ]);

  const students = studentsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Student[];

  const activities = activitiesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Activity[];

  const enrollments = enrollmentsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Enrollment[];

  const summary: ReportSummary = {
    totalStudents: students.length,

    activeStudents: students.filter(
      (student) => student.status === "Active"
    ).length,

    totalActivities: activities.length,

    activeActivities: activities.filter(
      (activity) => activity.status === "Active"
    ).length,

    totalEnrollments: enrollments.length,

    activeEnrollments: enrollments.filter(
      (enrollment) => enrollment.status === "Active"
    ).length,

    inactiveEnrollments: enrollments.filter(
      (enrollment) => enrollment.status === "Inactive"
    ).length,
  };

  const activityEnrollments: ActivityEnrollmentReport[] =
    activities.map((activity) => {
      const activityEnrollments = enrollments.filter(
        (enrollment) => enrollment.activityId === activity.id
      );

      return {
        activityId: activity.id ?? "",
        activityCode: activity.activityCode,
        activityName: activity.activityName,
        enrollmentCount: activityEnrollments.length,
        activeEnrollmentCount: activityEnrollments.filter(
          (enrollment) => enrollment.status === "Active"
        ).length,
      };
    });

  const recentEnrollments = enrollments
    .slice(0, 10)
    .map((enrollment) => ({
      id: enrollment.id,
      enrollmentCode: enrollment.enrollmentCode,
      studentName: enrollment.studentName,
      studentCode: enrollment.studentCode,
      activityName: enrollment.activityName,
      activityCode: enrollment.activityCode,
      enrollmentDate: enrollment.enrollmentDate,
      sessionFee: enrollment.sessionFee,
      status: enrollment.status,
    }));

  return {
    summary,
    activityEnrollments,
    recentEnrollments,
  };
}