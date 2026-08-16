import type {
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import { User, Phone, Mail, MapPin } from "lucide-react";

import type { StaffFormData } from "../schemas/staff.schema";

type Props = {
  register: UseFormRegister<StaffFormData>;
  errors: FieldErrors<StaffFormData>;
};

export default function PersonalInformation({
  register,
  errors,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Full Name */}
      <div className="md:col-span-2">
        <label
          htmlFor="fullName"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Full Name <span className="text-red-500">*</span>
        </label>

        <div className="relative">
          <User
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            id="fullName"
            type="text"
            placeholder="Enter staff's full name"
            autoComplete="name"
            {...register("fullName")}
            className={`h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
              errors.fullName
                ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
            }`}
          />
        </div>

        {errors.fullName && (
          <p className="mt-1.5 text-xs font-medium text-red-500">
            {errors.fullName.message}
          </p>
        )}
      </div>

      {/* Gender */}
      <div>
        <label
          htmlFor="gender"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Gender <span className="text-red-500">*</span>
        </label>

        <select
          id="gender"
          {...register("gender")}
          className={`h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-900 outline-none transition focus:ring-2 ${
            errors.gender
              ? "border-red-300 focus:border-red-400 focus:ring-red-50"
              : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
          }`}
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        {errors.gender && (
          <p className="mt-1.5 text-xs font-medium text-red-500">
            {errors.gender.message}
          </p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label
          htmlFor="phone"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Phone <span className="text-red-500">*</span>
        </label>

        <div className="relative">
          <Phone
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            id="phone"
            type="tel"
            placeholder="Enter phone number"
            {...register("phone")}
            className={`h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
              errors.phone
                ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
            }`}
          />
        </div>

        {errors.phone && (
          <p className="mt-1.5 text-xs font-medium text-red-500">
            {errors.phone.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Email
        </label>

        <div className="relative">
          <Mail
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            id="email"
            type="email"
            placeholder="Enter email address (optional)"
            {...register("email")}
            className={`h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
              errors.email
                ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
            }`}
          />
        </div>

        {errors.email && (
          <p className="mt-1.5 text-xs font-medium text-red-500">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Address */}
      <div className="md:col-span-2">
        <label
          htmlFor="address"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Address <span className="text-red-500">*</span>
        </label>

        <div className="relative">
          <MapPin
            size={17}
            className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
          />

          <textarea
            id="address"
            rows={3}
            placeholder="Enter complete address"
            {...register("address")}
            className={`w-full rounded-xl border bg-white pl-10 pr-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
              errors.address
                ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                : "border-slate-300 focus:border-blue-500 focus:ring-blue-50"
            }`}
          />
        </div>

        {errors.address && (
          <p className="mt-1.5 text-xs font-medium text-red-500">
            {errors.address.message}
          </p>
        )}
      </div>
    </div>
  );
}