import React, { createContext, useContext, useState, useEffect } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

/* ── 角色對應表（管理員在這裡設定）── */
const ROLE_MAP = {
  "cyndi.ma58@gmail.com":   "coach",
  "cyndi.wing58@gmail.com": "student",
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);   // Firebase user object
  const [role,    setRole]    = useState(null);   // "coach" | "student" | null
  const [loading, setLoading] = useState(true);  // 初始載入中
  const [error,   setError]   = useState("");    // 登入錯誤訊息

  /* ── 監聽登入狀態 ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email?.toLowerCase() || "";
        const assignedRole = ROLE_MAP[email] || null;
        setUser(firebaseUser);
        setRole(assignedRole);

        // 把用戶資料寫入 Firestore（第一次登入時建立）
        const ref = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            email,
            role: assignedRole,
            displayName: firebaseUser.displayName || "",
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ── Google 登入 ── */
  const loginWithGoogle = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      setError("Google 登入失敗，請再試一次。");
    }
  };

  /* ── Email 登入 ── */
  const loginWithEmail = async (email, password) => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      const msg = {
        "auth/invalid-credential":  "Email 或密碼錯誤。",
        "auth/user-not-found":      "找不到此帳號。",
        "auth/wrong-password":      "密碼錯誤。",
        "auth/too-many-requests":   "嘗試次數過多，請稍後再試。",
      };
      setError(msg[e.code] || "登入失敗，請確認帳號密碼。");
    }
  };

  /* ── 登出 ── */
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, loading, error, loginWithGoogle, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}