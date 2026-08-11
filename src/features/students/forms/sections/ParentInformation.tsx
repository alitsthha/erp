import { useFormContext } from "react-hook-form";
import type { StudentFormData } from "../../schemas/student.schema";

export default function ParentInformation() {
  const {
    register,
    formState: { errors },
  } = useFormContext<StudentFormData>();

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-6 text-xl font-semibold">
        Parent Information
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Parent Name */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Parent Name
          </label>

          <input
            {...register("parentName")}
            placeholder="Enter parent name"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
          />

          {errors.parentName && (
            <p className="mt-1 text-sm text-red-500">
              {errors.parentName.message}
            </p>
          )}
        </div>

        {/* Phone */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Parent Phone
          </label>

          <input
            {...register("parentPhone")}
            placeholder="98XXXXXXXX"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
          />

          {errors.parentPhone && (
            <p className="mt-1 text-sm text-red-500">
              {errors.parentPhone.message}
            </p>
          )}
        </div>

        {/* Email */}

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">
            Parent Email
          </label>

          <input
            type="email"
            {...register("parentEmail")}
            placeholder="parent@email.com"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
          />

          {errors.parentEmail && (
            <p className="mt-1 text-sm text-red-500">
              {errors.parentEmail.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}