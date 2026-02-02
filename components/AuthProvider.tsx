"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

// Define a minimal User type for our simplified auth
export interface SimpleUser {
  id: string; // Firestore document ID
  name: string;
  email: string;
  role: string | "admin" | "client";
  stores: string[];
}

interface AuthContextType {
  user: SimpleUser | null;
  role: string | null;
  loading: boolean;
  login: (email: string) => Promise<void>; // Simple login sets session
  logout: () => void;
  assignedStores: string[];
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  assignedStores: [],
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [assignedStores, setAssignedStores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Check for existing session in localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("dashboard_user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setRole(parsedUser.role);
        setAssignedStores(parsedUser.stores || []);
      } catch (e) {
        console.error("Failed to parse stored user", e);
        localStorage.removeItem("dashboard_user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string) => {
    // We assume the caller (LoginPage) has already verified credentials against Firestore
    // Here we just fetch the user details to set session
    try {
        setLoading(true);
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const userData = docSnap.data();
            const simpleUser: SimpleUser = {
                id: docSnap.id,
                name: userData.name,
                email: userData.email,
                role: userData.role || "client",
                stores: userData.stores || []
            };
            
            setUser(simpleUser);
            setRole(simpleUser.role);
            setAssignedStores(simpleUser.stores);
            
            // Persist session
            localStorage.setItem("dashboard_user", JSON.stringify(simpleUser));
        }
    } catch (e) {
        console.error("Login session error", e);
    } finally {
        setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    setAssignedStores([]);
    localStorage.removeItem("dashboard_user");
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, assignedStores }}>
      {children}
    </AuthContext.Provider>
  );
}
