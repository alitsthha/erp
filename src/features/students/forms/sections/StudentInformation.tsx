import { useFormContext } from "react-hook-form";
import type { StudentFormData } from "../../schemas/student.schema";

export default function StudentInformation() {
  const {
    register,
    formState: { errors },
  } = useFormContext<StudentFormData>();

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
      <h2 className="mb-6 text-2xl font-semibold text-gray-800">
        Student Information
      </h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Full Name */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Full Name
          </label>

          <input
            {...register("fullName")}
            placeholder="Enter full name"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          {errors.fullName && (
            <p className="mt-2 text-sm text-red-500">
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Gender */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Gender
          </label>

          <select
            {...register("gender")}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* DOB */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Date of Birth
          </label>

          <input
            type="date"
            {...register("dateOfBirth")}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          {errors.dateOfBirth && (
            <p className="mt-2 text-sm text-red-500">
              {errors.dateOfBirth.message}
            </p>
          )}
        </div>

        {/* Admission Date */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Admission Date
          </label>

          <input
            type="date"
            {...register("admissionDate")}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          {errors.admissionDate && (
            <p className="mt-2 text-sm text-red-500">
              {errors.admissionDate.message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}