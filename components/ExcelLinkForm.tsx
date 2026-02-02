import { useState } from "react";
// import type { ExcelLink } from "./ExcelLinkList"; // unused

interface ExcelLinkFormProps {
  onSubmit: (data: { name: string; url: string }) => void;
  onClose: () => void;
  initial?: { name: string; url: string };
  submitLabel?: string;
}

export default function ExcelLinkForm({
  onSubmit,
  onClose,
  initial = { name: "", url: "" },
  submitLabel = "Add Link",
}: ExcelLinkFormProps) {
  const [name, setName] = useState(initial.name);
  const [url, setUrl] = useState(initial.url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-7 border border-slate-200">
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
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ name, url });
          }}
        >
          <div>
            <input
              type="text"
              placeholder="Name for File"
              className="w-full px-2 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              type="url"
              className="w-full px-2 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800"
              value={url}
              placeholder="Excel Link"
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
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
              className="px-6 py-2 rounded-lg bg-blue-500 text-white shadow hover:bg-blue-600 transition"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
