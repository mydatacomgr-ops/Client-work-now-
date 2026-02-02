import { useState, useEffect } from "react";

export default function ExcelDataTable({ url }: { url: string }) {
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
              {columns.map((col) => {
                let value = row[col];
                if (typeof value === "string" && value.includes("€")) {
                  // Remove euro symbol and convert to number
                  value = value.replace(/€/g, "").replace(/,/g, "").trim();
                  value = parseFloat(value) || 0;
                }
                return (
                  <td key={col} className="px-4 py-2 text-slate-800 text-xs">
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
