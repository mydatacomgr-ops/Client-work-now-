import { useState, useEffect } from "react";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "client";
  stores: string[];
  authUid?: string;
  password?: string;
};

export type Store = {
  id: string;
  name: string;
  storeId: string;
};

interface UserListProps {
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  search: string;
  searchId?: string;
  searchEmail?: string;
  searchRole?: string;
  refresh?: number;
}

export default function UserList({
  onEdit,
  onDelete,
  search,
  searchId = "",
  searchEmail = "",
  searchRole = "",
  refresh = 0,
}: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      if (isMounted) setLoading(true);
      try {
        let url = `/api/users?search=${encodeURIComponent(search)}`;
        if (searchRole) url += `&role=${encodeURIComponent(searchRole)}`;
        const res = await fetch(url);
        const data: User[] = await res.json();
        let filtered = data;
        if (searchId) {
          filtered = filtered.filter((u) =>
            (u.authUid || u.id).toLowerCase().includes(searchId.toLowerCase())
          );
        }
        if (searchEmail) {
          filtered = filtered.filter((u) =>
            u.email.toLowerCase().includes(searchEmail.toLowerCase())
          );
        }
        if (isMounted) setUsers(filtered);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, [search, searchId, searchEmail, searchRole, refresh]);

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading users…</div>;
  }
  if (users.length === 0) {
    return (
      <div className="p-10 text-center text-slate-500">
        <p className="font-medium">No users found</p>
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
              User ID
            </th>
            <th className="px-4 py-2 text-left text-md font-semibold text-slate-700">
              Name
            </th>
            <th className="px-4 py-2 text-left text-md font-semibold text-slate-700">
              Email
            </th>
            <th className="px-4 py-2 text-left text-md font-semibold text-slate-700">
              Role
            </th>
            <th className="px-4 py-2 text-left text-md   font-semibold text-slate-700">
              Stores
            </th>
            <th className="px-4 py-2 text-right text-md font-semibold text-slate-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.authUid || user.id}
              className="border-b border-slate-100 hover:bg-slate-50 transition"
            >
              <td className="px-4 py-2 text-slate-800 font-medium">
                {user.authUid || user.id}
              </td>
              <td className="px-4 py-2 text-slate-700">{user.name}</td>
              <td className="px-4 py-2 text-slate-700">{user.email}</td>
              <td className="px-4 py-2 text-slate-700 capitalize">
                {user.role}
              </td>
              <td className="px-4 py-2 text-slate-700">
                {user.stores && user.stores.length > 0 ? (
                  user.stores.join(", ")
                ) : (
                  <span className="text-slate-400">None</span>
                )}
              </td>
              <td className="px-4 py-2 text-right">
                <div className="inline-flex gap-2">
                  <button
                    onClick={() => onEdit(user)}
                    className="px-2 py-2 text-sm rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(user)}
                    className="px-2 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
