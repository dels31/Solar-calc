"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

export const SUPERADMIN_EMAILS = [
  "bapuk1331@gmail.com",
  "delly@7layers.id",
  "admin@7layers.id",
];

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isPro: boolean;
  role: "user" | "superadmin";
  plan: "free" | "pro";
  proPlanType?: "project" | "monthly" | "lifetime";
  exportsCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isSuperAdmin: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  upgradeToPro: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = Boolean(
    (user?.email && SUPERADMIN_EMAILS.includes(user.email.toLowerCase())) ||
    userProfile?.role === "superadmin"
  );

  // Sync / create user profile document in Firestore
  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      const userEmail = firebaseUser.email?.toLowerCase() || "";
      const isSuper = SUPERADMIN_EMAILS.includes(userEmail);

      if (!userDoc.exists()) {
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
          photoURL: firebaseUser.photoURL,
          isPro: isSuper, // Superadmin auto PRO
          role: isSuper ? "superadmin" : "user",
          plan: isSuper ? "pro" : "free",
          proPlanType: isSuper ? "lifetime" : undefined,
          exportsCount: 0,
          createdAt: serverTimestamp(),
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
      } else {
        const data = userDoc.data() as UserProfile;
        if (isSuper && data.role !== "superadmin") {
          await updateDoc(userDocRef, {
            role: "superadmin",
            isPro: true,
            plan: "pro",
            proPlanType: "lifetime",
          });
          setUserProfile({ ...data, role: "superadmin", isPro: true, plan: "pro", proPlanType: "lifetime" });
        } else {
          setUserProfile(data);
        }
      }
    } catch (err) {
      console.warn("Gagal sinkronisasi user profile ke Firestore:", err);
      const userEmail = firebaseUser.email?.toLowerCase() || "";
      const isSuper = SUPERADMIN_EMAILS.includes(userEmail);
      setUserProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || "User",
        photoURL: firebaseUser.photoURL,
        isPro: isSuper,
        role: isSuper ? "superadmin" : "user",
        plan: isSuper ? "pro" : "free",
        exportsCount: 0,
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserProfile(currentUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    if (res.user) {
      await syncUserProfile(res.user);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      await syncUserProfile(res.user);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      if (name) {
        await updateProfile(res.user, { displayName: name });
      }
      await syncUserProfile({ ...res.user, displayName: name });
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  const upgradeToPro = async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        isPro: true,
        plan: "pro",
        upgradedAt: serverTimestamp(),
      });
      setUserProfile((prev) => (prev ? { ...prev, isPro: true, plan: "pro" } : null));
    } catch (err) {
      console.error("Gagal upgrade ke Pro:", err);
      setUserProfile((prev) => (prev ? { ...prev, isPro: true, plan: "pro" } : null));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isSuperAdmin,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        upgradeToPro,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
