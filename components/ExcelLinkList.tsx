import { useState, useEffect } from "react";

export type ExcelLink = {
  id: string;
  name: string;
  url: string;
};

interface ExcelLinkListProps {
  onEdit: (link: ExcelLink) => void;
  onDelete: (link: ExcelLink) => void;
  onSelect: (link: ExcelLink) => void;
  selectedId?: string;
  refresh?: number;
}

export default function ExcelLinkList({
  onEdit,
  onDelete,
  onSelect,
  selectedId,
  refresh = 0,
}: ExcelLinkListProps) {
  const [links, setLinks] = useState<ExcelLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchLinks = async () => {
      if (isMounted) setLoading(true);
      const res = await fetch("/api/excel_links");
      const data = await res.json();
      if (isMounted) {
        setLinks(data);
        setLoading(false);
      }
    };
    fetchLinks();
    return () => {
      isMounted = false;
    };
  }, [refresh]);

  if (loading) return <div className="p-6 text-slate-500">Loading links…</div>;
  if (links.length === 0)
    return (
      <div className="p-10 text-center text-slate-500">No links found</div>
    );

  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li
          key={link.id}
          className={`flex items-center justify-between rounded-xl border px-5 py-4 shadow-sm cursor-pointer transition bg-white/80 hover:bg-indigo-50 border-slate-200 ${
            selectedId === link.id ? "ring-2 ring-indigo-400" : ""
          }`}
          onClick={() => onSelect(link)}
        >
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-900 truncate">
              {link.name}
            </div>
            <div className="text-xs text-slate-500 truncate">{link.url}</div>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              className="px-3 py-1 text-xs rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(link);
              }}
            >
              Edit
            </button>
            <button
              className="px-3 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(link);
              }}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
