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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

        <h2 className="mb-6 text-2xl font-semibold">
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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500"
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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500"
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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500"
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
          className="rounded-xl bg-blue-600 px-8 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}