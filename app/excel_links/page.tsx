"use client";
import { useState, useEffect } from "react";
import ExcelLinkList, { ExcelLink } from "@/components/ExcelLinkList";
import ExcelLinkForm from "@/components/ExcelLinkForm";

function ExcelDataTable({ url }: { url: string }) {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    fetch(`/api/excel_proxy?url=${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then((json) => {
        setColumns(json.columns || []);
        setData(json.rows || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load Excel data");
        setLoading(false);
      });
  }, [url]);

  if (!url) return null;
  if (loading)
    return <div className="p-6 text-slate-500">Loading Excel data…</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!columns.length)
    return <div className="p-6 text-slate-500">No data found</div>;

  return (
    <div className="overflow-x-auto mt-6 rounded-xl border border-slate-200 bg-white shadow">
      <table className="min-w-5xl border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-2 py-2 text-left text-sm font-semibold text-slate-700 bg-slate-50 border-b border-slate-200 w-auto"
              >
                {col == "__EMPTY" ? "Month" : col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-slate-100 hover:bg-slate-50 transition w-auto"
            >
              {columns.map((col) => (
                <td key={col} className="px-4 py-2 text-slate-800 text-xs">
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ExcelLinksPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ExcelLink | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<ExcelLink | null>(null);

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleAdd = async (data: { name: string; url: string }) => {
    await fetch("/api/excel_links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    closeModal();
    setRefresh((r) => r + 1);
  };

  const handleEdit = async (data: { name: string; url: string }) => {
    if (!editing) return;
    await fetch("/api/excel_links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, ...data }),
    });
    closeModal();
    setRefresh((r) => r + 1);
  };

  const handleDelete = async (link: ExcelLink) => {
    if (confirm(`Delete link "${link.name}"?`)) {
      await fetch("/api/excel_links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: link.id }),
      });
      setRefresh((r) => r + 1);
      if (selected?.id === link.id) setSelected(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50  p-2 md:p-6 pt-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Excel Links
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Manage your OneDrive Excel links and view their data
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-md hover:bg-blue-600 transition text-sm md:text-lg"
          >
            + Add Link
          </button>
        </div>
        <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-sm">
          <div className="font-semibold mb-2">
            How to generate a direct CSV link from Google Sheets:
          </div>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open your Google Sheet.</li>
            <li>
              Go to <b>File &gt; Share &gt; Publish to web</b>.
            </li>
            <li>
              In the dialog that appears:
              <ul className="list-disc list-inside ml-5">
                <li>
                  Select the specific tab (e.g., <b>"Sheet1"</b>) or{" "}
                  <b>"Entire Document"</b>.
                </li>
                <li>
                  Change <b>"Web page"</b> to{" "}
                  <b>Comma-separated values (.csv)</b>.
                </li>
                <li>
                  Click <b>Publish</b>.
                </li>
              </ul>
            </li>
            <li>
              Copy the link provided. It will look like this:
              <br />
              <span className="text-xs text-blue-700 break-all">
                https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv
              </span>
            </li>
          </ol>
        </div>

        <div className="flex flex-col gap-1">
          <div>
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-slate-200 mb-6">
              <ExcelLinkList
                onEdit={(link) => {
                  setEditing(link);
                  setShowModal(true);
                }}
                onDelete={handleDelete}
                onSelect={setSelected}
                selectedId={selected?.id}
                refresh={refresh}
              />
            </div>
          </div>
          <div>
            {selected && (
              <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                <div className="mb-4">
                  <div className="font-semibold text-lg text-indigo-700">
                    {selected.name}
                  </div>
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline break-all"
                  >
                    {selected.url}
                  </a>
                </div>
                <ExcelDataTable url={selected.url} />
              </div>
            )}
            {!selected && (
              <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-10 text-center text-slate-400">
                Select a link to view its Excel data
              </div>
            )}
          </div>
        </div>
        {showModal && (
          <ExcelLinkForm
            onClose={closeModal}
            onSubmit={editing ? handleEdit : handleAdd}
            initial={editing || undefined}
            submitLabel={editing ? "Update Link" : "Add Link"}
          />
        )}
      </div>
    </div>
  );
}
