import type {
  FieldErrors,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";

import type { StaffFormData } from "../schemas/staff.schema";

type Props = {
  register: UseFormRegister<StaffFormData>;
  errors: FieldErrors<StaffFormData>;
  watch: UseFormWatch<StaffFormData>;
};

export default function SalaryInformation({
  register,
  errors,
  watch,
}: Props) {
  const salary = watch("basicSalary") || 0;
  const allowance = watch("allowance") || 0;

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold">
        Salary Information
      </h2>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        <div>
          <label className="mb-2 block font-medium">
            Basic Salary
          </label>

          <input
            type="number"
            {...register("basicSalary", {
              valueAsNumber: true,
            })}
            className="w-full rounded-xl border px-4 py-3"
          />

          <p className="mt-1 text-sm text-red-500">
            {errors.basicSalary?.message}
          </p>
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Salary Type
          </label>

          <select
            {...register("salaryType")}
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="Monthly">Monthly</option>
            <option value="Daily">Daily</option>
            <option value="Hourly">Hourly</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Allowance
          </label>

          <input
            type="number"
            {...register("allowance", {
              valueAsNumber: true,
            })}
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Overtime Rate
          </label>

          <input
            type="number"
            {...register("overtimeRate", {
              valueAsNumber: true,
            })}
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>

      </div>

      <div className="mt-6 rounded-xl bg-blue-50 p-5">
        <div className="flex justify-between">
          <span>Basic Salary</span>
          <strong>Rs. {salary}</strong>
        </div>

        <div className="mt-2 flex justify-between">
          <span>Allowance</span>
          <strong>Rs. {allowance}</strong>
        </div>

        <hr className="my-3" />

        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>Rs. {salary + allowance}</span>
        </div>
      </div>
    </div>
  );
}