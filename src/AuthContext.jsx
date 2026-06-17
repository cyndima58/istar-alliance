import Rimport React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, collection,
  query, where, getDocs, addDoc,
  updateDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

/* ── Secondary App（新增成員用，不影響主帳號登入狀態）── */
const SECONDARY = "istar-secondary";
const FB_CONFIG = {
  apiKey:            "AIzaSyAr_FH3cyWmcHFW4icnhzUd1TaPC9gERaI",
  authDomain:        "istar-alliance.firebaseapp.com",
  projectId:         "istar-alliance",
  storageBucket:     "istar-alliance.firebasestorage.app",
  messagingSenderId: "538197880233",
  appId:             "1:538197880233:web:fad87b5466cc04d6eea8b8",
};
const getSecondaryAuth = () => {
  const existing = getApps().find(a => a.name === SECONDARY);
  return getAuth(existing ?? initializeApp(FB_CONFIG, SECONDARY));
};

/* ════════════════════════════════════════
   Context
════════════════════════════════════════ */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [role,    setRole]    = useState(null);   // "admin" | "coach" | "student"
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  /* ── 登入狀態監聽 ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile({ uid: u.uid, ...data });
          setRole(data.role || null);
        } else {
          setProfile(null); setRole(null);
        }
        setUser(u);
      } else {
        setUser(null); setProfile(null); setRole(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ── 登入 ── */
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

  /* ════════════════════════════════════════
     成員管理（管理員）
  ════════════════════════════════════════ */
  const addMember = async (formData) => {
    const { name, email, password, role: r, birthdate, coachName, courseType, joinDate } = formData;
    try {
      const sa  = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(sa, email.trim().toLowerCase(), password);
      const uid  = cred.user.uid;
      await signOut(sa);
      const data = {
        name, email: email.trim().toLowerCase(),
        role: r, isAdmin: r === "admin",
        createdAt: serverTimestamp(), status: "active",
      };
      if (r === "student") {
        data.birthdate  = birthdate  || "";
        data.coachName  = coachName  || "";
        data.courseType = courseType || "";
        data.joinDate   = joinDate   || "";
      }
      await setDoc(doc(db, "users", uid), data);
      return { success: true };
    } catch (e) {
      const msg = {
        "auth/email-already-in-use": "此 Email 已被使用。",
        "auth/invalid-email":        "Email 格式不正確。",
        "auth/weak-password":        "密碼至少需要 6 個字元。",
      };
      return { success: false, error: msg[e.code] || e.message };
    }
  };

  const fetchMembers = async () => {
    try {
      const snap = await getDocs(query(collection(db, "users"), where("role", "in", ["admin","coach","student"])));
      return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    } catch { return []; }
  };

  const updateMember = async (uid, data) => {
    try { await setDoc(doc(db, "users", uid), data, { merge: true }); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  const deleteMember = async (uid) => {
    try { await deleteDoc(doc(db, "users", uid)); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  /* ════════════════════════════════════════
     課程模組
     狀態：draft（草稿）→ pending（待審）→ published（已發布）| rejected（退回）
  ════════════════════════════════════════ */
  const addModule = async (data) => {
    try {
      const ref = await addDoc(collection(db, "modules"), {
        ...data,
        coachId:   auth.currentUser?.uid || "",
        coachName: profile?.name || "",
        status:    "published", // 教練新增後直接發布
        createdAt: serverTimestamp(),
      });
      return { success: true, id: ref.id };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const fetchModules = async (statusFilter) => {
    try {
      const q = statusFilter
        ? query(collection(db, "modules"), where("status", "==", statusFilter))
        : collection(db, "modules");
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { return []; }
  };

  // 管理員審核：approve | reject
  const reviewModule = async (moduleId, action, note = "") => {
    try {
      await updateDoc(doc(db, "modules", moduleId), {
        status:      action === "approve" ? "published" : "rejected",
        reviewNote:  note,
        reviewedBy:  profile?.name || "",
        reviewedAt:  serverTimestamp(),
      });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  // 教練編輯（只能在 draft / rejected 狀態）
  const updateModule = async (moduleId, data) => {
    try {
      await updateDoc(doc(db, "modules", moduleId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const deleteModule = async (moduleId) => {
    try { await deleteDoc(doc(db, "modules", moduleId)); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  /* ════════════════════════════════════════
     分配課程
  ════════════════════════════════════════ */
  const saveAssignment = async (studentUid, moduleIds) => {
    try {
      await setDoc(doc(db, "assignments", studentUid), {
        studentUid,
        moduleIds,
        updatedBy:  profile?.name || "",
        updatedAt:  serverTimestamp(),
      });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const fetchAssignment = async (studentUid) => {
    try {
      const snap = await getDoc(doc(db, "assignments", studentUid));
      return snap.exists() ? snap.data().moduleIds || [] : [];
    } catch { return []; }
  };

  /* ════════════════════════════════════════
     上課記錄
  ════════════════════════════════════════ */
  const addRecord = async (data) => {
    try {
      const ref = await addDoc(collection(db, "records"), {
        ...data,
        coachId:   auth.currentUser?.uid || "",
        coachName: profile?.name || "",
        createdAt: serverTimestamp(),
      });
      return { success: true, id: ref.id };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const fetchRecords = async (studentUid) => {
    try {
      const q = studentUid
        ? query(collection(db, "records"), where("studentUid", "==", studentUid))
        : collection(db, "records");
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { return []; }
  };

  const updateRecord = async (recordId, data) => {
    try { await updateDoc(doc(db, "records", recordId), { ...data, updatedAt: serverTimestamp() }); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  const deleteRecord = async (recordId) => {
    try { await deleteDoc(doc(db, "records", recordId)); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  /* ════════════════════════════════════════
     課程學習資料（模組子集合）
  ════════════════════════════════════════ */
  const addModuleResource = async (moduleId, resource) => {
    try {
      await addDoc(collection(db, "modules", moduleId, "resources"), {
        ...resource, addedBy: profile?.name || "", addedRole: role || "",
        createdAt: serverTimestamp(),
      });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const fetchModuleResources = async (moduleId) => {
    try {
      const snap = await getDocs(collection(db, "modules", moduleId, "resources"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { return []; }
  };

  return (
    <AuthContext.Provider value={{
      user, profile, role, loading, error, setError,
      loginWithEmail, logout,
      /* 成員 */ addMember, fetchMembers, updateMember, deleteMember,
      /* 模組 */ addModule, fetchModules, reviewModule, updateModule, deleteModule,
      /* 分配 */ saveAssignment, fetchAssignment,
      /* 記錄 */ addRecord, fetchRecords, updateRecord, deleteRecord,
      /* 資料 */ addModuleResource, fetchModuleResources,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }