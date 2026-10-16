import { useSessionState } from "@/hooks/useSessionState";
import ListSortControl from "@/components/common/ListSortControl";
import PaginatedList from "@/components/common/PaginatedList";
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
  const [search, setSearch] = useSessionState("staff:DepartmentsPage:search", "");

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
          <h1 className="ui-page-title">
            Departments
          </h1>

          <p className="text-slate-500">
            Manage academy departments
          </p>
        </div>

        <Link
          to="/staff/departments/add"
          className="ui-button flex items-center gap-2 bg-brand-600 py-3 text-white hover:bg-brand-700"
        >
          <Plus size={18} />
          Add Department
        </Link>

      </div>

      {/* Stats */}

      <div className="grid gap-5 md:grid-cols-3">

        <div className="sm:p-5 p-4 ui-surface">
          <p className="text-slate-500">
            Total Departments
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            {departments.length}
          </h2>
        </div>

        <div className="sm:p-5 p-4 ui-surface">
          <p className="text-slate-500">
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

        <div className="sm:p-5 p-4 ui-surface">
          <p className="text-slate-500">
            Total Staff
          </p>

          <h2 className="mt-2 text-3xl font-bold text-brand-600">
            {departments.reduce(
              (sum, item) => sum + item.staffCount,
              0
            )}
          </h2>
        </div>

      </div>

      {/* Search */}

      <div className="ui-surface flex flex-col gap-3 p-4 sm:flex-row">

        <div className="relative flex-1">

          <Search
            size={18}
            className="absolute left-4 top-4 text-slate-400"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search Department..."
            className="ui-field w-full pl-11 pr-4"
          />

        </div>

        <ListSortControl />
      </div>

      {/* Desktop Table */}

      <div className="ui-surface hidden overflow-hidden lg:block">

        <table className="ui-table">

          <thead className="ui-table-head">

            <tr>

              <th className="px-4 py-3 text-left">
                Department
              </th>

              <th className="px-4 py-3 text-left">
                Description
              </th>

              <th className="px-4 py-3 text-center">
                Staff
              </th>

              <th className="px-4 py-3 text-center">
                Status
              </th>

              <th className="px-4 py-3 text-center">
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
              <PaginatedList showSort={false} items={filteredDepartments} table>{(department) => (
                <tr
                  key={department.id}
                  className="border-t"
                >
                  <td className="px-4 py-3 font-medium">
                    {department.name}
                  </td>

                  <td className="px-4 py-3">
                    {department.description}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {department.staffCount}
                  </td>

                  <td className="px-4 py-3 text-center">

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

                  <td className="px-4 py-3">

                    <div className="flex justify-center gap-3">

                      <Link
                        to={`/staff/departments/edit/${department.id}`}
                        className="rounded-lg bg-brand-100 p-2 text-brand-600 hover:bg-brand-200"
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
              )}</PaginatedList>
            )}

          </tbody>

        </table>

      </div>

      {/* Mobile */}

      <div className="grid gap-5 lg:hidden">

        {<PaginatedList showSort={false} items={filteredDepartments}>{(department) => (

          <div
            key={department.id}
            className="ui-surface p-5"
          >

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-brand-100 p-3">
                <Building2 className="text-brand-600" />
              </div>

              <div>

                <h3 className="font-semibold">
                  {department.name}
                </h3>

                <p className="text-sm text-slate-500">
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
                className="flex-1 rounded-lg bg-brand-600 py-2 text-center text-white"
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

        )}</PaginatedList>}

      </div>

    </div>
  );
}