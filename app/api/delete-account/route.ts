import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

/**
 * Deletes a Firebase Auth account by uid — used to clean up the Auth account
 * (email + password) that lib/faculty.ts / lib/students.ts create, when the
 * corresponding Firestore doc is deleted. The client SDK can only delete
 * auth.currentUser, so this has to run server-side with the Admin SDK.
 *
 * Firestore rules already gate who may delete the faculty/{uid} or
 * students/{id} doc that triggers this call; this route independently
 * re-checks that the caller is a signed-in admin or faculty account before
 * touching Auth, rather than trusting the client.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  let auth: ReturnType<typeof adminAuth>;
  try {
    auth = adminAuth();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server misconfigured." },
      { status: 500 }
    );
  }

  let callerUid: string;
  try {
    callerUid = (await auth.verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  const callerDoc = await adminDb().collection("users").doc(callerUid).get();
  const callerRole = callerDoc.data()?.role;
  if (callerRole !== "admin" && callerRole !== "faculty") {
    return NextResponse.json({ error: "Not authorized to delete accounts." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const uid = body?.uid;
  if (!uid || typeof uid !== "string") {
    return NextResponse.json({ error: "Missing uid." }, { status: 400 });
  }

  try {
    await auth.deleteUser(uid);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "auth/user-not-found") {
      return NextResponse.json({ error: "Could not delete the account." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
