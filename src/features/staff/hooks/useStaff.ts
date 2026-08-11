import { useEffect, useState } from "react";

import {
  deleteStaff,
  getStaff,
} from "../services/staff.service";

import type { Staff } from "../types/staff.types";

export function useStaff() {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadStaff() {
    try {
      const data = await getStaff();
      setStaffs(data);
    } finally {
      setLoading(false);
    }
  }

  async function removeStaff(id: string) {
    if (!window.confirm("Delete this staff member?")) return;

    await deleteStaff(id);

    await loadStaff();
  }

  useEffect(() => {
    loadStaff();
  }, []);

  return {
    staffs,
    loading,
    removeStaff,
    refresh: loadStaff,
  };
}