import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

const linksCollection = collection(db, "excel_links");

export async function GET() {
  const snapshot = await getDocs(linksCollection);
  const links = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(links);
}

export async function POST(req: NextRequest) {
  const { name, url } = await req.json();
  if (!name || !url)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const docRef = await addDoc(linksCollection, { name, url });
  return NextResponse.json({ id: docRef.id, name, url });
}

export async function PUT(req: NextRequest) {
  const { id, name, url } = await req.json();
  if (!id || !name || !url)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  await updateDoc(doc(linksCollection, id), { name, url });
  return NextResponse.json({ id, name, url });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteDoc(doc(linksCollection, id));
  return NextResponse.json({ id });
}
