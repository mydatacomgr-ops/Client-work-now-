import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
// import { getAuth, createUserWithEmailAndPassword, updateProfile, deleteUser } from "firebase/auth";
import { NextRequest, NextResponse } from "next/server";

const usersCollection = collection(db, "users");

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const role = url.searchParams.get("role") || "";
  const q = search
    ? query(
        usersCollection,
        where("name", ">=", search),
        where("name", "<=", search + "\uf8ff")
      )
    : usersCollection;
  const snapshot = await getDocs(q);
  let users = snapshot.docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, ...data };
  }) as Array<{ id: string; role?: string; [key: string]: unknown }>;
  if (role) {
    users = users.filter((u) => u.role === role);
  }
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const {
    email,
    name,
    role,
    stores,
    password,
    authUid: providedAuthUid,
  } = await req.json();
  if (!email || !name || !role)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  try {
    // Generate a unique authUid if not provided - used for internal ID
    const authUid =
      providedAuthUid ||
      `uid_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // Check if email already exists
    const q = query(usersCollection, where("email", "==", email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const docRef = await addDoc(usersCollection, {
      email,
      name,
      role,
      stores: stores || [],
      password: password || "password123", // Store simple password for auth
      authUid,
    });
    return NextResponse.json({
      id: docRef.id,
      email,
      name,
      role,
      stores: stores || [],
      authUid,
    });
  } catch (e: any) {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { id, email, name, role, stores, password } = await req.json();

  if (!id || !email || !name || !role)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const updateData: any = {
    email,
    name,
    role,
    stores: stores || [],
  };

  // Only update password if provided
  if (password) {
    updateData.password = password;
  }

  await updateDoc(doc(usersCollection, id), updateData);

  return NextResponse.json({ id, ...updateData });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteDoc(doc(usersCollection, id));
  // Note: Deleting Firebase Auth user requires Admin SDK, not available in Next.js API routes.
  return NextResponse.json({ id });
}
