import { useEffect, useState, type FormEvent } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  HeartPulse,
} from "lucide-react";

import { useAuth } from "@/app/providers/AuthProvider";
import { getRoleLabel } from "@/lib/rbac";
import { getStaff, updateStaff } from "@/features/staff/services/staff.service";
import type { Staff } from "@/features/staff/types/staff.types";

export default function StaffSelfProfileEdit() {
  const { user, role } = useAuth();

  const [staffRecord, setStaffRecord] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [designation, setDesignation] = useState("");
  const [qualification, setQualification] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStaffProfile() {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const staffList = await getStaff();
        const matched = staffList.find(
          (s) => s.email?.trim().toLowerCase() === user.email?.trim().toLowerCase()
        );

        if (active && matched) {
          setStaffRecord(matched);
          setFullName(matched.fullName || "");
          setPhone(matched.phone || "");
          setAddress(matched.address || "");
          setDesignation(matched.designation || "");
          setQualification(matched.qualification || "");
          setEmergencyContactName(matched.emergencyContactName || "");
          setEmergencyContactPhone(matched.emergencyContactPhone || "");
        }
      } catch (err) {
        console.error("Failed to load staff profile:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadStaffProfile();

    return () => {
      active = false;
    };
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    setError(null);

    if (!fullName.trim()) {
      setError("Full Name is required.");
      return;
    }

    setSubmitting(true);

    try {
      if (staffRecord?.id) {
        await updateStaff(staffRecord.id, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          designation: designation.trim(),
          qualification: qualification.trim(),
          emergencyContactName: emergencyContactName.trim(),
          emergencyContactPhone: emergencyContactPhone.trim(),
        });
      }

      setSuccess("Profile details updated successfully!");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      console.error(err);
      setError("Failed to update profile details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading user profile...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl space-y-6">
      
      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800 shadow-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Header Profile Summary */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-md">
              {(fullName || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                  <ShieldCheck size={13} />
                  {getRoleLabel(role)}
                </span>
                <span className="text-xs text-slate-400">• Active Staff Account</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                {fullName || user?.email || "Staff Member Profile"}
              </h1>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
          <p className="text-xs text-slate-500">Update your contact information and personal details.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Full Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Full Name *</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Gmail Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs font-medium text-slate-500"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Contact Phone Number</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+977 98XXXXXXXX"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Designation */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Designation / Subject</label>
            <div className="relative">
              <Briefcase size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Art Instructor"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Qualification */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Qualification & Specialization</label>
            <div className="relative">
              <GraduationCap size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. Bachelor in Fine Arts"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Physical Address */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Physical Address</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, City, Ward No., Nepal"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Emergency Contact */}
        <div>
          <h2 className="text-base font-bold text-slate-900">Emergency Contact</h2>
          <p className="text-xs text-slate-500">Person to contact in case of an emergency.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Contact Name</label>
            <div className="relative">
              <HeartPulse size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="Guardian / Spouse Name"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Contact Phone</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="+977 98XXXXXXXX"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            <Save size={16} />
            {submitting ? "Saving Profile..." : "Save My Profile Details"}
          </button>
        </div>
      </div>

    </form>
  );
}
