import { useFormContext } from "react-hook-form";
import type { StudentFormData } from "../../schemas/student.schema";

export default function AddressInformation() {
  const {
    register,
    formState: { errors },
  } = useFormContext<StudentFormData>();

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-6 text-xl font-semibold">
        Address Information
      </h2>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Full Address
        </label>

        <textarea
          {...register("address")}
          rows={4}
          placeholder="Enter student's address..."
          className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
        />

        {errors.address && (
          <p className="mt-1 text-sm text-red-500">
            {errors.address.message}
          </p>
        )}
      </div>
    </div>
  );
}