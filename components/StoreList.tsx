import { useState, useEffect } from "react";

type Store = {
  id: string;
  name: string;
  storeId: string;
};

interface StoreListProps {
  onEdit: (store: Store) => void;
  onDelete: (store: Store) => void;
  search: string;
  searchId?: string;
  refresh?: number;
  readOnly?: boolean;
  allowedStores?: string[];
}

export default function StoreList({
  onEdit,
  onDelete,
  search,
  searchId = "",
  refresh = 0,
  readOnly = false,
  allowedStores,
}: StoreListProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchStores = async () => {
      if (isMounted) setLoading(true);
      try {
        const res = await fetch(
          `/api/stores?search=${encodeURIComponent(search)}`
        );
        const data: Store[] = await res.json();

        let filtered = data;
        if (searchId) {
          filtered = filtered.filter((s) =>
            s.storeId.toLowerCase().includes(searchId.toLowerCase())
          );
        }

        if (allowedStores) {
          filtered = filtered.filter((s) => allowedStores.includes(s.name));
        }

        if (isMounted) setStores(filtered);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStores();
    return () => {
      isMounted = false;
    };
  }, [search, searchId, refresh, allowedStores]);

  /* ------------------ Loading ------------------ */
  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading stores…</div>;
  }

  /* ------------------ Empty State ------------------ */
  if (stores.length === 0) {
    return (
      <div className="p-10 text-center text-slate-500">
        <p className="font-medium">No stores found</p>
        <p className="text-sm mt-1">Try adjusting your search filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-2 text-left text-md font-semibold text-slate-700">
              Store ID
            </th>
            <th className="px-4 py-2 text-left text-md font-semibold text-slate-700">
              Store Name
            </th>
            {!readOnly && (
              <th className="px-4 py-2 text-right text-md font-semibold text-slate-700">
                Actions
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {stores.map((store) => (
            <tr
              key={store.id}
              className="border-b border-slate-100 hover:bg-slate-50 transition"
            >
              <td className="px-4 py-2 text-slate-800 font-medium">
                {store.storeId}
              </td>
              <td className="px-4 py-2 text-slate-700">{store.name}</td>
              {!readOnly && (
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      onClick={() => onEdit(store)}
                      className="px-2 py-2 text-sm rounded-md border border-indigo-200 text-blue-600 hover:bg-indigo-50 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(store)}
                      className="px-2 py-2 text-sm rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
