import { useState, useEffect } from "react";
import type { Store, User } from "./UserList";
import { EyeClosed, EyeIcon } from "lucide-react";

interface UserFormProps {
  onSubmit: (
    data: Omit<User, "id" | "authUid"> & { password?: string }
  ) => void;
  onClose: () => void;
  initial?: User;
  submitLabel?: string;
}

export default function UserForm({
  onSubmit,
  onClose,
  initial,
  submitLabel = "Add User",
}: UserFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [password, setPassword] = useState(initial?.password || "");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<User["role"]>(initial?.role || "client");
  const [stores, setStores] = useState<string[]>(initial?.stores || []);
  const [allStores, setAllStores] = useState<Store[]>([]);

  useEffect(() => {
    fetch("/api/stores")
      .then((res) => res.json())
      .then((data) => setAllStores(data));
  }, []);

  const handleStoreToggle = (storeName: string) => {
    setStores((prev) =>
      prev.includes(storeName)
        ? prev.filter((name) => name !== storeName)
        : [...prev, storeName]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-7 border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-900">
            {submitLabel}
          </h2>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name,
              email,
              password: password || undefined,
              role,
              stores,
            });
          }}
        >
          {/* Name */}
          <input
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {/* Email */}
          <input
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* Password with Eye */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full px-3 py-2 border rounded-lg pr-12"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!initial}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2 text-slate-500"
            >
              {showPassword ? <EyeClosed /> : <EyeIcon />}
            </button>
          </div>

          {/* Role */}
          <select
            className="w-full px-3 py-2 border rounded-lg"
            value={role}
            onChange={(e) => {
              const newRole = e.target.value as User["role"];
              setRole(newRole);
              if (newRole === "admin") setStores(allStores.map((s) => s.name));
              else setStores([]);
            }}
          >
            <option value="client">Client</option>
            <option value="admin">Admin</option>
          </select>

          {/* Stores */}
          <div className="flex flex-wrap gap-2">
            {allStores.map((store) => (
              <label key={store.id} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={stores.includes(store.name)}
                  onChange={() => handleStoreToggle(store.name)}
                />
                {store.name}
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-500 text-white rounded-lg"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
