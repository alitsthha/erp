import { useFormContext } from "react-hook-form";
import type { StudentFormData } from "../../schemas/student.schema";
import { formatPersonName } from "@/utils/person-name";

export default function ParentInformation() {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<StudentFormData>();

  return (
    <div className="sm:p-5 p-4 ui-surface">
      <h2 className="ui-section-title mb-6">
        Parent Information
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Parent Name */}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Parent Name
          </label>

          <input
            {...register("parentName", {
              onBlur: (event) => setValue("parentName", formatPersonName(event.target.value), { shouldValidate: true }),
            })}
            placeholder="Enter parent name"
            className="ui-field w-full p-3 focus:border-brand-600 focus:outline-none"
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
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="98XXXXXXXX"
            className="ui-field w-full p-3 focus:border-brand-600 focus:outline-none"
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
            className="ui-field w-full p-3 focus:border-brand-600 focus:outline-none"
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
