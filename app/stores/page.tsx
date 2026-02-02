"use client";
import { useState } from "react";
import StoreForm from "@/components/StoreForm";
import StoreList from "@/components/StoreList";
import { useAuth } from "@/components/AuthProvider";
// import { useRouter } from "next/navigation";

type Store = {
  id: string;
  name: string;
  storeId: string;
  status?: string;
  message?: string;
};

export default function Stores() {
  const { role, user, loading } = useAuth();
  // const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchId, setSearchId] = useState("");
  const [editing, setEditing] = useState<Store | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // Allow both admin and client
  if (loading) return null;

  const isClient = role === "client";
  const userStores = user?.stores || [];

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleAdd = async (data: {
    name: string;
    storeId: string;
    message?: string;
    status?: string;
  }) => {
    const response = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.status === 400) {
      alert("Store with Same name already exists.");
      return;
    }
    closeModal();
    setRefresh((r) => r + 1);
  };

  const handleEdit = async (data: { name: string; storeId: string }) => {
    if (!editing) return;
    await fetch("/api/stores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, ...data }),
    });
    closeModal();
    setRefresh((r) => r + 1);
  };

  const handleDelete = async (store: Store) => {
    if (confirm(`Delete store "${store.name}"?`)) {
      await fetch("/api/stores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: store.id }),
      });
      setRefresh((r) => r + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 pt-6 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Stores</h1>
            <p className="text-slate-500 mt-1 text-sm">
              {isClient
                ? "View your assigned stores"
                : "Manage and organize all registered stores"}
            </p>
          </div>

          {!isClient && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition text-sm md:text-lg"
            >
              + Add Store
            </button>
          )}
        </div>

        {/* Filters Card */}
        <div className="bg-white/80 backdrop-blur rounded-xl p-3 md:p-6 shadow-sm border border-slate-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search by store name"
              className="px-2 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 placeholder-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              type="text"
              placeholder="Search by Store ID"
              className="px-2 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 placeholder-slate-400"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
          </div>
        </div>

        {/* Store List Card */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <StoreList
            search={search}
            readOnly={isClient}
            allowedStores={isClient ? userStores : undefined}
            searchId={searchId}
            refresh={refresh}
            onEdit={(store: Store) => {
              setEditing(store);
              setShowModal(true);
            }}
            onDelete={handleDelete}
          />
        </div>

        {/* Modal */}
        {showModal && (
          <StoreForm
            onClose={closeModal}
            onSubmit={editing ? handleEdit : handleAdd}
            initial={editing || undefined}
            submitLabel={editing ? "Update Store" : "Add Store"}
          />
        )}
      </div>
    </div>
  );
}
