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
  loginWithEmail: (e: string, p: string, asAuthority?: boolean) => Promise<UserProfile | null>;
  loginWithGoogle: (asAuthority?: boolean) => Promise<UserProfile | null>;
  registerUser: (name: string, e: string, p: string, asAuthority?: boolean) => Promise<UserProfile | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  idToken: null,
  loading: true,
  loginWithEmail: async () => null,
  loginWithGoogle: async () => null,
  registerUser: async () => null,
  logout: async () => {}
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://hackrit.onrender.com";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // asAuthority=true hits the dedicated authority sync endpoint, which
  // grants the "authority" role. A plain resync (app load, citizen login)
  // always preserves whatever role is already stored.
  const syncBackendUser = async (u: User, asAuthority = false): Promise<UserProfile | null> => {
    try {
      const token = await u.getIdToken();
      setIdToken(token);
      const endpoint = asAuthority ? "/api/auth/sync-authority" : "/api/auth/sync";
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firebaseUid: u.uid,
          name: u.displayName || u.email?.split("@")[0] || "Citizen User",
          email: u.email || ""
        })
      });
      if (res.ok) {
        const prof = await res.json();
        setUserProfile(prof);
        return prof;
      }
    } catch (err) {
      console.warn("Backend user sync warning:", err);
    }
    return null;
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

  const loginWithEmail = async (email: string, pass: string, asAuthority = false) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    return await syncBackendUser(res.user, asAuthority);
  };

  const loginWithGoogle = async (asAuthority = false) => {
    const res = await signInWithPopup(auth, googleProvider);
    return await syncBackendUser(res.user, asAuthority);
  };

  const registerUser = async (name: string, email: string, pass: string, asAuthority = false) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    return await syncBackendUser(res.user, asAuthority);
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
