import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  initializeApp as _initApp,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, collection,
  query, where, getDocs, addDoc, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

/* ─────────────────────────────────────────────
   Secondary Firebase App（專門用來建立新帳號，
   不會把主教練登出）
───────────────────────────────────────────── */
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const SECONDARY_APP_NAME = "istar-secondary";
const firebaseConfig = {
  apiKey:            "AIzaSyAr_FH3cyWmcHFW4icnhzUd1TaPC9gERaI",
  authDomain:        "istar-alliance.firebaseapp.com",
  projectId:         "istar-alliance",
  storageBucket:     "istar-alliance.firebasestorage.app",
  messagingSenderId: "538197880233",
  appId:             "1:538197880233:web:fad87b5466cc04d6eea8b8",
};

function getSecondaryAuth() {
  const existing = getApps().find(a => a.name === SECONDARY_APP_NAME);
  const app = existing ?? initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  return getAuth(app);
}

/* ─────────────────────────────────────────────
   Context
───────────────────────────────────────────── */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [role,    setRole]    = useState(null);
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
          setProfile({ uid: firebaseUser.uid, ...data });
          setRole(data.role || null);
        } else {
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

  /* ══════════════════════════════════════════
     新增成員（用 secondary auth，不影響主教練登入狀態）
  ══════════════════════════════════════════ */
  const addMember = async (formData) => {
    const {
      name, email, password, role: memberRole,
      birthdate, coachName, courseType, joinDate,
    } = formData;

    try {
      const secondaryAuth = getSecondaryAuth();
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email.trim().toLowerCase(),
        password
      );
      const newUid = credential.user.uid;
      await signOut(secondaryAuth);

      const userData = {
        name,
        email: email.trim().toLowerCase(),
        role: memberRole,
        isAdmin: false,
        createdAt: serverTimestamp(),
        status: "active",
      };

      if (memberRole === "student") {
        userData.birthdate   = birthdate  || "";
        userData.coachName   = coachName  || ""; // 選填，主要聯絡教練
        userData.courseType  = courseType || "";
        userData.joinDate    = joinDate   || "";
        // 不再強制綁定 coachId，所有教練都可分配課程
      }

      await setDoc(doc(db, "users", newUid), userData);
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

  /* ── 取得所有成員（教練用）── */
  const fetchMembers = async () => {
    try {
      const q    = query(collection(db, "users"), where("role", "in", ["student", "coach"]));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    } catch {
      return [];
    }
  };

  /* ── 新增課程模組 ── */
  const addModule = async (moduleData) => {
    try {
      const ref = await addDoc(collection(db, "modules"), {
        ...moduleData,
        coachId:   auth.currentUser?.uid || "",
        coachName: profile?.name || "",
        createdAt: serverTimestamp(),
      });
      return { success: true, id: ref.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  /* ── 取得所有課程模組 ── */
  const fetchModules = async () => {
    try {
      const snap = await getDocs(collection(db, "modules"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  };

  /* ── 新增上課記錄 ── */
  const addRecord = async (recordData) => {
    try {
      const ref = await addDoc(collection(db, "records"), {
        ...recordData,
        coachId:   auth.currentUser?.uid || "",
        coachName: profile?.name || "",
        createdAt: serverTimestamp(),
      });
      return { success: true, id: ref.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  /* ── 取得上課記錄 ── */
  const fetchRecords = async () => {
    try {
      const snap = await getDocs(collection(db, "records"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  };

  /* ── 編輯成員資料 ── */
  const updateMember = async (uid, data) => {
    try {
      await setDoc(doc(db, "users", uid), data, { merge: true });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  /* ── 刪除成員（僅 Firestore 資料，Auth 帳號保留）── */
  const deleteMember = async (uid) => {
    try {
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "users", uid));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  /* ── 新增課程模組內的學習資料（連結）── */
  const addModuleResource = async (moduleId, resource) => {
    try {
      await addDoc(collection(db, "modules", moduleId, "resources"), {
        ...resource,
        addedBy:   profile?.name || "",
        addedRole: role || "",
        createdAt: serverTimestamp(),
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  /* ── 取得課程模組的學習資料 ── */
  const fetchModuleResources = async (moduleId) => {
    try {
      const snap = await getDocs(collection(db, "modules", moduleId, "resources"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  };

  return (
    <AuthContext.Provider value={{
      user, profile, role, loading, error, setError,
      loginWithEmail, logout,
      addMember, fetchMembers, updateMember, deleteMember,
      addModule, fetchModules,
      addRecord, fetchRecords,
      addModuleResource, fetchModuleResources,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}