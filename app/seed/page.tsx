"use client";

import { useState } from "react";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
// import { createUser } from "@/lib/auth-client"; // Removed
import { Button } from "@/components/ui/button";

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const seedData = async () => {
    if (!confirm("This will create dummy data. Continue?")) return;
    
    setLoading(true);
    setLogs([]);
    addLog("Starting seed process...");

    try {
      // 1. Create Stores
      addLog("Creating stores...");
      const storesRef = collection(db, "stores");
      
      const dummyStores = [
        { name: "Downtown Store", storeId: "ST-001" },
        { name: "Uptown Store", storeId: "ST-002" },
        { name: "Mall Kiosk", storeId: "ST-003" },
        { name: "Airport Branch", storeId: "ST-004" },
        { name: "Suburb Warehouse", storeId: "ST-005" },
      ];

      const createdStores: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

      for (const store of dummyStores) {
        // Check if exists roughly (optional, but good for idempotency)
        const q = query(storesRef, where("storeId", "==", store.storeId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            const docRef = await addDoc(storesRef, store);
            createdStores.push({ id: docRef.id, ...store });
            addLog(`Created store: ${store.name}`);
        } else {
            createdStores.push({ id: snapshot.docs[0].id, ...store });
            addLog(`Store already exists: ${store.name}`);
        }
      }

      // 2. Create Users
      addLog("Creating users...");
      const usersRef = collection(db, "users");

      const dummyUsers = [
        {
          name: "Admin User",
          email: "admin@example.com",
          password: "password123",
          role: "admin",
          stores: [], // Admin sees all
        },
        {
          name: "Client One",
          email: "client1@example.com",
          password: "password123",
          role: "client",
          stores: [createdStores[0]?.name, createdStores[1]?.name].filter(Boolean),
        },
        {
          name: "Client Two",
          email: "client2@example.com",
          password: "password123",
          role: "client",
          stores: [createdStores[2]?.name].filter(Boolean),
        },
      ];

      for (const user of dummyUsers) {
        // Check if user exists in Firestore
        const q = query(usersRef, where("email", "==", user.email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          try {
            // Updated for Simple Firestore Auth: Storing password directly
            await addDoc(usersRef, {
              name: user.name,
              email: user.email,
              role: user.role,
              stores: user.stores,
              password: user.password, // Storing directly
              authUid: `dummy_${Date.now()}_${Math.random()}` 
            });
            addLog(`Created user: ${user.name}`);
          } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            addLog(`Error creating user ${user.email}: ${err.message}`);
          }
        } else {
            addLog(`User already exists in Firestore: ${user.email}`);
        }
      }

      // 3. Create Dummy Excel Link
      addLog("Creating dummy Excel link...");
      const linksRef = collection(db, "excel_links");
      const linkQ = query(linksRef, where("url", "==", "dummy://seed-data"));
      const linkSnap = await getDocs(linkQ);

      if (linkSnap.empty) {
          await addDoc(linksRef, {
              name: "Dummy Data Source",
              url: "dummy://seed-data",
              uploadedAt: new Date().toISOString()
          });
          addLog("Created dummy Excel link");
      } else {
          addLog("Dummy Excel link already exists");
      }

      addLog("Seed complete!");

    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error(error);
      addLog(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50 font-mono">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4">Database Seeder</h1>
        <p className="mb-6 text-gray-600">
          This script will populate your Firestore database with dummy stores and users. 
          It will create users with simple password authentication (password123).
        </p>

        <Button 
          onClick={seedData} 
          disabled={loading}
          className="w-full mb-6"
        >
          {loading ? "Seeding..." : "Start Seeding"}
        </Button>

        <div className="bg-black text-green-400 p-4 rounded-lg h-64 overflow-y-auto text-sm">
          {logs.length === 0 ? (
            <span className="text-gray-500">Waiting to start...</span>
          ) : (
            logs.map((log, i) => <div key={i}>{`> ${log}`}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
