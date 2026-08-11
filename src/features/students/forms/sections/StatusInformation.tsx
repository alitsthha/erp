import { useFormContext } from "react-hook-form";
import type { StudentFormData } from "../../schemas/student.schema";

interface Props {
  saving: boolean;
}

export default function StatusInformation({ saving }: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext<StudentFormData>();

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
      <h2 className="mb-6 text-2xl font-semibold text-gray-800">
        Status
      </h2>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Student Status
          </label>

          <select
            {...register("status")}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {errors.status && (
            <p className="mt-2 text-sm text-red-500">
              {errors.status.message}
            </p>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Saving..." : "Save Student"}
          </button>
        </div>
      </div>
    </section>
  );
}