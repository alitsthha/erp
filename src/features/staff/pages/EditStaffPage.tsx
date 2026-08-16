import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import StaffForm from "../forms/StaffForm";
import { getStaffById, updateStaff } from "../services/staff.service";
import type { StaffFormData } from "../schemas/staff.schema";
import type { Staff } from "../types/staff.types";

export default function EditStaffPage() {
  const navigate = useNavigate();
  const { staffId } = useParams<{ staffId: string }>();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStaff() {
      if (!staffId) {
        setError("Invalid staff ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getStaffById(staffId);
        if (data) {
          setStaff(data);
        } else {
          setError("Staff member not found");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load staff member");
      } finally {
        setLoading(false);
      }
    }

    void loadStaff();
  }, [staffId]);

  async function handleUpdate(data: StaffFormData) {
    if (!staffId) return;

    try {
      await updateStaff(staffId, data);
      navigate("/staff", { replace: true });
    } catch (error) {
      console.error(error);
      alert("Unable to update staff member.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
          <p className="mt-2 text-sm text-slate-500">Loading staff member...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => navigate("/staff")}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Back to Staff
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="min-h-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">Staff member not found</p>
            <button
              onClick={() => navigate("/staff")}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Back to Staff
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <StaffForm
        initialData={{
          staffCode: staff.staffCode,
          fullName: staff.fullName,
          gender: staff.gender as "Male" | "Female" | "Other",
          joiningDate: staff.joiningDate,
          phone: staff.phone,
          address: staff.address,
          employmentType: staff.employmentType as "Full Time" | "Part Time" | "Contract" | "Temporary" | "Volunteer",
          status: staff.status as "Active" | "Inactive" | "Resigned",
          email: staff.email,
        }}
        onSave={handleUpdate}
        submitLabel="Update Staff"
        onCancel={() => navigate("/staff")}
      />
    </div>
  );
}
