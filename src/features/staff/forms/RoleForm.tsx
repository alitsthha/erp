import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  roleSchema,
  type RoleFormData,
} from "../schemas/role.schema";

const permissionModules = [
  "dashboard",
  "students",
  "activities",
  "enrollments",
  "attendance",
  "billing",
  "expenses",
  "staff",
  "payroll",
  "reports",
  "settings",
] as const;

const permissionActions = [
  "view",
  "create",
  "edit",
  "delete",
] as const;

type RoleFormProps = {
  initialData?: Partial<RoleFormData>;
  onSubmit: (data: RoleFormData) => Promise<void>;
  submitLabel?: string;
};

const defaultPermissions: RoleFormData["permissions"] = {
  dashboard: { view: true, create: false, edit: false, delete: false },
  students: { view: true, create: false, edit: false, delete: false },
  activities: { view: true, create: false, edit: false, delete: false },
  enrollments: { view: true, create: false, edit: false, delete: false },
  attendance: { view: true, create: false, edit: false, delete: false },
  billing: { view: true, create: false, edit: false, delete: false },
  expenses: { view: true, create: false, edit: false, delete: false },
  staff: { view: true, create: false, edit: false, delete: false },
  payroll: { view: true, create: false, edit: false, delete: false },
  reports: { view: true, create: false, edit: false, delete: false },
  settings: { view: true, create: false, edit: false, delete: false },
};

export default function RoleForm({
  initialData,
  onSubmit,
  submitLabel = "Save Role",
}: RoleFormProps) {
  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<RoleFormData>({
  resolver: zodResolver(roleSchema) as any,

    defaultValues: {
      roleCode: "",
      name: "",
      description: "",
      department: "",
      color: "Blue",
      displayOrder: 1,
      staffCount: 0,
      status: "Active",
      permissions: {
        ...defaultPermissions,
        ...initialData?.permissions,
      },
      ...initialData,
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8"
    >
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <h2 className="mb-8 text-2xl font-semibold">
          Role Information
        </h2>

        <div className="grid gap-6 md:grid-cols-2">

          <div>
            <label className="mb-2 block font-medium">
              Role Code
            </label>

            <input
              value={initialData?.roleCode ?? "Auto Generated"}
              readOnly
              className="w-full rounded-xl border bg-gray-100 px-4 py-3"
            />
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

          <div>
            <label className="mb-2 block font-medium">
              Role Name
            </label>

            <input
              {...register("name")}
              className="w-full rounded-xl border px-4 py-3"
            />

            <p className="mt-1 text-sm text-red-500">
              {errors.name?.message}
            </p>
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Department
            </label>

            <input
              {...register("department")}
              className="w-full rounded-xl border px-4 py-3"
            />

            <p className="mt-1 text-sm text-red-500">
              {errors.department?.message}
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block font-medium">
              Description
            </label>

            <textarea
              rows={4}
              {...register("description")}
              className="w-full rounded-xl border px-4 py-3"
            />

            <p className="mt-1 text-sm text-red-500">
              {errors.description?.message}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <h2 className="mb-8 text-2xl font-semibold">
          Role Settings
        </h2>

        <div className="grid gap-6 md:grid-cols-3">

          <div>
            <label className="mb-2 block font-medium">
              Badge Color
            </label>

            <select
              {...register("color")}
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value="Blue">Blue</option>
              <option value="Green">Green</option>
              <option value="Purple">Purple</option>
              <option value="Orange">Orange</option>
              <option value="Red">Red</option>
              <option value="Gray">Gray</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Display Order
            </label>

            <input
              type="number"
              {...register("displayOrder", {
                valueAsNumber: true,
              })}
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Staff Count
            </label>

            <input
              readOnly
              {...register("staffCount", {
                valueAsNumber: true,
              })}
              className="w-full rounded-xl border bg-gray-100 px-4 py-3"
            />
          </div>

        </div>
      </div>
            <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-2xl font-semibold">
          Permissions
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-3 text-left">Module</th>
                <th className="border p-3 text-center">View</th>
                <th className="border p-3 text-center">Create</th>
                <th className="border p-3 text-center">Edit</th>
                <th className="border p-3 text-center">Delete</th>
              </tr>
            </thead>

            <tbody>
              {permissionModules.map((module) => (
                <tr key={module}>
                  <td className="border p-3 font-medium capitalize">
                    {module}
                  </td>

                  {permissionActions.map((action) => (
                    <td
                      key={action}
                      className="border p-3 text-center"
                    >
                      <input
                        type="checkbox"
                        {...register(
                          `permissions.${module}.${action}` as const
                        )}
                        className="h-5 w-5"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-blue-600 px-8 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}