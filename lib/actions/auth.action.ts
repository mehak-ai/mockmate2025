"use server";

import { auth, db } from "@/firebase/admin";
import { CollectionReference } from "firebase-admin/firestore";
import { cookies } from "next/headers";

const ONE_WEEK = 7 * 24 * 60 * 60;

export async function signUp(params: SignUpParams) {
  const { uid, name, email } = params;

  try {
    // ✔ Admin Firestore syntax
    const userRef = db.collection("users").doc(uid);
    const userRecord = await userRef.get();

    if (userRecord.exists) {
      return {
        success: false,
        message: "User already exists. Please sign in instead.",
      };
    }

    // ✔ Admin Firestore syntax
    await userRef.set({
      name,
      email,
    });

    return {
      success: true,
      message: "User signed up successfully. Please sign in.",
    };

  } catch (e: any) {
    console.error("Error signing up user:", e);

    if (e.code === "auth/email-already-in-use") {
      return {
        success: false,
        message: "Email already in use.",
      };
    }

    return {
      success: false,
      message: "An error occurred during sign up.",
    };
  }

  return {
    success: true,
    message: "User signed up successfully.",
  };
}

export async function signIn(params: SignInParams) {
  const { email } = params;

  try {
    const userRecord = await auth.getUserByEmail(email);

    if (!userRecord) {
      return {
        success: false,
        message: "User does not exist. Please sign up first.",
      };
    }

  } catch (error) {
    console.error("Error signing in user:", error);
    return {
      success: false,
      message: "An error occurred during sign in.",
    };
  }

  return {
    success: true,
    message: "User signed in successfully.",
  };
}

export async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: ONE_WEEK * 1000,
  });

  cookieStore.set("session", sessionCookie, {
    maxAge: ONE_WEEK,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    // ✔ FIXED broken Firestore call
    const userRecord = await db
      .collection("users")
      .doc(decodedClaims.uid)
      .get();

    // ✔ FIXED: userRecord is a snapshot, check exists()
    if (!userRecord.exists) return null;

    return {
      ...userRecord.data(),
      id: userRecord.id,
    } as User;

  } catch (e) {
    console.error("Error getting current user:", e);
    return null;
  }
}

export async function isAuthenticated(){
    const user = await getCurrentUser();

    return !!user;

}
