import { useFormContext } from "react-hook-form";
import type { StudentFormData } from "../../schemas/student.schema";

export default function AddressInformation() {
  const {
    register,
    formState: { errors },
  } = useFormContext<StudentFormData>();

  return (
    <div className="sm:p-5 p-4 ui-surface">
      <h2 className="ui-section-title mb-6">
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
          className="ui-field w-full p-3 focus:border-brand-600 focus:outline-none"
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