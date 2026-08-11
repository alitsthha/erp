import { useFormContext } from "react-hook-form";
import type { StudentFormData } from "../../schemas/student.schema";

export default function EnrollmentInformation() {
  const {
    register,
    formState: { errors },
  } = useFormContext<StudentFormData>();

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-6 text-xl font-semibold">
        Enrollment Information
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Activity
          </label>

          <input
            {...register("activity")}
            placeholder="e.g. Karate"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
          />

          {errors.activity && (
            <p className="mt-1 text-sm text-red-500">
              {errors.activity.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Batch
          </label>

          <input
            {...register("batch")}
            placeholder="e.g. Morning Batch"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
          />

          {errors.batch && (
            <p className="mt-1 text-sm text-red-500">
              {errors.batch.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}