import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, collection,
  query, where, getDocs, addDoc, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null); // Firestore users/{uid}
  const [role,    setRole]    = useState(null);  // "coach" | "student"
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  /* ── 監聽登入狀態，從 Firestore 讀取角色 ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          setRole(data.role || null);
        } else {
          // 帳號存在 Auth 但 Firestore 沒有資料
          setProfile(null);
          setRole(null);
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ── Email 登入 ── */
  const loginWithEmail = async (email, password) => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (e) {
      const msg = {
        "auth/invalid-credential": "Email 或密碼錯誤，請再確認。",
        "auth/user-not-found":     "找不到此帳號。",
        "auth/wrong-password":     "密碼錯誤。",
        "auth/too-many-requests":  "嘗試次數過多，請稍後再試。",
        "auth/invalid-email":      "Email 格式不正確。",
      };
      setError(msg[e.code] || "登入失敗，請聯絡管理員。");
    }
  };

  /* ── 登出 ── */
  const logout = () => signOut(auth);

  /* ════════════════════════════════
     教練後台：新增成員
  ════════════════════════════════ */
  const addMember = async ({
    name, email, password, birthdate,
    coachId, coachName, courseType, joinDate, role: memberRole,
  }) => {
    try {
      // 1. 在 Firebase Auth 建立帳號
      const credential = await createUserWithEmailAndPassword(
        auth._delegate ?? auth,
        email.trim().toLowerCase(),
        password
      );
      // createUserWithEmailAndPassword 會自動登入，
      // 需要重新登入回教練帳號 — 先記錄教練的 uid
      // 實際做法：用 secondary auth instance 避免切換
      // 簡單做法：先寫 Firestore，再讓教練重新登入
      const newUid = credential.user.uid;

      // 2. 寫入 Firestore users 集合
      await setDoc(doc(db, "users", newUid), {
        name,
        email: email.trim().toLowerCase(),
        birthdate,
        role: memberRole,
        coachId,
        coachName,
        courseType,
        joinDate,
        isAdmin: false,
        createdAt: serverTimestamp(),
        status: "active",
      });

      return { success: true };
    } catch (e) {
      const msg = {
        "auth/email-already-in-use": "此 Email 已被使用。",
        "auth/invalid-email":        "Email 格式不正確。",
        "auth/weak-password":        "密碼至少需要 6 個字元。",
      };
      return { success: false, error: msg[e.code] || "新增失敗：" + e.message };
    }
  };

  /* ── 取得所有成員清單（教練用）── */
  const fetchMembers = async () => {
    const q    = query(collection(db, "users"), where("role", "in", ["student", "coach"]));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  };

  return (
    <AuthContext.Provider value={{
      user, profile, role, loading, error, setError,
      loginWithEmail, logout, addMember, fetchMembers,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}