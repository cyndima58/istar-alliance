import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, collection,
  query, where, getDocs, addDoc,
  updateDoc, deleteDoc, serverTimestamp, deleteField,
  writeBatch, runTransaction, orderBy, limit,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { normalizeCourse, initialJourney, advanceUpdate, setStageUpdate, mKey, stageOf } from "./journey";
import { notify, rebindPush, unbindPushOnLogout } from "./push";
import { todayStr } from "./schedule";
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

const ROLE_ORDER = ["admin", "coach", "student"];

/* 需要等伺服器先讀到資料的通知（例如取消課程，伺服器要在刪除前讀到內容）；最多等 4 秒 */
async function notifyNow(type, payload) {
  if (typeof window !== "undefined" && window.__ISTAR_NO_PUSH) return;
  try {
    const t = await auth.currentUser?.getIdToken(); if (!t) return;
    await Promise.race([
      fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ type, ...payload }) }),
      new Promise(r => setTimeout(r, 4000)),
    ]);
  } catch {}
}
const STUDENT_FIELDS = ["courseType", "coachName", "birthdate"];

/* 課程模組排序：手動排序（order）優先，其次依名稱（「第 2 堂」排在「第 10 堂」前面） */
export function sortModules(list) {
  return [...list].sort((a, b) => {
    const oa = Number.isFinite(a.order) ? a.order : Infinity, ob = Number.isFinite(b.order) ? b.order : Infinity;
    if (oa !== ob) return oa - ob;
    return (a.title || "").localeCompare(b.title || "", "zh-Hant", { numeric: true });
  });
}
// 相容舊資料：只有 role 欄位的帳號視為單一身分
export function rolesOf(u) {
  const list = Array.isArray(u?.roles) && u.roles.length ? u.roles : (u?.role ? [u.role] : []);
  return ROLE_ORDER.filter(r => list.includes(r));
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [role,    setRole]    = useState(null);   // 目前使用中的身分 "admin" | "coach" | "student"
  const [roles,   setRoles]   = useState([]);     // 這個帳號擁有的所有身分
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  /* ── 登入狀態監聽 ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          const list = rolesOf(data);
          let saved = "";
          try { saved = localStorage.getItem("istar.activeRole." + u.uid) || ""; } catch {}
          setProfile({ uid: u.uid, ...data, courseType: normalizeCourse(data.courseType) });
          setRoles(list);
          setRole(list.includes(saved) ? saved : (list[0] || null));
          rebindPush();
        } else {
          setProfile(null); setRole(null); setRoles([]);
        }
        setUser(u);
      } else {
        setUser(null); setProfile(null); setRole(null); setRoles([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 一個帳號可以同時是管理員＋教練，切換後介面跟著改變
  const switchRole = (r) => {
    if (!roles.includes(r)) return;
    setRole(r);
    try { localStorage.setItem("istar.activeRole." + auth.currentUser?.uid, r); } catch {}
  };

  /* ── 登入 ── */
  const loginWithEmail = async (email, password) => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (e) {
      const msg = {
        "auth/invalid-credential": "Email 或密碼不正確。請檢查 Email 的每個字母是否正確（例如多打或少打一個字），或點下方「忘記密碼」。",
        "auth/user-not-found":     "找不到此帳號，請確認 Email 拼字。",
        "auth/wrong-password":     "密碼錯誤。",
        "auth/too-many-requests":  "嘗試次數過多，帳號暫時鎖定，請稍後再試或點「忘記密碼」。",
        "auth/invalid-email":      "Email 格式不正確。",
        "auth/network-request-failed": "網路連線不穩，請檢查網路後再試。",
      };
      setError(msg[e.code] || "登入失敗，請聯絡管理員。");
    }
  };

  // 寄送重設密碼信（Firebase 內建，信件寄到該 Email）
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      return { success: true };
    } catch (e) {
      const msg = { "auth/invalid-email": "Email 格式不正確。", "auth/missing-email": "請先輸入 Email。" };
      // 為了安全，帳號不存在時 Firebase 也會回成功，不透露帳號是否存在
      return { success: false, error: msg[e.code] || "寄送失敗，請稍後再試。" };
    }
  };

  /* ── 登出 ── */
  const logout = async () => { await unbindPushOnLogout(); return signOut(auth); };

  /* ════════════════════════════════════════
     成員管理（管理員）
  ════════════════════════════════════════ */
  const addMember = async (formData) => {
    const { name, email, password, birthdate, coachName, courseType, joinDate } = formData;
    const list = rolesOf({ roles: formData.roles, role: formData.role });
    const r = list[0];
    try {
      const sa  = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(sa, email.trim().toLowerCase(), password);
      const uid  = cred.user.uid;
      await signOut(sa);
      const data = {
        name, email: email.trim().toLowerCase(),
        role: r, roles: list, isAdmin: list.includes("admin"),
        createdAt: serverTimestamp(), status: "active",
      };
      if (r === "student") {
        data.birthdate  = birthdate  || "";
        data.coachName  = coachName  || "";
        data.courseType = courseType || "";
        data.joinDate   = joinDate   || "";
      }
      await setDoc(doc(db, "users", uid), data);
      // 學員一建立就開通成長路徑
      if (r === "student") {
        await setDoc(doc(db, "journeys", uid), { ...initialJourney({ uid, name, courseType }), updatedAt: serverTimestamp() });
      }
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
      return snap.docs.map(d => {
        const data = d.data();
        return { uid: d.id, ...data, roles: rolesOf(data), courseType: normalizeCourse(data.courseType) };
      });
    } catch { return []; }
  };

  const updateMember = async (uid, data) => {
    try {
      const patch = { ...data };
      if (Array.isArray(data.roles)) {
        const list = rolesOf({ roles: data.roles });
        patch.roles = list; patch.role = list[0]; patch.isAdmin = list.includes("admin");
        // 不是學員就不該有班別、聯絡教練、生日等學員欄位
        if (!list.includes("student")) STUDENT_FIELDS.forEach(k => { patch[k] = deleteField(); });
      }
      await setDoc(doc(db, "users", uid), patch, { merge: true });
      return { success: true };
    }
    catch (e) { return { success: false, error: e.message }; }
  };

  // 清掉非學員身上殘留的學員欄位（例如原本建成學員、後來改成教練／管理員）
  const cleanupStaffFields = async (members) => {
    const dirty = members.filter(m => !rolesOf(m).includes("student") && STUDENT_FIELDS.some(k => m[k] !== undefined));
    for (const m of dirty) {
      try { await setDoc(doc(db, "users", m.uid), Object.fromEntries(STUDENT_FIELDS.map(k => [k, deleteField()])), { merge: true }); } catch {}
    }
    return dirty.length;
  };

  /* 伺服器端管理操作（重設密碼、刪除登入帳號）：需在 Vercel 設定 FIREBASE_SERVICE_ACCOUNT */
  const ADMIN_ERR = {
    not_configured: "伺服器金鑰尚未設定，暫時無法使用（請在 Vercel 設定 FIREBASE_SERVICE_ACCOUNT）。",
    not_admin: "只有管理員可以執行這個操作。", invalid_token: "登入已過期，請重新登入後再試。",
    weak_password: "密碼至少需要 6 個字元。", user_not_found: "找不到這個成員的登入帳號。",
    cannot_delete_self: "不能刪除自己的登入帳號。",
  };
  const adminAction = async (action, payload) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const r = await fetch("/api/admin-users", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, ...payload }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) return { success: true, ...j };
      return { success: false, code: j.error || "http_" + r.status, error: ADMIN_ERR[j.error] || "伺服器暫時無法處理，請稍後再試。" };
    } catch { return { success: false, code: "network", error: "網路連線失敗，請稍後再試。" }; }
  };
  const resetMemberPassword = (uid, password) => adminAction("resetPassword", { uid, password });

  const deleteMember = async (uid) => {
    try {
      await deleteDoc(doc(db, "users", uid));
      return { success: true };
    }
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
      return sortModules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { return []; }
  };

  // 手動排序：依傳入順序寫入 order
  const reorderModules = async (ids) => {
    try {
      const batch = writeBatch(db);
      ids.forEach((id, i) => batch.update(doc(db, "modules", id), { order: (i + 1) * 10 }));
      await batch.commit();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  // 管理員：模組使用狀況（分配給哪些學員、排了幾堂課）
  const fetchModuleUsage = async (moduleId) => {
    try {
      const [as, ss, rs] = await Promise.all([
        getDocs(query(collection(db, "assignments"), where("moduleIds", "array-contains", moduleId))),
        getDocs(query(collection(db, "sessions"), where("moduleId", "==", moduleId))),
        getDocs(resCol(moduleId)),
      ]);
      return { studentUids: as.docs.map(d => d.id), sessions: ss.docs.map(d => ({ id: d.id, ...d.data() })), resources: rs.size };
    } catch { return { studentUids: [], sessions: [], resources: 0 }; }
  };

  // 管理員：把模組轉給另一位教練（學習資料、學員分配都跟著模組走）
  const transferModule = async (moduleId, coach) => {
    try {
      await updateDoc(doc(db, "modules", moduleId), { coachId: coach.uid, coachName: coach.name, transferredAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
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

  // 刪除模組：連同學習資料（含檔案區塊）一起刪，並從學員的課程分配中移除
  const deleteModule = async (moduleId) => {
    try {
      const rs = await getDocs(resCol(moduleId));
      for (const r of rs.docs) {
        const parts = r.data().parts || 0;
        for (let i = 0; i < parts; i++) await deleteDoc(doc(db, "modules", moduleId, "resources", r.id, "chunks", String(i)));
        await deleteDoc(r.ref);
      }
      const as = await getDocs(query(collection(db, "assignments"), where("moduleIds", "array-contains", moduleId)));
      if (!as.empty) {
        const batch = writeBatch(db);
        as.docs.forEach(d => batch.update(d.ref, { moduleIds: (d.data().moduleIds || []).filter(x => x !== moduleId), updatedAt: serverTimestamp() }));
        await batch.commit();
      }
      await deleteDoc(doc(db, "modules", moduleId));
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
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
      if (rest.visibleStudent) notify("record_new", { id: ref.id });
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
  const resCol = (moduleId) => collection(db, "modules", moduleId, "resources");
  const resDoc = (moduleId, id) => doc(db, "modules", moduleId, "resources", id);

  const addModuleResource = async (moduleId, resource) => {
    try {
      const ref = await addDoc(resCol(moduleId), {
        ...resource, addedBy: profile?.name || "", addedByUid: auth.currentUser?.uid || "",
        addedRole: role || "", order: Date.now(), createdAt: serverTimestamp(),
      });
      return { success: true, id: ref.id };
    } catch (e) { return { success: false, error: e.message }; }
  };

  /*
   * 檔案／圖片：免費方案無法使用 Firebase Storage，改把檔案切成約 700KB 的區塊
   * 存在 modules/{m}/resources/{r}/chunks/{i}。資源本身只存名稱、大小、縮圖。
   */
  const CHUNK = 700 * 1024;
  const uploadModuleFile = async (moduleId, { name, mime, size, dataUrl, thumb, kind }, onProgress) => {
    try {
      const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      const parts = Math.ceil(b64.length / CHUNK);
      const ref = doc(resCol(moduleId));
      // 先寫區塊，最後才寫資源本體 → 清單上不會出現傳到一半的檔案
      for (let i = 0; i < parts; i++) {
        await setDoc(doc(db, "modules", moduleId, "resources", ref.id, "chunks", String(i)), {
          i, data: b64.slice(i * CHUNK, (i + 1) * CHUNK), addedByUid: auth.currentUser?.uid || "",
        });
        onProgress?.((i + 1) / (parts + 1));
      }
      await setDoc(ref, {
        type: kind, name, mime, size, parts, thumb: thumb || "",
        addedBy: profile?.name || "", addedByUid: auth.currentUser?.uid || "",
        addedRole: role || "", order: Date.now(), createdAt: serverTimestamp(),
      });
      onProgress?.(1);
      return { success: true, id: ref.id };
    } catch (e) { return { success: false, error: e.message }; }
  };

  // 讀回完整檔案，回傳 data URL
  const fetchResourceFile = async (moduleId, r) => {
    const snap = await getDocs(collection(db, "modules", moduleId, "resources", r.id, "chunks"));
    const b64 = snap.docs.map(d => d.data()).sort((a, b) => a.i - b.i).map(c => c.data).join("");
    return `data:${r.mime || "application/octet-stream"};base64,${b64}`;
  };

  const updateModuleResource = async (moduleId, id, data) => {
    try { await updateDoc(resDoc(moduleId, id), data); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  const deleteModuleResource = async (moduleId, resourceId, parts = 0) => {
    try {
      // 先刪區塊，再刪資源本體（規則會讀資源本體確認刪除權限）
      for (let i = 0; i < parts; i++) await deleteDoc(doc(db, "modules", moduleId, "resources", resourceId, "chunks", String(i)));
      await deleteDoc(resDoc(moduleId, resourceId));
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  /* ════════════════════════════════════════
     排課行事曆（sessions）
     status：open 可預約 | pending 待確認 | confirmed 已排定 | reschedule 請求改期
  ════════════════════════════════════════ */
  const addSessions = async (list) => {
    try {
      const batch = writeBatch(db);
      const ids = [];
      list.forEach(data => {
        const ref = doc(collection(db, "sessions"));
        if (data.studentUid && data.status === "pending") ids.push(ref.id);
        batch.set(ref, {
          ...data,
          coachId:   auth.currentUser?.uid || "",
          coachName: profile?.name || "",
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
      if (ids.length) notify("sessions_new", { ids });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const updateSession = async (id, data) => {
    try { await updateDoc(doc(db, "sessions", id), { ...data, updatedAt: serverTimestamp() }); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  // 取消已安排學員的未來課程：先通知學員（伺服器要在刪除前讀到課程內容），再刪除
  const deleteSession = async (id, s) => {
    try {
      if (s?.studentUid && s.date >= todayStr()) await notifyNow("session_cancelled", { id });
      await deleteDoc(doc(db, "sessions", id)); return { success: true };
    }
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

  const fetchSession = async (id) => {
    try { const snap = await getDoc(doc(db, "sessions", id)); return snap.exists() ? { id: snap.id, ...snap.data() } : null; }
    catch { return null; }
  };

  // 學員確認教練排定的時段 → 已排定
  const confirmSession = async (id) => {
    const r = await updateSession(id, { status: "confirmed", studentNote: "", confirmedAt: serverTimestamp() });
    if (r.success) notify("session_confirmed", { id });
    return r;
  };

  // 學員請求改期（附原因）
  const requestReschedule = async (id, note) => {
    const r = await updateSession(id, { status: "reschedule", studentNote: note || "" });
    if (r.success) notify("session_reschedule", { id });
    return r;
  };

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
      notify("session_booked", { id });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message === "taken" ? "這個時段剛被預約走了，請選擇其他時段。" : "預約失敗，請再試一次。" };
    }
  };

  /* ════════════════════════════════════════
     出席：簽到／上課證明照片／簽退
     時間用 serverTimestamp()，規則要求 == request.time，無法偽造
  ════════════════════════════════════════ */
  const stamp = (extra = {}) => ({
    at: serverTimestamp(), by: auth.currentUser?.uid || "", byName: profile?.name || "", ...extra,
  });

  // asRole：學員本人簽到傳 "student"；教練／管理員代簽傳自己的身分
  const checkInSession = async (id, asRole = role) => {
    try {
      await updateDoc(doc(db, "sessions", id), { checkIn: stamp({ role: asRole || "student" }), updatedAt: serverTimestamp() });
      if ((asRole || "student") === "student") notify("checkin", { id });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const checkOutSession = async (id, summary = "") => {
    try {
      await updateDoc(doc(db, "sessions", id), { checkOut: stamp({ summary: summary || "" }), updatedAt: serverTimestamp() });
      notify("checkout", { id });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const photoCol = (id) => collection(db, "sessions", id, "photos");

  const fetchSessionPhotos = async (id) => {
    try {
      const snap = await getDocs(photoCol(id));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch { return []; }
  };

  // 新增照片後同步更新 photoCount（清單上不用讀照片就知道有沒有證明）
  const addSessionPhoto = async (id, { data, thumb, name, size }, countAfter) => {
    try {
      await addDoc(photoCol(id), {
        data, thumb, name: name || "", size: size || 0, order: Date.now(),
        addedBy: profile?.name || "", addedByUid: auth.currentUser?.uid || "", createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "sessions", id), { photoCount: countAfter, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const deleteSessionPhoto = async (id, photoId, countAfter) => {
    try {
      await deleteDoc(doc(db, "sessions", id, "photos", photoId));
      await updateDoc(doc(db, "sessions", id), { photoCount: Math.max(0, countAfter), updatedAt: serverTimestamp() });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  /* ════════════════════════════════════════
     財務（只有管理員能讀寫）
  ════════════════════════════════════════ */
  const FIN_COLS = ["payments", "payouts", "expenses"];
  const fetchFinance = async () => {
    const [payments, payouts, expenses, settings] = await Promise.all([
      ...FIN_COLS.map(c => getDocs(collection(db, c)).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })))),
      getDoc(doc(db, "finance", "settings")).then(s => (s.exists() ? s.data() : {})),
    ]);
    const byDate = (a, b) => (b.date || b.period || "").localeCompare(a.date || a.period || "");
    return { payments: payments.sort(byDate), payouts: payouts.sort(byDate), expenses: expenses.sort(byDate),
             settings: { tuition: settings.tuition || {}, rates: settings.rates || {} } };
  };
  /*
   * 財務異動紀錄：每次新增／修改／刪除都和異動紀錄放在同一個批次寫入，
   * 要嘛兩筆都成功、要嘛都不寫，不會有「改了金額卻沒留紀錄」的情況。
   * financeLogs 只能新增，任何人（包含管理員）都不能修改或刪除。
   */
  const FIN_LABEL = { payments: "收款", payouts: "教練分潤", expenses: "支出", finance: "財務設定" };
  const pick = (o) => o ? Object.fromEntries(Object.entries(o).filter(([k]) => !["createdAt", "updatedAt", "createdBy", "createdByUid"].includes(k))) : null;
  const logRef = () => doc(collection(db, "financeLogs"));
  const logData = (action, col, docId, before, after, extra = {}) => ({
    action, col, colLabel: FIN_LABEL[col] || col, docId,
    before: pick(before), after: pick(after), ...extra,
    byUid: auth.currentUser?.uid || "", byName: profile?.name || "", at: serverTimestamp(),
  });

  const finAdd = async (col, data) => {
    try {
      const ref = doc(collection(db, col));
      const batch = writeBatch(db);
      batch.set(ref, { ...data, createdBy: profile?.name || "", createdByUid: auth.currentUser?.uid || "", createdAt: serverTimestamp() });
      batch.set(logRef(), logData("create", col, ref.id, null, data));
      await batch.commit();
      return { success: true, id: ref.id };
    } catch (e) { return { success: false, error: e.message }; }
  };
  const finUpdate = async (col, id, data) => {
    try {
      const ref = doc(db, col, id);
      const snap = await getDoc(ref);
      const before = snap.exists() ? snap.data() : null;
      const batch = writeBatch(db);
      batch.update(ref, { ...data, updatedAt: serverTimestamp() });
      batch.set(logRef(), logData("update", col, id, before, { ...(before || {}), ...data }));
      await batch.commit();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };
  const finDelete = async (col, id) => {
    try {
      const ref = doc(db, col, id);
      const snap = await getDoc(ref);
      const batch = writeBatch(db);
      batch.delete(ref);
      batch.set(logRef(), logData("delete", col, id, snap.exists() ? snap.data() : null, null));
      await batch.commit();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };
  // 應收學費、教練每小時分潤：key 例如 "tuition.uid123"；label 是給紀錄看的對象名稱
  const setFinanceSetting = async (path, value, label = "") => {
    try {
      const ref = doc(db, "finance", "settings");
      const [group, key] = path.split(".");
      const snap = await getDoc(ref);
      const old = snap.exists() ? (snap.data()[group] || {})[key] : undefined;
      if (old === value) return { success: true, unchanged: true };
      const batch = writeBatch(db);
      batch.set(ref, { [group]: { [key]: value }, updatedAt: serverTimestamp() }, { merge: true });
      batch.set(logRef(), logData("setting", "finance", path, { [group]: old ?? null }, { [group]: value }, { setting: group, target: label }));
      await batch.commit();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };
  const fetchFinanceLogs = async (max = 300) => {
    try {
      const snap = await getDocs(query(collection(db, "financeLogs"), orderBy("at", "desc"), limit(max)));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { return []; }
  };

  /* ════════════════════════════════════════
     開通申請：有登入帳號但沒有成員資料的人（例如在 Firebase 直接建立、或成員被刪除過）
  ════════════════════════════════════════ */
  const myRequest = async () => {
    try { const s = await getDoc(doc(db, "accessRequests", auth.currentUser.uid)); return s.exists() ? s.data() : null; }
    catch { return null; }
  };
  const requestAccess = async (name, note = "") => {
    try {
      const u = auth.currentUser;
      await setDoc(doc(db, "accessRequests", u.uid), { uid: u.uid, email: (u.email || "").toLowerCase(), name: name.trim(), note: note.trim(), createdAt: serverTimestamp() });
      notify("access_request");
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };
  const fetchAccessRequests = async () => {
    try { const s = await getDocs(collection(db, "accessRequests")); return s.docs.map(d => ({ id: d.id, ...d.data() })); }
    catch { return []; }
  };
  const approveAccess = async (req, formData) => {
    try {
      const list = rolesOf({ roles: formData.roles });
      const r = list[0];
      const data = { name: formData.name || req.name || "", email: req.email, role: r, roles: list, isAdmin: list.includes("admin"), createdAt: serverTimestamp(), status: "active" };
      if (r === "student") Object.assign(data, { birthdate: formData.birthdate || "", coachName: formData.coachName || "", courseType: formData.courseType || "", joinDate: formData.joinDate || todayStr() });
      const batch = writeBatch(db);
      batch.set(doc(db, "users", req.id), data);
      if (r === "student") batch.set(doc(db, "journeys", req.id), { ...initialJourney({ uid: req.id, name: data.name, courseType: data.courseType }), updatedAt: serverTimestamp() });
      batch.delete(doc(db, "accessRequests", req.id));
      await batch.commit();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };
  const rejectAccess = async (id) => {
    try { await deleteDoc(doc(db, "accessRequests", id)); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };
  // 被開通後不用登出：重新讀一次自己的成員資料
  const refreshProfile = async () => {
    const u = auth.currentUser; if (!u) return false;
    const snap = await getDoc(doc(db, "users", u.uid));
    if (!snap.exists()) return false;
    const data = snap.data(); const list = rolesOf(data);
    setProfile({ uid: u.uid, ...data, courseType: normalizeCourse(data.courseType) });
    setRoles(list); setRole(list[0] || null);
    return true;
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
      const snap = await getDocs(resCol(moduleId));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order ?? a.createdAt?.seconds ?? 0) - (b.order ?? b.createdAt?.seconds ?? 0));
    } catch { return []; }
  };

  /* ════════════════════════════════════════
     成長路徑（journeys/{studentUid}）
  ════════════════════════════════════════ */
  const jDoc = (uid) => doc(db, "journeys", uid);

  const fetchJourney = async (uid) => {
    try { const snap = await getDoc(jDoc(uid)); return snap.exists() ? { id: snap.id, ...snap.data() } : null; }
    catch { return null; }
  };

  const fetchJourneys = async () => {
    try { const snap = await getDocs(collection(db, "journeys")); return snap.docs.map(d => ({ id: d.id, ...d.data() })); }
    catch { return []; }
  };

  // 教練／管理員：幫還沒有成長紀錄的學員建立（舊學員自動補齊）
  const ensureJourneys = async (students) => {
    const existing = await fetchJourneys();
    const have = new Set(existing.map(j => j.id));
    const created = [];
    for (const st of students) {
      if (have.has(st.uid)) continue;
      const j = { ...initialJourney(st), updatedAt: serverTimestamp() };
      try { await setDoc(jDoc(st.uid), j); created.push({ id: st.uid, ...j }); } catch {}
    }
    return [...existing, ...created];
  };

  // 學員回報完成（附成果）
  const claimMilestone = async (n, i, note, link) => {
    try {
      await updateDoc(jDoc(auth.currentUser.uid), {
        [`claims.${mKey(n, i)}`]: { note: note || "", link: link || "", at: todayStr() },
        updatedAt: serverTimestamp(),
      });
      notify("milestone_claim", { studentUid: auth.currentUser.uid, text: stageOf(n).milestones[i] || "" });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const unclaimMilestone = async (n, i) => {
    try {
      await updateDoc(jDoc(auth.currentUser.uid), { [`claims.${mKey(n, i)}`]: deleteField(), updatedAt: serverTimestamp() });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  // 教練確認／取消確認
  const verifyMilestone = async (uid, n, i, ok = true) => {
    try {
      await updateDoc(jDoc(uid), {
        [`verified.${mKey(n, i)}`]: ok ? { by: profile?.name || "", at: todayStr() } : deleteField(),
        updatedAt: serverTimestamp(),
      });
      if (ok) notify("milestone_verified", { studentUid: uid, text: stageOf(n).milestones[i] || "" });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const advanceStage = async (uid, j) => {
    try { await updateDoc(jDoc(uid), { ...advanceUpdate(j), updatedAt: serverTimestamp() }); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  const setJourneyStage = async (uid, j, target) => {
    try { await updateDoc(jDoc(uid), { ...setStageUpdate(j, target), updatedAt: serverTimestamp() }); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  const setStageNote = async (uid, n, text) => {
    try { await updateDoc(jDoc(uid), { [`coachNote.${n}`]: text, updatedAt: serverTimestamp() }); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  return (
    <AuthContext.Provider value={{
      user, profile, role, roles, switchRole, loading, error, setError,
      loginWithEmail, logout,
      /* 成員 */ addMember, fetchMembers, updateMember, deleteMember, cleanupStaffFields,
      /* 模組 */ addModule, fetchModules, reviewModule, updateModule, deleteModule, reorderModules, fetchModuleUsage, transferModule,
      /* 分配 */ saveAssignment, fetchAssignment,
      /* 記錄 */ addRecord, fetchRecords, updateRecord, deleteRecord,
      /* 資料 */ addModuleResource, fetchModuleResources, deleteModuleResource,
                 uploadModuleFile, fetchResourceFile, updateModuleResource,
      /* 路徑 */ fetchJourney, fetchJourneys, ensureJourneys, claimMilestone, unclaimMilestone,
                 verifyMilestone, advanceStage, setJourneyStage, setStageNote,
      /* 排課 */ addSessions, updateSession, deleteSession, fetchSessions, fetchSession,
                 confirmSession, requestReschedule, bookOpenSession,
      /* 出席 */ checkInSession, checkOutSession, fetchSessionPhotos, addSessionPhoto, deleteSessionPhoto,
      /* 帳號 */ resetPassword, myRequest, requestAccess, fetchAccessRequests, approveAccess, rejectAccess, refreshProfile,
      /* 財務 */ fetchFinance, finAdd, finUpdate, finDelete, setFinanceSetting, fetchFinanceLogs,
      /* 反饋 */ addFeedback, fetchFeedbacks,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }