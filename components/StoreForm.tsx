import { useState } from "react";

interface StoreFormProps {
  onSubmit: (data: { name: string; storeId: string }) => void;
  onClose: () => void;
  initial?: { name: string; storeId: string };
  submitLabel?: string;
}

export default function StoreForm({
  onSubmit,
  onClose,
  initial = { name: "", storeId: "" },
  submitLabel = "Add Store",
}: StoreFormProps) {
  const [name, setName] = useState(initial.name);
  const [storeId, setStoreId] = useState(initial.storeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-7 border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-900">
            {submitLabel}
          </h2>
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ name, storeId });
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Store ID
            </label>
            <input
              type="text"
              className="w-full px-2 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Store Name
            </label>
            <input
              type="text"
              className="w-full px-2 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white shadow hover:bg-indigo-700 transition"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
