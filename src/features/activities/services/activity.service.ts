import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/firebase/config";

import { generateActivityCode } from "./activity-code.service";

import type { ActivityFormData } from "../schemas/activity.schema";
import type { Activity } from "../types/activity.types";

export async function getActivities(): Promise<Activity[]> {
  const q = query(
    collection(db, "activities"),
    orderBy("activityCode")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(
    (activityDoc) => ({
      id: activityDoc.id,
      ...activityDoc.data(),
    })
  ) as Activity[];
}

export async function getActivityById(
  activityId: string
): Promise<Activity | null> {
  const snapshot = await getDoc(
    doc(db, "activities", activityId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Activity;
}

export async function addActivity(
  data: ActivityFormData
): Promise<string> {
  const activityCode =
    await generateActivityCode();

  const numFeePerSession = data.feePerSession?.trim()
    ? Number(data.feePerSession)
    : 0;
  const numFeePerMonth = data.feePerMonth?.trim()
    ? Number(data.feePerMonth)
    : 0;
  const countedMonthly = Boolean(data.countedMonthly);

  const payload = {
    activityCode,

    activityName:
      data.activityName.trim(),

    category:
      data.category.trim(),

    coachStaffId: data.coachStaffId?.trim() || "",

    coachName:
      data.coachName?.trim() || "",

    countedMonthly,
    feePerMonth: countedMonthly ? numFeePerMonth : 0,
    feePerSession: countedMonthly ? 0 : numFeePerSession,
    fee: countedMonthly ? 0 : numFeePerSession, // Backward compatibility
    sessionFee: countedMonthly ? 0 : numFeePerSession, // Backward compatibility

    description:
      data.description?.trim() || "",

    status: data.status,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, "activities"),
    payload
  );

  return docRef.id;
}

export async function updateActivity(
  activityId: string,
  data: ActivityFormData
): Promise<void> {
  const numFeePerSession = data.feePerSession?.trim()
    ? Number(data.feePerSession)
    : 0;
  const numFeePerMonth = data.feePerMonth?.trim()
    ? Number(data.feePerMonth)
    : 0;
  const countedMonthly = Boolean(data.countedMonthly);

  const payload = {
    activityName:
      data.activityName.trim(),

    category:
      data.category.trim(),

    coachStaffId: data.coachStaffId?.trim() || "",

    coachName:
      data.coachName?.trim() || "",

    countedMonthly,
    feePerMonth: countedMonthly ? numFeePerMonth : 0,
    feePerSession: countedMonthly ? 0 : numFeePerSession,
    fee: countedMonthly ? 0 : numFeePerSession, // Backward compatibility
    sessionFee: countedMonthly ? 0 : numFeePerSession, // Backward compatibility

    description:
      data.description?.trim() || "",

    status: data.status,

    updatedAt:
      serverTimestamp(),
  };

  await updateDoc(
    doc(db, "activities", activityId),
    payload
  );
}

export async function deleteActivity(
  activityId: string
): Promise<void> {
  await deleteDoc(
    doc(db, "activities", activityId)
  );
}