"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface UserProfile {
  firebaseUid: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  idToken: string | null;
  loading: boolean;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  registerUser: (name: string, e: string, p: string, inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  idToken: null,
  loading: true,
  loginWithEmail: async () => {},
  loginWithGoogle: async () => {},
  registerUser: async () => {},
  logout: async () => {}
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://hackrit.onrender.com";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const syncBackendUser = async (u: User, inviteCode?: string) => {
    try {
      const token = await u.getIdToken();
      setIdToken(token);
      const res = await fetch(`${API_BASE_URL}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firebaseUid: u.uid,
          name: u.displayName || u.email?.split("@")[0] || "Citizen User",
          email: u.email || "",
          inviteCode
        })
      });
      if (res.ok) {
        const prof = await res.json();
        setUserProfile(prof);
      }
    } catch (err) {
      console.warn("Backend user sync warning:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const token = await currentUser.getIdToken();
        setIdToken(token);
        await syncBackendUser(currentUser);
      } else {
        setIdToken(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    await syncBackendUser(res.user);
  };

  const loginWithGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    await syncBackendUser(res.user);
  };

  const registerUser = async (name: string, email: string, pass: string, inviteCode?: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    await syncBackendUser(res.user, inviteCode);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserProfile(null);
    setIdToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        idToken,
        loading,
        loginWithEmail,
        loginWithGoogle,
        registerUser,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
