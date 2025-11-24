"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";

// Session duration (1 week)
const SESSION_DURATION = 60 * 60 * 24 * 7;

// ------------------------------
// Set Session Cookie
// ------------------------------
export async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION * 1000,
  });

  cookieStore.set("session", sessionCookie, {
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

// ------------------------------
// SIGN UP
// ------------------------------
export async function signUp(params: SignUpParams) {
  const { name, email, password } = params;

  try {
    // 1️⃣ Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(email);
      if (existingUser) {
        return {
          success: false,
          message: "This email is already in use",
        };
      }
    } catch (err: any) {
      if (err.code !== "auth/user-not-found") throw err;
    }

    // 2️⃣ Create Firebase Auth User
    const user = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // 3️⃣ Create Firestore User Document
    await db.collection("users").doc(user.uid).set({
      uid: user.uid,
      name,
      email,
      role: "user",
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (error: any) {
    console.error("Error creating user:", error);
    return {
      success: false,
      message: "Failed to create account. Please try again.",
    };
  }
}

// ------------------------------
// SIGN IN
// ------------------------------
export async function signIn(params: SignInParams) {
  const { email, idToken } = params;

  try {
    // 1️⃣ Check if Auth user exists
    const userRecord = await auth.getUserByEmail(email);
    if (!userRecord) {
      return {
        success: false,
        message: "User does not exist. Create an account.",
      };
    }

    // 2️⃣ Create Firestore doc if missing
    const userDocRef = db.collection("users").doc(userRecord.uid);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      await userDocRef.set({
        uid: userRecord.uid,
        name: userRecord.displayName || "",
        email: userRecord.email || "",
        role: "user",
        createdAt: new Date().toISOString(),
      });
    }

    // 3️⃣ Set session cookie
    await setSessionCookie(idToken);

    return { success: true };
  } catch (error: any) {
    console.log("Sign-In Error:", error);
    return {
      success: false,
      message: "Failed to log into account. Please try again.",
    };
  }
}

// ------------------------------
// SIGN OUT
// ------------------------------
export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

// ------------------------------
// GET CURRENT USER
// ------------------------------
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    // Check if Auth user actually exists
    let authUser;
    try {
      authUser = await auth.getUser(decodedClaims.uid);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        console.log("User does not exist in Auth:", decodedClaims.uid);
        return null; // safely return null for SSR
      }
      throw err;
    }

    // Get or create Firestore document
    const userDocRef = db.collection("users").doc(decodedClaims.uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      await userDocRef.set({
        uid: authUser.uid,
        name: authUser.displayName || "",
        email: authUser.email || "",
        role: "user",
        createdAt: new Date().toISOString(),
      });

      return {
        uid: authUser.uid,
        id: authUser.uid,
        name: authUser.displayName || "",
        email: authUser.email || "",
        role: "user",
      } as User;
    }

    return { ...userDoc.data(), id: userDoc.id } as User;
  } catch (error) {
    console.log("getCurrentUser Error:", error);
    return null;
  }
}


// ------------------------------
// IS AUTHENTICATED
// ------------------------------
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

export async function getInterviewByUserId(userId: string): Promise<Interview[] | null> {

  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getLatestInterviews(params: GetLatestInterviewsParams): Promise<Interview[] | null> {

  const { userId, limit = 20 } = params;
  const snapshot = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}
