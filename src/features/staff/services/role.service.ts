
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

import type { Role } from "../types/role.types";
import type { RoleFormData } from "../schemas/role.schema";

export async function addRole(
  data: RoleFormData
): Promise<string> {
  const docRef = await addDoc(
    collection(db, "roles"),
    {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return docRef.id;
}

export async function getRoles(): Promise<Role[]> {
  const q = query(
    collection(db, "roles"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Omit<Role, "id">;

    return {
      id: docSnap.id,
      ...data,
    };
  });
}

export async function getRoleById(
  id: string
): Promise<Role | null> {
  const snapshot = await getDoc(
    doc(db, "roles", id)
  );

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as Omit<Role, "id">;

  return {
    id: snapshot.id,
    ...data,
  };
}

export async function updateRole(
  id: string,
  data: Partial<RoleFormData>
): Promise<void> {
  await updateDoc(
    doc(db, "roles", id),
    {
      ...data,
      updatedAt: serverTimestamp(),
    }
  );
}

export async function deleteRole(
  id: string
): Promise<void> {
  await deleteDoc(
    doc(db, "roles", id)
  );
}