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
import { NextRequest, NextResponse } from "next/server";

const storesCollection = collection(db, "stores");

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const q = search
    ? query(
        storesCollection,
        where("name", ">=", search),
        where("name", "<=", search + "\uf8ff"),
      )
    : storesCollection;
  const snapshot = await getDocs(q);
  const stores = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(stores);
}

export async function POST(req: NextRequest) {
  const { name, storeId } = await req.json();

  if (!name || !storeId) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });
  }

  const nameLower = name;

  const duplicateQuery = query(
    storesCollection,
    where("nameLower", "==", nameLower),
  );

  const existing = await getDocs(duplicateQuery);

  if (!existing.empty) {
    return NextResponse.json(
      { message: "Store name already exists" },
      { status: 400 },
    );
  }

  const docRef = await addDoc(storesCollection, {
    name: name.trim(),
    nameLower,
    storeId: storeId.trim(),
  });

  return NextResponse.json({
    id: docRef.id,
    name,
    storeId,
  });
}

export async function PUT(req: NextRequest) {
  const { id, name, storeId } = await req.json();
  if (!id || !name || !storeId)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  await updateDoc(doc(storesCollection, id), { name, storeId });
  return NextResponse.json({ id, name, storeId });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteDoc(doc(storesCollection, id));
  return NextResponse.json({ id });
}
