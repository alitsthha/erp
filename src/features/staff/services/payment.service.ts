import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { PaymentFormData } from "../schemas/staff.schema";
import type { PaymentRecord } from "../types/staff.types";

export async function addPayment(data: PaymentFormData): Promise<string> {
  const docRef = await addDoc(collection(db, "staff_payments"), {
    staffId: data.staffId,
    amount: data.amount,
    paymentType: data.paymentType,
    paymentDate: data.paymentDate,
    status: data.status || "pending",
    notes: data.notes || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function getPaymentsByStaffId(staffId: string): Promise<PaymentRecord[]> {
  const q = query(
    collection(db, "staff_payments"),
    where("staffId", "==", staffId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    staffName: "",
    ...doc.data(),
  } as PaymentRecord));
}

export async function updatePayment(
  id: string,
  data: Partial<PaymentFormData>
): Promise<void> {
  const docRef = doc(db, "staff_payments", id);

  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePayment(id: string): Promise<void> {
  await deleteDoc(doc(db, "staff_payments", id));
}

export async function getAllPayments(): Promise<PaymentRecord[]> {
  const snapshot = await getDocs(collection(db, "staff_payments"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    staffName: "",
    ...doc.data(),
  } as PaymentRecord));
}
