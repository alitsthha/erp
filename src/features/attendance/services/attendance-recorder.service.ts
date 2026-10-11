import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import type { AttendanceActor } from "../utils/attendance-recorder";

export async function getAttendanceActor(): Promise<AttendanceActor> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before saving attendance.");
  let name = user.displayName?.trim() || "";
  if (!name && user.email) {
    try {
      const profile = await getDoc(doc(db, "user_roles", user.email.trim().toLowerCase()));
      const label = profile.data()?.label;
      if (typeof label === "string") name = label.trim();
    } catch { /* Email still identifies the authenticated user if their profile is unavailable. */ }
  }
  if (auth.currentUser?.uid !== user.uid) throw new Error("Your session changed. Please try saving again.");
  return { uid: user.uid, name: name || user.email || "Signed-in user" };
}
