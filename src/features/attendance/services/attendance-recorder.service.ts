import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import type { AttendanceActor } from "../utils/attendance-recorder";

const adminEmails = new Set(["admin@academy.edu", "admin@gmail.com", "admin@outlook.com", "alitshrestha74@gmail.com"]);
const roleLabels = new Set(["admin", "administrator", "teacher", "multiple activities teacher", "music teacher", "dance teacher", "art teacher", "sports teacher"]);

export async function getAttendanceActor(): Promise<AttendanceActor> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before saving attendance.");
  const email = user.email?.trim().toLowerCase() || "";
  let profile: Record<string, unknown> = {};
  if (email) {
    try { profile = (await getDoc(doc(db, "user_roles", email))).data() || {}; }
    catch { /* Claims and the authenticated email remain available. */ }
  }
  const token = typeof user.getIdTokenResult === "function" ? await user.getIdTokenResult() : null;
  const role = profile.role || token?.claims.role;
  const isAdmin = role === "admin" || token?.claims.admin === true || adminEmails.has(email);
  let name = "";
  let staffId = "";
  if (!isAdmin && email) {
    try {
      const matches = await getDocs(query(collection(db, "staff"), where("email", "==", email)));
      // An ambiguous email must not silently attribute work to the wrong person.
      if (matches.docs.length === 1) {
        const staff = matches.docs[0];
        name = typeof staff.data().fullName === "string" ? staff.data().fullName.trim() : "";
        staffId = staff.id;
      }
    } catch { /* Older deployments may not yet permit a staff member to read their own profile. */ }
    if (!name && typeof profile.staffName === "string") name = profile.staffName.trim();
  }
  if (!isAdmin && !name) {
    const fallback = user.displayName?.trim() || (typeof profile.label === "string" ? profile.label.trim() : "");
    if (!roleLabels.has(fallback.toLowerCase().replace(/_/g, " "))) name = fallback;
  }
  if (auth.currentUser?.uid !== user.uid) throw new Error("Your session changed. Please try saving again.");
  return { uid: user.uid, name: isAdmin ? email || user.uid : name || email || user.uid, email, role: isAdmin ? "admin" : "staff", staffId };
}
