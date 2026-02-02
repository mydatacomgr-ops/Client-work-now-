"use client";
import { useState, useEffect } from "react";
import UserList, { User } from "@/components/UserList";
import UserForm from "@/components/UserForm";
// import { createUser } from "@/lib/auth-client"; // Removed for simple auth
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

export default function Users() {
  const { role, loading } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [searchId, setSearchId] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.push("/dashboard");
    }
  }, [loading, role, router]);

  if (loading || role !== "admin") return null;

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleAdd = async (
    data: Omit<User, "id" | "authUid"> & { password?: string }
  ) => {
    try {
      // NOTE: We are using simple Firestore auth now, so no need to create user in Firebase Auth
      // The password is sent directly to the API to be stored in the user document.

      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      closeModal();
      setRefresh((r) => r + 1);
    } catch (error: any) {
      // eslint-disable-line @typescript-eslint/no-explicit-any
      alert("Error creating user: " + error.message);
    }
  };

  const handleEdit = async (
    data: Omit<User, "id" | "authUid"> & { password?: string }
  ) => {
    if (!editing) return;

    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, ...data }),
    });

    closeModal();
    setRefresh((r) => r + 1);
  };

  const handleDelete = async (user: User) => {
    if (confirm(`Delete user "${user.name}"?`)) {
      await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, authUid: user.authUid }),
      });
      setRefresh((r) => r + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 md:p-6 pt-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Users</h1>
            <p className="text-slate-500 mt-1 text-sm">
              Manage and organize all registered users
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-2 py-2 rounded-lg shadow-md hover:bg-blue-700 transition text-sm md:text-lg"
          >
            + Add User
          </button>
        </div>
        {/* Filters Card */}
        <div className="bg-white/80 backdrop-blur rounded-xl p-3 md:p-5 shadow-sm border border-slate-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search by name"
              className="px-2 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 placeholder-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              type="text"
              placeholder="Search by User ID"
              className="px-2 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 placeholder-slate-400"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
            <input
              type="text"
              placeholder="Search by Email"
              className="px-2 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 placeholder-slate-400"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
            />
            <select
              className="px-2 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800"
              value={searchRole}
              onChange={(e) => setSearchRole(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="client">Client</option>
            </select>
          </div>
        </div>
        {/* User List Card */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <UserList
            search={search}
            searchId={searchId}
            searchEmail={searchEmail}
            searchRole={searchRole}
            refresh={refresh}
            onEdit={(user: User) => {
              setEditing(user);
              setShowModal(true);
            }}
            onDelete={handleDelete}
          />
        </div>
        {/* Modal */}
        {showModal && (
          <UserForm
            onClose={closeModal}
            onSubmit={editing ? handleEdit : handleAdd}
            initial={editing || undefined}
            submitLabel={editing ? "Update User" : "Add User"}
          />
        )}
      </div>
    </div>
  );
}
