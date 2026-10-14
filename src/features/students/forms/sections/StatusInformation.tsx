import SearchableSelect from "@/components/forms/SearchableSelect";
import { useFormContext } from "react-hook-form";
import type { StudentFormData } from "../../schemas/student.schema";

interface Props {
  saving: boolean;
}

export default function StatusInformation({ saving }: Props) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<StudentFormData>();

  return (
    <section className="sm:p-5 p-4 ui-surface md:p-8">
      <h2 className="ui-section-title mb-6">
        Status
      </h2>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Student Status
          </label>

          <SearchableSelect value={watch("status")}
            {...register("status")}
            className="ui-field w-full px-4 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </SearchableSelect>

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
            className="ui-button w-full bg-brand-600 px-8 py-3 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Saving..." : "Save Student"}
          </button>
        </div>
      </div>
    </section>
  );
}