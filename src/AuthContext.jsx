import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, collection,
  query, where, getDocs, addDoc,
  updateDoc, deleteDoc, serverTimestamp, deleteField,
  writeBatch, runTransaction,
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
  /*
   * 教練私密備註存在獨立的 recordNotes/{recordId} 集合（只有教練、管理員能讀），
   * records 本身不再含 privateNote，學員即使直接讀資料庫也看不到。
   */
  const noteRef = (recordId) => doc(db, "recordNotes", recordId);

  const addRecord = async (data) => {
    try {
      const { privateNote, ...rest } = data;
      const ref = doc(collection(db, "records"));
      const batch = writeBatch(db);
      batch.set(ref, {
        ...rest,
        coachId:   auth.currentUser?.uid || "",
        coachName: profile?.name || "",
        createdAt: serverTimestamp(),
      });
      if (privateNote) {
        batch.set(noteRef(ref.id), {
          text: privateNote, recordId: ref.id,
          coachId: auth.currentUser?.uid || "", studentUid: rest.studentUid || "",
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      return { success: true, id: ref.id };
    } catch (e) { return { success: false, error: e.message }; }
  };

  // 舊資料把 privateNote 寫在 records 裡 → 搬到 recordNotes 並從 records 移除
  const migrateNote = async (r) => {
    try {
      const batch = writeBatch(db);
      batch.set(noteRef(r.id), {
        text: r.privateNote, recordId: r.id,
        coachId: r.coachId || "", studentUid: r.studentUid || "",
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, "records", r.id), { privateNote: deleteField() });
      await batch.commit();
    } catch { /* 沒有權限（非本人記錄）時略過，管理員登入時會完成搬移 */ }
  };

  const fetchRecords = async (studentUid) => {
    try {
      // 學員只能讀「學員可見」的記錄（配合 Firestore 規則）
      const q = studentUid
        ? (role === "student"
            ? query(collection(db, "records"), where("studentUid", "==", studentUid), where("visibleStudent", "==", true))
            : query(collection(db, "records"), where("studentUid", "==", studentUid)))
        : collection(db, "records");
      const snap = await getDocs(q);
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (role === "student") {
        return records.map(({ privateNote, ...r }) => r);
      }

      // 教練 / 管理員：合併私密備註
      const notesSnap = await getDocs(collection(db, "recordNotes"));
      const notes = {};
      notesSnap.docs.forEach(d => { notes[d.id] = d.data().text || ""; });
      return records.map(r => {
        if (r.privateNote && notes[r.id] === undefined &&
            (role === "admin" || r.coachId === auth.currentUser?.uid)) {
          migrateNote(r);
        }
        return { ...r, privateNote: notes[r.id] ?? r.privateNote ?? "" };
      });
    } catch { return []; }
  };

  const updateRecord = async (recordId, data) => {
    try {
      const { privateNote, ...rest } = data;
      const batch = writeBatch(db);
      batch.update(doc(db, "records", recordId), { ...rest, privateNote: deleteField(), updatedAt: serverTimestamp() });
      if (privateNote) {
        batch.set(noteRef(recordId), {
          text: privateNote, recordId,
          coachId: auth.currentUser?.uid || "", studentUid: rest.studentUid || "",
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.delete(noteRef(recordId));
      }
      await batch.commit();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const deleteRecord = async (recordId) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "records", recordId));
      batch.delete(noteRef(recordId));
      await batch.commit();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
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

  const deleteModuleResource = async (moduleId, resourceId) => {
    try { await deleteDoc(doc(db, "modules", moduleId, "resources", resourceId)); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  /* ════════════════════════════════════════
     排課行事曆（sessions）
     status：open 可預約 | pending 待確認 | confirmed 已排定 | reschedule 請求改期
  ════════════════════════════════════════ */
  const addSessions = async (list) => {
    try {
      const batch = writeBatch(db);
      list.forEach(data => {
        const ref = doc(collection(db, "sessions"));
        batch.set(ref, {
          ...data,
          coachId:   auth.currentUser?.uid || "",
          coachName: profile?.name || "",
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const updateSession = async (id, data) => {
    try { await updateDoc(doc(db, "sessions", id), { ...data, updatedAt: serverTimestamp() }); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  const deleteSession = async (id) => {
    try { await deleteDoc(doc(db, "sessions", id)); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  // 依條件讀取（只用單一 where，避免需要建立 Firestore 複合索引）
  const fetchSessions = async ({ coachId, studentUid, status } = {}) => {
    try {
      let q = collection(db, "sessions");
      if (coachId)         q = query(q, where("coachId", "==", coachId));
      else if (studentUid) q = query(q, where("studentUid", "==", studentUid));
      else if (status)     q = query(q, where("status", "==", status));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { return []; }
  };

  // 學員確認教練排定的時段 → 已排定
  const confirmSession = (id) =>
    updateSession(id, { status: "confirmed", studentNote: "", confirmedAt: serverTimestamp() });

  // 學員請求改期（附原因）
  const requestReschedule = (id, note) =>
    updateSession(id, { status: "reschedule", studentNote: note || "" });

  // 學員預約開放時段：用 transaction 防止兩人同時搶到同一時段
  const bookOpenSession = async (id) => {
    try {
      await runTransaction(db, async (tx) => {
        const ref  = doc(db, "sessions", id);
        const snap = await tx.get(ref);
        if (!snap.exists() || snap.data().status !== "open") throw new Error("taken");
        tx.update(ref, {
          status:      "confirmed",
          studentUid:  auth.currentUser?.uid || "",
          studentName: profile?.name || "",
          confirmedAt: serverTimestamp(),
          updatedAt:   serverTimestamp(),
        });
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message === "taken" ? "這個時段剛被預約走了，請選擇其他時段。" : "預約失敗，請再試一次。" };
    }
  };

  /* ════════════════════════════════════════
     學員反饋（feedbacks）
  ════════════════════════════════════════ */
  const addFeedback = async (text) => {
    try {
      await addDoc(collection(db, "feedbacks"), {
        text,
        studentUid:  auth.currentUser?.uid || "",
        studentName: profile?.name || "",
        createdAt:   serverTimestamp(),
      });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const fetchFeedbacks = async (studentUid) => {
    try {
      const q = studentUid
        ? query(collection(db, "feedbacks"), where("studentUid", "==", studentUid))
        : collection(db, "feedbacks");
      const snap = await getDocs(q);
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch { return []; }
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
      /* 資料 */ addModuleResource, fetchModuleResources, deleteModuleResource,
      /* 排課 */ addSessions, updateSession, deleteSession, fetchSessions,
                 confirmSession, requestReschedule, bookOpenSession,
      /* 反饋 */ addFeedback, fetchFeedbacks,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }