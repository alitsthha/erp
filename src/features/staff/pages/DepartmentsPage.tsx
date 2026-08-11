import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Pencil,
  Trash2,
  Building2,
  Search,
  Plus,
} from "lucide-react";

import {
  deleteDepartment,
  getDepartments,
} from "../services/department.service";

import type { Department } from "../types/department.types";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmDelete = window.confirm(
      "Delete this department?"
    );

    if (!confirmDelete) return;

    try {
      await deleteDepartment(id);

      setDepartments((prev) =>
        prev.filter((item) => item.id !== id)
      );
    } catch (error) {
      console.error(error);
      alert("Unable to delete department.");
    }
  }

  const filteredDepartments = useMemo(() => {
    return departments.filter((department) =>
      department.name
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [departments, search]);

  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            Departments
          </h1>

          <p className="text-gray-500">
            Manage academy departments
          </p>
        </div>

        <Link
          to="/staff/departments/add"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Department
        </Link>

      </div>

      {/* Stats */}

      <div className="grid gap-5 md:grid-cols-3">

        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-gray-500">
            Total Departments
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            {departments.length}
          </h2>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-gray-500">
            Active
          </p>

          <h2 className="mt-2 text-3xl font-bold text-green-600">
            {
              departments.filter(
                (item) => item.status === "Active"
              ).length
            }
          </h2>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-gray-500">
            Total Staff
          </p>

          <h2 className="mt-2 text-3xl font-bold text-blue-600">
            {departments.reduce(
              (sum, item) => sum + item.staffCount,
              0
            )}
          </h2>
        </div>

      </div>

      {/* Search */}

      <div className="rounded-2xl bg-white p-4 shadow">

        <div className="relative">

          <Search
            size={18}
            className="absolute left-4 top-4 text-gray-400"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search Department..."
            className="w-full rounded-xl border py-3 pl-11 pr-4"
          />

        </div>

      </div>

      {/* Desktop Table */}

      <div className="hidden overflow-hidden rounded-2xl bg-white shadow lg:block">

        <table className="w-full">

          <thead className="bg-gray-100">

            <tr>

              <th className="px-5 py-4 text-left">
                Department
              </th>

              <th className="px-5 py-4 text-left">
                Description
              </th>

              <th className="px-5 py-4 text-center">
                Staff
              </th>

              <th className="px-5 py-4 text-center">
                Status
              </th>

              <th className="px-5 py-4 text-center">
                Action
              </th>

            </tr>

          </thead>

          <tbody>

            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center"
                >
                  Loading...
                </td>
              </tr>
            ) : filteredDepartments.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center"
                >
                  No Department Found
                </td>
              </tr>
            ) : (
              filteredDepartments.map((department) => (
                <tr
                  key={department.id}
                  className="border-t"
                >
                  <td className="px-5 py-4 font-medium">
                    {department.name}
                  </td>

                  <td className="px-5 py-4">
                    {department.description}
                  </td>

                  <td className="px-5 py-4 text-center">
                    {department.staffCount}
                  </td>

                  <td className="px-5 py-4 text-center">

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        department.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {department.status}
                    </span>

                  </td>

                  <td className="px-5 py-4">

                    <div className="flex justify-center gap-3">

                      <Link
                        to={`/staff/departments/edit/${department.id}`}
                        className="rounded-lg bg-blue-100 p-2 text-blue-600 hover:bg-blue-200"
                      >
                        <Pencil size={18} />
                      </Link>

                      <button
                        onClick={() =>
                          handleDelete(department.id)
                        }
                        className="rounded-lg bg-red-100 p-2 text-red-600 hover:bg-red-200"
                      >
                        <Trash2 size={18} />
                      </button>

                    </div>

                  </td>

                </tr>
              ))
            )}

          </tbody>

        </table>

      </div>

      {/* Mobile */}

      <div className="grid gap-5 lg:hidden">

        {filteredDepartments.map((department) => (

          <div
            key={department.id}
            className="rounded-2xl bg-white p-5 shadow"
          >

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-blue-100 p-3">
                <Building2 className="text-blue-600" />
              </div>

              <div>

                <h3 className="font-semibold">
                  {department.name}
                </h3>

                <p className="text-sm text-gray-500">
                  {department.description}
                </p>

              </div>

            </div>

            <div className="mt-4 flex justify-between">

              <span>
                Staff :
                {" "}
                {department.staffCount}
              </span>

              <span
                className={`font-medium ${
                  department.status === "Active"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {department.status}
              </span>

            </div>

            <div className="mt-5 flex gap-3">

              <Link
                to={`/staff/departments/edit/${department.id}`}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-center text-white"
              >
                Edit
              </Link>

              <button
                onClick={() =>
                  handleDelete(department.id)
                }
                className="flex-1 rounded-lg bg-red-600 py-2 text-white"
              >
                Delete
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}