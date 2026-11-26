"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase/client";

export type AdminRole = "super" | "editor";

type AuthState = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  /** Firestore admins/{email} 문서에 등록된 경우에만 값이 있음 */
  role: AdminRole | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);

  useEffect(() => {
    const fb = getFirebase();
    if (!fb) return;
    return onAuthStateChanged(fb.auth, async (next) => {
      setUser(next);
      setRole(null);
      if (next?.email) {
        try {
          const snap = await getDoc(doc(fb.db, "admins", next.email));
          const value = snap.exists() ? snap.data().role : null;
          setRole(value === "super" || value === "editor" ? value : null);
        } catch {
          // 보안 규칙에서 거부되면 관리자가 아닌 것으로 처리
          setRole(null);
        }
      }
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async () => {
    const fb = getFirebase();
    if (!fb) return;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(fb.auth, provider);
  }, []);

  const signOut = useCallback(async () => {
    const fb = getFirebase();
    if (fb) await fbSignOut(fb.auth);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      configured: isFirebaseConfigured,
      loading,
      user,
      role,
      signIn,
      signOut,
    }),
    [loading, user, role, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
