import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  departmentSchema,
  type DepartmentFormData,
} from "../schemas/department.schema";

type DepartmentFormProps = {
  initialData?: Partial<DepartmentFormData>;
  onSubmit: (data: DepartmentFormData) => Promise<void>;
  submitLabel?: string;
};

export default function DepartmentForm({
  initialData,
  onSubmit,
  submitLabel = "Save Department",
}: DepartmentFormProps) {
  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),

    defaultValues: {
      name: "",
      description: "",
      status: "Active",
      ...initialData,
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <div className="sm:p-5 p-4 ui-surface">

        <h2 className="ui-section-title mb-6">
          Department Information
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          <div>
            <label className="mb-2 block text-sm font-medium">
              Department Name
            </label>

            <input
              {...register("name")}
              placeholder="Enter department name"
              className="ui-field w-full px-4 outline-none transition focus:border-brand-600"
            />

            {errors.name && (
              <p className="mt-1 text-sm text-red-500">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Status
            </label>

            <select
              {...register("status")}
              className="ui-field w-full px-4 outline-none transition focus:border-brand-600"
            >
              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>

            {errors.status && (
              <p className="mt-1 text-sm text-red-500">
                {errors.status.message}
              </p>
            )}
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium">
              Description
            </label>

            <textarea
              rows={5}
              {...register("description")}
              placeholder="Enter department description"
              className="ui-field w-full px-4 outline-none transition focus:border-brand-600"
            />

            {errors.description && (
              <p className="mt-1 text-sm text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="ui-button bg-brand-600 px-8 py-3 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}