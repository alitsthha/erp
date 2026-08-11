import type {
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";

import type { StaffFormData } from "../schemas/staff.schema";
import { STAFF_DEPARTMENTS } from "../constants/departments";
import { STAFF_ROLES } from "../constants/roles";

type Props = {
  register: UseFormRegister<StaffFormData>;
  errors: FieldErrors<StaffFormData>;
};

export default function EmploymentInformation({
  register,
  errors,
}: Props) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold">
        Employment Information
      </h2>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        <div>
          <label className="mb-2 block font-medium">
            Department
          </label>

          <select
            {...register("department")}
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="">Select Department</option>

            {STAFF_DEPARTMENTS.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>

          <p className="mt-1 text-sm text-red-500">
            {errors.department?.message}
          </p>
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Role
          </label>

          <select
            {...register("role")}
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="">Select Role</option>

            {STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <p className="mt-1 text-sm text-red-500">
            {errors.role?.message}
          </p>
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Joining Date (BS)
          </label>

          <input
            {...register("joiningDate")}
            className="w-full rounded-xl border px-4 py-3"
          />

          <p className="mt-1 text-sm text-red-500">
            {errors.joiningDate?.message}
          </p>
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Employment Type
          </label>

          <select
            {...register("employmentType")}
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="Full Time">Full Time</option>
            <option value="Part Time">Part Time</option>
            <option value="Contract">Contract</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Status
          </label>

          <select
            {...register("status")}
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

      </div>
    </div>
  );
}