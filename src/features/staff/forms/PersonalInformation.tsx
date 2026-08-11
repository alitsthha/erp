import type {
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";

import type { StaffFormData } from "../schemas/staff.schema";

type Props = {
  register: UseFormRegister<StaffFormData>;
  errors: FieldErrors<StaffFormData>;
};

export default function PersonalInformation({
  register,
  errors,
}: Props) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold">
        Personal Information
      </h2>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

        <div>
          <label className="mb-2 block font-medium">
            Full Name
          </label>

          <input
            {...register("fullName")}
            className="w-full rounded-xl border px-4 py-3"
          />

          <p className="mt-1 text-sm text-red-500">
            {errors.fullName?.message}
          </p>
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Gender
          </label>

          <select
            {...register("gender")}
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <p className="mt-1 text-sm text-red-500">
            {errors.gender?.message}
          </p>
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Phone
          </label>

          <input
            {...register("phone")}
            className="w-full rounded-xl border px-4 py-3"
          />

          <p className="mt-1 text-sm text-red-500">
            {errors.phone?.message}
          </p>
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Email
          </label>

          <input
            type="email"
            {...register("email")}
            className="w-full rounded-xl border px-4 py-3"
          />

          <p className="mt-1 text-sm text-red-500">
            {errors.email?.message}
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block font-medium">
            Address
          </label>

          <textarea
            rows={3}
            {...register("address")}
            className="w-full rounded-xl border px-4 py-3"
          />

          <p className="mt-1 text-sm text-red-500">
            {errors.address?.message}
          </p>
        </div>

      </div>
    </div>
  );
}