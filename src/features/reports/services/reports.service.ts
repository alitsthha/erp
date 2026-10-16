import { resolveActivityReferences } from "@/features/activities/utils/activity-reference";
import {
  collection,
  getDocs,
  query,
  orderBy,
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
          orderBy("createdAt", "desc")
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

  const enrollments = resolveActivityReferences(enrollmentsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Enrollment[], new Map(activities.map((activity) => [activity.id!, activity])));

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
