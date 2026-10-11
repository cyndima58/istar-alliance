import React, { useState, useEffect, useRef } from "react";
import { useAuth, rolesOf } from "./AuthContext";
import { pushStatus, enablePush, disablePush, promptDismissed, dismissPrompt, notify } from "./push";
import {
  SESSION_STATUS, todayStr, addDays, toMinutes, fromMinutes, buildMonthGrid,
  formatDateLabel, relativeDayLabel, weekdayLabel, isPast, sortSessions,
  findConflicts, repeatDates, validateSession, googleCalendarUrl, countByStatus,
  parseDateStr,
} from "./schedule";
import {
  STAGES, stageOf, mKey, COURSE_TYPES, milestoneState, stageStatus, stageProgress,
  overallProgress, canAdvance, daysInStage, daysBetween, pendingClaims, funnel, stuckStudents,
  initialJourney,
} from "./journey";
import {
  attendanceState, checkInWindow, checkInOpensAt, ATTEND, MAX_PHOTOS, fmtClock, fmtDateTime,
  scheduledMinutes, deliveredMinutes, isShort, formatMinutes, toHours, inRange, monthRange, monthOptions,
  summarize, totals, deliveredList, sessionsCsv,
} from "./attendance";
import {
  PAY_METHODS, EXPENSE_CATS, parseAmount, fmtMoney, inPeriod, financeSummary, studentBalances,
  payoutSuggestions, financeCsv, periodOptions,
} from "./finance";

// 字級：依使用者設定的倍率縮放（--fs）
const fz = (px) => `calc(${px}px * var(--fs))`;

const GLOBAL_CSS = `
:root {
  /* ── Neutral palette ── */
  --cream:   #FAFAF7;
  --cream-2: #F4F3EE;
  --cream-3: #ECEAE2;
  --cream-4: #E2DFD5;
  --ink:     #1C1A17;
  --ink-2:   #3D3A34;
  --ink-3:   #5C5850;   /* 次要文字：對比 ≥ 6:1 */
  --ink-4:   #7D786D;   /* 輔助文字：對比 ≥ 4.5:1 */

  /* ── Gold accent ── */
  --gold:       #86672C;   /* 加深，文字對比 ≥ 4.5:1 */
  --gold-light: #C4A05A;
  --gold-pale:  #F0E8D5;
  --gold-line:  rgba(154,123,63,0.22);

  /* ── Status colours ── */
  --sage:      #3F6E4E;
  --sage-pale: #EAF2EC;
  --rust:      #8B3A2A;
  --rust-pale: #F5EAE7;
  --slate:     #3A4A6B;
  --slate-pale:#ECF0F8;

  /* ── Radii ── */
  --r:    8px;
  --r-lg: 12px;
  --r-xl: 18px;
  --r-pill: 100px;

  /* ── Typography ── */
  /* 內文用系統無襯線字（iPhone 蘋方、Android 思源黑體、Windows 微軟正黑），中文最清楚 */
  --font: -apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "Segoe UI", Roboto, sans-serif;
  /* 標題與品牌保留典雅襯線 */
  --font-display: 'Cormorant Garamond', 'Noto Serif TC', serif;
  /* 字級倍率：設定裡的「字級」會改這個值 */
  --fs: 1;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body {
  font-family: var(--font);
  background: var(--cream);
  color: var(--ink);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: "kern" 1, "liga" 1, "onum" 1;
}

/* No starfield in light mode */
#starfield { display: none; }

.app {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 480px;
  height: 100dvh;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--cream);
}

/* ── App Header ── */
.app-header {
  padding: 16px 22px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  border-bottom: 1px solid var(--cream-4);
  background: var(--cream);
}
.header-brand { display: flex; align-items: center; gap: 9px; }
.header-logo-mark {
  font-family: var(--font);
  font-size: calc(20px * var(--fs));
  color: var(--gold);
  line-height: 1;
}
.header-logo-text {
  font-family: var(--font);
  font-size: calc(16px * var(--fs));
  font-weight: 600;
  letter-spacing: .02em;
  color: var(--ink);
  text-transform: uppercase;
}
.header-logo-text span { color: var(--gold); }
.header-right { display: flex; align-items: center; gap: 10px; }
.role-badge {
  font-family: var(--font);
  font-size: calc(12px * var(--fs));
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--r-pill);
  letter-spacing: .02em;
  text-transform: uppercase;
}
.role-badge.coach  { background: var(--sage-pale);  color: var(--sage);  border: 1px solid rgba(74,123,90,.2); }
.role-badge.student{ background: var(--slate-pale); color: var(--slate); border: 1px solid rgba(58,74,107,.2); }
.role-badge.admin  { background: var(--gold-pale);  color: var(--gold);  border: 1px solid var(--gold-line); }
.logout-btn {
  padding: 5px 12px;
  border-radius: var(--r-pill);
  border: 1px solid var(--cream-4);
  background: transparent;
  color: var(--ink-3);
  font-size: calc(13px * var(--fs));
  font-family: var(--font);
  letter-spacing: .02em;
  cursor: pointer;
  transition: all .2s;
}
.logout-btn:hover { border-color: var(--rust); color: var(--rust); }
.avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--gold-pale);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font);
  font-size: calc(16px * var(--fs)); font-weight: 600;
  color: var(--gold);
  border: 1px solid var(--gold-line);
  flex-shrink: 0;
}
.avatar.coach-av-header { background: var(--sage-pale); color: var(--sage); border-color: rgba(74,123,90,.25); }
.coach-av { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font); font-size: calc(16px * var(--fs)); font-weight: 600; flex-shrink: 0; }

/* ── Screen animation ── */
@keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
.screen-enter {
  display: flex; flex-direction: column; flex: 1; min-height: 0;
  animation: fadeUp .18s var(--ease-out) both;
}

/* ── Topbar ── */
.topbar {
  padding: 16px 22px 12px;
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
.topbar-title {
  font-family: var(--font);
  font-size: calc(26px * var(--fs)); font-weight: 500;
  letter-spacing: .01em;
  color: var(--ink);
}

/* ── Content ── */
.content {
  flex: 1; overflow-y: auto;
  padding: 6px 18px 28px;
  scrollbar-width: none;
  background: var(--cream);
}
.content::-webkit-scrollbar { display: none; }

/* ── Cards ── */
.card {
  background: #fff;
  border: 1px solid var(--cream-3);
  border-radius: var(--r-lg);
  padding: 16px 18px;
  margin-bottom: 10px;
}
.card-sm { padding: 11px 14px; border-radius: var(--r); margin-bottom: 8px; }
.card-glow {
  background: #fff;
  border: 1px solid var(--gold-line);
  border-radius: var(--r-lg);
  padding: 16px 18px; margin-bottom: 10px;
  box-shadow: 0 2px 16px rgba(154,123,63,.06);
}
.card-gold {
  background: linear-gradient(145deg, var(--gold-pale), #FBF6EC);
  border: 1px solid var(--gold-line);
  border-radius: var(--r-xl);
  padding: 22px;
  margin-bottom: 12px;
}
.card-glass {
  background: var(--cream-2);
  border: 1px solid var(--cream-3);
  border-radius: var(--r-lg);
  padding: 16px 18px; margin-bottom: 10px;
}

/* ── Greeting ── */
.greeting-name {
  font-family: var(--font);
  font-size: calc(30px * var(--fs)); font-weight: 500;
  letter-spacing: -.01em; line-height: 1.2;
  color: var(--ink);
}
.greeting-sub { font-size: calc(17px * var(--fs)); color: var(--ink-3); margin-top: 6px; line-height: 1.5; }

/* ── Stats ── */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.stat-tile {
  background: var(--cream-2);
  border: 1px solid var(--cream-3);
  border-radius: var(--r);
  padding: 14px 16px;
}
.stat-num {
  font-family: var(--font);
  font-size: calc(34px * var(--fs)); font-weight: 500;
  letter-spacing: -.02em; line-height: 1;
  color: var(--ink);
}
.stat-num.gold   { color: var(--gold); }
.stat-num.nebula { color: var(--slate); }
.stat-lbl { font-size: calc(13px * var(--fs)); color: var(--ink-3); margin-top: 6px; letter-spacing: .02em; text-transform: uppercase; }

/* ── Section heading ── */
.sec-h {
  font-family: var(--font);
  font-size: calc(13px * var(--fs)); font-weight: 600; color: var(--ink-3);
  letter-spacing: .02em; text-transform: uppercase;
  margin: 20px 0 10px;
}

/* ── Badges ── */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 9px; border-radius: var(--r-pill);
  font-family: var(--font);
  font-size: calc(13px * var(--fs)); font-weight: 500; letter-spacing: .02em;
}
.badge-nebula { background: var(--slate-pale); color: var(--slate); border: 1px solid rgba(58,74,107,.18); }
.badge-gold   { background: var(--gold-pale);  color: var(--gold);  border: 1px solid var(--gold-line); }
.badge-teal   { background: var(--sage-pale);  color: var(--sage);  border: 1px solid rgba(74,123,90,.2); }
.badge-coral  { background: var(--rust-pale);  color: var(--rust);  border: 1px solid rgba(139,58,42,.18); }

/* ── Progress bar ── */
.prog-track { height: 2px; background: var(--cream-3); border-radius: 1px; overflow: hidden; }
.prog-fill  { height: 100%; border-radius: 1px; background: var(--gold); }
.prog-fill.gold { background: linear-gradient(90deg, var(--gold), var(--gold-light)); }

/* ── Divider ── */
.divider { height: 1px; background: var(--cream-3); margin: 4px 0; }

/* ── Journey path ── */
.journey { padding-left: 30px; }
.journey-item { position: relative; margin-bottom: 9px; }
.journey-item::before {
  content: ''; position: absolute;
  left: -18px; top: 20px; bottom: -9px;
  width: 1px; background: var(--cream-3);
}
.journey-item:last-child::before { display: none; }
.journey-dot {
  position: absolute; left: -24px; top: 7px;
  width: 12px; height: 12px; border-radius: 50%;
  border: 1.5px solid var(--cream-4);
  background: var(--cream);
  display: flex; align-items: center; justify-content: center;
}
.j-title { font-family: var(--font); font-size: calc(17px * var(--fs)); font-weight: 500; letter-spacing: .01em; }
.j-title.active-stage { color: var(--gold); }
.j-sub { font-size: calc(15px * var(--fs)); color: var(--ink-3); margin-top: 3px; }

/* ── Course ── */
.course-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.course-name { font-family: var(--font); font-size: calc(20px * var(--fs)); font-weight: 500; margin-bottom: 3px; letter-spacing: .01em; }
.course-meta { font-size: calc(15px * var(--fs)); color: var(--ink-3); }

/* ── People rows ── */
.coach-row {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid var(--cream-3);
}
.coach-row:last-child { border-bottom: none; }
.coach-name { font-family: var(--font); font-size: calc(17px * var(--fs)); font-weight: 500; letter-spacing: .01em; }
.coach-tag { font-size: calc(14px * var(--fs)); color: var(--ink-3); margin-top: 2px; }

/* ── Buttons ── */
.btn {
  padding: 9px 18px; border-radius: var(--r);
  border: 1px solid var(--cream-3);
  font-family: var(--font);
  font-size: calc(15px * var(--fs)); font-weight: 500; letter-spacing: .02em;
  cursor: pointer;
  background: #fff; color: var(--ink);
  transition: all .2s;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.btn:hover { border-color: var(--ink-4); background: var(--cream-2); }
.btn-primary {
  background: var(--ink);
  color: var(--cream);
  border-color: var(--ink);
}
.btn-primary:hover { background: var(--ink-2); border-color: var(--ink-2); }
.btn:disabled, .btn-primary:disabled { opacity:.38; cursor:not-allowed; }
.btn-gold {
  background: var(--gold-pale);
  color: var(--gold);
  border-color: var(--gold-line);
}
.btn-gold:hover { background: #EDE0C4; }
.btn-sm { padding: 6px 13px; font-size: calc(14px * var(--fs)); }
.btn-row { display: flex; gap: 8px; margin-top: 12px; }
.btn-row .btn { flex: 1; }

/* ── Feedback ── */
.feedback-quote {
  background: var(--cream-2);
  border-left: 2px solid var(--gold);
  border-radius: 0 var(--r) var(--r) 0;
  padding: 12px 16px; font-size: calc(16px * var(--fs));
  color: var(--ink-2); line-height: 1.7; margin-bottom: 8px;
}
.feedback-author { font-size: calc(13px * var(--fs)); color: var(--gold); margin-bottom: 8px; font-weight: 600; letter-spacing: .02em; text-transform: uppercase; }

/* ── Forms ── */
.input-label { font-family: var(--font); font-size: calc(13px * var(--fs)); color: var(--ink-3); margin-bottom: 5px; letter-spacing: .02em; text-transform: uppercase; font-weight: 600; }
.input-field {
  width: 100%;
  padding: 11px 14px;
  background: var(--cream-2);
  border: 1px solid var(--cream-3);
  border-radius: var(--r);
  color: var(--ink); font-size: calc(17px * var(--fs));
  font-family: var(--font);
  margin-bottom: 10px;
  transition: border-color .2s, box-shadow .2s;
  outline: none;
  line-height: 1.5;
}
.input-field:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(154,123,63,.1); background: #fff; }
.input-field::placeholder { color: var(--ink-4); }
textarea.input-field { resize: none; line-height: 1.7; }
select.input-field { appearance: none; cursor: pointer; }

/* ── Toggle ── */
.toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid var(--cream-3); }
.toggle-lbl { font-family: var(--font); font-size: calc(16px * var(--fs)); color: var(--ink-2); display: flex; align-items: center; gap: 8px; }
.toggle-sw { width: 40px; height: 23px; border-radius: 12px; background: var(--cream-3); border: none; cursor: pointer; position: relative; transition: background .2s; flex-shrink: 0; }
.toggle-sw.on { background: var(--ink); }
.toggle-sw::after { content:''; position:absolute; top:3px; left:3px; width:17px; height:17px; border-radius:50%; background:#fff; transition:left .2s var(--ease-spring); box-shadow: 0 1px 3px rgba(0,0,0,.15); }
.toggle-sw.on::after { left: 20px; }

/* ── Chips ── */
.chip-group { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.chip {
  padding: 5px 13px; border-radius: var(--r-pill);
  font-family: var(--font);
  font-size: calc(14px * var(--fs)); font-weight: 500; letter-spacing: .04em;
  border: 1px solid var(--cream-3);
  background: #fff; color: var(--ink-3);
  cursor: pointer; transition: all .2s;
}
.chip.sel { background: var(--gold-pale); border-color: var(--gold-line); color: var(--gold); }

/* ── Module chips ── */
.module-pool { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px; background: var(--cream-2); border-radius: var(--r); border: 1px dashed var(--cream-4); margin-bottom: 10px; min-height: 56px; }
.m-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: var(--r-pill); font-family: var(--font); font-size: calc(14px * var(--fs)); font-weight: 500; background: var(--gold-pale); color: var(--gold); border: 1px solid var(--gold-line); cursor: pointer; user-select: none; transition: all .15s; letter-spacing: .04em; }
.m-chip:hover { background: #EDE0C4; }
.m-chip.assigned { background: var(--sage-pale); color: var(--sage); border-color: rgba(74,123,90,.22); }
.drop-zone { padding: 12px; background: var(--sage-pale); border: 1px dashed rgba(74,123,90,.3); border-radius: var(--r); min-height: 64px; }
.drop-label { font-family: var(--font); font-size: calc(14px * var(--fs)); color: var(--sage); margin-bottom: 8px; letter-spacing: .04em; }

/* ── Record notes ── */
.record-note { background: var(--cream-2); border-radius: var(--r); padding: 11px 14px; font-size: calc(16px * var(--fs)); color: var(--ink-2); line-height: 1.7; margin-top: 8px; }
.record-note.coach-only { background: var(--gold-pale); }
.record-note-label { font-family: var(--font); font-size: calc(12px * var(--fs)); font-weight: 700; letter-spacing: .02em; text-transform: uppercase; margin-bottom: 5px; font-style: normal; }

/* ── Module cards ── */
.mod-card { background: #fff; border: 1px solid var(--cream-3); border-radius: var(--r-lg); padding: 14px 16px; margin-bottom: 8px; border-left: 2px solid var(--gold); }
.mod-card.teal-l { border-left-color: var(--sage); }
.mod-card.gold-l  { border-left-color: var(--gold); }
.mod-title { font-family: var(--font); font-size: calc(17px * var(--fs)); font-weight: 500; margin-bottom: 6px; letter-spacing: .01em; }
.mod-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
.mod-outline { font-family: var(--font); font-size: calc(15px * var(--fs)); color: var(--ink-3); line-height: 1.6; }

/* ── Bottom nav ── */
.bottom-nav {
  height: 64px;
  background: #fff;
  border-top: 1px solid var(--cream-3);
  display: flex; flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
.nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-family: var(--font); font-size: calc(12px * var(--fs)); font-weight: 600; color: var(--ink-4); border: none; background: none; cursor: pointer; position: relative; letter-spacing: .02em; text-transform: uppercase; transition: color .2s; }
.nav-item svg { width: 19px; height: 19px; }
.nav-item.active { color: var(--gold); }
.nav-item.active::before { content:''; position:absolute; top:0; left:50%; transform:translateX(-50%); width:20px; height:1.5px; background:var(--gold); border-radius:0 0 2px 2px; }

/* ── Modal ── */
.modal-overlay { position:absolute; inset:0; background:rgba(28,26,23,.5); backdrop-filter:blur(8px); z-index:50; display:flex; align-items:flex-end; }
.modal-sheet { background:var(--cream); border:1px solid var(--cream-3); border-top-left-radius:20px; border-top-right-radius:20px; padding:22px 20px 36px; width:100%; max-height:90%; overflow-y:auto; }
.modal-sheet::-webkit-scrollbar { display:none; }
.modal-handle { width:28px; height:2px; border-radius:2px; background:var(--cream-4); margin:0 auto 22px; }
.modal-title { font-family:var(--font); font-size: calc(24px * var(--fs)); font-weight:500; margin-bottom:20px; letter-spacing:.01em; color:var(--ink); }

/* ── Inner tabs ── */
.inner-tabs { display:flex; border-bottom:1px solid var(--cream-3); flex-shrink:0; }
.inner-tab { flex:1; padding:10px; font-family:var(--font); font-size: calc(13px * var(--fs)); font-weight:600; text-align:center; border:none; background:none; color:var(--ink-4); cursor:pointer; border-bottom:1.5px solid transparent; transition:all .2s; letter-spacing: .02em; text-transform:uppercase; }
.inner-tab.active { color:var(--gold); border-bottom-color:var(--gold); }

/* ── QA grid ── */
.qa-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.qa-card { background:#fff; border:1px solid var(--cream-3); border-radius:var(--r-lg); padding:16px; cursor:pointer; transition:all .2s; text-align:left; width:100%; }
.qa-card:hover { border-color:var(--gold-line); background:var(--gold-pale); }
.qa-icon { font-size: calc(22px * var(--fs)); margin-bottom:9px; display:block; line-height:1; }
.qa-label { font-family:var(--font); font-size: calc(16px * var(--fs)); font-weight:500; color:var(--ink); letter-spacing:.01em; }
.qa-sub { font-family:var(--font); font-size: calc(14px * var(--fs)); color:var(--ink-3); margin-top:3px;  }

/* ── iSTAR logo ── */
.istar-logo { font-family:var(--font); font-size: calc(12px * var(--fs)); letter-spacing:.2em; color:var(--gold); text-transform:uppercase; font-style:italic; }
.istar-mark { font-size: calc(18px * var(--fs)); font-weight:600; font-style:normal; }

/* ── Stage bar ── */
.stage-bar { display:flex; gap:3px; margin-bottom:6px; }
.stage-seg { flex:1; height:3px; border-radius:2px; }
.stage-seg.done    { background:var(--gold); }
.stage-seg.current { background:var(--ink); }
.stage-seg.future  { background:var(--cream-3); }

/* ── Detail rows ── */
.detail-meta-row { display:flex; gap:12px; padding:8px 0; border-bottom:1px solid var(--cream-3); align-items:flex-start; }
.detail-meta-lbl { font-family:var(--font); font-size: calc(12px * var(--fs)); color:var(--ink-4); min-width:56px; flex-shrink:0; padding-top:2px; letter-spacing: .02em; text-transform:uppercase; font-weight:600; }
.detail-meta-val { font-family:var(--font); font-size: calc(16px * var(--fs)); color:var(--ink-2); line-height:1.65;  }

/* ── Login ── */
.login-wrap { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:36px 26px; background:var(--cream); }
.login-logo { font-family:var(--font); font-size: calc(58px * var(--fs)); color:var(--gold); text-align:center; line-height:1; margin-bottom:16px; font-style:italic; }
.login-brand { font-family:var(--font); font-size: calc(24px * var(--fs)); font-weight:500; color:var(--ink); letter-spacing:.1em; text-align:center; margin-bottom:4px; text-transform:uppercase; }
.login-brand span { color:var(--gold); }
.login-sub { font-family:var(--font); font-size: calc(16px * var(--fs)); color:var(--ink-3); text-align:center; margin-bottom:36px;  }
.login-card { width:100%; background:#fff; border:1px solid var(--cream-3); border-radius:var(--r-xl); padding:28px 24px; box-shadow:0 4px 40px rgba(28,26,23,.06); }
.login-error { background:var(--rust-pale); border:1px solid rgba(139,58,42,.2); border-radius:var(--r); padding:11px 14px; font-family:var(--font); font-size: calc(15px * var(--fs)); color:var(--rust); margin-bottom:14px; text-align:center; line-height:1.5; }
.login-no-access { background:var(--gold-pale); border:1px solid var(--gold-line); border-radius:var(--r); padding:13px 16px; font-family:var(--font); font-size: calc(15px * var(--fs)); color:var(--gold); text-align:center; margin-top:14px; line-height:1.7;  }

/* ── Resource panel ── */
.resource-panel { background:var(--cream-2); border:1px solid var(--cream-3); border-radius:var(--r-lg); padding:16px; margin-top:12px; }
.resource-panel-title { font-family:var(--font); font-size: calc(13px * var(--fs)); font-weight:600; color:var(--ink-3); letter-spacing: .02em; text-transform:uppercase; margin-bottom:12px; }
.resource-tabs { display:flex; gap:4px; margin-bottom:14px; }
.resource-tab { flex:1; padding:7px 4px; border-radius:var(--r-pill); border:1px solid var(--cream-3); background:#fff; color:var(--ink-3); font-family:var(--font); font-size: calc(13px * var(--fs)); font-weight:500; cursor:pointer; transition:all .2s; letter-spacing:.04em; text-align:center; }
.resource-tab.active { background:var(--gold-pale); border-color:var(--gold-line); color:var(--gold); }
.resource-list { display:flex; flex-direction:column; gap:6px; margin-top:10px; }
.resource-item { display:flex; align-items:center; gap:10px; padding:10px 13px; background:#fff; border-radius:var(--r); border:1px solid var(--cream-3); }
.resource-icon { width:32px; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size: calc(16px * var(--fs)); flex-shrink:0; }
.resource-icon.link { background:var(--slate-pale); }
.resource-icon.file { background:var(--sage-pale); }
.resource-icon.img  { background:var(--gold-pale); }
.resource-name { font-family:var(--font); font-size: calc(16px * var(--fs)); font-weight:500; color:var(--ink); line-height:1.3; }
.resource-meta { font-family:var(--font); font-size: calc(14px * var(--fs)); color:var(--ink-4); margin-top:2px;  }
.resource-empty { text-align:center; color:var(--ink-4); font-family:var(--font); font-size: calc(15px * var(--fs)); padding:18px 0; line-height:1.7;  }
.upload-hint { font-family:var(--font); font-size: calc(14px * var(--fs)); color:var(--ink-4); text-align:center; margin-top:8px; line-height:1.6;  }

/* ── Calendar & scheduling ── */
.cal { background:#fff; border:1px solid var(--cream-3); border-radius:var(--r-lg); padding:12px 10px 10px; margin-bottom:12px; }
.cal-head { display:flex; align-items:center; justify-content:space-between; padding:0 4px 10px; }
.cal-title { font-family:var(--font); font-size: calc(19px * var(--fs)); font-weight:600; letter-spacing:.02em; }
.cal-nav { width:30px; height:30px; border-radius:50%; border:1px solid var(--cream-3); background:#fff; color:var(--ink-2); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size: calc(17px * var(--fs)); }
.cal-nav:hover { border-color:var(--gold-line); color:var(--gold); }
.cal-wk { display:grid; grid-template-columns:repeat(7,1fr); text-align:center; font-size: calc(12px * var(--fs)); color:var(--ink-4); letter-spacing: .02em; margin-bottom:4px; }
.cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
.cal-day { position:relative; height:42px; border:none; background:none; border-radius:10px; cursor:pointer; font-family:var(--font); font-size: calc(16px * var(--fs)); color:var(--ink); display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding-top:6px; transition:background .15s; }
.cal-day:hover { background:var(--cream-2); }
.cal-day.out { color:var(--ink-4); opacity:.5; }
.cal-day.past { color:var(--ink-4); }
.cal-day.today .cal-num { border:1px solid var(--gold); color:var(--gold); font-weight:700; }
.cal-day.sel { background:var(--ink); }
.cal-day.sel .cal-num { color:var(--cream); border-color:transparent; }
.cal-num { width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; line-height:1; }
.cal-dots { display:flex; gap:2px; margin-top:3px; height:5px; }
.cal-dot { width:5px; height:5px; border-radius:50%; }
.status-pill { display:inline-flex; align-items:center; gap:4px; padding:2px 9px; border-radius:var(--r-pill); font-family:var(--font); font-size: calc(13px * var(--fs)); font-weight:600; letter-spacing:.04em; white-space:nowrap; }
.status-pill::before { content:''; width:6px; height:6px; border-radius:50%; background:currentColor; }
.sess { display:flex; gap:12px; background:#fff; border:1px solid var(--cream-3); border-radius:var(--r-lg); padding:12px 14px; margin-bottom:8px; cursor:pointer; transition:border-color .15s, transform .15s; text-align:left; width:100%; font-family:var(--font); color:var(--ink); }
.sess:hover { border-color:var(--gold-line); }
.sess:active { transform:scale(.99); }
.sess.past { opacity:.6; }
.sess-time { min-width:48px; text-align:center; border-right:1px solid var(--cream-3); padding-right:12px; }
.sess-start { font-size: calc(18px * var(--fs)); font-weight:600; line-height:1.1; }
.sess-end { font-size: calc(13px * var(--fs)); color:var(--ink-4); margin-top:2px; }
.sess-body { flex:1; min-width:0; }
.sess-title { font-size: calc(17px * var(--fs)); font-weight:600; line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sess-meta { font-size: calc(14px * var(--fs)); color:var(--ink-3); margin-top:3px;  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.filter-row { display:flex; gap:6px; overflow-x:auto; padding-bottom:2px; margin-bottom:12px; scrollbar-width:none; }
.filter-row::-webkit-scrollbar { display:none; }
.filter-chip { flex-shrink:0; display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:var(--r-pill); border:1px solid var(--cream-3); background:#fff; font-family:var(--font); font-size: calc(14px * var(--fs)); font-weight:600; color:var(--ink-3); cursor:pointer; }
.filter-chip .n { font-size: calc(14px * var(--fs)); min-width:18px; height:18px; padding:0 5px; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; background:var(--cream-2); color:var(--ink-2); }
.filter-chip.on { border-color:currentColor; }
.seg { display:flex; background:var(--cream-2); border:1px solid var(--cream-3); border-radius:var(--r-pill); padding:3px; margin-bottom:14px; }
.seg button { flex:1; padding:8px 6px; border:none; border-radius:var(--r-pill); background:transparent; font-family:var(--font); font-size: calc(15px * var(--fs)); font-weight:600; color:var(--ink-3); cursor:pointer; }
.seg button.on { background:#fff; color:var(--ink); box-shadow:0 1px 4px rgba(28,26,23,.08); }
.time-row { display:flex; gap:8px; align-items:center; }
.time-row .input-field { flex:1; }
.alert-card { border-radius:var(--r-lg); padding:14px 16px; margin-bottom:12px; border:1px solid; }
.check-row { display:flex; align-items:center; gap:10px; padding:12px 14px; border:1px solid var(--cream-3); border-radius:var(--r); background:#fff; cursor:pointer; margin-bottom:10px; font-family:var(--font); font-size: calc(16px * var(--fs)); color:var(--ink); width:100%; text-align:left; }
.check-box { width:20px; height:20px; border-radius:5px; border:1.5px solid var(--ink-4); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .15s; }
.check-row.on { border-color:rgba(74,123,90,.4); background:var(--sage-pale); }
.check-row.on .check-box { background:var(--sage); border-color:var(--sage); }
.detail-line { display:flex; gap:12px; padding:9px 0; border-bottom:1px solid var(--cream-3); font-family:var(--font); font-size: calc(16px * var(--fs)); }
.detail-line:last-child { border-bottom:none; }
.detail-line .k { width:64px; flex-shrink:0; font-size: calc(13px * var(--fs)); color:var(--ink-4); letter-spacing: .02em; text-transform:uppercase; font-weight:600; padding-top:2px; }
.detail-line .v { flex:1; color:var(--ink); line-height:1.55; word-break:break-word; }
.empty { text-align:center; color:var(--ink-3); font-size: calc(15px * var(--fs)); padding:28px 12px; line-height:1.7; }
.toast { position:absolute; left:50%; bottom:80px; transform:translateX(-50%); background:var(--ink); color:var(--cream); padding:10px 18px; border-radius:var(--r-pill); font-family:var(--font); font-size: calc(15px * var(--fs)); z-index:80; box-shadow:0 6px 24px rgba(28,26,23,.25); animation:fadeUp .2s var(--ease-out) both; white-space:nowrap; }
/* ── Role switcher ── */
.role-switch { cursor:pointer; font-family:var(--font); }
.role-menu { position:absolute; right:0; top:calc(100% + 6px); z-index:61; background:#fff; border:1px solid var(--cream-3); border-radius:var(--r-lg); box-shadow:0 8px 30px rgba(28,26,23,.12); min-width:150px; padding:6px; }
.role-menu-h { font-size: calc(12px * var(--fs)); letter-spacing: .02em; color:var(--ink-4); padding:6px 10px 4px; font-weight:700; }
.role-menu-item { display:flex; justify-content:space-between; width:100%; padding:9px 10px; border:none; background:none; border-radius:var(--r); font-family:var(--font); font-size: calc(16px * var(--fs)); color:var(--ink); cursor:pointer; }
.role-menu-item:hover, .role-menu-item.on { background:var(--cream-2); }
.role-menu-item.on { color:var(--gold); font-weight:600; }

/* ── Module tiles & resources ── */
.mod-tile { display:block; width:100%; text-align:left; font-family:var(--font); color:var(--ink); border:1px solid; border-left-width:3px; border-radius:var(--r-lg); padding:12px 14px; margin-bottom:10px; cursor:pointer; transition:transform .12s, box-shadow .15s; }
.mod-tile:hover { box-shadow:0 4px 16px rgba(28,26,23,.06); }
.mod-tile:active { transform:scale(.99); }
.mod-mine { font-size: calc(12px * var(--fs)); border:1px solid; border-radius:var(--r-pill); padding:0 7px; background:rgba(255,255,255,.7); }
.mod-clamp { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-top:4px; }
.mod-foot { display:flex; justify-content:space-between; margin-top:10px; padding-top:8px; border-top:1px solid rgba(28,26,23,.06); font-size: calc(14px * var(--fs)); color:var(--ink-3); }
.res { margin-top:4px; }
.res-add { background:var(--cream-2); border:1.5px dashed var(--cream-4); border-radius:var(--r-lg); padding:12px; transition:all .15s; }
.res-add.drag { border-color:var(--gold); background:var(--gold-pale); }
.res-row { display:flex; gap:8px; align-items:center; }
.res-row .input-field { flex:1; }
.res-or { display:flex; align-items:center; gap:10px; margin:10px 0; color:var(--ink-4); font-size: calc(13px * var(--fs)); }
.res-or::before, .res-or::after { content:''; flex:1; height:1px; background:var(--cream-4); }
.res-hint { font-size: calc(13px * var(--fs)); color:var(--ink-4); text-align:center; margin-top:8px;  line-height:1.5; }
.res-msg { font-size: calc(15px * var(--fs)); color:var(--rust); margin:8px 2px; }
.res-head { font-size: calc(13px * var(--fs)); font-weight:700; color:var(--ink-3); letter-spacing: .02em; margin:16px 2px 8px; }
.res-empty { font-size: calc(15px * var(--fs)); color:var(--ink-4); text-align:center; padding:16px 0;  }
.res-item { display:flex; align-items:center; gap:10px; padding:9px 10px; background:#fff; border:1px solid var(--cream-3); border-radius:var(--r); margin-bottom:6px; }
.res-ic { width:40px; height:40px; flex-shrink:0; border-radius:8px; border:none; background:var(--cream-2); display:flex; align-items:center; justify-content:center; font-size: calc(20px * var(--fs)); cursor:pointer; overflow:hidden; padding:0; }
.res-ic img { width:100%; height:100%; object-fit:cover; }
.res-name { display:block; width:100%; text-align:left; border:none; background:none; padding:0; font-family:var(--font); font-size: calc(16px * var(--fs)); font-weight:600; color:var(--ink); cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.res-name:hover { color:var(--gold); }
.res-meta { font-size: calc(13px * var(--fs)); color:var(--ink-4); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.res-acts { display:flex; gap:2px; flex-shrink:0; }
.res-act { min-width:28px; height:28px; padding:0 6px; border:1px solid transparent; border-radius:6px; background:none; color:var(--ink-3); font-size: calc(16px * var(--fs)); cursor:pointer; font-family:var(--font); }
.res-act:hover:not(:disabled) { background:var(--cream-2); border-color:var(--cream-3); }
.res-act:disabled { opacity:.25; cursor:default; }
.res-act.del:hover, .res-act.armed { color:var(--rust); }
.res-act.armed { background:var(--rust-pale); font-size: calc(13px * var(--fs)); font-weight:700; }
.viewer { position:fixed; inset:0; z-index:90; background:rgba(16,15,13,.92); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; }
.viewer img { max-width:100%; max-height:80vh; border-radius:8px; }
.viewer-bar { display:flex; gap:16px; align-items:center; margin-top:14px; color:#eee; font-size: calc(15px * var(--fs)); font-family:var(--font); }
.viewer-bar a { color:var(--gold-light); }

/* ── Journey ── */
.ms { padding:11px 0; border-bottom:1px solid var(--cream-3); }
.ms:last-child { border-bottom:none; }
.ms-head { display:flex; align-items:center; gap:10px; }
.ms-dot { width:22px; height:22px; border-radius:50%; border:1.5px solid var(--cream-4); display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size: calc(14px * var(--fs)); color:#8A6820; }
.ms-done .ms-dot { background:var(--sage); border-color:var(--sage); }
.ms-claimed .ms-dot { background:#FEF3D0; border-color:#C4A05A; }
.ms-text { font-size: calc(16px * var(--fs)); font-weight:500; line-height:1.4; }
.ms-done .ms-text { color:var(--ink-2); }
.ms-sub { font-size: calc(13px * var(--fs)); color:var(--ink-4); margin-top:2px; }
.ms-claimed .ms-sub { color:#8A6820; }
.ms-claim { margin:8px 0 0 32px; padding:8px 12px; background:var(--cream-2); border-radius:var(--r); font-size: calc(15px * var(--fs)); color:var(--ink-2); line-height:1.6; }
.ms-claim a { color:var(--slate); font-size: calc(14px * var(--fs)); }
.ms-form { margin:10px 0 0 32px; }
.tl { position:relative; padding-left:34px; }
.tl::before { content:''; position:absolute; left:13px; top:14px; bottom:14px; width:1px; background:var(--cream-3); }
.tl-item { position:relative; margin-bottom:8px; }
.tl-dot { position:absolute; left:-34px; top:12px; width:26px; height:26px; border-radius:50%; border:1.5px solid; display:flex; align-items:center; justify-content:center; font-size: calc(13px * var(--fs)); font-weight:700; color:var(--ink-3); z-index:1; }
.tl-active .tl-dot span { color:#fff; }
.tl-body { display:block; width:100%; text-align:left; font-family:var(--font); color:var(--ink); background:#fff; border:1px solid var(--cream-3); border-radius:var(--r-lg); padding:10px 14px; cursor:pointer; }
.tl-active .tl-body { border-color:var(--gold-line); background:var(--gold-pale); }
.tl-locked .tl-body { opacity:.55; }
.tl-detail { margin:6px 0 4px 4px; padding:8px 12px; background:var(--cream-2); border-radius:var(--r); }
.grow-row { width:100%; border-left:none; border-right:none; border-top:none; background:none; cursor:pointer; font-family:var(--font); color:var(--ink); }
.fn-row { display:flex; align-items:center; gap:8px; padding:4px 0; font-size: calc(14px * var(--fs)); }
.fn-label { width:64px; flex-shrink:0; color:var(--ink-2); white-space:nowrap; }
.fn-track { flex:1; height:12px; background:var(--cream-2); border-radius:6px; overflow:hidden; }
.fn-bar { height:100%; border-radius:6px; min-width:2px; transition:width .4s var(--ease-out); }
.fn-n { width:18px; text-align:right; font-weight:700; color:var(--ink); }
.fn-days { width:62px; text-align:right; color:var(--ink-4); font-size: calc(13px * var(--fs)); }
.fn-stuck { display:flex; justify-content:space-between; width:100%; gap:10px; padding:7px 0; border:none; border-top:1px solid rgba(138,104,32,.15); background:none; font-family:var(--font); font-size: calc(15px * var(--fs)); color:var(--ink-2); cursor:pointer; text-align:left; }
.nav-badge { position:absolute; top:7px; left:calc(50% + 6px); min-width:16px; height:16px; padding:0 4px; border-radius:8px; background:var(--rust); color:#fff; font-size: calc(12px * var(--fs)); font-weight:700; display:flex; align-items:center; justify-content:center; letter-spacing:0; }

/* ════════════════════════════════════════
   可讀性與操作性 v2
   ・內文 16px 起跳、最小 13px；可用「字級」放大到 125%
   ・按鈕／點擊區至少 44px（手指好點）
   ・中文標籤不再全大寫、不加大字距、不用斜體
════════════════════════════════════════ */
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body { font-size: calc(16px * var(--fs)); line-height: 1.6; font-feature-settings: normal; }
@media (min-width: 520px) {
  body { background: var(--cream-3); }
  .app { box-shadow: 0 0 0 1px var(--cream-4), 0 10px 40px rgba(28,26,23,.08); }
}
button, input, select, textarea { font-family: var(--font); }
:focus-visible { outline: 3px solid rgba(134,103,44,.45); outline-offset: 2px; }

.header-logo-text, .login-brand, .istar-logo, .greeting-name, .topbar-title, .modal-title, .stat-num, .login-logo, .header-logo-mark, .cal-title { font-family: var(--font-display); }
.greeting-name, .topbar-title, .modal-title { font-weight: 600; }
.topbar-title { font-size: calc(26px * var(--fs)); }
.app-header { padding: 12px 16px 10px; gap: 8px; }
.header-right { gap: 8px; min-width: 0; }
.hdr-name { font-size: calc(14px * var(--fs)); color: var(--ink-2); font-weight: 600; max-width: 6em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 400px) { .hdr-name { display: none; } }
.role-badge { font-size: calc(12px * var(--fs)); padding: 5px 11px; min-height: 30px; display: inline-flex; align-items: center; }
.logout-btn, .fs-btn { min-height: 36px; padding: 6px 12px; font-size: calc(14px * var(--fs)); color: var(--ink-2); letter-spacing: .02em; border-color: var(--cream-4); }
.fs-btn { border-radius: var(--r-pill); border: 1px solid var(--cream-4); background: #fff; cursor: pointer; font-weight: 700; }
.fs-menu { position:absolute; right:0; top:calc(100% + 6px); z-index:61; background:#fff; border:1px solid var(--cream-3); border-radius:var(--r-lg); box-shadow:0 8px 30px rgba(28,26,23,.14); padding:6px; min-width: 180px; }
.fs-opt { display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 12px; border:none; background:none; border-radius:var(--r); cursor:pointer; color:var(--ink); min-height:44px; }
.fs-opt.on, .fs-opt:hover { background: var(--cream-2); }
.fs-opt.on { color: var(--gold); font-weight: 700; }

.content { padding: 8px 16px 32px; }
.sec-h { font-size: calc(16px * var(--fs)); font-weight: 700; color: var(--ink); letter-spacing: .02em; text-transform: none; margin: 22px 2px 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.input-label { font-size: calc(14px * var(--fs)); color: var(--ink-2); letter-spacing: .01em; text-transform: none; font-weight: 600; margin-bottom: 6px; display: block; }
.input-field { font-size: calc(17px * var(--fs)); padding: 12px 14px; min-height: 48px; background: #fff; border-color: var(--cream-4); }
.input-field::placeholder { color: #9A958A; }
.stat-lbl, .detail-line .k, .detail-meta-lbl, .inner-tab, .nav-item, .res-head, .role-menu-h, .feedback-author, .record-note-label { text-transform: none; letter-spacing: .02em; }
.stat-lbl { font-size: calc(13px * var(--fs)); color: var(--ink-3); }
.stat-num { font-size: calc(34px * var(--fs)); }
.stat-of { font-size: .55em; color: var(--ink-3); }
.detail-line .k { width: 72px; font-size: calc(14px * var(--fs)); color: var(--ink-3); font-weight: 600; }
.detail-line .v { font-size: calc(16px * var(--fs)); }
.inner-tab { font-size: calc(15px * var(--fs)); padding: 13px 6px; color: var(--ink-3); font-weight: 600; border-bottom-width: 2.5px; }
.inner-tab.active { color: var(--ink); border-bottom-color: var(--gold); }

/* 按鈕 */
.btn { min-height: 44px; padding: 10px 18px; font-size: calc(16px * var(--fs)); letter-spacing: .02em; border-color: var(--cream-4); font-weight: 600; text-decoration: none; }
.btn-sm { min-height: 38px; padding: 7px 14px; font-size: calc(15px * var(--fs)); }
.btn-lg { min-height: 54px; padding: 14px 20px; font-size: calc(18px * var(--fs)); border-radius: var(--r-lg); }
.btn:disabled, .btn-primary:disabled { opacity: .45; }
.btn-row { gap: 10px; }
.link-btn { border: none; background: none; padding: 6px 2px; min-height: 36px; cursor: pointer; color: var(--gold); font-size: calc(15px * var(--fs)); font-weight: 600; text-transform: none; letter-spacing: 0; }
.chip { font-size: calc(15px * var(--fs)); padding: 9px 15px; min-height: 40px; color: var(--ink-2); border-color: var(--cream-4); display: inline-flex; align-items: center; }
.filter-chip { font-size: calc(15px * var(--fs)); padding: 8px 14px; min-height: 40px; }
.seg button { font-size: calc(15px * var(--fs)); padding: 10px 6px; min-height: 42px; }
.check-row { font-size: calc(16px * var(--fs)); min-height: 52px; }
.check-box { width: 24px; height: 24px; }
.toggle-lbl { font-size: calc(16px * var(--fs)); }
.cal-nav { width: 40px; height: 40px; font-size: calc(20px * var(--fs)); }
.cal-day { height: 48px; font-size: calc(16px * var(--fs)); }
.cal-num { width: 30px; height: 30px; }
.cal-dot { width: 6px; height: 6px; }
.cal-wk { font-size: calc(13px * var(--fs)); color: var(--ink-3); }
.res-act { min-width: 38px; height: 38px; font-size: calc(17px * var(--fs)); }
.res-ic { width: 46px; height: 46px; }

/* 底部導覽：字放大、點擊區加大 */
.bottom-nav { height: calc(66px + env(safe-area-inset-bottom, 0px)); }
.nav-item { font-size: calc(13px * var(--fs)); color: var(--ink-3); gap: 4px; font-weight: 600; min-width: 0; }
.nav-item svg { width: 24px; height: 24px; }
.nav-item.active { color: var(--gold); }
.nav-item.active::before { width: 32px; height: 3px; }
.nav-badge { font-size: calc(11px * var(--fs)); min-width: 18px; height: 18px; border-radius: 9px; }

/* 卡片與清單 */
.card, .card-glow, .card-glass { padding: 16px; }
.card-sm { padding: 12px 14px; }
.sess { padding: 14px; gap: 12px; }
.sess-time { min-width: 58px; }
.sess-date { font-size: calc(13px * var(--fs)); color: var(--gold); font-weight: 700; margin-bottom: 3px; white-space: nowrap; }
.sess-start { font-size: calc(18px * var(--fs)); }
.sess-end { font-size: calc(14px * var(--fs)); color: var(--ink-3); }
.sess-title { font-size: calc(17px * var(--fs)); }
.sess-meta { font-size: calc(14px * var(--fs)); color: var(--ink-3); }
.sess.past { opacity: .75; }
.status-pill { font-size: calc(13px * var(--fs)); padding: 3px 10px; }
.badge { font-size: calc(13px * var(--fs)); padding: 3px 10px; }
.empty { font-size: calc(15px * var(--fs)); color: var(--ink-3); }
.alert-card { padding: 16px; }
.alert-t { font-size: calc(17px * var(--fs)); font-weight: 700; }
.alert-s { font-size: calc(14px * var(--fs)); color: var(--ink-2); margin: 3px 0 10px; }
.hint { font-size: calc(14px * var(--fs)); color: var(--ink-3); margin-top: 8px; line-height: 1.6; }
.coach-name { font-size: calc(17px * var(--fs)); font-weight: 600; }
.coach-tag { font-size: calc(14px * var(--fs)); color: var(--ink-3); }
.coach-row { padding: 12px 0; min-height: 56px; }
.modal-sheet { padding: 20px 18px calc(28px + env(safe-area-inset-bottom, 0px)); max-height: 92%; }
.modal-title { font-size: calc(24px * var(--fs)); }
.modal-handle { width: 40px; height: 4px; }
.toast { font-size: calc(15px * var(--fs)); padding: 12px 20px; bottom: 90px; white-space: normal; max-width: 90%; text-align: center; }
.login-error, .login-ok { font-size: calc(15px * var(--fs)); line-height: 1.6; text-align: left; }
.login-ok { background: var(--sage-pale); border: 1px solid rgba(63,110,78,.25); border-radius: var(--r); padding: 11px 14px; color: var(--sage); margin-bottom: 14px; }
.login-no-access { font-size: calc(14px * var(--fs)); color: var(--ink-2); }
.login-wrap { padding: 28px 20px; justify-content: flex-start; padding-top: 6vh; }
.login-card { padding: 24px 20px; }
.pw-wrap { position: relative; }
.pw-wrap .input-field { padding-right: 72px; }
.pw-eye { position: absolute; right: 6px; top: 6px; height: 36px; padding: 0 12px; border: none; background: var(--cream-2); border-radius: var(--r); color: var(--ink-2); cursor: pointer; font-size: calc(14px * var(--fs)); font-weight: 600; }
.cred { margin-top: 10px; padding: 10px 12px; background: #fff; border-radius: var(--r); color: var(--ink); text-align: left; font-size: calc(15px * var(--fs)); line-height: 1.8; }

/* 出席 */
.attend { margin-top: 4px; margin-bottom: 8px; background: #fff; border: 1px solid var(--cream-3); border-radius: var(--r-lg); padding: 14px 16px; }
.attend-h { display:flex; justify-content:space-between; align-items:center; font-size: calc(17px * var(--fs)); font-weight: 700; margin-bottom: 8px; }
.attend-pill { display:inline-flex; align-items:center; padding: 3px 10px; border-radius: var(--r-pill); font-size: calc(13px * var(--fs)); font-weight: 700; white-space: nowrap; }
.steps { display:flex; flex-direction:column; }
.step { display:flex; gap:12px; padding: 9px 0; position: relative; }
.step:not(:last-child)::after { content:''; position:absolute; left:15px; top:42px; bottom:-6px; width:2px; background: var(--cream-3); }
.step-dot { width:32px; height:32px; border-radius:50%; border:2px solid var(--cream-4); display:flex; align-items:center; justify-content:center; flex-shrink:0; font-weight:700; color: var(--ink-3); background:#fff; font-size: calc(15px * var(--fs)); z-index:1; }
.step.ok .step-dot { background: var(--sage); border-color: var(--sage); color:#fff; }
.step-t { font-size: calc(16px * var(--fs)); font-weight: 700; }
.step-s { font-size: calc(14px * var(--fs)); color: var(--ink-3); margin-top: 2px; line-height: 1.5; }
.step-s b { color: var(--ink); }
.ph-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
.ph { position: relative; aspect-ratio: 1; border-radius: var(--r); overflow: hidden; background: var(--cream-2); }
.ph-img { width:100%; height:100%; border:none; padding:0; cursor:zoom-in; background:none; display:block; }
.ph-img img { width:100%; height:100%; object-fit: cover; display:block; }
.ph-del { position:absolute; top:4px; right:4px; min-width:32px; height:32px; border-radius:16px; border:none; background: rgba(28,26,23,.6); color:#fff; cursor:pointer; font-size: calc(14px * var(--fs)); padding: 0 8px; }
.ph-del.armed { background: var(--rust); font-weight: 700; }
.ph-add { border: 2px dashed var(--cream-4); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; cursor:pointer; color: var(--ink-2); font-size: calc(14px * var(--fs)); font-weight: 600; background: var(--cream-2); }
.ph-add:hover { border-color: var(--gold); color: var(--gold); }

/* 學員首頁：今天的課 */
.today-card { border-radius: var(--r-xl); padding: 16px; margin-bottom: 12px; border: 1.5px solid var(--cream-4); background: #fff; }
.today-card.st-open { border-color: #2F5E8A; background: #F2F7FC; box-shadow: 0 4px 20px rgba(47,94,138,.12); }
.today-card.st-inClass, .today-card.st-done, .today-card.st-needOut { border-color: rgba(47,107,69,.35); background: #F3F9F5; }
.today-main { display:block; width:100%; text-align:left; border:none; background:none; padding:0; cursor:pointer; color: var(--ink); }
.today-k { font-size: calc(14px * var(--fs)); font-weight: 700; color: var(--gold); }
.today-t { font-size: calc(21px * var(--fs)); font-weight: 700; margin-top: 4px; line-height: 1.35; }
.today-m { font-size: calc(15px * var(--fs)); color: var(--ink-3); margin-top: 4px; }
.today-note { margin-top: 12px; padding: 10px 12px; border-radius: var(--r); background: var(--cream-2); font-size: calc(15px * var(--fs)); color: var(--ink-2); font-weight: 600; }
.today-note.ok { background: #E3F1E7; color: #2F6B45; }

/* 時數報表 */
.hr-row { display:flex; align-items:center; gap:12px; width:100%; padding: 12px 4px; border:none; border-bottom: 1px solid var(--cream-3); background:none; cursor:pointer; text-align:left; color: var(--ink); }
.hr-row:last-child { border-bottom: none; }
.hr-row.on { background: var(--gold-pale); border-radius: var(--r); }
.hr-name { font-size: calc(17px * var(--fs)); font-weight: 700; }
.hr-sub { font-size: calc(14px * var(--fs)); color: var(--ink-3); margin-top: 2px; }
.hr-h { font-size: calc(24px * var(--fs)); font-weight: 700; color: var(--gold); text-align: right; flex-shrink: 0; font-family: var(--font-display); }
.hr-h span { display:block; font-size: calc(12px * var(--fs)); color: var(--ink-3); font-family: var(--font); font-weight: 600; }
.prog-track { height: 6px; border-radius: 3px; }
.prog-fill { border-radius: 3px; }

/* 管理員：本月交付 */
.deliver-card { display:block; width:100%; text-align:left; cursor:pointer; color: var(--ink); border-left: 3px solid var(--sage); }
.deliver-h { display:flex; justify-content:space-between; align-items:center; font-size: calc(17px * var(--fs)); font-weight: 700; }
.deliver-row { display:grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 10px; }
.deliver-row b { display:block; font-size: calc(22px * var(--fs)); font-family: var(--font-display); }
.deliver-row span { font-size: calc(13px * var(--fs)); color: var(--ink-3); }


/* 頁首不換行 */
.header-brand { flex-shrink: 0; gap: 7px; }
.header-logo-text { white-space: nowrap; letter-spacing: .08em; font-size: calc(16px * var(--fs)); }
@media (max-width: 440px) { .header-logo-text span { display: none; } }
/* 頁首是固定的操作列：不跟著字級放大，避免擠出畫面 */
.app-header .role-badge { font-size: 14px; }
.app-header .logout-btn, .app-header .fs-btn { font-size: 15px; }
.app-header .header-logo-text { font-size: 16px; }
.app-header .hdr-name { font-size: 14px; }
.header-right { flex-shrink: 1; justify-content: flex-end; }
.role-badge, .logout-btn, .fs-btn { white-space: nowrap; flex-shrink: 0; }
.role-badge { letter-spacing: .02em; text-transform: none; font-weight: 700; }

/* 財務 */
.fund-card { background: linear-gradient(150deg, #F4F9F5, #FFFFFF); border: 1px solid rgba(63,110,78,.25); border-radius: var(--r-xl); padding: 18px; margin-bottom: 12px; }
.fund-k { font-size: calc(15px * var(--fs)); font-weight: 700; color: var(--ink-2); }
.fund-v { font-family: var(--font-display); font-size: calc(38px * var(--fs)); font-weight: 600; margin: 4px 0 10px; line-height: 1.1; }
.fund-lines > div { display:flex; justify-content:space-between; padding: 6px 0; font-size: calc(16px * var(--fs)); border-bottom: 1px dashed var(--cream-4); }
.fund-lines > div span { color: var(--ink-2); }
.fund-lines > div.sub { padding-left: 16px; font-size: calc(14px * var(--fs)); }
.fund-lines > div.eq { border-bottom: none; font-weight: 700; padding-top: 8px; }
.tab-n { display:inline-flex; align-items:center; justify-content:center; min-width:20px; height:20px; border-radius:10px; background:#8A5A10; color:#fff; font-size: calc(12px * var(--fs)); margin-left: 6px; padding: 0 5px; }
.sec-note { font-size: calc(14px * var(--fs)); font-weight: 600; color: var(--ink-3); }
.fin-row { display:flex; align-items:center; gap:8px; }
.fin-row:not(.card) { padding: 10px 0; border-bottom: 1px solid var(--cream-3); }
.fin-t { font-size: calc(16px * var(--fs)); font-weight: 700; display:flex; flex-wrap:wrap; gap: 4px 10px; align-items: baseline; }
.fin-s { font-size: calc(14px * var(--fs)); color: var(--ink-3); margin-top: 2px; }
.fin-amt { font-size: calc(16px * var(--fs)); white-space: nowrap; }
.fin-amt.in { color: var(--sage); } .fin-amt.out { color: var(--rust); }
.fin-owed { text-align:right; flex-shrink:0; font-weight:700; color: var(--rust); font-size: calc(16px * var(--fs)); }
.fin-owed span { display:block; font-size: calc(12px * var(--fs)); color: var(--ink-3); font-weight:600; }
.fin-owed span.ok { color: var(--sage); font-size: calc(14px * var(--fs)); }
.fin-bal { display:grid; grid-template-columns: repeat(3,1fr); gap:6px; background:#fff; border:1px solid var(--cream-3); border-radius: var(--r-lg); padding: 12px; margin-bottom: 14px; }
.fin-bal span { display:block; font-size: calc(13px * var(--fs)); color: var(--ink-3); }
.fin-bal b { font-size: calc(16px * var(--fs)); }
.money-wrap { position: relative; }
.money-wrap span { position:absolute; left:14px; top:13px; color: var(--ink-3); font-weight:600; font-size: calc(16px * var(--fs)); pointer-events:none; }
.money-wrap .input-field { padding-left: 58px; font-weight: 700; }
.sug-row { display:flex; align-items:center; gap:10px; padding: 12px 0; border-top: 1px solid var(--cream-3); flex-wrap: wrap; }
.sug-rate { width: 104px; }
.sug-rate span { font-size: calc(12px * var(--fs)); color: var(--ink-3); }
.sug-rate .input-field { margin: 2px 0 0; min-height: 40px; padding: 6px 10px; }
.sug-act { text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:4px; min-width: 96px; }
.sug-act b { font-size: calc(17px * var(--fs)); }
.po-card.paid { opacity: .85; }
.po-amt { font-family: var(--font-display); font-size: calc(28px * var(--fs)); font-weight: 600; margin-top: 6px; }
.btn.danger { background: var(--rust); color: #fff; border-color: var(--rust); }
.pw-card { margin-top: 18px; border-left: 3px solid var(--slate); }
.push-card { background: linear-gradient(150deg, #F2F7FC, #fff); border:1px solid rgba(47,94,138,.25); border-radius: var(--r-xl); padding: 14px 16px; margin-bottom: 12px; }
.fs-opt:disabled { opacity:.6; cursor: default; }
.req-row { display:flex; align-items:center; gap:8px; padding: 10px 0; border-top: 1px solid rgba(138,90,16,.15); }

/* 課程模組分組 */
.mg { background:#fff; border:1px solid var(--cream-3); border-left:4px solid; border-radius: var(--r-lg); margin-bottom:10px; overflow:hidden; }
.mg-head { display:flex; align-items:center; gap:8px; padding-right:10px; }
.mg-toggle { flex:1; display:flex; align-items:center; gap:10px; min-height:56px; padding: 10px 14px; border:none; background:none; cursor:pointer; text-align:left; color: var(--ink); }
.mg-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.mg-name { font-size: calc(18px * var(--fs)); font-weight:700; }
.mg-n { font-size: calc(14px * var(--fs)); color: var(--ink-3); }
.mg-chev { margin-left:auto; font-size: calc(18px * var(--fs)); color: var(--ink-3); }
.mg-list { border-top:1px solid var(--cream-3); padding: 4px 10px 10px; }
.mg-row { display:flex; align-items:center; gap:10px; width:100%; padding: 12px 4px; border:none; border-bottom:1px solid var(--cream-3); background:none; text-align:left; cursor:pointer; color: var(--ink); min-height:52px; }
.mg-row:last-of-type { border-bottom:none; }
.mg-row.sorting { cursor:default; background: var(--cream-2); border-radius: var(--r); margin-top:4px; border-bottom:none; padding: 8px; }
.mg-idx { width:26px; height:26px; border-radius:50%; background: var(--cream-2); color: var(--ink-3); display:flex; align-items:center; justify-content:center; font-size: calc(13px * var(--fs)); font-weight:700; flex-shrink:0; }
.mg-title { display:block; flex:1; font-size: calc(16px * var(--fs)); font-weight:600; line-height:1.4; }
.mg-sub { display:block; font-size: calc(13px * var(--fs)); color: var(--ink-3); margin-top:2px; }
.mg-go { color: var(--ink-4); font-size: calc(20px * var(--fs)); }
.usage { display:grid; grid-template-columns: repeat(3,1fr); gap:6px; background: var(--cream-2); border-radius: var(--r-lg); padding: 12px; margin-bottom: 12px; text-align:center; }
.usage b { display:block; font-size: calc(22px * var(--fs)); font-family: var(--font-display); }
.usage span { font-size: calc(13px * var(--fs)); color: var(--ink-3); }
.adm-acts { display:grid; gap:8px; margin-bottom: 6px; }
.danger-zone { margin-top: 18px; padding-top: 12px; border-top: 1px dashed var(--cream-4); }

/* 標誌 */
.wordmark { display:inline-flex; align-items:baseline; gap:.45em; font-family: var(--font-display); white-space:nowrap; line-height:1; }
.wm-istar { font-size: 30px; font-weight:600; letter-spacing:.04em; color: var(--ink); }
.wm-i { color: var(--gold); }
.wm-all { font-size: 13px; font-weight:600; letter-spacing:.32em; color: var(--gold); }
.wordmark.sm .wm-istar { font-size: 21px; }
.wordmark.sm .wm-all { font-size: 11px; letter-spacing:.26em; }
@media (max-width: 440px) { .app-header .wm-all { display:none; } }
.login-logo { font-size: 0; margin-bottom: 14px; }
.login-brand { margin-bottom: 8px; text-transform: none; letter-spacing: 0; }
.login-brand .wm-istar { color: var(--ink); font-size: 36px; }
.login-brand .wm-i, .login-brand .wm-all { color: var(--gold); }

/* 財務異動紀錄 */
.log-row { display:flex; gap:10px; padding: 12px 0; border-bottom: 1px solid var(--cream-3); align-items:flex-start; }
.log-row:last-child { border-bottom:none; }
.log-tag { flex-shrink:0; font-size: calc(13px * var(--fs)); font-weight:700; padding: 3px 9px; border-radius: var(--r-pill); background: var(--cream-2); color: var(--ink-2); }
.log-tag.create { background:#E3F1E7; color:#2F6B45; }
.log-tag.update, .log-tag.setting { background:#E6EFF8; color:#2F5E8A; }
.log-tag.delete { background: var(--rust-pale); color: var(--rust); }
.log-t { font-size: calc(16px * var(--fs)); font-weight:700; word-break: break-word; }
.log-s { font-size: calc(14px * var(--fs)); color: var(--ink-2); margin-top: 2px; }
.log-meta { font-size: calc(13px * var(--fs)); color: var(--ink-3); margin-top: 4px; }
/* 減少動態效果（系統設定開啟時） */
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
`;


/* ════════════════════════════════════════
   MACARON PALETTE — 頭像顏色系統
════════════════════════════════════════ */
const MACARON = [
  { bg:"#F9E4E8", text:"#A0405A" }, // 玫瑰
  { bg:"#FDE8D8", text:"#A0562A" }, // 杏桃
  { bg:"#FEF3D0", text:"#8A6820" }, // 香草
  { bg:"#E8F5E4", text:"#3A6B35" }, // 抹茶
  { bg:"#D8EFF5", text:"#2A6478" }, // 薄荷
  { bg:"#E4E8F9", text:"#3A4A8A" }, // 薰衣草
  { bg:"#F0E4F9", text:"#6A3A8A" }, // 紫羅蘭
  { bg:"#F9E4F3", text:"#8A3A70" }, // 荔枝
  { bg:"#E4F5F0", text:"#2A6A5A" }, // 蘋果綠
  { bg:"#F5EDE4", text:"#7A5030" }, // 焦糖
];

// 用名字產生固定色（相同名字永遠同色）
function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MACARON[Math.abs(hash) % MACARON.length];
}

/* ── 教練課程模組專屬馬卡龍色票 ── */
// 每位教練有固定的邊框色＋淡底色，讓模組一眼識別歸屬
const COACH_MODULE_PALETTE = [
  { border:"#C47E7E", bg:"#FDF0F0", label:"薔薇" },   // 玫瑰紅
  { border:"#C49A6C", bg:"#FDF5EC", label:"杏桃" },   // 杏桃橘
  { border:"#A8B86C", bg:"#F5F8EC", label:"抹茶" },   // 抹茶綠
  { border:"#6CA8B8", bg:"#ECF5F8", label:"天空" },   // 天空藍
  { border:"#8C7EC4", bg:"#F2F0FC", label:"薰衣草" }, // 薰衣草紫
  { border:"#C47EA8", bg:"#FDF0F8", label:"荔枝" },   // 荔枝粉
  { border:"#7EC4A8", bg:"#F0FCF8", label:"薄荷" },   // 薄荷綠
  { border:"#C4B86C", bg:"#FDF9EC", label:"香草" },   // 香草黃
];

// 由 coachId 決定教練的固定色
function getCoachModuleColor(coachId = "") {
  let hash = 0;
  for (let i = 0; i < coachId.length; i++) {
    hash = coachId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COACH_MODULE_PALETTE[Math.abs(hash) % COACH_MODULE_PALETTE.length];
}

/* ════════════════════════════════════════
   DATA
════════════════════════════════════════ */

/* ════════════════════════════════════════
   SHARED COMPONENTS
════════════════════════════════════════ */

/* ── iSTAR Alliance 標誌：五位夥伴手牽手組成一顆星（沿用原本概念，改成 App 的金、綠、藍、紅配色）── */
function LogoMark({ size = 28, style }) {
  return <svg viewBox="0 0 512 512" width={size} height={size} style={style} aria-hidden="true"><path d="M263.5 81.0 L303.0 191.3 L420.1 194.8" fill="none" stroke="#86672C" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round"/><circle cx="341.8" cy="137.9" r="28" fill="#86672C"/><path d="M424.8 209.1 L332.1 280.7 L364.9 393.2" fill="none" stroke="#3F6E4E" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round"/><circle cx="394.9" cy="301.1" r="28" fill="#3F6E4E"/><path d="M352.8 402.0 L256.0 336.0 L159.2 402.0" fill="none" stroke="#3A4A6B" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round"/><circle cx="256.0" cy="402.0" r="28" fill="#3A4A6B"/><path d="M147.1 393.2 L179.9 280.7 L87.2 209.1" fill="none" stroke="#8B3A2A" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round"/><circle cx="117.1" cy="301.1" r="28" fill="#8B3A2A"/><path d="M91.9 194.8 L209.0 191.3 L248.5 81.0" fill="none" stroke="#B8913F" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round"/><circle cx="170.2" cy="137.9" r="28" fill="#B8913F"/></svg>;
}
function Wordmark({ small }) {
  return (
    <span className={"wordmark" + (small ? " sm" : "")}>
      <span className="wm-istar"><span className="wm-i">i</span>STAR</span>
      <span className="wm-all">ALLIANCE</span>
    </span>
  );
}

function Starfield() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId, stars = [];
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = Array.from({ length: 140 }, () => ({
        x: Math.random()*canvas.width, y: Math.random()*canvas.height,
        r: Math.random()*1.0+0.15, a: Math.random(),
        sp: Math.random()*.006+.002, ph: Math.random()*Math.PI*2,
      }));
    };
    const draw = t => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for (const s of stars) {
        const op = ((Math.sin(t*s.sp+s.ph)+1)/2)*.65+.15;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fillStyle = `rgba(236,233,248,${(op*s.a).toFixed(3)})`; ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    resize(); window.addEventListener("resize",resize);
    animId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize",resize); };
  }, []);
  return <canvas id="starfield" ref={ref} />;
}

/* ── Icons ── */
const IcHome  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcGrid  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
const IcPath  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IcMsg   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const IcLayer = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>;
const IcSwap  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><polyline points="8 6 2 12 8 18"/><polyline points="16 6 22 12 16 18"/></svg>;
const IcDoc   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const IcSend  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const IcEye   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcUsers = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const IcLock  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const IcLink  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const IcFile  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IcImg   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IcCoin = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6.5v11"/></svg>;
const IcCal   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcCheck = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcPlus  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

// 底部導覽：可在 tab 上顯示待處理數量（例如學員有幾堂課待確認）
const NavBadgeContext = React.createContext({});

function BottomNav({ tabs, active, onSwitch }) {
  const badges = React.useContext(NavBadgeContext);
  return (
    <div className="bottom-nav">
      {tabs.map(({ key, label, Icon }) => (
        <button key={key} className={"nav-item"+(active===key?" active":"")} onClick={() => onSwitch(key)}>
          <Icon /><span>{label}</span>
          {badges[key] > 0 && <span className="nav-badge">{badges[key]}</span>}
        </button>
      ))}
    </div>
  );
}

/* ChipGroup 已整合為 inline chip-group */

/* Toggle 已整合為 inline toggle-row */

/* ── Resource Upload Panel ── */
/* ════════════════════════════════════════
   MODALS
════════════════════════════════════════ */
function ModalAddModule({ onClose, editData }) {
  const { addModule, updateModule } = useAuth();
  const isEdit = !!editData;
  const [form, setForm] = useState({
    title:    editData?.title    || "",
    outline:  editData?.outline  || "",
    duration: editData?.duration || "",
    method:   editData?.method   || ["線上"],
    stage:    editData?.stage    || ["定位"],
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleOption = (key, val) => setForm(f => {
    const arr = f[key];
    return { ...f, [key]: arr.includes(val) ? arr.filter(x=>x!==val) : [...arr,val] };
  });

  const handleSave = async () => {
    if (!form.title.trim()) { setError("請填寫課程主題"); return; }
    setLoading(true); setError("");
    const payload = { title:form.title.trim(), outline:form.outline.trim(), duration:form.duration.trim(), method:form.method, stage:form.stage };
    const res = isEdit ? await updateModule(editData.id, payload) : await addModule(payload);
    setLoading(false);
    if (res.success) onClose(true, { id: res.id || editData?.id });
    else setError("儲存失敗，請再試一次。");
  };

  return (
    <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) onClose(false); }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">{isEdit ? "編輯課程模組" : "新增課程模組"}</div>

        {error && (
          <div style={{ background:"var(--rust-pale)", border:"1px solid rgba(139,58,42,.2)", borderRadius:"var(--r)", padding:"10px 14px", fontSize:fz(15), color:"var(--rust)", marginBottom:14 }}>
            {error}
          </div>
        )}

        <div className="input-label">課程主題 *</div>
        <input className="input-field" placeholder="例：商業模式設計工作坊"
          value={form.title} onChange={e => setField("title", e.target.value)} />

        <div className="input-label">大綱</div>
        <textarea className="input-field" rows={3}
          placeholder={"第一步：…\n第二步：…"}
          value={form.outline} onChange={e => setField("outline", e.target.value)} />

        <div className="input-label">時間</div>
        <input className="input-field" placeholder="例：3小時 / 2天"
          value={form.duration} onChange={e => setField("duration", e.target.value)} />

        <div className="input-label">上課方式</div>
        <div className="chip-group">
          {["線上","實體","混合","非同步"].map(o => (
            <div key={o}
              className={"chip" + (form.method.includes(o) ? " sel" : "")}
              onClick={() => toggleOption("method", o)}>
              {o}
            </div>
          ))}
        </div>

        <div className="input-label">對應成長階段</div>
        <div className="chip-group">
          {["探索","自我認知","內化","定位","方向","小驗","實作","市場","共創"].map(o => (
            <div key={o}
              className={"chip" + (form.stage.includes(o) ? " sel" : "")}
              onClick={() => toggleOption("stage", o)}>
              {o}
            </div>
          ))}
        </div>

        <div className="btn-row">
          <button className="btn" onClick={() => onClose(false)}>取消</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? "儲存中…" : isEdit ? "✦ 儲存變更" : "✦ 新增模組"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalAddRecord({ onClose, prefill, editData }) {
  const { fetchMembers, addRecord, updateRecord } = useAuth();
  const isEdit = !!editData;
  const src = editData || prefill || {};
  const [students,  setStudents]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [form, setForm] = useState({
    studentUid:   src.studentUid  || "",
    studentName:  src.studentName || "",
    date:         src.date        || todayStr(),
    topic:        src.topic       || "",
    feedback:     src.feedback    || "",
    privateNote:  src.privateNote || "",
    visibleStudent: src.visibleStudent ?? true,
    visibleCoach:   src.visibleCoach   ?? true,
  });

  useEffect(() => {
    fetchMembers()
      .then(all => setStudents(all.filter(m => m.role === "student")))
      .catch(() => {});
  }, []);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.studentUid) { setError("請選擇學員"); return; }
    if (!form.topic.trim()) { setError("請填寫課程主題"); return; }
    setLoading(true); setError("");
    const payload = {
      studentUid:     form.studentUid,
      studentName:    form.studentName,
      date:           form.date,
      topic:          form.topic.trim(),
      feedback:       form.feedback.trim(),
      privateNote:    form.privateNote.trim(),
      visibleStudent: form.visibleStudent,
      visibleCoach:   form.visibleCoach,
      ...(prefill?.sessionId ? { sessionId: prefill.sessionId } : {}),
    };
    const res = isEdit ? await updateRecord(editData.id, payload) : await addRecord(payload);
    setLoading(false);
    if (res.success) {
      onClose(true);
    } else {
      setError("儲存失敗，請再試一次。");
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) onClose(false); }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">{isEdit ? "編輯上課記錄" : "新增上課記錄"}</div>

        {error && (
          <div style={{ background:"var(--rust-pale)", border:"1px solid rgba(139,58,42,.2)", borderRadius:"var(--r)", padding:"10px 14px", fontSize:fz(15), color:"var(--rust)", marginBottom:14 }}>
            {error}
          </div>
        )}

        <div className="input-label">學員 *</div>
        <select className="input-field"
          value={form.studentUid}
          onChange={e => {
            const s = students.find(x => x.uid === e.target.value);
            setField("studentUid", e.target.value);
            setField("studentName", s?.name || "");
          }}>
          <option value="">— 選擇學員 —</option>
          {students.map(s => <option key={s.uid} value={s.uid}>{s.name}</option>)}
        </select>

        <div className="input-label">上課日期</div>
        <input className="input-field" type="date"
          value={form.date} onChange={e => setField("date", e.target.value)} />

        <div className="input-label">課程主題 *</div>
        <input className="input-field" placeholder="例：個人品牌定位工作坊"
          value={form.topic} onChange={e => setField("topic", e.target.value)} />

        <div className="input-label">給學員的回饋</div>
        <textarea className="input-field" rows={2} placeholder="課後鼓勵與建議…"
          value={form.feedback} onChange={e => setField("feedback", e.target.value)} />

        <div className="input-label">教練私密備註（學員不可見）</div>
        <textarea className="input-field" rows={2} placeholder="教練群內部觀察…"
          value={form.privateNote} onChange={e => setField("privateNote", e.target.value)} />

        <div className="toggle-row">
          <span className="toggle-lbl"><IcEye />學員可見</span>
          <button className={"toggle-sw"+(form.visibleStudent?" on":"")}
            onClick={() => setField("visibleStudent", !form.visibleStudent)} />
        </div>
        <div className="toggle-row" style={{ borderBottom:"none" }}>
          <span className="toggle-lbl"><IcUsers />教練群可見</span>
          <button className={"toggle-sw"+(form.visibleCoach?" on":"")}
            onClick={() => setField("visibleCoach", !form.visibleCoach)} />
        </div>

        <div className="btn-row" style={{ marginTop:14 }}>
          <button className="btn" onClick={() => onClose(false)}>取消</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? "儲存中…" : "✦ 儲存記錄"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   課程學習資料：檔案處理工具
════════════════════════════════════════ */
const MAX_FILE = 5 * 1024 * 1024;   // 5MB（存在 Firestore，免費方案可用）

const formatSize = (b) => !b ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

const readAsDataUrl = (file) => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
});

// 圖片：縮到最長邊 1600px、JPEG 壓縮，另產生 240px 縮圖
const loadImage = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
async function compressImage(file) {
  const src = await readAsDataUrl(file);
  const im = await loadImage(src);
  const draw = (max, q) => {
    const k = Math.min(1, max / Math.max(im.width, im.height));
    const c = document.createElement("canvas");
    c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", q);
  };
  const dataUrl = draw(1600, 0.82);
  return { dataUrl, thumb: draw(240, 0.7), size: Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75) };
}

const dataUrlToBlobUrl = (dataUrl) => {
  const [head, b64] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);/)?.[1] || "application/octet-stream";
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: mime }));
};

const normalizeUrl = (v) => {
  const t = (v || "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return "https://" + t;
  return "";
};
const linkLabel = (url) => {
  try {
    const u = new URL(url); const h = u.hostname.replace(/^www\./, "");
    if (/youtube\.com|youtu\.be/.test(h)) return "YouTube 影片";
    if (/docs\.google\.com/.test(h)) return u.pathname.includes("/presentation") ? "Google 簡報" : u.pathname.includes("/spreadsheets") ? "Google 試算表" : "Google 文件";
    if (/drive\.google\.com/.test(h)) return "Google 雲端硬碟";
    if (/canva\.com/.test(h)) return "Canva 設計";
    if (/notion\.(so|site)/.test(h)) return "Notion 頁面";
    return h;
  } catch { return url; }
};
const FILE_ICON = (r) => r.type === "link" ? "🔗" : r.type === "img" ? "🖼" : /pdf/.test(r.mime || "") ? "📕" : /sheet|excel|csv/.test(r.mime || "") ? "📊" : /presentation|powerpoint/.test(r.mime || "") ? "📙" : /word|document/.test(r.mime || "") ? "📘" : "📎";

/* ── 學習資料管理（教練＝完整管理；學員＝可新增、可刪自己的） ── */
function ResourceManager({ moduleId, canManage, canAdd = true }) {
  const { profile, role, addModuleResource, fetchModuleResources, deleteModuleResource,
          uploadModuleFile, fetchResourceFile, updateModuleResource } = useAuth();
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [url,      setUrl]      = useState("");
  const [title,    setTitle]    = useState("");
  const [queue,    setQueue]    = useState([]);     // { id, name, pct, error }
  const [editing,  setEditing]  = useState(null);   // { id, name }
  const [armedDel, setArmedDel] = useState(null);
  const [viewer,   setViewer]   = useState(null);   // { name, src }
  const [opening,  setOpening]  = useState(null);
  const [drag,     setDrag]     = useState(false);
  const [msg,      setMsg]      = useState("");
  const fileRef = useRef(null);

  const load = () => fetchModuleResources(moduleId).then(list => { setItems(list); setLoading(false); });
  useEffect(() => { setLoading(true); load(); }, [moduleId]);

  const mine = (r) => r.addedByUid ? r.addedByUid === profile?.uid : r.addedBy === profile?.name;
  const canEdit = (r) => canManage || mine(r);

  /* 連結 */
  const validUrl = normalizeUrl(url);
  const addLink = async () => {
    if (!validUrl) { setMsg("請貼上完整的網址，例如 https://…"); return; }
    setMsg("");
    const res = await addModuleResource(moduleId, { type: "link", url: validUrl, name: title.trim() || linkLabel(validUrl) });
    if (res.success) { setUrl(""); setTitle(""); load(); } else setMsg("加入失敗，請再試一次");
  };

  /* 檔案 / 圖片（可多選、拖放、貼上） */
  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setMsg("");
    for (const f of files) {
      const qid = Math.random().toString(36).slice(2);
      setQueue(q => [...q, { id: qid, name: f.name, pct: 0 }]);
      const setQ = (patch) => setQueue(q => q.map(x => x.id === qid ? { ...x, ...patch } : x));
      try {
        const isImg = /^image\/(jpeg|png|webp|gif|heic|heif|bmp)/.test(f.type);
        let payload;
        if (isImg) {
          const c = await compressImage(f);
          payload = { kind: "img", name: f.name.replace(/\.\w+$/, "") + ".jpg", mime: "image/jpeg", size: c.size, dataUrl: c.dataUrl, thumb: c.thumb };
        } else {
          if (f.size > MAX_FILE) { setQ({ error: `超過 5MB（${formatSize(f.size)}），請改用雲端硬碟連結` }); continue; }
          payload = { kind: "file", name: f.name, mime: f.type || "application/octet-stream", size: f.size, dataUrl: await readAsDataUrl(f) };
        }
        const res = await uploadModuleFile(moduleId, payload, (p) => setQ({ pct: Math.round(p * 100) }));
        if (!res.success) { setQ({ error: "上傳失敗，請再試一次" }); continue; }
        setQueue(q => q.filter(x => x.id !== qid));
        load();
      } catch { setQ({ error: "無法讀取這個檔案" }); }
    }
  };

  const onPaste = (e) => {
    const files = Array.from(e.clipboardData?.files || []);
    if (files.length) { e.preventDefault(); handleFiles(files); }
  };

  /* 開啟 */
  const open = async (r) => {
    if (r.type === "link") { window.open(r.url, "_blank", "noopener"); return; }
    setOpening(r.id);
    try {
      const dataUrl = await fetchResourceFile(moduleId, r);
      if (r.type === "img") setViewer({ name: r.name, src: dataUrl });
      else {
        // 不加 target="_blank"：否則瀏覽器會忽略檔名，存成亂碼檔名
        const href = dataUrlToBlobUrl(dataUrl);
        const a = document.createElement("a");
        a.href = href; a.download = r.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 60000);
      }
    } catch { setMsg("開啟失敗，請再試一次"); }
    setOpening(null);
  };

  /* 重新命名 / 排序 / 刪除 */
  const saveName = async () => {
    if (!editing?.name.trim()) { setEditing(null); return; }
    await updateModuleResource(moduleId, editing.id, { name: editing.name.trim() });
    setEditing(null); load();
  };
  const move = async (idx, dir) => {
    const a = items[idx], b = items[idx + dir];
    if (!a || !b) return;
    const oa = a.order ?? idx, ob = b.order ?? idx + dir;
    setItems(list => { const n = [...list]; [n[idx], n[idx + dir]] = [n[idx + dir], n[idx]]; return n; });
    await Promise.all([updateModuleResource(moduleId, a.id, { order: ob === oa ? oa + dir : ob }), updateModuleResource(moduleId, b.id, { order: oa })]);
    load();
  };
  const remove = async (r) => {
    if (armedDel !== r.id) { setArmedDel(r.id); setTimeout(() => setArmedDel(d => d === r.id ? null : d), 3000); return; }
    setArmedDel(null);
    setItems(list => list.filter(x => x.id !== r.id));
    await deleteModuleResource(moduleId, r.id, r.parts || 0);
    load();
  };

  return (
    <div className="res" onPaste={canAdd ? onPaste : undefined}
      onDragOver={canAdd ? (e => { e.preventDefault(); setDrag(true); }) : undefined}
      onDragLeave={() => setDrag(false)}
      onDrop={canAdd ? (e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }) : undefined}>

      {/* ── 新增區 ── */}
      {canAdd && <div className={"res-add" + (drag ? " drag" : "")}>
        <div className="res-row">
          <input className="input-field" style={{ marginBottom:0 }} placeholder="貼上連結（YouTube、雲端硬碟、文章…）"
            value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && addLink()} />
          <button className="btn btn-primary" onClick={addLink} disabled={!url.trim()}>加入</button>
        </div>
        {validUrl && (
          <input className="input-field" style={{ marginTop:8, marginBottom:0 }} placeholder={`顯示名稱（預設：${linkLabel(validUrl)}）`}
            value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && addLink()} />
        )}
        <div className="res-or"><span>或</span></div>
        <button className="btn" style={{ width:"100%" }} onClick={() => fileRef.current?.click()}>
          📎 上傳檔案或圖片
        </button>
        <div className="res-hint">可一次選多個 · 可直接拖放或貼上截圖 · 圖片自動壓縮 · 檔案上限 5MB</div>
        <input ref={fileRef} type="file" multiple style={{ display:"none" }}
          onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
      </div>}

      {msg && <div className="res-msg">{msg}</div>}

      {/* ── 上傳中 ── */}
      {queue.map(q => (
        <div key={q.id} className="res-item">
          <div className="res-ic">{q.error ? "⚠" : "⏳"}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="res-name">{q.name}</div>
            {q.error
              ? <div className="res-meta" style={{ color:"var(--rust)" }}>{q.error}</div>
              : <div className="prog-track" style={{ marginTop:6 }}><div className="prog-fill gold" style={{ width:`${q.pct}%` }} /></div>}
          </div>
          {q.error && <button className="res-act" onClick={() => setQueue(x => x.filter(y => y.id !== q.id))}>×</button>}
        </div>
      ))}

      {/* ── 清單 ── */}
      <div className="res-head">學習資料 {items.length > 0 && `· ${items.length}`}</div>
      {loading ? <div className="res-empty">載入中…</div>
        : items.length === 0 && queue.length === 0 ? <div className="res-empty">還沒有資料，從上方加入第一份吧</div>
        : items.map((r, idx) => (
          <div key={r.id} className="res-item">
            <button className="res-ic" onClick={() => open(r)} aria-label="開啟">
              {r.thumb ? <img src={r.thumb} alt="" /> : FILE_ICON(r)}
            </button>
            <div style={{ flex:1, minWidth:0 }}>
              {editing?.id === r.id ? (
                <input className="input-field" style={{ marginBottom:0, padding:"6px 10px", fontSize:fz(16) }} autoFocus
                  value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                  onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditing(null); }}
                  onBlur={saveName} />
              ) : (
                <button className="res-name" onClick={() => open(r)}>
                  {opening === r.id ? "開啟中…" : r.name || r.url}
                </button>
              )}
              <div className="res-meta">
                {r.type === "link" ? linkLabel(r.url) : formatSize(r.size)}
                {r.addedBy ? ` · ${r.addedBy}` : ""}
                {r.createdAt?.toDate ? ` · ${r.createdAt.toDate().toLocaleDateString("zh-TW")}` : ""}
              </div>
            </div>
            {canEdit(r) && editing?.id !== r.id && (
              <div className="res-acts">
                {canManage && <button className="res-act" disabled={idx === 0} onClick={() => move(idx, -1)} aria-label="上移">↑</button>}
                {canManage && <button className="res-act" disabled={idx === items.length - 1} onClick={() => move(idx, 1)} aria-label="下移">↓</button>}
                <button className="res-act" onClick={() => setEditing({ id: r.id, name: r.name || "" })} aria-label="重新命名">✎</button>
                <button className={"res-act del" + (armedDel === r.id ? " armed" : "")} onClick={() => remove(r)} aria-label="刪除">
                  {armedDel === r.id ? "確定?" : "×"}
                </button>
              </div>
            )}
          </div>
        ))}

      {viewer && (
        <div className="viewer" onClick={() => setViewer(null)}>
          <img src={viewer.src} alt={viewer.name} />
          <div className="viewer-bar">
            <span>{viewer.name}</span>
            <a href={viewer.src} download={viewer.name} onClick={e => e.stopPropagation()}>下載</a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 課程模組詳情（點模組卡片開啟） ── */
function ModuleSheet({ m, isOwn, onClose, onEdit, onDelete }) {
  const { role } = useAuth();
  const color = getCoachModuleColor(m.coachId || "");
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet" style={{ maxHeight:"94%" }}>
        <div className="modal-handle" />
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
          <span className="cal-dot" style={{ background: color.border, width:8, height:8 }} />
          <span style={{ fontSize:fz(14), color: color.border, fontWeight:700 }}>{m.coachName || "—"} 教練{isOwn ? " · 我的課程" : ""}</span>
        </div>
        <div className="modal-title" style={{ marginBottom:8 }}>{m.title}</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
          {(m.stage||[]).map(s => <span key={s} className="badge" style={{ background: color.bg, color: color.border, border:`1px solid ${color.border}`, fontSize:fz(13) }}>{s}</span>)}
          {m.duration && <span className="badge" style={{ background:"var(--cream-2)", color:"var(--ink-3)", border:"1px solid var(--cream-3)", fontSize:fz(13) }}>⏱ {m.duration}</span>}
          {(m.method||[]).map(mt => <span key={mt} className="badge" style={{ background:"var(--cream-2)", color:"var(--ink-3)", border:"1px solid var(--cream-3)", fontSize:fz(13) }}>{mt}</span>)}
        </div>
        {m.outline && <div style={{ fontSize:fz(16), color:"var(--ink-2)", lineHeight:1.7, whiteSpace:"pre-wrap", marginBottom:12 }}>{m.outline}</div>}

        {isOwn && !confirmDel && (
          <div className="btn-row" style={{ marginTop:0, marginBottom:14 }}>
            <button className="btn btn-sm" onClick={() => onEdit(m)}>✎ 編輯課程資訊</button>
            <button className="btn btn-sm" style={{ color:"var(--rust)", borderColor:"rgba(139,58,42,.2)", background:"var(--rust-pale)" }} onClick={() => setConfirmDel(true)}>刪除模組</button>
          </div>
        )}
        {confirmDel && (
          <div className="alert-card" style={{ background:"var(--rust-pale)", borderColor:"rgba(139,58,42,.2)" }}>
            <div style={{ fontSize:fz(16), marginBottom:10 }}>確定刪除「{m.title}」嗎？已分配給學員的會一併失效。</div>
            <div className="btn-row" style={{ marginTop:0 }}>
              <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>返回</button>
              <button className="btn btn-sm" style={{ background:"var(--rust)", color:"#fff", borderColor:"var(--rust)" }} onClick={() => onDelete(m.id)}>確認刪除</button>
            </div>
          </div>
        )}

        <ResourceManager moduleId={m.id} canManage={isOwn || role === "admin"} canAdd={isOwn || role === "admin"} />
        {!isOwn && role !== "admin" && <div style={{ fontSize:fz(14), color:"var(--ink-4)", textAlign:"center", marginTop:6 }}>其他教練的課程僅可檢視</div>}
        <button className="btn" style={{ width:"100%", marginTop:12, border:"none", background:"none", color:"var(--ink-3)" }} onClick={onClose}>關閉</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   成長路徑：共用元件
════════════════════════════════════════ */
function StageBar({ journey }) {
  return (
    <div className="stage-bar">
      {STAGES.map(s => {
        const st = stageStatus(journey, s.n);
        return <div key={s.n} className="stage-seg" style={{
          background: st === "done" ? s.color : st === "active" ? "var(--ink)" : "var(--cream-3)",
          opacity: st === "done" ? .85 : 1 }} />;
      })}
    </div>
  );
}

/* 單一里程碑列 */
function MilestoneRow({ journey, n, i, mode, studentUid, onChanged }) {
  const { claimMilestone, unclaimMilestone, verifyMilestone } = useAuth();
  const st = milestoneState(journey, n, i);
  const k = mKey(n, i);
  const claim = journey?.claims?.[k];
  const ver = journey?.verified?.[k];
  const skipped = journey?.stages?.[n]?.skipped;
  const [form, setForm] = useState(false);
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const active = stageStatus(journey, n) === "active";
  const run = async (fn, msg) => { setBusy(true); const r = await fn(); setBusy(false); if (r.success) { setForm(false); onChanged(msg); } else onChanged("操作失敗，請再試一次"); };

  return (
    <div className={"ms ms-" + st}>
      <div className="ms-head">
        <span className="ms-dot">{st === "done" ? <IcCheck /> : st === "claimed" ? "…" : ""}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="ms-text">{stageOf(n).milestones[i]}</div>
          <div className="ms-sub">
            {st === "done" && (skipped && !ver ? "已具備" : `${ver?.by || "教練"} 確認 · ${ver?.at || ""}`)}
            {st === "claimed" && `已回報 ${claim.at} · 等待教練確認`}
          </div>
        </div>
        {/* 學員：回報 / 撤回 */}
        {mode === "student" && active && st === "todo" && !form && (
          <button className="btn btn-sm" onClick={() => setForm(true)}>回報完成</button>
        )}
        {mode === "student" && active && st === "claimed" && (
          <button className="btn btn-sm" style={{ color:"var(--ink-3)" }} disabled={busy} onClick={() => run(() => unclaimMilestone(n, i), "已撤回回報")}>撤回</button>
        )}
        {/* 教練：確認 / 取消 */}
        {mode === "coach" && !skipped && st !== "done" && (
          <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => run(() => verifyMilestone(studentUid, n, i, true), "已確認里程碑 ✓")}>確認</button>
        )}
        {mode === "coach" && !skipped && st === "done" && active && (
          <button className="btn btn-sm" style={{ color:"var(--ink-3)" }} disabled={busy} onClick={() => run(() => verifyMilestone(studentUid, n, i, false), "已取消確認")}>取消</button>
        )}
      </div>
      {claim && (claim.note || claim.link) && (
        <div className="ms-claim">
          {claim.note && <div style={{ whiteSpace:"pre-wrap" }}>{claim.note}</div>}
          {claim.link && <a href={claim.link} target="_blank" rel="noopener noreferrer">查看成果 →</a>}
        </div>
      )}
      {form && (
        <div className="ms-form">
          <textarea className="input-field" rows={2} placeholder="簡單說明你完成了什麼（教練會看到）" value={note} onChange={e => setNote(e.target.value)} />
          <input className="input-field" placeholder="成果連結（選填，例如雲端文件）" value={link} onChange={e => setLink(e.target.value)} />
          <div className="btn-row" style={{ marginTop:0 }}>
            <button className="btn btn-sm" onClick={() => setForm(false)}>取消</button>
            <button className="btn btn-sm btn-primary" disabled={busy || !note.trim()}
              onClick={() => run(() => claimMilestone(n, i, note.trim(), normalizeUrl(link) || ""), "已回報，等待教練確認")}>送出回報</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* 完整成長路徑（學員自己看 / 教練幫學員看） */
function JourneyView({ journey, mode, studentUid, onChanged, related = [], preview }) {
  const [openStage, setOpenStage] = useState(null);
  const cur = journey?.currentStage || 1;
  const curStage = stageOf(cur);
  const prog = stageProgress(journey, cur);
  const finished = cur === 9 && journey?.stages?.[9]?.completedAt;
  const days = daysInStage(journey);
  const note = journey?.coachNote?.[cur];

  return (
    <>
      {/* 摘要 */}
      <div className="card-gold" style={{ marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:fz(12), color:"var(--gold)", letterSpacing:".02em", fontWeight:700, textTransform:"uppercase" }}>
              {finished ? "✦ 已成為星辰聯盟成員" : `第 ${cur} / 9 階段 · ${curStage.phase}`}
            </div>
            <div style={{ fontFamily:"var(--font)", fontSize:fz(30), fontWeight:600, marginTop:4 }}>{curStage.name}</div>
            <div style={{ fontSize:fz(15), color:"var(--ink-3)", marginTop:2 }}>{curStage.goal}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"var(--font)", fontSize:fz(30), fontWeight:600, color:"var(--gold)" }}>{overallProgress(journey)}%</div>
            <div style={{ fontSize:fz(12), color:"var(--ink-4)", letterSpacing:".02em" }}>整體旅程</div>
          </div>
        </div>
        <div style={{ marginTop:14 }}><StageBar journey={journey} /></div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:fz(13), color:"var(--ink-3)", marginTop:6 }}>
          <span>本階段 {prog.done}/{prog.total} 個里程碑{prog.claimed ? ` · ${prog.claimed} 個待確認` : ""}</span>
          {!preview && !finished && <span>已進行 {days} 天</span>}
        </div>
      </div>

      {preview && (
        <div className="alert-card" style={{ background:"var(--slate-pale)", borderColor:"rgba(58,74,107,.2)", fontSize:fz(15), color:"var(--slate)" }}>
          你的成長紀錄還在建立中，教練開通後就能開始回報進度。
        </div>
      )}

      {/* 教練給這個階段的提醒 */}
      {note && (
        <div className="feedback-quote" style={{ marginBottom:12 }}>
          <div className="feedback-author" style={{ marginBottom:4 }}>教練提醒</div>{note}
        </div>
      )}

      {/* 目前階段的里程碑 */}
      {!finished && (
        <>
          <div className="sec-h">本階段要完成的事</div>
          <div className="card" style={{ padding:"4px 14px" }}>
            {curStage.milestones.map((_, i) => (
              <MilestoneRow key={i} journey={journey} n={cur} i={i} mode={preview ? "view" : mode} studentUid={studentUid} onChanged={onChanged} />
            ))}
          </div>
          {canAdvance(journey) && mode === "student" && (
            <div className="alert-card" style={{ background:"var(--sage-pale)", borderColor:"rgba(74,123,90,.25)", color:"var(--sage)", fontSize:fz(16) }}>
              ✓ 本階段的里程碑都完成了！教練確認後就會升到下一階段「{stageOf(cur + 1).name}」。
            </div>
          )}
          <div style={{ fontSize:fz(14), color:"var(--ink-3)", margin:"-2px 2px 4px" }}>
            對應課程：{curStage.course}
          </div>
          {related.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, margin:"8px 0" }}>
              {related.map(m => {
                const c = getCoachModuleColor(m.coachId || "");
                return <span key={m.id} className="badge" style={{ background:c.bg, color:c.border, border:`1px solid ${c.border}`, fontSize:fz(14) }}>✦ {m.title}</span>;
              })}
            </div>
          )}
        </>
      )}

      {/* 全部 9 階段時間軸 */}
      <div className="sec-h">完整旅程</div>
      <div className="tl">
        {STAGES.map(s => {
          const st = stageStatus(journey, s.n);
          const info = journey?.stages?.[s.n] || {};
          const p = stageProgress(journey, s.n);
          const expanded = openStage === s.n;
          return (
            <div key={s.n} className={"tl-item tl-" + st}>
              <div className="tl-dot" style={{ background: st === "done" ? s.color : st === "active" ? "var(--ink)" : "var(--cream)", borderColor: st === "locked" ? "var(--cream-4)" : st === "done" ? s.color : "var(--ink)" }}>
                {st === "done" ? <IcCheck /> : <span>{s.n}</span>}
              </div>
              <button className="tl-body" onClick={() => setOpenStage(expanded ? null : s.n)}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                  <div>
                    <span style={{ fontSize:fz(12), color: s.color, fontWeight:700, letterSpacing:".02em" }}>{s.tag}</span>
                    <div style={{ fontSize:fz(17), fontWeight:600 }}>{String(s.n).padStart(2,"0")}. {s.name}</div>
                  </div>
                  <div style={{ textAlign:"right", fontSize:fz(13), color:"var(--ink-3)", flexShrink:0 }}>
                    {st === "done" && (info.skipped ? "已具備" : <>完成 {info.completedAt}<br/>{daysBetween(info.startedAt, info.completedAt)} 天</>)}
                    {st === "active" && <span style={{ color:"var(--gold)", fontWeight:700 }}>進行中 {p.pct}%</span>}
                    {st === "locked" && <IcLock />}
                  </div>
                </div>
                <div style={{ fontSize:fz(14), color:"var(--ink-3)", marginTop:2 }}>{s.goal}</div>
              </button>
              {expanded && st !== "active" && (
                <div className="tl-detail">
                  {s.milestones.map((t, i) => (
                    <div key={i} style={{ display:"flex", gap:8, fontSize:fz(15), padding:"3px 0", color: milestoneState(journey, s.n, i) === "done" ? "var(--ink-2)" : "var(--ink-4)" }}>
                      <span>{milestoneState(journey, s.n, i) === "done" ? "✓" : "○"}</span><span>{t}</span>
                    </div>
                  ))}
                  <div style={{ fontSize:fz(14), color:"var(--ink-4)", marginTop:4 }}>對應課程：{s.course}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* 教練／管理員：管理某位學員的成長路徑 */
function StudentJourneySheet({ student, onClose, onChanged }) {
  const { fetchJourney, advanceStage, setJourneyStage, setStageNote } = useAuth();
  const [j, setJ] = useState(null);
  const [toast, setToast] = useState("");
  const [note, setNote] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => fetchJourney(student.uid).then(x => { setJ(x); setNote(x?.coachNote?.[x?.currentStage] || ""); setTarget(""); });
  useEffect(() => { load(); }, [student.uid]);
  const changed = (msg) => { setToast(msg); load(); onChanged?.(); };
  const run = async (fn, msg) => { setBusy(true); const r = await fn(); setBusy(false); changed(r.success ? msg : "操作失敗，請再試一次"); };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet" style={{ maxHeight:"94%" }}>
        <div className="modal-handle" />
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <div className="coach-av" style={(() => { const c = getAvatarColor(student.name || ""); return { background:c.bg, color:c.text }; })()}>{student.name?.slice(0,2)}</div>
          <div>
            <div className="modal-title" style={{ marginBottom:0 }}>{student.name} 的成長路徑</div>
            <div style={{ fontSize:fz(14), color:"var(--ink-3)" }}>{student.courseType || "—"}</div>
          </div>
        </div>
        {!j ? <div className="empty">載入中…</div> : (
          <>
            {canAdvance(j) && (
              <button className="btn btn-primary" style={{ width:"100%", padding:12, marginBottom:12 }} disabled={busy}
                onClick={() => run(() => advanceStage(student.uid, j), j.currentStage < 9 ? `已升到「${stageOf(j.currentStage + 1).name}」✦` : "恭喜完成全部旅程 ✦")}>
                {j.currentStage < 9 ? `✦ 確認升階到第 ${j.currentStage + 1} 階段「${stageOf(j.currentStage + 1).name}」` : "✦ 完成共創，正式成為星辰聯盟成員"}
              </button>
            )}
            <JourneyView journey={j} mode="coach" studentUid={student.uid} onChanged={changed} />

            <div className="sec-h">給學員這個階段的提醒</div>
            <textarea className="input-field" rows={2} placeholder="例：先把目標受眾縮小到一種人，再寫定位宣言" value={note} onChange={e => setNote(e.target.value)} />
            <button className="btn btn-sm" disabled={busy || note === (j.coachNote?.[j.currentStage] || "")}
              onClick={() => run(() => setStageNote(student.uid, j.currentStage, note.trim()), "提醒已儲存")}>儲存提醒</button>

            <div className="sec-h">調整目前階段</div>
            <div style={{ fontSize:fz(14), color:"var(--ink-3)", marginBottom:8 }}>學員中途加入或已具備能力時使用；之前的階段會標記為「已具備」。</div>
            <div className="res-row">
              <select className="input-field" style={{ marginBottom:0 }} value={target} onChange={e => setTarget(e.target.value)}>
                <option value="">選擇階段…</option>
                {STAGES.map(s => <option key={s.n} value={s.n} disabled={s.n === j.currentStage}>{s.n}. {s.name}</option>)}
              </select>
              <button className="btn" disabled={!target || busy} onClick={() => run(() => setJourneyStage(student.uid, j, Number(target)), "階段已調整")}>套用</button>
            </div>
          </>
        )}
        <button className="btn" style={{ width:"100%", marginTop:14, border:"none", background:"none", color:"var(--ink-3)" }} onClick={onClose}>關閉</button>
        <Toast msg={toast} onDone={() => setToast("")} />
      </div>
    </div>
  );
}

/* 管理員：聯盟成長漏斗 */
function AllianceFunnel({ journeys, students, onOpen }) {
  const f = funnel(journeys);
  const stuck = stuckStudents(journeys, 30);
  const max = Math.max(1, ...f.map(x => x.count));
  const nameOf = (uid) => students.find(s => s.uid === uid)?.name || journeys.find(j => j.id === uid)?.studentName || "學員";
  const members = journeys.filter(j => j.currentStage === 9 && j.stages?.[9]?.completedAt).length;
  return (
    <>
      <div className="sec-h">聯盟成長漏斗</div>
      <div className="card" style={{ padding:"14px 16px" }}>
        {journeys.length === 0 ? <div className="empty" style={{ padding:12 }}>還沒有學員成長紀錄</div> : (
          <>
            {f.map(x => {
              const s = stageOf(x.n);
              return (
                <div key={x.n} className="fn-row">
                  <span className="fn-label">{x.n}. {s.name}</span>
                  <div className="fn-track">
                    <div className="fn-bar" style={{ width:`${(x.count / max) * 100}%`, background: s.color }} />
                  </div>
                  <span className="fn-n">{x.count}</span>
                  <span className="fn-days">{x.avgDays != null ? `平均 ${x.avgDays} 天` : ""}</span>
                </div>
              );
            })}
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:fz(14), color:"var(--ink-3)", marginTop:10, paddingTop:10, borderTop:"1px solid var(--cream-3)" }}>
              <span>共 {journeys.length} 位學員</span>
              <span>已成為聯盟成員 <b style={{ color:"var(--gold)" }}>{members}</b> 位</span>
            </div>
          </>
        )}
      </div>
      {stuck.length > 0 && (
        <div className="alert-card" style={{ background:"#FEF3D0", borderColor:"rgba(138,104,32,.25)" }}>
          <div style={{ fontSize:fz(16), fontWeight:700, color:"#8A6820", marginBottom:6 }}>{stuck.length} 位學員在同一階段超過 30 天</div>
          {stuck.slice(0, 5).map(j => (
            <button key={j.id} className="fn-stuck" onClick={() => onOpen({ uid: j.id, name: nameOf(j.id), courseType: students.find(s => s.uid === j.id)?.courseType })}>
              <span>{nameOf(j.id)}</span><span>{stageOf(j.currentStage).name} · {j.days} 天 →</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════
   排課行事曆：共用元件
════════════════════════════════════════ */
function StatusPill({ status }) {
  const st = SESSION_STATUS[status] || SESSION_STATUS.pending;
  return (
    <span className="status-pill" style={{ background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>
      {st.label}
    </span>
  );
}

function Toast({ msg, onDone }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [msg]);
  return msg ? <div className="toast">{msg}</div> : null;
}

/* ── 月曆 ── */
function ScheduleCalendar({ sessions, selected, onSelect }) {
  const sel = parseDateStr(selected || todayStr());
  const [ym, setYm] = useState({ y: sel.getFullYear(), m: sel.getMonth() });
  const today = todayStr();
  const cells = buildMonthGrid(ym.y, ym.m);

  // 每天最多顯示 3 個狀態點（依狀態去重）
  const dotsByDate = {};
  sessions.forEach(s => {
    const arr = dotsByDate[s.date] || (dotsByDate[s.date] = []);
    if (!arr.includes(s.status)) arr.push(s.status);
  });

  const shift = (n) => setYm(({ y, m }) => {
    const d = new Date(y, m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="cal-nav" onClick={() => shift(-1)} aria-label="上個月">‹</button>
        <div style={{ textAlign:"center" }}>
          <div className="cal-title">{ym.y} 年 {ym.m + 1} 月</div>
          <button style={{ border:"none", background:"none", fontFamily:"var(--font)", fontSize:fz(13), color:"var(--gold)", cursor:"pointer" }}
            onClick={() => { const t = new Date(); setYm({ y:t.getFullYear(), m:t.getMonth() }); onSelect(today); }}>
            回到今天
          </button>
        </div>
        <button className="cal-nav" onClick={() => shift(1)} aria-label="下個月">›</button>
      </div>
      <div className="cal-wk">{["日","一","二","三","四","五","六"].map(w => <div key={w}>{w}</div>)}</div>
      <div className="cal-grid">
        {cells.map(c => {
          const cls = ["cal-day",
            !c.inMonth && "out",
            c.date < today && "past",
            c.date === today && "today",
            c.date === selected && "sel"].filter(Boolean).join(" ");
          const dots = (dotsByDate[c.date] || []).slice(0, 3);
          return (
            <button key={c.date} className={cls} onClick={() => onSelect(c.date)}>
              <span className="cal-num">{c.day}</span>
              <span className="cal-dots">
                {dots.map(st => <span key={st} className="cal-dot" style={{ background: SESSION_STATUS[st]?.color || "var(--ink-4)" }} />)}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginTop:10, paddingTop:10, borderTop:"1px solid var(--cream-3)" }}>
        {["open","pending","confirmed","reschedule"].map(k => (
          <span key={k} style={{ display:"flex", alignItems:"center", gap:5, fontSize:fz(13), color:"var(--ink-3)" }}>
            <span className="cal-dot" style={{ background: SESSION_STATUS[k].color }} />{SESSION_STATUS[k].label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 單一課程時段卡片 ── */
function SessionItem({ s, viewer, onOpen, showDate }) {
  const color = getCoachModuleColor(s.coachId || "");
  const who = viewer === "student"
    ? `教練 ${s.coachName || "—"}`
    : s.status === "open" ? "開放給學員預約" : `學員 ${s.studentName || "—"}`;
  const extra = viewer === "admin" ? ` · 教練 ${s.coachName || "—"}` : "";
  return (
    <button className={"sess" + (isPast(s) ? " past" : "")} style={{ borderLeft:`3px solid ${color.border}` }} onClick={() => onOpen(s)}>
      <div className="sess-time">
        {showDate && <div className="sess-date">{relativeDayLabel(s.date)}</div>}
        <div className="sess-start">{s.start}</div>
        <div className="sess-end">{s.end}</div>
      </div>
      <div className="sess-body">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <div className="sess-title">{s.moduleTitle || "一對一課程"}</div>
          {s.status === "confirmed" && attendanceState(s) !== "upcoming" ? <AttendBadge s={s} /> : <StatusPill status={s.status} />}
        </div>
        <div className="sess-meta">{who}{extra} · {s.method || "線上"}{s.recorded ? " · 已記錄" : ""}{s.photoCount ? ` · 📷 ${s.photoCount}` : ""}</div>
      </div>
    </button>
  );
}

/* ════════════════════════════════════════
   出席：簽到／上課證明／簽退
════════════════════════════════════════ */
function AttendBadge({ s, now }) {
  const st = attendanceState(s, now);
  const a = ATTEND[st];
  if (!a || st === "upcoming") return null;
  return (
    <span className="attend-pill" style={{ background:a.bg, color:a.color }}>
      {st === "done" ? `✓ ${formatMinutes(deliveredMinutes(s))}` : a.label}
    </span>
  );
}

// 上課照片：盡量保留清晰度，但每張壓在 Firestore 單筆 1MB 以內
async function compressPhoto(file) {
  const im = await loadImage(await readAsDataUrl(file));
  const draw = (max, q) => {
    const k = Math.min(1, max / Math.max(im.width, im.height));
    const c = document.createElement("canvas");
    c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", q);
  };
  let data = "";
  for (const [max, q] of [[1600, .8], [1280, .72], [1024, .65], [800, .6]]) {
    data = draw(max, q);
    if (data.length < 900000) break;
  }
  return { data, thumb: draw(320, .7), size: Math.round((data.length - data.indexOf(",") - 1) * 0.75) };
}

function AttendancePanel({ s, viewer, onUpdated, onWriteRecord }) {
  const { checkInSession, checkOutSession, fetchSessionPhotos, addSessionPhoto, deleteSessionPhoto } = useAuth();
  const [now,     setNow]     = useState(new Date());
  const [photos,  setPhotos]  = useState([]);
  const [busy,    setBusy]    = useState("");
  const [err,     setErr]     = useState("");
  const [summary, setSummary] = useState("");
  const [view,    setView]    = useState(null);
  const [armed,   setArmed]   = useState("");
  const fileRef = useRef(null);
  const staff = viewer === "coach" || viewer === "admin";
  const st = attendanceState(s, now);
  const win = checkInWindow(s, now);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { fetchSessionPhotos(s.id).then(setPhotos).catch(() => {}); }, [s.id, s.photoCount]);

  const act = async (key, fn, msg) => {
    setBusy(key); setErr("");
    const res = await fn();
    setBusy("");
    if (res?.success === false) { setErr("操作失敗，請再試一次。" + (/permission/i.test(res.error || "") ? "（沒有權限）" : "")); return false; }
    await onUpdated?.(msg);
    return true;
  };

  const upload = async (files) => {
    const list = [...(files || [])].filter(f => /^image\//.test(f.type));
    if (!list.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) { setErr(`每堂課最多 ${MAX_PHOTOS} 張照片`); return; }
    setBusy("photo"); setErr("");
    let count = photos.length, failed = 0;
    for (const f of list.slice(0, room)) {
      try {
        const p = await compressPhoto(f);
        const res = await addSessionPhoto(s.id, { ...p, name: f.name }, count + 1);
        if (res.success) count++; else failed++;
      } catch { failed++; }
    }
    setBusy("");
    if (failed) setErr(`有 ${failed} 張上傳失敗，請再試一次`);
    if (list.length > room) setErr(`每堂課最多 ${MAX_PHOTOS} 張，多的照片沒有上傳`);
    await onUpdated?.(`已上傳 ${count - photos.length} 張照片`);
    fetchSessionPhotos(s.id).then(setPhotos);
  };

  const removePhoto = async (p) => {
    if (armed !== p.id) { setArmed(p.id); setTimeout(() => setArmed(a => a === p.id ? "" : a), 3000); return; }
    setArmed("");
    await act("del" + p.id, () => deleteSessionPhoto(s.id, p.id, photos.length - 1), "照片已刪除");
    fetchSessionPhotos(s.id).then(setPhotos);
  };

  const who = s.checkIn ? (s.checkIn.role === "student" ? "學員本人簽到" : `${s.checkIn.byName || "教練"} 代簽`) : "";
  const dm = deliveredMinutes(s), sm = scheduledMinutes(s);
  const canEditPhotos = staff && s.checkIn && !s.checkOut;

  return (
    <div className="attend">
      <div className="attend-h">
        <span>出席與上課證明</span>
        {ATTEND[st] && <span className="attend-pill" style={{ background:ATTEND[st].bg, color:ATTEND[st].color }}>{ATTEND[st].label}</span>}
      </div>

      {/* 三個步驟 */}
      <div className="steps">
        <div className={"step" + (s.checkIn ? " ok" : "")}>
          <div className="step-dot">{s.checkIn ? "✓" : "1"}</div>
          <div className="step-body">
            <div className="step-t">簽到</div>
            <div className="step-s">{s.checkIn ? `${fmtClock(s.checkIn.at)} · ${who}` : st === "missed" ? "沒有簽到紀錄" : win === "open" ? (staff ? "已開放，等學員簽到" : "現在可以簽到") : `上課前 30 分鐘（${checkInOpensAt(s)}）開放簽到`}</div>
          </div>
        </div>
        <div className={"step" + (photos.length ? " ok" : "")}>
          <div className="step-dot">{photos.length ? "✓" : "2"}</div>
          <div className="step-body">
            <div className="step-t">上課證明</div>
            <div className="step-s">{photos.length ? `${photos.length} 張照片／截圖` : "教練上傳現場照片或線上截圖"}</div>
          </div>
        </div>
        <div className={"step" + (s.checkOut ? " ok" : "")}>
          <div className="step-dot">{s.checkOut ? "✓" : "3"}</div>
          <div className="step-body">
            <div className="step-t">簽退</div>
            <div className="step-s">
              {s.checkOut
                ? <>{fmtClock(s.checkOut.at)} · 實際上課 <b>{formatMinutes(dm)}</b>（排定 {formatMinutes(sm)}）{isShort(s) && <span style={{ color:"var(--rust)" }}> · 時數不足</span>}</>
                : "課程結束後由教練簽退"}
            </div>
          </div>
        </div>
      </div>

      {err && <div className="login-error" style={{ marginTop:10 }}>{err}</div>}

      {/* 照片 */}
      {(photos.length > 0 || canEditPhotos) && (
        <div className="ph-grid">
          {photos.map(p => (
            <div key={p.id} className="ph">
              <button className="ph-img" onClick={() => setView(p)} aria-label="放大照片"><img src={p.thumb || p.data} alt={p.name || "上課照片"} /></button>
              {canEditPhotos && (
                <button className={"ph-del" + (armed === p.id ? " armed" : "")} onClick={() => removePhoto(p)} aria-label="刪除照片">
                  {armed === p.id ? "確定刪除" : "✕"}
                </button>
              )}
            </div>
          ))}
          {canEditPhotos && photos.length < MAX_PHOTOS && (
            <button className="ph ph-add" onClick={() => fileRef.current?.click()} disabled={busy === "photo"}>
              <span style={{ fontSize:"calc(26px * var(--fs))" }}>{busy === "photo" ? "…" : "＋"}</span>
              <span>{busy === "photo" ? "上傳中" : "拍照／上傳"}</span>
            </button>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { upload(e.target.files); e.target.value = ""; }} />

      {s.checkOut?.summary && <div className="record-note" style={{ marginTop:10 }}><div className="record-note-label">課堂摘要</div>{s.checkOut.summary}</div>}

      {/* ── 學員 ── */}
      {viewer === "student" && win === "open" && (
        <button className="btn btn-primary btn-lg" style={{ width:"100%", marginTop:12 }} disabled={!!busy}
          onClick={() => act("in", () => checkInSession(s.id, "student"), "簽到成功 ✓")}>
          {busy === "in" ? "簽到中…" : "✦ 我到了，簽到"}
        </button>
      )}
      {viewer === "student" && st === "missed" && (
        <div className="hint">這堂課沒有簽到紀錄。如果你有出席，請聯絡教練補登。</div>
      )}

      {/* ── 教練／管理員 ── */}
      {staff && !s.checkIn && (st === "open" || st === "missed" || (st === "upcoming" && s.date === todayStr())) && (
        <button className="btn" style={{ width:"100%", marginTop:12 }} disabled={!!busy}
          onClick={() => act("in", () => checkInSession(s.id, viewer), "已代學員簽到")}>
          {busy === "in" ? "處理中…" : "代學員簽到（學員沒有手機時使用）"}
        </button>
      )}
      {staff && !s.checkIn && st !== "missed" && <div className="hint">學員可以在自己的 App 上簽到；代簽會標示為「教練代簽」並記錄實際時間。</div>}

      {canEditPhotos && (
        <>
          <div className="input-label" style={{ marginTop:14 }}>課堂摘要（選填，學員看得到）</div>
          <textarea className="input-field" rows={2} placeholder="例：完成定位一頁紙初稿，下次討論受眾輪廓" value={summary} onChange={e => setSummary(e.target.value)} />
          <button className="btn btn-primary btn-lg" style={{ width:"100%" }} disabled={!!busy || photos.length === 0}
            onClick={() => act("out", () => checkOutSession(s.id, summary.trim()), "已簽退，課程完成交付 ✓")}>
            {busy === "out" ? "簽退中…" : "簽退，完成這堂課"}
          </button>
          {photos.length === 0 && <div className="hint">請先上傳至少 1 張上課照片或線上截圖，才能簽退。</div>}
        </>
      )}

      {staff && s.checkOut && !s.recorded && onWriteRecord && (
        <button className="btn btn-gold" style={{ width:"100%", marginTop:12 }} onClick={() => onWriteRecord(s)}>✦ 接著填寫上課記錄與回饋</button>
      )}

      {view && (
        <div className="viewer" onClick={() => setView(null)}>
          <img src={view.data} alt={view.name || "上課照片"} />
          <div className="viewer-bar">
            <span>{view.addedBy} · {fmtDateTime(view.createdAt)}</span>
            <a href={view.data} download={(view.name || "photo").replace(/\.\w+$/, "") + ".jpg"} onClick={e => e.stopPropagation()}>下載</a>
            <span>點任意處關閉</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 上課時數報表（學員看自己；教練看自己的學員；管理員看全聯盟）── */
function HoursReport({ sessions, viewer, onOpen }) {
  const months = monthOptions(sessions);
  const [ym,    setYm]    = useState(months[0] || "");
  const [by,    setBy]    = useState("student");
  const [focus, setFocus] = useState("");
  const { from, to } = monthRange(ym);
  const inMonth = sessions.filter(s => inRange(s, from, to));
  const rows = summarize(inMonth, by);
  const tt = totals(rows);
  const keyOf = by === "coach" ? (s) => s.coachId : (s) => s.studentUid;
  const detail = deliveredList(inMonth).filter(s => !focus || keyOf(s) === focus);
  const pendingN = tt.missed + tt.needOut;

  const download = () => {
    const blob = new Blob([sessionsCsv(inMonth)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `iSTAR上課時數_${ym || "全部"}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <>
      <div className="filter-row">
        {months.map(m => (
          <button key={m} className={"filter-chip" + (ym === m ? " on" : "")} style={{ color: ym === m ? "var(--gold)" : "var(--ink-2)" }}
            onClick={() => { setYm(m); setFocus(""); }}>{Number(m.slice(5))} 月{m.slice(0, 4) !== todayStr().slice(0, 4) ? ` ${m.slice(0, 4)}` : ""}</button>
        ))}
        <button className={"filter-chip" + (!ym ? " on" : "")} style={{ color: !ym ? "var(--gold)" : "var(--ink-2)" }} onClick={() => { setYm(""); setFocus(""); }}>全部</button>
      </div>

      <div className="stats-grid">
        <div className="stat-tile"><div className="stat-num gold">{toHours(tt.deliveredMin)}</div><div className="stat-lbl">實際上課時數</div></div>
        <div className="stat-tile"><div className="stat-num">{tt.done}<span className="stat-of">／{tt.total}</span></div><div className="stat-lbl">完成交付堂數</div></div>
        <div className="stat-tile"><div className="stat-num" style={{ color:"var(--sage)" }}>{tt.total ? Math.round(tt.done / tt.total * 100) : 0}%</div><div className="stat-lbl">完整交付率</div></div>
        <div className="stat-tile"><div className="stat-num" style={{ color: pendingN ? "var(--rust)" : "var(--ink-3)" }}>{pendingN}</div><div className="stat-lbl">待補登堂數</div></div>
      </div>

      {viewer !== "student" && (
        <>
          {viewer === "admin" && (
            <div className="seg">
              <button className={by === "student" ? "on" : ""} onClick={() => { setBy("student"); setFocus(""); }}>依學員</button>
              <button className={by === "coach" ? "on" : ""} onClick={() => { setBy("coach"); setFocus(""); }}>依教練</button>
            </div>
          )}
          {rows.length > 0 && (
            <div className="card" style={{ padding:"4px 14px" }}>
              {rows.map(r => (
                <button key={r.key} className={"hr-row" + (focus === r.key ? " on" : "")} onClick={() => setFocus(f => f === r.key ? "" : r.key)}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="hr-name">{r.name}</div>
                    <div className="hr-sub">完成 {r.done}／{r.total} 堂{r.missed ? ` · 未簽到 ${r.missed}` : ""}{r.needOut ? ` · 待簽退 ${r.needOut}` : ""}</div>
                    <div className="prog-track" style={{ marginTop:6 }}><div className="prog-fill" style={{ width:`${r.rate}%`, background: r.rate === 100 ? "var(--sage)" : "var(--gold)" }} /></div>
                  </div>
                  <div className="hr-h">{toHours(r.deliveredMin)}<span>小時</span></div>
                </button>
              ))}
            </div>
          )}
          <button className="btn" style={{ width:"100%", marginBottom:6 }} onClick={download} disabled={!detail.length && !rows.length}>⬇ 匯出 CSV（可用 Excel 開啟）</button>
        </>
      )}

      <div className="sec-h">{focus ? `${rows.find(r => r.key === focus)?.name || ""} 的上課明細` : "上課明細"}{focus && <button className="link-btn" onClick={() => setFocus("")}>顯示全部</button>}</div>
      {detail.length === 0
        ? <div className="card empty">這段期間還沒有上過的課</div>
        : detail.map(s => (
          <button key={s.id} className="sess" onClick={() => onOpen(s)} style={{ borderLeft:`3px solid ${ATTEND[attendanceState(s)]?.color || "var(--cream-4)"}` }}>
            <div className="sess-time">
              <div className="sess-date">{formatDateLabel(s.date)}</div>
              <div className="sess-start">{s.start}</div>
            </div>
            <div className="sess-body">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                <div className="sess-title">{s.moduleTitle || "一對一課程"}</div>
                <AttendBadge s={s} />
              </div>
              <div className="sess-meta">{viewer === "student" ? `教練 ${s.coachName || "—"}` : viewer === "coach" ? `學員 ${s.studentName || "—"}` : `${s.studentName || "—"} · 教練 ${s.coachName || "—"}`}</div>
              <div className="sess-meta">
                {s.checkIn ? `簽到 ${fmtClock(s.checkIn.at)}` : "未簽到"}{s.checkOut ? ` · 簽退 ${fmtClock(s.checkOut.at)}` : ""}{s.photoCount ? ` · 📷 ${s.photoCount}` : ""}
              </div>
            </div>
          </button>
        ))}
    </>
  );
}

/* ── 課程時段詳情（依角色顯示不同操作）── */
function SessionSheet({ s: initial, viewer, onClose, onChanged, onEdit, onWriteRecord }) {
  const { confirmSession, requestReschedule, bookOpenSession, deleteSession, fetchSession } = useAuth();
  // 簽到、上傳照片、簽退後留在這個畫面並顯示最新資料
  const [s, setS] = useState(initial);
  const reload = async (msg) => {
    const fresh = await fetchSession(s.id);
    if (fresh) setS(fresh);
    onChanged?.(msg, { keepOpen: true });
  };
  const [agree,     setAgree]     = useState(false);
  const [askChange, setAskChange] = useState(false);
  const [note,      setNote]      = useState("");
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const past = isPast(s);
  const isLink = /^https?:\/\//i.test(s.location || "");

  const run = async (fn, okMsg) => {
    setBusy(true); setError("");
    const res = await fn();
    setBusy(false);
    if (res.success) { onChanged(okMsg); onClose(); }
    else setError(res.error && res.error.length < 60 ? res.error : "操作失敗，請再試一次。");
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:14 }}>
          <div>
            <div style={{ fontSize:fz(14), color:"var(--gold)", fontWeight:700, letterSpacing:".02em" }}>
              {relativeDayLabel(s.date)} · {formatDateLabel(s.date)}
            </div>
            <div className="modal-title" style={{ marginBottom:0, marginTop:4 }}>{s.moduleTitle || "一對一課程"}</div>
          </div>
          <StatusPill status={s.status} />
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="card" style={{ padding:"4px 16px", marginBottom:14 }}>
          <div className="detail-line"><span className="k">時間</span><span className="v">{s.start} – {s.end}（{toMinutes(s.end) - toMinutes(s.start)} 分鐘）</span></div>
          <div className="detail-line"><span className="k">教練</span><span className="v">{s.coachName || "—"}</span></div>
          {s.status !== "open" && <div className="detail-line"><span className="k">學員</span><span className="v">{s.studentName || "—"}</span></div>}
          <div className="detail-line"><span className="k">方式</span><span className="v">{s.method || "線上"}</span></div>
          {s.location && (
            <div className="detail-line"><span className="k">{isLink ? "連結" : "地點"}</span>
              <span className="v">{isLink ? <a href={s.location} target="_blank" rel="noopener noreferrer" style={{ color:"var(--slate)" }}>{s.location}</a> : s.location}</span>
            </div>
          )}
          {s.note && <div className="detail-line"><span className="k">備註</span><span className="v">{s.note}</span></div>}
        </div>

        {/* 學員提出的改期原因（教練與學員都看得到） */}
        {s.status === "reschedule" && (
          <div className="alert-card" style={{ background:"var(--rust-pale)", borderColor:"rgba(139,58,42,.2)" }}>
            <div style={{ fontSize:fz(14), fontWeight:700, color:"var(--rust)", letterSpacing:".02em" }}>學員請求改期</div>
            <div style={{ fontSize:fz(16), color:"var(--ink-2)", marginTop:4, lineHeight:1.6 }}>
              {s.studentNote || "（未填寫原因）"}
            </div>
            {viewer === "student" && <div style={{ fontSize:fz(14), color:"var(--ink-3)", marginTop:6 }}>已通知教練，等待重新安排時間。</div>}
          </div>
        )}

        {/* ── 學員操作 ── */}
        {viewer === "student" && s.status === "pending" && !past && !askChange && (
          <>
            <button className={"check-row" + (agree ? " on" : "")} onClick={() => setAgree(a => !a)}>
              <span className="check-box">{agree && <IcCheck />}</span>
              <span>確認課程時間：我可以在此時段準時出席</span>
            </button>
            <button className="btn btn-primary" style={{ width:"100%", padding:12 }} disabled={!agree || busy}
              onClick={() => run(() => confirmSession(s.id), "已確認，課程已排定 ✓")}>
              {busy ? "處理中…" : "✦ 確認課程時間"}
            </button>
            <button className="btn" style={{ width:"100%", marginTop:8, color:"var(--ink-3)" }} onClick={() => setAskChange(true)}>
              這個時間不行？請求改期
            </button>
          </>
        )}
        {viewer === "student" && askChange && (
          <>
            <div className="input-label">告訴教練原因或你方便的時間</div>
            <textarea className="input-field" rows={3} placeholder="例：當天要出差，週四晚上或週六下午可以" value={note} onChange={e => setNote(e.target.value)} />
            <div className="btn-row" style={{ marginTop:0 }}>
              <button className="btn" onClick={() => setAskChange(false)}>返回</button>
              <button className="btn btn-primary" disabled={busy || !note.trim()}
                onClick={() => run(() => requestReschedule(s.id, note.trim()), "已送出改期請求")}>送出</button>
            </div>
          </>
        )}
        {viewer === "student" && s.status === "open" && !past && (
          <button className="btn btn-primary" style={{ width:"100%", padding:12 }} disabled={busy}
            onClick={() => run(() => bookOpenSession(s.id), "預約成功，課程已排定 ✓")}>
            {busy ? "預約中…" : "✦ 預約此時段"}
          </button>
        )}
        {viewer === "student" && s.status === "confirmed" && !past && (
          <div className="btn-row" style={{ marginTop:0 }}>
            <a className="btn" href={googleCalendarUrl(s)} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>加入 Google 行事曆</a>
            {isLink && <a className="btn btn-primary" href={s.location} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>進入線上教室</a>}
          </div>
        )}

        {/* ── 出席與上課證明（已排定的課）── */}
        {s.status === "confirmed" && s.studentUid && (
          <AttendancePanel s={s} viewer={viewer} onUpdated={reload} onWriteRecord={onWriteRecord} />
        )}

        {/* ── 教練操作 ── */}
        {viewer === "coach" && !confirmDel && (
          <>
            {past && s.studentUid && s.status === "confirmed" && !s.recorded && !s.checkOut && onWriteRecord && (
              <button className="btn" style={{ width:"100%", marginTop:10 }} onClick={() => onWriteRecord(s)}>
                填寫這堂課的上課記錄
              </button>
            )}
            <div className="btn-row">
              {!s.checkIn && onEdit && <button className="btn" onClick={() => onEdit(s)}>{s.status === "reschedule" ? "重新安排時間" : "編輯時段"}</button>}
              {!s.checkIn && (
                <button className="btn" style={{ color:"var(--rust)", borderColor:"rgba(139,58,42,.2)", background:"var(--rust-pale)" }}
                  onClick={() => setConfirmDel(true)}>{past ? "刪除" : "取消課程"}</button>
              )}
            </div>
            {s.checkIn && <div className="hint" style={{ textAlign:"center" }}>已簽到的課程是交付紀錄，無法修改或刪除；如需更正請聯絡管理員。</div>}
          </>
        )}
        {(viewer === "admin" && !confirmDel) && (
          <button className="btn" style={{ width:"100%", color:"var(--rust)", borderColor:"rgba(139,58,42,.2)", background:"var(--rust-pale)" }}
            onClick={() => setConfirmDel(true)}>刪除此時段</button>
        )}
        {confirmDel && (
          <div className="alert-card" style={{ background:"var(--rust-pale)", borderColor:"rgba(139,58,42,.2)", marginBottom:0 }}>
            <div style={{ fontSize:fz(16), color:"var(--ink-2)", marginBottom:10 }}>確定要{past ? "刪除" : "取消"}這個時段嗎？學員端也會一併移除。</div>
            <div className="btn-row" style={{ marginTop:0 }}>
              <button className="btn" onClick={() => setConfirmDel(false)}>返回</button>
              <button className="btn" style={{ background:"var(--rust)", color:"#fff", borderColor:"var(--rust)" }} disabled={busy}
                onClick={() => run(() => deleteSession(s.id, s), "時段已移除")}>確認</button>
            </div>
          </div>
        )}

        <button className="btn" style={{ width:"100%", marginTop:10, border:"none", background:"none", color:"var(--ink-3)" }} onClick={onClose}>關閉</button>
      </div>
    </div>
  );
}

/* ── 教練：新增 / 編輯排課 ── */
const DURATIONS = [[60,"1 小時"],[90,"1.5 小時"],[120,"2 小時"],[180,"3 小時"]];
const REPEATS   = [[1,"單次"],[4,"每週 ×4"],[8,"每週 ×8"],[12,"每週 ×12"]];

function ModalSession({ editData, defaultDate, coachSessions, onClose }) {
  const { profile, fetchMembers, fetchModules, fetchAssignment, fetchSessions, addSessions, updateSession } = useAuth();
  const isEdit = !!editData;
  const [students,  setStudents]  = useState([]);
  const [myModules, setMyModules] = useState([]);
  const [assignedIds, setAssignedIds] = useState([]);
  const [studentSessions, setStudentSessions] = useState([]);
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState("");
  const [ackConflict, setAckConflict] = useState(false);

  const startDate = defaultDate && defaultDate >= todayStr() ? defaultDate : todayStr();
  const [form, setForm] = useState({
    mode:       editData ? (editData.status === "open" ? "open" : "assign") : "assign",
    studentUid: editData?.studentUid || "",
    moduleId:   editData?.moduleId   || "",
    date:       editData?.date       || startDate,
    start:      editData?.start      || "19:00",
    end:        editData?.end        || "21:00",
    method:     editData?.method     || "線上",
    location:   editData?.location   || "",
    note:       editData?.note       || "",
    repeat:     1,
  });
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setAckConflict(false); };

  useEffect(() => {
    fetchMembers().then(all => setStudents(all.filter(m => m.role === "student"))).catch(() => {});
    fetchModules().then(all => setMyModules(all.filter(m => m.coachId === profile?.uid))).catch(() => {});
  }, [profile?.uid]);

  // 選了學員 → 載入該學員已分配的模組（排在最前面）與他的其他課程（檢查衝堂）
  useEffect(() => {
    if (!form.studentUid || form.mode !== "assign") { setAssignedIds([]); setStudentSessions([]); return; }
    fetchAssignment(form.studentUid).then(setAssignedIds).catch(() => {});
    fetchSessions({ studentUid: form.studentUid }).then(setStudentSessions).catch(() => {});
  }, [form.studentUid, form.mode]);

  const duration = toMinutes(form.end) - toMinutes(form.start);
  const setDuration = (min) => set("end", fromMinutes(toMinutes(form.start) + min));

  const sortedModules = [...myModules].sort((a, b) =>
    (assignedIds.includes(b.id) ? 1 : 0) - (assignedIds.includes(a.id) ? 1 : 0));

  const dates = isEdit ? [form.date] : repeatDates(form.date, form.repeat);
  const pool  = [...coachSessions, ...studentSessions.filter(x => !coachSessions.find(c => c.id === x.id))];
  const conflicts = dates.flatMap(d => findConflicts(
    { date:d, start:form.start, end:form.end, coachId:profile?.uid, studentUid: form.mode === "assign" ? form.studentUid : "" },
    pool, editData?.id));

  const handleSave = async () => {
    const msg = validateSession(form);
    if (msg) { setError(msg); return; }
    if (conflicts.length && !ackConflict) { setAckConflict(true); setError(""); return; }
    setBusy(true); setError("");
    const student = students.find(s => s.uid === form.studentUid);
    const mod     = myModules.find(m => m.id === form.moduleId);
    const base = {
      studentUid:  form.mode === "assign" ? form.studentUid : "",
      studentName: form.mode === "assign" ? (student?.name || "") : "",
      moduleId:    form.moduleId || "",
      moduleTitle: mod?.title || "",
      start: form.start, end: form.end,
      method: form.method, location: form.location.trim(), note: form.note.trim(),
    };
    let res;
    if (isEdit) {
      const changedTime = form.date !== editData.date || form.start !== editData.start || form.end !== editData.end;
      const changedStudent = base.studentUid !== (editData.studentUid || "");
      let status = editData.status;
      if (form.mode === "open") status = changedStudent || editData.status !== "open" ? "open" : editData.status;
      // 時間或學員有變動 → 需要學員重新確認
      else if (editData.status === "open" || changedTime || changedStudent || editData.status === "reschedule") status = "pending";
      res = await updateSession(editData.id, { ...base, date: form.date, status, studentNote: status === "pending" ? "" : (editData.studentNote || "") });
      if (res.success && status === "pending" && base.studentUid) notify("session_updated", { id: editData.id });
    } else {
      const seriesId = dates.length > 1 ? `s${Date.now()}` : "";
      res = await addSessions(dates.map(d => ({
        ...base, date: d, seriesId,
        status: form.mode === "assign" ? "pending" : "open",
        studentNote: "",
      })));
    }
    setBusy(false);
    if (res.success) onClose(true, isEdit ? "時段已更新" : dates.length > 1 ? `已建立 ${dates.length} 堂課` : "已建立時段");
    else setError("儲存失敗，請再試一次。");
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(false); }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">{isEdit ? "編輯時段" : "新增排課"}</div>

        <div className="seg">
          <button className={form.mode === "assign" ? "on" : ""} onClick={() => set("mode", "assign")}>指定學員</button>
          <button className={form.mode === "open" ? "on" : ""} onClick={() => set("mode", "open")}>開放預約時段</button>
        </div>
        <div style={{ fontSize:fz(14), color:"var(--ink-3)", marginTop:-6, marginBottom:14, lineHeight:1.6 }}>
          {form.mode === "assign"
            ? "排給指定學員，狀態為「待確認」，學員確認後變成「已排定」。"
            : "開放給學員自行預約，狀態為「可預約」，學員預約後直接「已排定」。"}
        </div>

        {error && <div className="login-error">{error}</div>}

        {form.mode === "assign" && (
          <>
            <div className="input-label">學員 *</div>
            {students.length === 0
              ? <div style={{ fontSize:fz(15), color:"var(--ink-3)", marginBottom:12 }}>尚無學員，請管理員先新增學員。</div>
              : <div className="chip-group">
                  {students.map(st => (
                    <div key={st.uid} className={"chip" + (form.studentUid === st.uid ? " sel" : "")} onClick={() => set("studentUid", st.uid)}>{st.name}</div>
                  ))}
                </div>}
          </>
        )}

        <div className="input-label">課程模組</div>
        <select className="input-field" value={form.moduleId} onChange={e => set("moduleId", e.target.value)}>
          <option value="">一對一課程（不指定模組）</option>
          {sortedModules.map(m => (
            <option key={m.id} value={m.id}>{assignedIds.includes(m.id) ? "★ " : ""}{m.title}</option>
          ))}
        </select>
        {myModules.length === 0 && <div style={{ fontSize:fz(14), color:"var(--ink-4)", marginTop:-6, marginBottom:10 }}>你還沒有課程模組，可先到「模組」新增。</div>}
        {assignedIds.length > 0 && <div style={{ fontSize:fz(14), color:"var(--ink-4)", marginTop:-6, marginBottom:10 }}>★ 為已分配給此學員的模組</div>}

        <div className="input-label">日期 *</div>
        <input className="input-field" type="date" min={todayStr()} value={form.date} onChange={e => set("date", e.target.value)} />

        <div className="input-label">時間 *</div>
        <div className="time-row">
          <input className="input-field" type="time" step="900" value={form.start}
            onChange={e => { const st = e.target.value; setForm(f => ({ ...f, start: st, end: fromMinutes(toMinutes(st) + Math.max(duration, 30)) })); setAckConflict(false); }} />
          <span style={{ color:"var(--ink-4)", marginBottom:10 }}>–</span>
          <input className="input-field" type="time" step="900" value={form.end} onChange={e => set("end", e.target.value)} />
        </div>
        <div className="chip-group">
          {DURATIONS.map(([min, label]) => (
            <div key={min} className={"chip" + (duration === min ? " sel" : "")} onClick={() => setDuration(min)}>{label}</div>
          ))}
        </div>

        {!isEdit && (
          <>
            <div className="input-label">重複</div>
            <div className="chip-group">
              {REPEATS.map(([n, label]) => (
                <div key={n} className={"chip" + (form.repeat === n ? " sel" : "")} onClick={() => set("repeat", n)}>{label}</div>
              ))}
            </div>
            {form.repeat > 1 && (
              <div style={{ fontSize:fz(14), color:"var(--ink-3)", marginTop:-4, marginBottom:12 }}>
                將建立 {form.repeat} 堂：每週{weekdayLabel(form.date)} {form.start}，從 {formatDateLabel(form.date)} 到 {formatDateLabel(dates[dates.length - 1])}
              </div>
            )}
          </>
        )}

        <div className="input-label">上課方式</div>
        <div className="chip-group">
          {["線上","實體"].map(m => <div key={m} className={"chip" + (form.method === m ? " sel" : "")} onClick={() => set("method", m)}>{m}</div>)}
        </div>
        <div className="input-label">{form.method === "線上" ? "線上教室連結" : "上課地點"}</div>
        <input className="input-field" placeholder={form.method === "線上" ? "https://meet.google.com/..." : "例：台北市信義區…"} value={form.location} onChange={e => set("location", e.target.value)} />

        <div className="input-label">給學員的備註（選填）</div>
        <textarea className="input-field" rows={2} placeholder="例：請先完成上週的定位練習" value={form.note} onChange={e => set("note", e.target.value)} />

        {conflicts.length > 0 && (
          <div className="alert-card" style={{ background:"#FEF3D0", borderColor:"rgba(138,104,32,.25)" }}>
            <div style={{ fontSize:fz(15), fontWeight:700, color:"#8A6820" }}>⚠ 有 {conflicts.length} 個時段衝堂</div>
            {conflicts.slice(0, 3).map(c => (
              <div key={c.id + c.date} style={{ fontSize:fz(14), color:"var(--ink-2)", marginTop:4 }}>
                {formatDateLabel(c.date)} {c.start}–{c.end} · {c.moduleTitle || "一對一課程"} · {c.coachId === profile?.uid ? (c.studentName || "開放時段") : `${c.coachName} 教練的課`}
              </div>
            ))}
            {ackConflict && <div style={{ fontSize:fz(14), color:"#8A6820", marginTop:6 }}>再按一次「仍要排課」即可建立。</div>}
          </div>
        )}

        <div className="btn-row">
          <button className="btn" onClick={() => onClose(false)}>取消</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={busy}>
            {busy ? "儲存中…" : ackConflict ? "仍要排課" : isEdit ? "✦ 儲存變更" : form.mode === "assign" ? "✦ 送出給學員確認" : "✦ 開放預約"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 選定日期的課程清單 + 接下來的課程 ── */
function DayAgenda({ sessions, selected, viewer, onOpen, emptyHint }) {
  const today = todayStr();
  const daySessions = sortSessions(sessions.filter(s => s.date === selected));
  const upcoming = sortSessions(sessions.filter(s => s.date > selected && s.date >= today)).slice(0, 5);
  return (
    <>
      <div className="sec-h">{relativeDayLabel(selected)}{selected !== today && relativeDayLabel(selected) === formatDateLabel(selected) ? "" : ` · ${formatDateLabel(selected)}`}</div>
      {daySessions.length === 0
        ? <div className="card empty" style={{ padding:"18px 12px" }}>{emptyHint || "這天沒有課程"}</div>
        : daySessions.map(s => <SessionItem key={s.id} s={s} viewer={viewer} onOpen={onOpen} />)}
      {upcoming.length > 0 && (
        <>
          <div className="sec-h">接下來</div>
          {upcoming.map(s => <SessionItem key={s.id} s={s} viewer={viewer} onOpen={onOpen} showDate />)}
        </>
      )}
    </>
  );
}

/* ════════════════════════════════════════
   STUDENT SCREENS
════════════════════════════════════════ */
const S_TABS = [
  { key:"home",     label:"首頁", Icon:IcHome },
  { key:"courses",  label:"課程", Icon:IcGrid },
  { key:"growth",   label:"路徑", Icon:IcPath },
  { key:"feedback", label:"反饋", Icon:IcMsg  },
];

/* 學員首頁最上方：今天的課 → 一鍵簽到 */
function TodayClassCard({ s, onOpen, onCheckedIn }) {
  const { checkInSession } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");
  const [now,  setNow]  = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const st = attendanceState(s, now);
  const go = async () => {
    setBusy(true); setErr("");
    const r = await checkInSession(s.id, "student");
    setBusy(false);
    if (r.success) onCheckedIn?.(); else setErr("簽到失敗，請再試一次。");
  };
  const isLink = /^https?:\/\//i.test(s.location || "");
  return (
    <div className={"today-card st-" + st}>
      <button className="today-main" onClick={() => onOpen(s)}>
        <div className="today-k">{s.date === todayStr() ? "今天的課" : relativeDayLabel(s.date)} · {s.start}–{s.end}</div>
        <div className="today-t">{s.moduleTitle || "一對一課程"}</div>
        <div className="today-m">教練 {s.coachName || "—"} · {s.method || "線上"}{s.location && !isLink ? ` · ${s.location}` : ""}</div>
      </button>
      {err && <div className="login-error" style={{ margin:"10px 0 0" }}>{err}</div>}
      {st === "open" && (
        <button className="btn btn-primary btn-lg" style={{ width:"100%", marginTop:12 }} disabled={busy} onClick={go}>
          {busy ? "簽到中…" : "✦ 我到了，簽到"}
        </button>
      )}
      {st === "upcoming" && <div className="today-note">⏰ {checkInOpensAt(s)} 開放簽到（上課前 30 分鐘）</div>}
      {st === "inClass"  && <div className="today-note ok">✓ 已於 {fmtClock(s.checkIn.at)} 簽到，上課中</div>}
      {st === "needOut"  && <div className="today-note ok">✓ 已簽到，等教練簽退完成這堂課</div>}
      {st === "done"     && <div className="today-note ok">✓ 已完成，本堂上課 {formatMinutes(deliveredMinutes(s))}</div>}
      {isLink && (st === "open" || st === "inClass" || st === "upcoming") && (
        <a className="btn" href={s.location} target="_blank" rel="noopener noreferrer" style={{ width:"100%", marginTop:8, textDecoration:"none" }}>進入線上教室 ↗</a>
      )}
    </div>
  );
}

function SHome({ onSwitch }) {
  const { profile, fetchRecords, fetchAssignment, fetchModules, fetchSessions, fetchJourney } = useAuth();
  const [journey, setJourney] = useState(null);
  const [todayList, setTodayList] = useState([]);
  const [sheet,     setSheet]     = useState(null);
  const [toast,     setToast]     = useState("");
  const [refresh,   setRefresh]   = useState(0);
  const name       = profile?.name || "同學";
  const [pendingCount, setPendingCount] = useState(0);
  const [nextSession,  setNextSession]  = useState(null);
  const [openCount,    setOpenCount]    = useState(0);
  const courseType = profile?.courseType || "";
  const coachName  = profile?.coachName  || "";
  const [latestFeedback, setLatestFeedback] = useState(null);
  const [nextModule,     setNextModule]     = useState(null);

  useEffect(() => {
    if (!profile?.uid) return;
    // 載入最新教練回饋
    fetchRecords(profile.uid).then(records => {
      const visible = records
        .filter(r => r.visibleStudent && r.feedback)
        .sort((a,b) => (b.date||"").localeCompare(a.date||""));
      if (visible.length) setLatestFeedback(visible[0]);
    }).catch(() => {});
    // 載入課表：待確認數量、下一堂已排定的課、可預約時段
    fetchSessions({ studentUid: profile.uid }).then(list => {
      const future = sortSessions(list.filter(s => !isPast(s)));
      setPendingCount(future.filter(s => s.status === "pending").length);
      // 今天已排定的課（含剛下課、還在補簽到時間內的）放最上面
      const today = sortSessions(list.filter(s => s.status === "confirmed" && s.date === todayStr()));
      setTodayList(today);
      setNextSession(future.find(s => s.status === "confirmed" && s.date !== todayStr()) || null);
    }).catch(() => {});
    fetchSessions({ status: "open" }).then(list => setOpenCount(list.filter(s => !isPast(s)).length)).catch(() => {});
    // 成長路徑
    fetchJourney(profile.uid).then(setJourney).catch(() => {});
    // 載入下一個待完成模組
    fetchAssignment(profile.uid).then(async (ids) => {
      if (!ids.length) return;
      const mods = await fetchModules();
      const assigned = mods.filter(m => ids.includes(m.id) && m.status !== "hidden");
      if (assigned.length) setNextModule(assigned[0]);
    }).catch(() => {});
  }, [profile?.uid, refresh]);

  // 計算問候語
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "早安" : hour < 18 ? "午安" : "晚安";

  // 學員實際的成長階段（還沒建立時依課程班別預估）
  const j = journey || (profile ? initialJourney(profile) : null);
  const currentStage = j ? stageOf(j.currentStage) : null;
  const stageProg = j ? stageProgress(j, j.currentStage) : null;

  return (
    <div className="screen-enter">
      <div className="content">

        {/* ── 今天的課：簽到是上課當下唯一要做的事，放最上面 ── */}
        {todayList.filter(s => attendanceState(s) !== "missed").map(s => (
          <TodayClassCard key={s.id} s={s} onOpen={setSheet}
            onCheckedIn={() => { setToast("簽到成功 ✓"); setRefresh(r => r + 1); }} />
        ))}

        <PushPrompt />

        {/* ── 問候卡（升級版：顯示當前成長階段）── */}
        <div className="card-gold" style={{ marginBottom:12 }}>
          <div className="greeting-name">{greeting}，{name} <span style={{ fontSize:fz(20) }}>✦</span></div>
          <div className="greeting-sub" style={{ marginTop:5 }}>
            {courseType ? courseType : "你的旅程正在前進"}
          </div>
          {currentStage && (
            <button onClick={() => onSwitch("growth")} style={{ display:"block", width:"100%", textAlign:"left", marginTop:14, border:"none", background:"none", padding:0, cursor:"pointer", fontFamily:"var(--font)", color:"inherit" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                <span style={{ fontSize:fz(12), letterSpacing:".02em", textTransform:"uppercase", color:"var(--gold)", fontWeight:700 }}>
                  第 {j.currentStage} / 9 階段 · {currentStage.name}
                </span>
                <span style={{ fontSize:fz(14), color:"var(--gold)", fontWeight:600 }}>整體 {overallProgress(j)}%</span>
              </div>
              <StageBar journey={j} />
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:fz(13), color:"var(--ink-3)" }}>
                <span>本階段 {stageProg.done}/{stageProg.total} 個里程碑{stageProg.claimed ? `（${stageProg.claimed} 個待確認）` : ""}</span>
                <span style={{ color:"var(--gold)" }}>查看路徑 →</span>
              </div>
            </button>
          )}
        </div>

        {/* ── 待確認課程（最優先的行動）── */}
        {pendingCount > 0 && (
          <button className="alert-card" onClick={() => onSwitch("courses")}
            style={{ width:"100%", textAlign:"left", cursor:"pointer", background:"#FEF3D0", borderColor:"rgba(138,104,32,.25)", fontFamily:"var(--font)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
              <div>
                <div style={{ fontSize:fz(17), fontWeight:700, color:"#8A6820" }}>你有 {pendingCount} 堂課等待確認時間</div>
                <div style={{ fontSize:fz(14), color:"#A07830", marginTop:3 }}>點此前往課表確認</div>
              </div>
              <span style={{ fontSize:fz(20), color:"#8A6820" }}>→</span>
            </div>
          </button>
        )}

        {/* ── 下一堂課 ── */}
        {nextSession && (
          <>
            <div className="sec-h">下一堂課</div>
            <button className="sess" style={{ borderLeft:`3px solid ${getCoachModuleColor(nextSession.coachId||"").border}` }} onClick={() => onSwitch("courses")}>
              <div className="sess-time">
                <div style={{ fontSize:fz(13), color:"var(--gold)", fontWeight:700, marginBottom:3 }}>{relativeDayLabel(nextSession.date)}</div>
                <div className="sess-start">{nextSession.start}</div>
                <div className="sess-end">{nextSession.end}</div>
              </div>
              <div className="sess-body">
                <div className="sess-title">{nextSession.moduleTitle || "一對一課程"}</div>
                <div className="sess-meta">{formatDateLabel(nextSession.date)} · 教練 {nextSession.coachName} · {nextSession.method}</div>
                <div style={{ marginTop:6 }}><StatusPill status="confirmed" /></div>
              </div>
            </button>
          </>
        )}
        {!nextSession && pendingCount === 0 && openCount > 0 && (
          <button className="card" onClick={() => onSwitch("courses")}
            style={{ width:"100%", textAlign:"left", cursor:"pointer", fontFamily:"var(--font)", display:"flex", alignItems:"center", justifyContent:"space-between", borderLeft:"3px solid var(--slate)" }}>
            <div>
              <div style={{ fontSize:fz(16), fontWeight:600 }}>有 {openCount} 個時段開放預約</div>
              <div style={{ fontSize:fz(14), color:"var(--ink-3)", marginTop:3 }}>前往課表選擇你方便的時間</div>
            </div>
            <span style={{ color:"var(--slate)" }}>→</span>
          </button>
        )}

        {/* ── 下一步行動（最重要的 CTA）── */}
        {nextModule ? (
          <>
            <div className="sec-h">學習中的課程模組</div>
            <div className="card" style={{ borderLeft:"2px solid var(--gold)", cursor:"pointer" }} onClick={() => onSwitch("courses")}>
              <div style={{ fontSize:fz(12), letterSpacing:".02em", textTransform:"uppercase", color:"var(--gold)", marginBottom:5, fontWeight:700 }}>待完成</div>
              <div style={{ fontSize:fz(17), fontWeight:600, fontFamily:"var(--font)", marginBottom:3 }}>{nextModule.title}</div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {(nextModule.stage||[]).map(s => <span key={s} className="badge badge-gold" style={{ fontSize:fz(12) }}>{s}</span>)}
                {nextModule.duration && <span style={{ fontSize:fz(13), color:"var(--ink-3)" }}>⏱ {nextModule.duration}</span>}
              </div>
            </div>
          </>
        ) : courseType ? (
          <>
            <div className="sec-h">我的課程</div>
            <div className="card" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }} onClick={() => onSwitch("courses")}>
              <div>
                <div style={{ fontSize:fz(17), fontWeight:600, fontFamily:"var(--font)" }}>{courseType}</div>
                {coachName && <div style={{ fontSize:fz(14), color:"var(--ink-3)", marginTop:3 }}>聯絡教練：{coachName}</div>}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </>
        ) : (
          <>
            <div className="sec-h">課程</div>
            <div className="card" style={{ textAlign:"center", color:"var(--ink-3)", fontSize:fz(15), padding:"20px 16px", lineHeight:1.7 }}>
              尚未分配課程<br /><span style={{ fontSize:fz(14) }}>請聯絡您的教練</span>
            </div>
          </>
        )}

        {/* ── 最新教練回饋（有才顯示）── */}
        {latestFeedback && (
          <>
            <div className="sec-h">最新回饋</div>
            <div className="card" style={{ cursor:"pointer" }} onClick={() => onSwitch("feedback")}>
              <div className="feedback-author">✦ {latestFeedback.coachName} · {latestFeedback.date}</div>
              <div className="feedback-quote" style={{ fontSize:fz(15), marginBottom:0 }}>
                {latestFeedback.feedback.length > 80
                  ? latestFeedback.feedback.slice(0,80) + "…"
                  : latestFeedback.feedback}
              </div>
              <div style={{ fontSize:fz(13), color:"var(--ink-4)", marginTop:8 }}>
                點此查看完整回饋 →
              </div>
            </div>
          </>
        )}

        {/* ── 無回饋時顯示互動反饋入口 ── */}
        {!latestFeedback && (
          <>
            <div className="sec-h">本週學習</div>
            <div className="card" style={{ display:"flex", alignItems:"center", gap:14, cursor:"pointer", padding:"14px 18px" }} onClick={() => onSwitch("feedback")}>
              <div style={{ fontSize:fz(26) }}>💬</div>
              <div>
                <div style={{ fontSize:fz(16), fontWeight:600, fontFamily:"var(--font)" }}>填寫本週反饋</div>
                <div style={{ fontSize:fz(14), color:"var(--ink-3)", marginTop:3 }}>記錄你的學習收穫與感受</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="2" style={{ marginLeft:"auto" }}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </>
        )}

      </div>
      {sheet && (
        <SessionSheet s={sheet} viewer="student" onClose={() => { setSheet(null); setRefresh(r => r + 1); }}
          onChanged={(msg) => { if (msg) setToast(msg); }} />
      )}
      <Toast msg={toast} onDone={() => setToast("")} />
      <BottomNav tabs={S_TABS} active="home" onSwitch={onSwitch} />
    </div>
  );
}

function SCourses({ onSwitch }) {
  const { profile, fetchSessions, fetchAssignment, fetchModules } = useAuth();
  const [tab,       setTab]       = useState("schedule");
  const [mine,      setMine]      = useState([]);   // 排給我的
  const [openSlots, setOpenSlots] = useState([]);   // 開放預約
  const [modules,   setModules]   = useState([]);
  const [selected,  setSelected]  = useState(todayStr());
  const [sheet,     setSheet]     = useState(null);
  const [toast,     setToast]     = useState("");
  const [loading,   setLoading]   = useState(true);
  const [refresh,   setRefresh]   = useState(0);

  useEffect(() => {
    if (!profile?.uid) return;
    setLoading(true);
    Promise.all([
      fetchSessions({ studentUid: profile.uid }),
      fetchSessions({ status: "open" }),
    ]).then(([m, o]) => {
      setMine(m);
      setOpenSlots(o.filter(s => !isPast(s)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [profile?.uid, refresh]);

  useEffect(() => {
    if (!profile?.uid) return;
    fetchAssignment(profile.uid).then(async ids => {
      if (!ids.length) { setModules([]); return; }
      const all = await fetchModules();
      setModules(all.filter(m => ids.includes(m.id) && m.status !== "hidden"));
    }).catch(() => {});
  }, [profile?.uid]);

  const pending = sortSessions(mine.filter(s => s.status === "pending" && !isPast(s)));
  const calendarSessions = [...mine, ...openSlots];

  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">我的課程</div>
        <div className="avatar" style={(() => { const c = getAvatarColor(profile?.name||""); return { background: c.bg, color: c.text, borderColor: c.bg }; })()}>{(profile?.name||"?").slice(0,1)}</div>
      </div>
      <div className="inner-tabs" style={{ padding:"0 16px" }}>
        <button className={"inner-tab"+(tab==="schedule"?" active":"")} onClick={()=>setTab("schedule")}>
          課表{pending.length > 0 && <span style={{ marginLeft:5, color:"var(--rust)" }}>({pending.length})</span>}
        </button>
        <button className={"inner-tab"+(tab==="modules"?" active":"")} onClick={()=>setTab("modules")}>課程模組</button>
        <button className={"inner-tab"+(tab==="hours"?" active":"")} onClick={()=>setTab("hours")}>上課時數</button>
      </div>

      <div className="content" style={{ paddingTop:12 }}>
        {tab === "schedule" && (loading ? <div className="empty">載入中…</div> : (
          <>
            {/* 1. 待確認：最需要學員行動的事放最上面 */}
            {pending.length > 0 && (
              <div className="alert-card" style={{ background:"#FEF3D0", borderColor:"rgba(138,104,32,.25)" }}>
                <div style={{ fontSize:fz(16), fontWeight:700, color:"#8A6820" }}>教練幫你排了 {pending.length} 堂課，請確認時間</div>
                <div style={{ fontSize:fz(14), color:"#A07830", marginTop:3, marginBottom:10 }}>點選課程，勾選「確認課程時間」即完成</div>
                {pending.map(s => <SessionItem key={s.id} s={s} viewer="student" onOpen={setSheet} showDate />)}
              </div>
            )}

            {/* 2. 開放預約 */}
            {openSlots.length > 0 && (
              <>
                <div className="sec-h">開放預約時段 · {openSlots.length}</div>
                {sortSessions(openSlots).slice(0, 4).map(s => <SessionItem key={s.id} s={s} viewer="student" onOpen={setSheet} showDate />)}
                {openSlots.length > 4 && <div style={{ fontSize:fz(14), color:"var(--ink-3)", margin:"-2px 0 8px" }}>更多時段可在下方月曆中查看（藍色點）</div>}
              </>
            )}

            {/* 3. 月曆 + 當日 */}
            <div className="sec-h">月曆</div>
            <ScheduleCalendar sessions={calendarSessions} selected={selected} onSelect={setSelected} />
            <DayAgenda sessions={calendarSessions} selected={selected} viewer="student" onOpen={setSheet}
              emptyHint="這天沒有排課" />
          </>
        ))}

        {tab === "hours" && <HoursReport sessions={mine} viewer="student" onOpen={setSheet} />}

        {tab === "modules" && (
          modules.length === 0
            ? <div className="empty" style={{ marginTop:24 }}>尚未分配課程模組<br/><span style={{ fontSize:fz(14) }}>教練分配後會出現在這裡</span></div>
            : modules.map(m => <StudentModuleCard key={m.id} m={m} />)
        )}
      </div>

      {sheet && (
        <SessionSheet s={sheet} viewer="student" onClose={() => setSheet(null)}
          onChanged={(msg) => { setToast(msg); setRefresh(r => r + 1); }} />
      )}
      <Toast msg={toast} onDone={() => setToast("")} />
      <BottomNav tabs={S_TABS} active="courses" onSwitch={onSwitch} />
    </div>
  );
}

function StudentModuleCard({ m }) {
  const [open, setOpen] = useState(false);
  const color = getCoachModuleColor(m.coachId || "");
  return (
    <div style={{ background:color.bg, border:`1px solid ${color.border}`, borderLeft:`3px solid ${color.border}`, borderRadius:"var(--r-lg)", marginBottom:10 }}>
      <div style={{ padding:"12px 14px", cursor:"pointer" }} onClick={() => setOpen(o => !o)}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:fz(13), color:color.border, fontWeight:700, marginBottom:4 }}>{m.coachName || "—"} 教練</div>
            <div className="mod-title">{m.title}</div>
            {m.outline && <div className="mod-outline" style={{ marginTop:4 }}>{m.outline}</div>}
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:8 }}>
              {(m.stage||[]).map(s => <span key={s} className="badge" style={{ background:"rgba(255,255,255,.7)", color:color.border, border:`1px solid ${color.border}`, fontSize:fz(12) }}>{s}</span>)}
              {m.duration && <span className="badge" style={{ background:"rgba(255,255,255,.6)", color:"var(--ink-3)", border:"1px solid var(--cream-3)", fontSize:fz(12) }}>⏱ {m.duration}</span>}
            </div>
          </div>
          <span style={{ fontSize:fz(14), color:"var(--ink-4)", whiteSpace:"nowrap" }}>{open ? "收合 ▲" : "學習資料 ▼"}</span>
        </div>
      </div>
      {open && <div style={{ padding:"0 14px 14px" }}><ResourceManager moduleId={m.id} canManage={false} /></div>}
    </div>
  );
}


function SGrowth({ onSwitch }) {
  const { profile, fetchJourney, fetchAssignment, fetchModules } = useAuth();
  const [journey, setJourney] = useState(undefined);   // undefined=載入中、null=尚未建立
  const [modules, setModules] = useState([]);
  const [toast,   setToast]   = useState("");
  const load = () => profile?.uid && fetchJourney(profile.uid).then(setJourney);
  useEffect(() => {
    load();
    if (!profile?.uid) return;
    fetchAssignment(profile.uid).then(async ids => {
      if (!ids.length) return;
      const all = await fetchModules();
      setModules(all.filter(m => ids.includes(m.id) && m.status !== "hidden"));
    }).catch(() => {});
  }, [profile?.uid]);

  const j = journey || (profile ? initialJourney(profile) : null);
  const related = j ? modules.filter(m => (m.stage || []).includes(stageOf(j.currentStage).name)) : [];

  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">成長路徑</div>
        <div className="avatar" style={(() => { const c = getAvatarColor(profile?.name||""); return { background: c.bg, color: c.text, borderColor: c.bg }; })()}>{(profile?.name||"?").slice(0,1)}</div>
      </div>
      <div className="content">
        {journey === undefined ? <div className="empty">載入中…</div> : (
          <JourneyView journey={j} mode="student" studentUid={profile?.uid} related={related} preview={journey === null}
            onChanged={(msg) => { setToast(msg); load(); }} />
        )}
      </div>
      <Toast msg={toast} onDone={() => setToast("")} />
      <BottomNav tabs={S_TABS} active="growth" onSwitch={onSwitch} />
    </div>
  );
}

function SFeedback({ onSwitch }) {
  const { profile, addFeedback, fetchFeedbacks, fetchRecords } = useAuth();
  const coachName = profile?.coachName || "";
  const [text,    setText]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [mine,    setMine]    = useState([]);
  const [records, setRecords] = useState([]);
  const [toast,   setToast]   = useState("");

  const load = () => {
    if (!profile?.uid) return;
    fetchFeedbacks(profile.uid).then(setMine).catch(() => {});
    fetchRecords(profile.uid).then(all => setRecords(
      all.filter(r => r.visibleStudent && r.feedback).sort((a,b) => (b.date||"").localeCompare(a.date||""))
    )).catch(() => {});
  };
  useEffect(load, [profile?.uid]);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const res = await addFeedback(text.trim());
    setBusy(false);
    if (res.success) { setText(""); setToast("反饋已送出，教練會看到 ✓"); load(); }
    else setToast("送出失敗，請再試一次");
  };

  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">互動反饋</div>
        <div className="avatar" style={(() => { const c = getAvatarColor(profile?.name||""); return { background: c.bg, color: c.text, borderColor: c.bg }; })()}>{(profile?.name||"?").slice(0,1)}</div>
      </div>
      <div className="content">
        {coachName && (
          <>
            <div className="sec-h">主要聯絡教練</div>
            <div className="card" style={{ padding:"6px 16px" }}>
              <div className="coach-row" style={{ borderBottom:"none" }}>
                <div className="coach-av" style={(() => { const c = getAvatarColor(coachName); return { background: c.bg, color: c.text }; })()}>{coachName.slice(0,2)}</div>
                <div style={{ flex:1 }}>
                  <div className="coach-name">{coachName}</div>
                  <div className="coach-tag">{profile?.courseType||""}</div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="sec-h">填寫本週反饋</div>
        <textarea className="input-field" rows={3} placeholder="記錄這週的學習心得、疑問或想法…" value={text} onChange={e => setText(e.target.value)} />
        <button className="btn btn-primary" style={{ width:"100%" }} onClick={send} disabled={busy || !text.trim()}>
          <IcSend />{busy ? "送出中…" : "送出反饋"}
        </button>

        {records.length > 0 && (
          <>
            <div className="sec-h">教練給你的回饋</div>
            {records.map(r => (
              <div key={r.id} className="card">
                <div className="feedback-author">✦ {r.coachName} · {r.date} · {r.topic}</div>
                <div className="feedback-quote" style={{ marginBottom:0 }}>{r.feedback}</div>
              </div>
            ))}
          </>
        )}

        {mine.length > 0 && (
          <>
            <div className="sec-h">我送出的反饋</div>
            {mine.map(f => (
              <div key={f.id} className="card card-sm">
                <div style={{ fontSize:fz(13), color:"var(--ink-4)", marginBottom:4 }}>{f.createdAt?.toDate?.()?.toLocaleDateString("zh-TW") || "剛剛"}</div>
                <div style={{ fontSize:fz(16), color:"var(--ink-2)", lineHeight:1.65, whiteSpace:"pre-wrap" }}>{f.text}</div>
              </div>
            ))}
          </>
        )}
      </div>
      <Toast msg={toast} onDone={() => setToast("")} />
      <BottomNav tabs={S_TABS} active="feedback" onSwitch={onSwitch} />
    </div>
  );
}


/* ════════════════════════════════════════
   COACH SCREENS
════════════════════════════════════════ */

function CHome({ onSwitch, onModal }) {
  const { profile, fetchMembers, fetchModules, fetchRecords, fetchAssignment, fetchSessions, fetchFeedbacks, ensureJourneys, updateSession } = useAuth();
  const [mySessions, setMySessions] = useState([]);
  const [sheet,      setSheet]      = useState(null);
  const [toast,      setToast]      = useState("");
  const [sRefresh,   setSRefresh]   = useState(0);
  const [journeys,  setJourneys]  = useState([]);
  const [jStudent,  setJStudent]  = useState(null);
  const [jRefresh,  setJRefresh]  = useState(0);
  const [upcoming,  setUpcoming]  = useState([]);   // 今天起的課程
  const [schedCnt,  setSchedCnt]  = useState({});
  const [feedbacks, setFeedbacks] = useState([]);
  const [students,        setStudents]        = useState([]);
  const [moduleCount,     setModuleCount]     = useState(0);
  const [unassigned,      setUnassigned]      = useState([]);  // 尚未分配課程的學員
  const [recentRecords,   setRecentRecords]   = useState([]);  // 最近 3 筆上課記錄
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    if (!jRefresh || !students.length) return;
    ensureJourneys(students).then(setJourneys).catch(() => {});
  }, [jRefresh]);

  useEffect(() => {
    if (!profile?.uid) return;
    fetchSessions({ coachId: profile.uid }).then(list => {
      setMySessions(list);
      const future = sortSessions(list.filter(s => !isPast(s)));
      setUpcoming(future.filter(s => s.date !== todayStr()));
      setSchedCnt(countByStatus(future));
    }).catch(() => {});
    fetchFeedbacks().then(list => setFeedbacks(list.slice(0, 3))).catch(() => {});
  }, [profile?.uid, sRefresh]);

  // 今天的課、待補簽退／簽到（最近 14 天）
  const todayClasses = sortSessions(mySessions.filter(s => s.date === todayStr() && s.status === "confirmed" && s.studentUid));
  const recentFrom = addDays(todayStr(), -14);
  const toFix = sortSessions(mySessions.filter(s => s.date >= recentFrom && s.date < todayStr()
    && ["needOut", "missed"].includes(attendanceState(s)))).reverse();
  const writeRecord = (s) => {
    setSheet(null);
    onModal?.("record", () => { updateSession(s.id, { recorded: true }).then(() => { setToast("上課記錄已儲存 ✓"); setSRefresh(r => r + 1); }); }, {
      prefill: { studentUid: s.studentUid, studentName: s.studentName, date: s.date, topic: s.moduleTitle || "一對一課程", sessionId: s.id },
    });
  };

  useEffect(() => {
    if (!profile?.uid) return;
    Promise.all([
      fetchMembers(),
      fetchModules(),
      fetchRecords(),
    ]).then(async ([members, modules, records]) => {
      const studentList = members.filter(m => m.role === "student");
      setStudents(studentList);
      ensureJourneys(studentList).then(setJourneys).catch(() => {});
      setModuleCount(modules.filter(m => m.coachId === profile.uid).length);

      // 找出尚未有任何分配記錄的學員
      // 用 fetchAssignment 逐一查詢每位學員的分配狀況
      const assignedUids = new Set();
      await Promise.all(
        studentList.map(async s => {
          try {
            const ids = await fetchAssignment(s.uid);
            if (ids && ids.length > 0) assignedUids.add(s.uid);
          } catch {}
        })
      );
      setUnassigned(studentList.filter(s => !assignedUids.has(s.uid)));

      // 最近 3 筆記錄
      const sorted = records.sort((a,b) => (b.date||"").localeCompare(a.date||""));
      setRecentRecords(sorted.slice(0,3));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [profile?.uid]);

  return (
    <div className="screen-enter">
      <div className="content">

        {/* ── 今天的課（簽到、上傳照片、簽退都從這裡進入）── */}
        <div className="sec-h" style={{ marginTop:4 }}>今天的課</div>
        {todayClasses.length === 0
          ? <div className="card empty" style={{ padding:"16px 12px" }}>今天沒有排定的課</div>
          : todayClasses.map(s => <SessionItem key={s.id} s={s} viewer="coach" onOpen={setSheet} />)}

        {toFix.length > 0 && (
          <div className="alert-card" style={{ background:"#FCEFD2", borderColor:"rgba(138,90,16,.25)" }}>
            <div className="alert-t" style={{ color:"#8A5A10" }}>{toFix.length} 堂課的交付紀錄還沒完成</div>
            <div className="alert-s">上傳上課照片並簽退，課程時數才會列入完整交付</div>
            {toFix.slice(0, 4).map(s => <SessionItem key={s.id} s={s} viewer="coach" onOpen={setSheet} showDate />)}
          </div>
        )}

        <PushPrompt />

        {/* ── 今日摘要卡 ── */}
        <div className="card-glass" style={{ marginBottom:12 }}>
          <div style={{ fontFamily:"var(--font)", fontSize:fz(22), fontWeight:600 }}>{profile?.name||"教練"}</div>
          <div style={{ display:"flex", gap:20, marginTop:12 }}>
            <div>
              <div style={{ fontFamily:"var(--font)", fontSize:fz(28), fontWeight:600, color:"var(--sage)" }}>{students.length}</div>
              <div style={{ fontSize:fz(13), color:"var(--ink-3)", letterSpacing:".02em", textTransform:"uppercase", marginTop:2 }}>學員</div>
            </div>
            <div style={{ width:1, background:"var(--cream-3)" }} />
            <div>
              <div style={{ fontFamily:"var(--font)", fontSize:fz(28), fontWeight:600, color:"var(--gold)" }}>{moduleCount}</div>
              <div style={{ fontSize:fz(13), color:"var(--ink-3)", letterSpacing:".02em", textTransform:"uppercase", marginTop:2 }}>課程模組</div>
            </div>
            <div style={{ width:1, background:"var(--cream-3)" }} />
            <div>
              <div style={{ fontFamily:"var(--font)", fontSize:fz(28), fontWeight:600, color: unassigned.length > 0 ? "var(--rust)" : "var(--ink)" }}>{unassigned.length}</div>
              <div style={{ fontSize:fz(13), color:"var(--ink-3)", letterSpacing:".02em", textTransform:"uppercase", marginTop:2 }}>待分配</div>
            </div>
          </div>
        </div>

        {/* ── 待辦事項：需要關注的學員 ── */}
        {!loading && unassigned.length > 0 && (
          <>
            <div className="sec-h">需要關注</div>
            <div className="card" style={{ borderLeft:"2px solid var(--rust)", padding:"12px 16px", cursor:"pointer" }} onClick={() => onSwitch("assign")}>
              <div style={{ fontSize:fz(12), letterSpacing:".02em", textTransform:"uppercase", color:"var(--rust)", marginBottom:6, fontWeight:700 }}>尚未分配課程</div>
              {unassigned.slice(0,3).map((s, i) => (
                <div key={s.uid} style={{ display:"flex", alignItems:"center", gap:10, paddingTop: i > 0 ? 8 : 0, borderTop: i > 0 ? "1px solid var(--cream-3)" : "none" }}>
                  <div className="coach-av" style={{ ...(() => { const c = getAvatarColor(s.name||""); return { background:c.bg, color:c.text }; })(), width:28, height:28, fontSize:fz(13) }}>
                    {s.name?.slice(0,2)||"??"}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:fz(15), fontWeight:600 }}>{s.name}</div>
                    <div style={{ fontSize:fz(13), color:"var(--ink-3)" }}>{s.courseType||"—"}</div>
                  </div>
                </div>
              ))}
              {unassigned.length > 3 && (
                <div style={{ fontSize:fz(14), color:"var(--rust)", marginTop:8 }}>
                  還有 {unassigned.length - 3} 位學員等待分配 →
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 所有學員快速列表 ── */}
        {!loading && students.length > 0 && unassigned.length === 0 && (
          <>
            <div className="sec-h">所有學員</div>
            <div className="card" style={{ padding:"4px 14px" }}>
              {students.slice(0,4).map((s,i) => (
                <div key={s.uid} className="coach-row" style={i === Math.min(students.length,4)-1 ? {borderBottom:"none"} : {}}>
                  <div className="coach-av" style={(() => { const c = getAvatarColor(s.name||""); return { background:c.bg, color:c.text, fontSize:fz(14) }; })()} >{s.name?.slice(0,2)||"??"}</div>
                  <div style={{ flex:1 }}>
                    <div className="coach-name">{s.name}</div>
                    <div className="coach-tag">{s.courseType||"—"}</div>
                  </div>
                  <button className="btn btn-sm" style={{ fontSize:fz(13), padding:"4px 10px" }} onClick={() => onSwitch("assign")}>分配</button>
                </div>
              ))}
              {students.length > 4 && (
                <div style={{ textAlign:"center", fontSize:fz(14), color:"var(--ink-3)", padding:"8px 0", borderTop:"1px solid var(--cream-3)" }}>
                  共 {students.length} 位學員
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 學員回報待確認（最需要教練行動）── */}
        {(() => {
          const claims = journeys.flatMap(j => pendingClaims(j).map(c => ({ ...c, j })));
          if (!claims.length) return null;
          return (
            <div className="alert-card" style={{ background:"var(--gold-pale)", borderColor:"var(--gold-line)" }}>
              <div style={{ fontSize:fz(16), fontWeight:700, color:"var(--gold)", marginBottom:6 }}>{claims.length} 個里程碑回報等你確認</div>
              {claims.slice(0, 4).map(c => {
                const st = students.find(x => x.uid === c.j.id);
                return (
                  <button key={c.j.id + c.key} className="fn-stuck" onClick={() => st && setJStudent(st)}>
                    <span>{st?.name || c.j.studentName}：{c.text}</span><span>→</span>
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* ── 學員成長 ── */}
        {students.length > 0 && (
          <>
            <div className="sec-h">學員成長</div>
            <div className="card" style={{ padding:"4px 14px" }}>
              {students.map((st, i) => {
                const j = journeys.find(x => x.id === st.uid);
                const stage = j ? stageOf(j.currentStage) : null;
                const pc = j ? pendingClaims(j).length : 0;
                return (
                  <button key={st.uid} className="coach-row grow-row" style={i === students.length - 1 ? { borderBottom:"none" } : {}} onClick={() => setJStudent(st)}>
                    <div className="coach-av" style={(() => { const c = getAvatarColor(st.name || ""); return { background:c.bg, color:c.text, fontSize:fz(14) }; })()}>{st.name?.slice(0,2)}</div>
                    <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
                      <div className="coach-name">{st.name}{pc > 0 && <span className="nav-badge" style={{ position:"static", display:"inline-flex", marginLeft:6 }}>{pc}</span>}</div>
                      <div className="coach-tag">{stage ? `${j.currentStage}. ${stage.name} · 已 ${daysInStage(j)} 天` : "建立中…"}</div>
                      {j && <div style={{ marginTop:5 }}><StageBar journey={j} /></div>}
                    </div>
                    <span style={{ fontSize:fz(15), color:"var(--gold)", fontWeight:600, flexShrink:0 }}>{j ? `${overallProgress(j)}%` : ""}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── 近期課表 ── */}
        <div className="sec-h" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>近期課表</span>
          <button style={{ fontSize:fz(13), color:"var(--gold)", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--font)" }} onClick={() => onSwitch("assign")}>前往排課 →</button>
        </div>
        {(schedCnt.reschedule > 0 || schedCnt.pending > 0) && (
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            {schedCnt.reschedule > 0 && <span className="status-pill" style={{ background:SESSION_STATUS.reschedule.bg, color:SESSION_STATUS.reschedule.color, border:`1px solid ${SESSION_STATUS.reschedule.border}` }}>{schedCnt.reschedule} 堂請求改期</span>}
            {schedCnt.pending > 0 && <span className="status-pill" style={{ background:SESSION_STATUS.pending.bg, color:SESSION_STATUS.pending.color, border:`1px solid ${SESSION_STATUS.pending.border}` }}>{schedCnt.pending} 堂待學員確認</span>}
          </div>
        )}
        {upcoming.length === 0
          ? <button className="card empty" style={{ width:"100%", cursor:"pointer", fontFamily:"var(--font)", padding:"18px 12px" }} onClick={() => onSwitch("assign")}>近期沒有排課 · 點此開始排課</button>
          : upcoming.slice(0, 3).map(s => <SessionItem key={s.id} s={s} viewer="coach" onOpen={setSheet} showDate />)}

        {/* ── 學員反饋 ── */}
        {feedbacks.length > 0 && (
          <>
            <div className="sec-h">學員最新反饋</div>
            {feedbacks.map(f => (
              <div key={f.id} className="card card-sm">
                <div style={{ fontSize:fz(13), color:"var(--gold)", fontWeight:700, marginBottom:4 }}>{f.studentName || "學員"} · {f.createdAt?.toDate?.()?.toLocaleDateString("zh-TW") || ""}</div>
                <div style={{ fontSize:fz(15), color:"var(--ink-2)", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{f.text.length > 100 ? f.text.slice(0,100) + "…" : f.text}</div>
              </div>
            ))}
          </>
        )}

        {/* ── 最近上課記錄 ── */}
        {!loading && recentRecords.length > 0 && (
          <>
            <div className="sec-h" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>最近記錄</span>
              <button style={{ fontSize:fz(13), color:"var(--gold)", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--font)" }} onClick={() => onSwitch("records")}>查看全部 →</button>
            </div>
            {recentRecords.map(r => (
              <div key={r.id} className="card card-sm" style={{ marginBottom:7 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:fz(15), fontWeight:600, fontFamily:"var(--font)" }}>{r.topic}</div>
                    <div style={{ fontSize:fz(13), color:"var(--ink-3)", marginTop:2 }}>{r.date} · {r.studentName||"—"}</div>
                  </div>
                  {r.visibleStudent && <span className="badge badge-teal" style={{ fontSize:fz(12), flexShrink:0, marginLeft:8 }}>學員可見</span>}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── 空狀態 ── */}
        {!loading && students.length === 0 && (
          <div className="card" style={{ textAlign:"center", color:"var(--ink-3)", fontSize:fz(15), padding:"28px 16px", lineHeight:1.7 }}>
            還沒有學員<br />
            <span style={{ fontSize:fz(14) }}>請聯絡管理員新增學員至系統</span>
          </div>
        )}

      </div>
      {jStudent && <StudentJourneySheet student={jStudent} onClose={() => setJStudent(null)} onChanged={() => setJRefresh(r => r + 1)} />}
      {sheet && (
        <SessionSheet s={sheet} viewer="coach" onClose={() => { setSheet(null); setSRefresh(r => r + 1); }}
          onChanged={(msg, o) => { if (msg) setToast(msg); if (!o?.keepOpen) setSRefresh(r => r + 1); }}
          onEdit={() => { setSheet(null); onSwitch("assign"); }} onWriteRecord={writeRecord} />
      )}
      <Toast msg={toast} onDone={() => setToast("")} />
      <BottomNav tabs={C_TABS} active="home" onSwitch={onSwitch} />
    </div>
  );
}

/* ════════════════════════════════════════
   課程模組：依教練分組（可收合）＋手動排序
   教練：可排序自己的模組；管理員：可排序所有人的模組
════════════════════════════════════════ */
const OPEN_KEY = "istar.moduleGroups";
function useOpenGroups(defaults) {
  const [open, setOpen] = useState(() => { try { return JSON.parse(localStorage.getItem(OPEN_KEY) || "null") || defaults; } catch { return defaults; } });
  const toggle = (k) => setOpen(o => { const n = { ...o, [k]: !o[k] }; try { localStorage.setItem(OPEN_KEY, JSON.stringify(n)); } catch {} return n; });
  return [open, toggle];
}

function ModuleGroups({ modules, meUid, canSortAll, onOpen, onSaved, showStatus, emptyText = "目前沒有課程模組" }) {
  const { reorderModules } = useAuth();
  const groups = [];
  modules.forEach(m => {
    const k = m.coachId || m.coachName || "—";
    let g = groups.find(x => x.key === k);
    if (!g) groups.push(g = { key: k, name: m.coachName || "—", list: [] });
    g.list.push(m);
  });
  // 自己的排第一，其餘依名字
  groups.sort((a, b) => (b.key === meUid) - (a.key === meUid) || a.name.localeCompare(b.name, "zh-Hant"));
  const [open, toggle] = useOpenGroups(meUid ? { [meUid]: true } : {});
  const [sorting, setSorting] = useState("");      // 正在排序的教練 key
  const [draft,   setDraft]   = useState([]);
  const [busy,    setBusy]    = useState(false);
  const isOpen = (k) => open[k] ?? (k === meUid);

  const startSort = (g) => { setSorting(g.key); setDraft(g.list.map(m => m.id)); if (!isOpen(g.key)) toggle(g.key); };
  const move = (i, d) => setDraft(arr => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const saveSort = async () => { setBusy(true); const r = await reorderModules(draft); setBusy(false); setSorting(""); onSaved?.(r.success ? "排序已儲存 ✓" : "排序儲存失敗"); };

  if (!groups.length) return <div className="card empty">{emptyText}</div>;
  return groups.map(g => {
    const color = getCoachModuleColor(g.key);
    const mine = g.key === meUid;
    const canSort = canSortAll || mine;
    const opened = isOpen(g.key);
    const list = sorting === g.key ? draft.map(id => g.list.find(m => m.id === id)).filter(Boolean) : g.list;
    return (
      <div key={g.key} className={"mg" + (opened ? " open" : "")} style={{ borderLeftColor: color.border }}>
        <div className="mg-head">
          <button className="mg-toggle" onClick={() => sorting !== g.key && toggle(g.key)} aria-expanded={opened}>
            <span className="mg-dot" style={{ background: color.border }} />
            <span className="mg-name">{g.name}{mine ? "（我）" : ""}</span>
            <span className="mg-n">{g.list.length} 個模組</span>
            <span className="mg-chev">{opened ? "▾" : "▸"}</span>
          </button>
          {canSort && opened && g.list.length > 1 && sorting !== g.key && <button className="btn btn-sm" onClick={() => startSort(g)}>⇅ 排序</button>}
        </div>
        {opened && (
          <div className="mg-list">
            {list.map((m, i) => sorting === g.key ? (
              <div key={m.id} className="mg-row sorting">
                <span className="mg-idx">{i + 1}</span>
                <span className="mg-title">{m.title}</span>
                <button className="res-act" disabled={i === 0} onClick={() => move(i, -1)} aria-label="上移">↑</button>
                <button className="res-act" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label="下移">↓</button>
              </div>
            ) : (
              <button key={m.id} className="mg-row" onClick={() => onOpen(m)}>
                <span className="mg-idx">{i + 1}</span>
                <span style={{ flex:1, minWidth:0 }}>
                  <span className="mg-title">{m.title}</span>
                  <span className="mg-sub">
                    {(m.stage || []).join("・")}{m.duration ? ` · ⏱ ${m.duration}` : ""}
                  </span>
                </span>
                {showStatus && m.status === "hidden" && <span className="attend-pill" style={{ background:"var(--cream-3)", color:"var(--ink-3)" }}>已下架</span>}
                <span className="mg-go">›</span>
              </button>
            ))}
            {sorting === g.key && (
              <div className="btn-row" style={{ marginTop:8 }}>
                <button className="btn btn-sm" onClick={() => setSorting("")}>取消</button>
                <button className="btn btn-sm btn-primary" disabled={busy} onClick={saveSort}>{busy ? "儲存中…" : "儲存排序"}</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  });
}

function CModules({ onSwitch, onModal }) {
  const { profile, fetchModules, deleteModule } = useAuth();
  const [modules,    setModules]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editTarget, setEditTarget] = useState(null);
  const [sheetId,    setSheetId]    = useState(null);
  const [toast,      setToast]      = useState("");

  useEffect(() => {
    if (!profile?.uid) return;
    setLoading(true);
    fetchModules().then(all => {
      setModules(all.map(m => ({ ...m, _v: refreshKey })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [refreshKey, profile?.uid]);

  const myModules  = modules.filter(m => m.coachId === profile?.uid);
  const sheet = modules.find(m => m.id === sheetId);

  // 新增完成後直接打開模組，接著加學習資料
  const handleModal  = () => onModal("module", (r) => {
    setRefreshKey(k => k + 1);
    if (r?.id) { setSheetId(r.id); setToast("模組已建立，接著加入學習資料吧"); }
  });
  const handleDelete = async (id) => {
    await deleteModule(id);
    setSheetId(null); setToast("模組已刪除");
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">課程模組</div>
        <button className="btn btn-primary btn-sm" onClick={handleModal}><IcPlus />新增模組</button>
      </div>

      <div className="content" style={{ paddingTop:6 }}>
        {loading ? <div className="empty">載入中…</div> : (
          <>
            {myModules.length === 0 && (
              <div className="card empty" style={{ marginBottom:12 }}>
                你還沒有建立課程模組<br/>
                <button className="btn" style={{ marginTop:12 }} onClick={handleModal}><IcPlus />新增第一個課程模組</button>
              </div>
            )}
            <div className="hint" style={{ margin:"0 2px 10px" }}>點教練名字可展開／收合；你的模組可按「⇅ 排序」調整順序，學員看到的順序也會跟著改。</div>
            <ModuleGroups modules={modules.filter(m => m.status !== "hidden" || m.coachId === profile?.uid)} meUid={profile?.uid}
              onOpen={(x) => setSheetId(x.id)} onSaved={(msg) => { setToast(msg); setRefreshKey(k => k + 1); }} showStatus />
          </>
        )}
      </div>

      {sheet && (
        <ModuleSheet m={sheet} isOwn={sheet.coachId === profile?.uid}
          onClose={() => { setSheetId(null); setRefreshKey(k => k + 1); }}
          onEdit={(m) => setEditTarget(m)} onDelete={handleDelete} />
      )}
      {editTarget && (
        <ModalAddModule editData={editTarget}
          onClose={(saved) => { setEditTarget(null); if (saved) { setRefreshKey(k => k + 1); setToast("課程資訊已更新"); } }} />
      )}
      <Toast msg={toast} onDone={() => setToast("")} />
      <BottomNav tabs={C_TABS} active="modules" onSwitch={onSwitch} />
    </div>
  );
}


function AssignPanel() {
  const { profile, fetchMembers, fetchModules, fetchAssignment, saveAssignment } = useAuth();
  const [students,   setStudents]   = useState([]);
  const [modulePool, setModulePool] = useState([]);
  const [selStudent, setSelStudent] = useState(null);
  const [assigned,   setAssigned]   = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [otherIds,   setOtherIds]   = useState([]);   // 其他教練分配的模組，儲存時要保留

  useEffect(() => {
    if (!profile?.uid) return;
    fetchMembers().then(all => setStudents(all.filter(m => m.role === "student"))).catch(() => {});
    // 只載入自己的課程模組
    fetchModules().then(all => {
      setModulePool(all.filter(m => m.coachId === profile.uid && m.status !== "hidden"));
    }).catch(() => {});
  }, [profile?.uid]);

  // 選擇學員後載入已分配的模組
  const selectStudent = async (s) => {
    setSelStudent(s);
    setSaved(false);
    const ids = await fetchAssignment(s.uid);
    // 用 id 找回完整模組資料（自己的）；其他教練分配的另外保留
    const current = modulePool.filter(m => ids.includes(m.id));
    setAssigned(current);
    setOtherIds(ids.filter(id => !modulePool.find(m => m.id === id)));
  };

  const addModule = (m) => {
    setAssigned(a => a.find(x => x.id === m.id) ? a : [...a, m]);
    setSaved(false);
  };

  const removeModule = (id) => {
    setAssigned(a => a.filter(m => m.id !== id));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selStudent) return;
    setSaving(true);
    const res = await saveAssignment(selStudent.uid, [...otherIds, ...assigned.map(m => m.id)]);
    setSaving(false);
    if (res.success) setSaved(true);
  };

  return (
      <div className="content" style={{ paddingTop:12 }}>
        {students.length === 0 ? (
          <div style={{ textAlign:"center",color:"var(--ink-3)",fontSize:fz(15),marginTop:48,lineHeight:1.7 }}>
            尚無學員<br/><span style={{ fontSize:fz(14) }}>請先在「成員管理」新增學員</span>
          </div>
        ) : (
          <>
            <div className="sec-h">選擇學員</div>
            <div className="chip-group">
              {students.map(s => (
                <div key={s.uid} className={"chip"+(selStudent?.uid===s.uid?" sel":"")}
                  onClick={() => selectStudent(s)}>{s.name}</div>
              ))}
            </div>
            {selStudent && (
              <>
                <div style={{ fontSize:fz(15),color:"var(--ink-3)",marginBottom:12,lineHeight:1.6 }}>
                  為 <strong style={{ color:"var(--ink)" }}>{selStudent.name}</strong> 分配課程模組
                </div>
                <div className="sec-h">可用模組</div>
                <div className="module-pool">
                  {modulePool.length === 0
                    ? <span style={{ fontSize:fz(14),color:"var(--ink-3)" }}>你尚未建立任何課程模組，請至「模組」頁面新增</span>
                    : modulePool.map(m => {
                        const mc = getCoachModuleColor(m.coachId || "");
                        return (
                          <span key={m.id}
                            style={{ display:"inline-flex", alignItems:"center", gap:6,
                              padding:"5px 11px", borderRadius:"var(--r-pill)",
                              fontSize:fz(14), fontWeight:500, cursor:"pointer",
                              background: mc.bg, color: mc.border,
                              border: `1px solid ${mc.border}` }}
                            onClick={() => addModule(m)}>
                            ✦ {m.title}
                          </span>
                        );
                      })
                  }
                </div>
                <div className="sec-h">{selStudent.name} 的專屬課程</div>
                {otherIds.length > 0 && <div style={{ fontSize:fz(14), color:"var(--ink-3)", marginTop:-4, marginBottom:8 }}>另有 {otherIds.length} 個其他教練分配的模組，儲存時會保留。</div>}
                <div className="drop-zone">
                  <div className="drop-label">↑ 點擊上方模組加入 · 點 × 移除</div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                    {assigned.map(a => {
                      const mc = getCoachModuleColor(a.coachId || "");
                      return (
                        <span key={a.id}
                          style={{ display:"inline-flex", alignItems:"center", gap:6,
                            padding:"5px 11px", borderRadius:"var(--r-pill)",
                            fontSize:fz(14), fontWeight:500, cursor:"pointer",
                            background: mc.bg, color: mc.border,
                            border: `1px solid ${mc.border}`,
                            opacity: 0.85 }}
                          onClick={() => removeModule(a.id)}>
                          ✓ {a.title} ×
                        </span>
                      );
                    })}
                  </div>
                </div>
                {saved && (
                  <div style={{ padding:"10px 14px",borderRadius:"var(--r)",marginTop:10,fontSize:fz(15),textAlign:"center",background:"var(--sage-pale)",border:"1px solid rgba(74,123,90,.22)",color:"var(--sage)" }}>
                    ✓ 課程安排已儲存
                  </div>
                )}
                <div className="btn-row" style={{ marginTop:12 }}>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? "儲存中…" : "✦ 儲存課程安排"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
  );
}

function CSchedule({ onSwitch, onModal }) {
  const { profile, fetchSessions, updateSession } = useAuth();
  const [tab,      setTab]      = useState("calendar");
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [refresh,  setRefresh]  = useState(0);
  const [selected, setSelected] = useState(todayStr());
  const [filter,   setFilter]   = useState("");     // "" | status
  const [sheet,    setSheet]    = useState(null);
  const [editing,  setEditing]  = useState(null);   // null | {} 新增 | session 編輯
  const [toast,    setToast]    = useState("");

  useEffect(() => {
    if (!profile?.uid) return;
    setLoading(true);
    fetchSessions({ coachId: profile.uid }).then(list => { setSessions(list); setLoading(false); }).catch(() => setLoading(false));
  }, [profile?.uid, refresh]);

  const future = sessions.filter(s => !isPast(s));
  const counts = countByStatus(future);
  const reschedule = sortSessions(future.filter(s => s.status === "reschedule"));
  const toRecord = sortSessions(sessions.filter(s => isPast(s) && s.status === "confirmed" && s.studentUid && !s.recorded && s.checkOut)).reverse();
  const toFinish = sortSessions(sessions.filter(s => s.date >= addDays(todayStr(), -30) && ["needOut", "missed"].includes(attendanceState(s)))).reverse();

  const done = (msg) => { setToast(msg); setRefresh(r => r + 1); };

  const writeRecord = (s) => {
    setSheet(null);
    onModal("record", () => { updateSession(s.id, { recorded: true }).then(() => done("上課記錄已儲存 ✓")); }, {
      prefill: { studentUid: s.studentUid, studentName: s.studentName, date: s.date, topic: s.moduleTitle || "一對一課程", sessionId: s.id },
    });
  };

  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">排課</div>
        {tab === "calendar" && <button className="btn btn-primary btn-sm" onClick={() => setEditing({})}><IcPlus />排課</button>}
      </div>
      <div className="inner-tabs" style={{ padding:"0 16px" }}>
        <button className={"inner-tab"+(tab==="calendar"?" active":"")} onClick={() => setTab("calendar")}>行事曆</button>
        <button className={"inner-tab"+(tab==="assign"?" active":"")} onClick={() => setTab("assign")}>課程分配</button>
      </div>

      {tab === "assign" ? <AssignPanel /> : (
        <div className="content" style={{ paddingTop:12 }}>
          {loading ? <div className="empty">載入中…</div> : (
            <>
              {/* 狀態篩選：同時是統計 */}
              <div className="filter-row">
                <button className={"filter-chip" + (!filter ? " on" : "")} style={{ color:"var(--ink)" }} onClick={() => setFilter("")}>
                  全部 <span className="n">{future.length}</span>
                </button>
                {["pending","reschedule","open","confirmed"].map(k => (
                  <button key={k} className={"filter-chip" + (filter === k ? " on" : "")} style={{ color: SESSION_STATUS[k].color }}
                    onClick={() => setFilter(f => f === k ? "" : k)}>
                    {SESSION_STATUS[k].label} <span className="n" style={{ background: SESSION_STATUS[k].bg, color: SESSION_STATUS[k].color }}>{counts[k] || 0}</span>
                  </button>
                ))}
              </div>

              {/* 需要教練處理：改期請求、待補記錄 */}
              {!filter && reschedule.length > 0 && (
                <div className="alert-card" style={{ background:"var(--rust-pale)", borderColor:"rgba(139,58,42,.2)" }}>
                  <div style={{ fontSize:fz(16), fontWeight:700, color:"var(--rust)", marginBottom:8 }}>{reschedule.length} 位學員請求改期</div>
                  {reschedule.map(s => <SessionItem key={s.id} s={s} viewer="coach" onOpen={setSheet} showDate />)}
                </div>
              )}
              {!filter && toFinish.length > 0 && (
                <div className="alert-card" style={{ background:"#FCEFD2", borderColor:"rgba(138,90,16,.25)" }}>
                  <div className="alert-t" style={{ color:"#8A5A10" }}>{toFinish.length} 堂課待簽退或未簽到</div>
                  <div className="alert-s">點開課程，上傳照片並簽退，才算完成交付</div>
                  {toFinish.slice(0, 4).map(s => <SessionItem key={s.id} s={s} viewer="coach" onOpen={setSheet} showDate />)}
                </div>
              )}
              {!filter && toRecord.length > 0 && (
                <div className="alert-card" style={{ background:"var(--gold-pale)", borderColor:"var(--gold-line)" }}>
                  <div style={{ fontSize:fz(16), fontWeight:700, color:"var(--gold)", marginBottom:8 }}>{toRecord.length} 堂課已上完，還沒寫上課記錄</div>
                  {toRecord.slice(0, 3).map(s => <SessionItem key={s.id} s={s} viewer="coach" onOpen={setSheet} showDate />)}
                </div>
              )}

              {filter ? (
                <>
                  <div className="sec-h">{SESSION_STATUS[filter].label} · 即將到來</div>
                  {sortSessions(future.filter(s => s.status === filter)).length === 0
                    ? <div className="card empty">沒有{SESSION_STATUS[filter].label}的時段</div>
                    : sortSessions(future.filter(s => s.status === filter)).map(s => <SessionItem key={s.id} s={s} viewer="coach" onOpen={setSheet} showDate />)}
                </>
              ) : (
                <>
                  <ScheduleCalendar sessions={sessions} selected={selected} onSelect={setSelected} />
                  <DayAgenda sessions={sessions} selected={selected} viewer="coach" onOpen={setSheet}
                    emptyHint={selected >= todayStr()
                      ? <span>這天還沒有課程<br/><button className="btn btn-sm" style={{ marginTop:10 }} onClick={() => setEditing({})}><IcPlus />在這天排課</button></span>
                      : "這天沒有課程"} />
                </>
              )}
            </>
          )}
        </div>
      )}

      {sheet && (
        <SessionSheet s={sheet} viewer="coach" onClose={() => setSheet(null)} onChanged={done}
          onEdit={(s) => { setSheet(null); setEditing(s); }} onWriteRecord={writeRecord} />
      )}
      {editing && (
        <ModalSession editData={editing.id ? editing : null} defaultDate={selected}
          coachSessions={sessions}
          onClose={(saved, msg) => { setEditing(null); if (saved) done(msg); }} />
      )}
      <Toast msg={toast} onDone={() => setToast("")} />
      <BottomNav tabs={C_TABS} active="assign" onSwitch={onSwitch} />
    </div>
  );
}

function CRecords({ onSwitch, onModal }) {
  const { profile, fetchRecords, deleteRecord, fetchSessions } = useAuth();
  const [tab,        setTab]        = useState("records");
  const [sessions,   setSessions]   = useState([]);
  const [sheet,      setSheet]      = useState(null);
  const [toast,      setToast]      = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [records,    setRecords]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetchRecords().then(all => {
      // 依日期倒序排列
      setRecords(all.sort((a, b) => (b.date || "").localeCompare(a.date || "")));
      setLoading(false);
    }).catch(() => setLoading(false));
    if (profile?.uid) fetchSessions({ coachId: profile.uid }).then(setSessions).catch(() => {});
  }, [refreshKey]);

  const handleModal = () => onModal("record", () => setRefreshKey(k => k + 1));
  const handleEdit  = (r) => onModal("record", () => setRefreshKey(k => k + 1), { editData: r });
  const handleDelete = async (id) => {
    await deleteRecord(id);
    setConfirmDel(null);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">記錄與時數</div>
        {tab === "records" && <button className="btn btn-primary btn-sm" onClick={handleModal}><IcPlus />新增記錄</button>}
      </div>
      <div className="inner-tabs" style={{ padding:"0 16px" }}>
        <button className={"inner-tab"+(tab==="records"?" active":"")} onClick={() => setTab("records")}>上課記錄</button>
        <button className={"inner-tab"+(tab==="hours"?" active":"")} onClick={() => setTab("hours")}>上課時數</button>
      </div>
      <div className="content" style={{ paddingTop:12 }}>
        {tab === "hours" ? (
          <HoursReport sessions={sessions} viewer="coach" onOpen={setSheet} />
        ) : loading ? (
          <div style={{ textAlign:"center", color:"var(--ink-3)", fontSize:fz(15), marginTop:48 }}>載入中…</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign:"center", color:"var(--ink-3)", fontSize:fz(15), marginTop:48, lineHeight:1.7 }}>
            尚無上課記錄<br /><span style={{ fontSize:fz(14) }}>點右上角「新增」記錄上課狀況</span>
          </div>
        ) : (
          records.map(r => (
            <div key={r.id} className="card" style={{ marginBottom:10 }}>
              {/* 標題列 */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:fz(17), fontWeight:600, fontFamily:"var(--font)" }}>{r.topic}</div>
                  <div style={{ fontSize:fz(14), color:"var(--ink-3)", marginTop:2 }}>
                    {r.date} · {r.studentName || "—"} · {r.coachName || "—"}
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end", flexShrink:0, marginLeft:8 }}>
                  {r.visibleStudent && <span className="badge badge-teal" style={{ fontSize:fz(12) }}>學員可見</span>}
                  {r.visibleCoach   && <span className="badge badge-nebula" style={{ fontSize:fz(12) }}>教練可見</span>}
                </div>
              </div>
              {/* 給學員的回饋 */}
              {r.feedback && (
                <div className="record-note">
                  <div className="record-note-label" style={{ color:"var(--sage)" }}>給學員的回饋</div>
                  {r.feedback}
                </div>
              )}
              {/* 教練私密備註 */}
              {r.privateNote && (
                <div className="record-note coach-only" style={{ marginTop:6 }}>
                  <div className="record-note-label" style={{ color:"var(--gold)" }}>教練私密備註</div>
                  {r.privateNote}
                </div>
              )}
              {/* 只有寫這筆記錄的教練可以編輯刪除 */}
              {r.coachId === profile?.uid && (
                confirmDel === r.id ? (
                  <div className="btn-row">
                    <button className="btn btn-sm" onClick={() => setConfirmDel(null)}>返回</button>
                    <button className="btn btn-sm" style={{ background:"var(--rust)", color:"#fff", borderColor:"var(--rust)" }} onClick={() => handleDelete(r.id)}>確認刪除</button>
                  </div>
                ) : (
                  <div className="btn-row">
                    <button className="btn btn-sm" onClick={() => handleEdit(r)}>編輯</button>
                    <button className="btn btn-sm" style={{ color:"var(--rust)", borderColor:"rgba(139,58,42,.2)", background:"var(--rust-pale)" }} onClick={() => setConfirmDel(r.id)}>刪除</button>
                  </div>
                )
              )}
            </div>
          ))
        )}
      </div>
      {sheet && <SessionSheet s={sheet} viewer="coach" onClose={() => setSheet(null)} onChanged={(m) => { if (m) setToast(m); setRefreshKey(k => k + 1); }} />}
      <Toast msg={toast} onDone={() => setToast("")} />
      <BottomNav tabs={C_TABS} active="records" onSwitch={onSwitch} />
    </div>
  );
}


/* ════════════════════════════════════════
   LOGIN / NO ACCESS
════════════════════════════════════════ */
function LoginScreen() {
  const { loginWithEmail, resetPassword, error, setError, loading } = useAuth();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [show,     setShow]     = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [notice,   setNotice]   = useState("");
  const handleSubmit = async e => {
    e.preventDefault(); setNotice("");
    if (!email || !password) { setError("請輸入 Email 和密碼。"); return; }
    setBusy(true); await loginWithEmail(email, password); setBusy(false);
  };
  const forgot = async () => {
    setNotice(""); setError("");
    if (!email.trim()) { setError("請先在上方輸入你的 Email，再按「忘記密碼」。"); return; }
    const r = await resetPassword(email);
    if (r.success) setNotice(`如果 ${email.trim().toLowerCase()} 是已註冊的帳號，重設密碼信已寄出，請到信箱（含垃圾郵件）收信。`);
    else setError(r.error);
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, minHeight:0, overflowY:"auto" }}>
      <div className="login-wrap">
        <div className="login-logo"><LogoMark size={96} /></div>
        <div className="login-brand"><Wordmark /></div>
        <div className="login-sub">星辰聯盟 · 學員成長平台</div>
        <div className="login-card">
          {error && <div className="login-error" role="alert">{error}</div>}
          {notice && <div className="login-ok" role="status">{notice}</div>}
          <form onSubmit={handleSubmit}>
            <label className="input-label" htmlFor="login-email">Email</label>
            <input id="login-email" className="input-field" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" />
            <label className="input-label" htmlFor="login-pw">密碼</label>
            <div className="pw-wrap">
              <input id="login-pw" className="input-field" type={show ? "text" : "password"} placeholder="輸入密碼" value={password}
                onChange={e=>setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" className="pw-eye" onClick={() => setShow(v => !v)} aria-label={show ? "隱藏密碼" : "顯示密碼"}>{show ? "隱藏" : "顯示"}</button>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width:"100%", marginTop:6 }} disabled={loading || busy}>
              {busy ? "登入中…" : "登入"}
            </button>
          </form>
          <button type="button" className="link-btn" style={{ display:"block", margin:"14px auto 0" }} onClick={forgot}>忘記密碼？寄送重設信</button>
          <div className="login-no-access">
            沒有帳號？請聯絡星辰聯盟管理員取得登入資格
          </div>
        </div>
      </div>
    </div>
  );
}

function NoAccessScreen({ user, logout }) {
  const { myRequest, requestAccess, refreshProfile } = useAuth();
  const [req,   setReq]   = useState(undefined);   // undefined 載入中 | null 尚未申請 | {...}
  const [name,  setName]  = useState("");
  const [note,  setNote]  = useState("");
  const [busy,  setBusy]  = useState(false);
  const [msg,   setMsg]   = useState("");
  useEffect(() => { myRequest().then(setReq); }, []);
  const send = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setMsg("請輸入你的姓名"); return; }
    setBusy(true); setMsg("");
    const r = await requestAccess(name, note);
    setBusy(false);
    if (r.success) setReq({ name, note }); else setMsg("送出失敗，請稍後再試。");
  };
  const check = async () => {
    setBusy(true); const ok = await refreshProfile(); setBusy(false);
    if (!ok) setMsg("還沒開通，請等管理員處理後再試一次。");
  };
  return (
    <div className="content" style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:36 }}>
      <div style={{ marginBottom:10 }}><LogoMark size={64} /></div>
      <div style={{ fontSize:fz(22), fontWeight:700, marginBottom:8 }}>帳號尚未開通</div>
      <div style={{ fontSize:fz(15), color:"var(--ink-3)", textAlign:"center", lineHeight:1.7, marginBottom:20 }}>
        你已成功登入 <b style={{ color:"var(--ink)" }}>{user?.email}</b><br />但這個帳號還沒有加入星辰聯盟的成員名單。
      </div>
      <div className="card" style={{ width:"100%" }}>
        {req === undefined ? <div className="empty">載入中…</div> : req ? (
          <>
            <div style={{ fontSize:fz(17), fontWeight:700, color:"var(--sage)" }}>✓ 已送出開通申請</div>
            <div className="hint">申請人：{req.name}。管理員在「成員」頁開通後，按下方按鈕即可進入，不用重新登入。</div>
            <button className="btn btn-primary btn-lg" style={{ width:"100%", marginTop:14 }} onClick={check} disabled={busy}>{busy ? "檢查中…" : "我已被開通，進入 App"}</button>
          </>
        ) : (
          <form onSubmit={send}>
            <div style={{ fontSize:fz(17), fontWeight:700, marginBottom:10 }}>申請開通</div>
            <label className="input-label" htmlFor="req-name">你的姓名 *</label>
            <input id="req-name" className="input-field" value={name} maxLength={50} onChange={e => setName(e.target.value)} placeholder="王小明" />
            <label className="input-label" htmlFor="req-note">備註（選填）</label>
            <input id="req-note" className="input-field" value={note} maxLength={100} onChange={e => setNote(e.target.value)} placeholder="例：個人賦能班學員、王老師介紹" />
            <button type="submit" className="btn btn-primary btn-lg" style={{ width:"100%" }} disabled={busy}>{busy ? "送出中…" : "送出開通申請"}</button>
          </form>
        )}
        {msg && <div className="login-error" style={{ marginTop:12 }}>{msg}</div>}
      </div>
      <button className="btn" style={{ marginTop:18 }} onClick={logout}>登出，換另一個帳號</button>
    </div>
  );
}

/* ════════════════════════════════════════
   COACH TABS（無成員管理，移至管理員）
════════════════════════════════════════ */
const C_TABS = [
  { key:"home",    label:"總覽", Icon:IcHome  },
  { key:"modules", label:"模組", Icon:IcLayer },
  { key:"assign",  label:"排課", Icon:IcCal   },
  { key:"records", label:"記錄", Icon:IcDoc   },
];

/* ════════════════════════════════════════
   ADMIN SCREENS
════════════════════════════════════════ */
const A_TABS = [
  { key:"home",    label:"總覽",   Icon:IcHome  },
  { key:"members", label:"成員",   Icon:IcUsers },
  { key:"review",  label:"課程管理", Icon:IcLayer },
  { key:"records", label:"交付記錄", Icon:IcDoc  },
  { key:"finance", label:"財務",     Icon:IcCoin },
];

function AHome({ onSwitch }) {
  const { profile, fetchMembers, fetchModules, fetchRecords, ensureJourneys, fetchSessions } = useAuth();
  const [allSessions, setAllSessions] = useState([]);
  useEffect(() => { fetchSessions().then(setAllSessions).catch(() => {}); }, []);
  const mr = monthRange(todayStr().slice(0, 7));
  const monthTotals = totals(summarize(allSessions.filter(s => inRange(s, mr.from, mr.to))));
  const [journeys, setJourneys] = useState([]);
  const [jStudent, setJStudent] = useState(null);
  const [data,    setData]    = useState({ members:[], coaches:[], students:[], modules:[], recentRecords:[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchMembers(),
      fetchModules(),
      fetchRecords(),
    ]).then(([members, modules, records]) => {
      const coaches  = members.filter(m => (m.roles || [m.role]).includes("coach"));
      const students = members.filter(m => m.role === "student");
      ensureJourneys(students).then(setJourneys).catch(() => {});
      const sorted   = records.sort((a,b) => (b.date||"").localeCompare(a.date||""));
      setData({ members, coaches, students, modules, recentRecords: sorted.slice(0,4) });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="screen-enter">
      <div className="content">

        {/* ── 歡迎卡 ── */}
        <div className="card-gold" style={{ marginBottom:12 }}>
          <div style={{ fontFamily:"var(--font)", fontSize:fz(22), fontWeight:600 }}>{profile?.name||"管理員"}</div>
          <div style={{ fontSize:fz(15), color:"rgba(197,162,74,.7)", marginTop:3 }}>iSTAR Alliance 系統管理員</div>
          <div style={{ display:"flex", gap:18, marginTop:14, paddingTop:14, borderTop:"1px solid rgba(197,162,74,.2)" }}>
            {[
              { num: data.members.length, label:"總成員" },
              { num: data.coaches.length, label:"教練" },
              { num: data.students.length, label:"學員" },
              { num: data.modules.length, label:"課程模組" },
            ].map(({ num, label }) => (
              <div key={label} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"var(--font)", fontSize:fz(24), fontWeight:600, color:"var(--gold)" }}>{loading ? "—" : num}</div>
                <div style={{ fontSize:fz(12), color:"rgba(197,162,74,.6)", letterSpacing:".02em", textTransform:"uppercase", marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <PushPrompt />

        {/* ── 本月課程交付 ── */}
        <button className="card deliver-card" onClick={() => onSwitch("records")}>
          <div className="deliver-h"><span>本月課程交付</span><span className="link-btn">查看報表 →</span></div>
          <div className="deliver-row">
            <div><b>{toHours(monthTotals.deliveredMin)}</b><span>實際時數</span></div>
            <div><b>{monthTotals.done}／{monthTotals.total}</b><span>完成堂數</span></div>
            <div><b style={{ color:"var(--sage)" }}>{monthTotals.total ? Math.round(monthTotals.done / monthTotals.total * 100) : 0}%</b><span>交付率</span></div>
            <div><b style={{ color: monthTotals.missed + monthTotals.needOut ? "var(--rust)" : "inherit" }}>{monthTotals.missed + monthTotals.needOut}</b><span>待補</span></div>
          </div>
        </button>

        {/* ── 聯盟成長漏斗：看出哪個階段最需要投入資源 ── */}
        {!loading && <AllianceFunnel journeys={journeys} students={data.students} onOpen={setJStudent} />}

        {/* ── 近期活動：最新成員 ── */}
        {!loading && data.members.length > 0 && (
          <>
            <div className="sec-h" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>成員概況</span>
              <button style={{ fontSize:fz(13), color:"var(--gold)", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--font)" }} onClick={() => onSwitch("members")}>管理全部 →</button>
            </div>
            <div className="card" style={{ padding:"4px 14px" }}>
              {data.members.slice(0,4).map((m, i) => {
                const rc = m.role==="admin"
                  ? { bg:"var(--gold-pale)", color:"var(--gold)", border:"var(--gold-line)", label:"管理員" }
                  : m.role==="coach"
                  ? { bg:"var(--sage-pale)", color:"var(--sage)", border:"rgba(74,123,90,.22)", label:"教練" }
                  : { bg:"var(--slate-pale)", color:"var(--slate)", border:"rgba(58,74,107,.18)", label:"學員" };
                return (
                  <div key={m.uid} className="coach-row" style={i===Math.min(data.members.length,4)-1?{borderBottom:"none"}:{}}>
                    <div className="coach-av" style={(() => { const c=getAvatarColor(m.name||""); return {background:c.bg,color:c.text,fontSize:fz(14)}; })()}>{m.name?.slice(0,2)||"??"}</div>
                    <div style={{ flex:1 }}>
                      <div className="coach-name">{m.name}</div>
                      <div className="coach-tag">{m.email}</div>
                    </div>
                    <span style={{ fontSize:fz(12), fontWeight:700, padding:"2px 8px", borderRadius:"var(--r-pill)", background:rc.bg, color:rc.color, border:`1px solid ${rc.border}`, flexShrink:0 }}>{rc.label}</span>
                  </div>
                );
              })}
              {data.members.length > 4 && (
                <div style={{ textAlign:"center", fontSize:fz(14), color:"var(--ink-3)", padding:"8px 0", borderTop:"1px solid var(--cream-3)" }}>
                  共 {data.members.length} 位成員
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 最近上課記錄 ── */}
        {!loading && data.recentRecords.length > 0 && (
          <>
            <div className="sec-h" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>最近上課記錄</span>
              <button style={{ fontSize:fz(13), color:"var(--gold)", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--font)" }} onClick={() => onSwitch("records")}>查看全部 →</button>
            </div>
            {data.recentRecords.map(r => (
              <div key={r.id} className="card card-sm" style={{ marginBottom:7 }}>
                <div style={{ fontSize:fz(15), fontWeight:600, fontFamily:"var(--font)" }}>{r.topic}</div>
                <div style={{ fontSize:fz(13), color:"var(--ink-3)", marginTop:2 }}>
                  {r.date} · 學員：{r.studentName||"—"} · 教練：{r.coachName||"—"}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── 空狀態 ── */}
        {!loading && data.members.length === 0 && (
          <div className="card" style={{ textAlign:"center", color:"var(--ink-3)", fontSize:fz(15), padding:"28px 16px", lineHeight:1.7 }}>
            系統尚無成員<br />
            <button className="btn btn-primary" style={{ marginTop:14, fontSize:fz(15) }} onClick={() => onSwitch("members")}>
              + 新增第一位成員
            </button>
          </div>
        )}

      </div>
      {jStudent && <StudentJourneySheet student={jStudent} onClose={() => setJStudent(null)} onChanged={() => ensureJourneys(data.students).then(setJourneys)} />}
      <BottomNav tabs={A_TABS} active="home" onSwitch={onSwitch} />
    </div>
  );
}

function AMembers({ onSwitch }) {
  // 與 CMembers 相同邏輯，管理員版
  const { addMember, fetchMembers, updateMember, deleteMember, cleanupStaffFields, profile, fetchAccessRequests, approveAccess, rejectAccess } = useAuth();
  const [members,    setMembers]    = useState([]);
  const [requests,   setRequests]   = useState([]);
  const [approving,  setApproving]  = useState(null);   // 正在開通的申請
  const [tab,        setTab]        = useState("list");
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const blankForm = { name:"",email:"",email2:"",password:"",birthdate:"",coachName:"",courseType:"個人賦能班",joinDate:todayStr(),roles:["student"] };
  const [form, setForm] = useState(blankForm);

  const loadMembers = () => {
    // 順便清掉教練／管理員身上殘留的學員欄位（例如「個人賦能班」）
    fetchMembers().then(async ms => { setMembers(ms); if (await cleanupStaffFields(ms)) fetchMembers().then(setMembers); }).catch(() => {});
    fetchAccessRequests().then(rs => setRequests(rs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))).catch(() => {});
  };
  const startApprove = (r) => { setApproving(r); setEditTarget(null); setForm({ ...blankForm, name: r.name || "", roles:["student"] }); setTab("add"); setResult(null); };
  const handleApprove = async e => {
    e.preventDefault();
    if (!form.name) { setResult({ok:false,msg:"姓名為必填。"}); return; }
    setLoading(true); setResult(null);
    const res = await approveAccess(approving, form);
    setLoading(false);
    if (res.success) { setResult({ ok:true, msg:`${form.name}（${approving.email}）已開通！請通知對方按「我已被開通，進入 App」。` }); setApproving(null); setTab("list"); loadMembers(); }
    else setResult({ ok:false, msg:"開通失敗，請再試一次。" });
  };
  const handleReject = async (r) => { await rejectAccess(r.id); loadMembers(); };
  useEffect(() => { if(tab==="list") loadMembers(); }, [tab]);

  const setField = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleAdd = async e => {
    e.preventDefault();
    if (!form.name||!form.email||!form.password) { setResult({ok:false,msg:"姓名、Email、密碼為必填。"}); return; }
    // 再輸入一次 Email：Email 建立後無法修改，打錯字對方就永遠登入不了
    if (form.email.trim().toLowerCase() !== form.email2.trim().toLowerCase()) { setResult({ok:false,msg:"兩次輸入的 Email 不一樣，請再確認拼字。"}); return; }
    if (form.password.length < 6) { setResult({ok:false,msg:"密碼至少需要 6 個字元。"}); return; }
    setLoading(true); setResult(null);
    const res = await addMember({...form});
    setLoading(false);
    if (res.success) {
      setResult({ ok:true, msg:`${form.name} 已成功新增！`, cred:{ email: form.email.trim().toLowerCase(), password: form.password } });
      setForm({...blankForm,roles:form.roles});
    }
    else setResult({ok:false,msg:res.error === "此 Email 已被使用。" ? "此 Email 已經有登入帳號了。請對方直接用原本的密碼登入並按「送出開通申請」，你再到成員頁的「等待開通」按開通即可。" : res.error});
  };

  const startEdit = m => { setEditTarget(m); setForm({name:m.name||"",email:m.email||"",password:"",birthdate:m.birthdate||"",coachName:m.coachName||"",courseType:m.courseType||"個人賦能班",joinDate:m.joinDate||"",roles:(m.roles && m.roles.length ? m.roles : [m.role||"student"])}); setTab("add"); setResult(null); };

  const handleEdit = async e => {
    e.preventDefault();
    if (!form.name) { setResult({ok:false,msg:"姓名為必填。"}); return; }
    setLoading(true); setResult(null);
    if (editTarget.uid === profile?.uid && !form.roles.includes("admin")) { setLoading(false); setResult({ok:false,msg:"不能移除自己的管理員身分，否則會無法再管理系統。"}); return; }
    const res = await updateMember(editTarget.uid, isStudentForm
      ? {name:form.name,birthdate:form.birthdate,coachName:form.coachName,courseType:form.courseType,joinDate:form.joinDate,roles:form.roles}
      : {name:form.name,joinDate:form.joinDate,roles:form.roles});
    setLoading(false);
    if (res.success) { setResult({ok:true,msg:`${form.name} 資料已更新！`}); setEditTarget(null); loadMembers(); }
    else setResult({ok:false,msg:"更新失敗。"});
  };

  // 學員身分獨立；教練與管理員可以同時擁有
  const toggleRole = (r) => setForm(f => {
    if (r === "student") return { ...f, roles: ["student"] };
    const staff = f.roles.filter(x => x !== "student");
    const next = staff.includes(r) ? staff.filter(x => x !== r) : [...staff, r];
    return { ...f, roles: next.length ? next : [r] };
  });
  const ROLE_NAME = { admin:"管理員", coach:"教練", student:"學員" };
  const isStudentForm = form.roles.includes("student");

  const handleDelete = async uid => {
    const name = members.find(m => m.uid === uid)?.name || "";
    const r = await deleteMember(uid); setConfirmDel(null);
    if (r.success) { setMembers(ms=>ms.filter(m=>m.uid!==uid)); setResult({ ok:true, msg:`${name} 已從成員名單移除。` }); }
    else setResult({ ok:false, msg:"刪除失敗，請再試一次。" });
  };


  const roleColors = { admin:{bg:"var(--gold-pale)",color:"var(--gold)",border:"var(--gold-line)"}, coach:{bg:"var(--sage-pale)",color:"var(--sage)",border:"rgba(74,123,90,.22)"}, student:{bg:"var(--slate-pale)",color:"var(--slate)",border:"rgba(58,74,107,.18)"} };
  const rc = r => roleColors[r] || roleColors.student;

  return (
    <div className="screen-enter">
      {confirmDel && (
        <div style={{ position:"absolute",inset:0,background:"rgba(28,26,23,.5)",backdropFilter:"blur(6px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
          <div style={{ background:"var(--cream)",border:"1px solid var(--cream-3)",borderRadius:"var(--r-xl)",padding:"26px 24px",width:"100%",maxWidth:320 }}>
            <div style={{ fontFamily:"var(--font)",fontSize:fz(20),fontWeight:600,marginBottom:10 }}>確認刪除成員</div>
            <div style={{ fontSize:fz(16),color:"var(--ink-2)",lineHeight:1.65,marginBottom:20 }}>確定要刪除 <strong>{members.find(m=>m.uid===confirmDel)?.name}</strong> 嗎？</div>
            <div className="btn-row" style={{ marginTop:0 }}>
              <button className="btn" onClick={() => setConfirmDel(null)}>取消</button>
              <button className="btn" style={{ background:"var(--rust-pale)",color:"var(--rust)",borderColor:"rgba(139,58,42,.2)" }} onClick={() => handleDelete(confirmDel)}>確認刪除</button>
            </div>
          </div>
        </div>
      )}
      <div className="topbar">
        <div className="topbar-title">成員管理</div>
        <button className={tab==="add"?"btn btn-primary btn-sm":"btn btn-sm"} onClick={() => { if(tab==="add"){setTab("list");setEditTarget(null);setApproving(null);setResult(null);}else{setForm(blankForm);setEditTarget(null);setApproving(null);setTab("add");setResult(null);} }}>
          {tab==="add" ? "← 返回" : "+ 新增成員"}
        </button>
      </div>
      {tab==="list" ? (
        <div className="content">
          {result?.ok && <div className="login-ok">{result.msg}</div>}
          {requests.length > 0 && (
            <div className="alert-card" style={{ background:"#FCEFD2", borderColor:"rgba(138,90,16,.25)" }}>
              <div className="alert-t" style={{ color:"#8A5A10" }}>{requests.length} 個帳號等待開通</div>
              <div className="alert-s">對方已登入但還沒有成員資料，選好身分即可開通</div>
              {requests.map(r => (
                <div key={r.id} className="req-row">
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="hr-name">{r.name || "（未填姓名）"}</div>
                    <div className="hr-sub" style={{ wordBreak:"break-all" }}>{r.email}{r.note ? ` · ${r.note}` : ""}</div>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => startApprove(r)}>開通</button>
                  <button className="btn btn-sm" onClick={() => handleReject(r)}>略過</button>
                </div>
              ))}
            </div>
          )}
          <div className="sec-h">所有成員（{members.length} 人）</div>
          {members.length===0 && <div style={{ textAlign:"center",color:"var(--ink-3)",fontSize:fz(15),marginTop:36,lineHeight:1.7 }}>還沒有成員<br/><span style={{ fontSize:fz(14) }}>點右上角「+ 新增成員」</span></div>}
          {members.map(m => {
            const mRoles = m.roles && m.roles.length ? m.roles : [m.role];
            return (
              <div key={m.uid} className="card card-sm" style={{ marginBottom:8 }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div className="coach-av" style={(() => { const ac=getAvatarColor(m.name||""); return {background:ac.bg,color:ac.text,fontSize:fz(14),flexShrink:0}; })()}>{m.name?.slice(0,2)||"??"}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
                      <span style={{ fontSize:fz(16),fontWeight:600,letterSpacing:"-.01em" }}>{m.name}</span>
                      {mRoles.map(r => { const c = rc(r); return <span key={r} style={{ fontSize:fz(12),fontWeight:700,padding:"2px 7px",borderRadius:"var(--r-pill)",background:c.bg,color:c.color,border:`1px solid ${c.border}` }}>{ROLE_NAME[r]}</span>; })}
                    </div>
                    <div style={{ fontSize:fz(13),color:"var(--ink-3)" }}>{m.email}</div>
                    {mRoles.includes("student") && m.courseType && <div style={{ fontSize:fz(13),color:"var(--ink-3)",marginTop:2 }}>{m.courseType}{m.joinDate?" · "+m.joinDate:""}</div>}
                  </div>
                  <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                    <button className="btn btn-sm" style={{ padding:"5px 10px",fontSize:fz(14) }} onClick={() => startEdit(m)}>編輯</button>
                    <button className="btn btn-sm" style={{ padding:"5px 10px",fontSize:fz(14),color:"var(--rust)",borderColor:"rgba(139,58,42,.2)",background:"var(--rust-pale)" }} onClick={() => setConfirmDel(m.uid)}>刪除</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="content">
          {result && <div style={{ padding:"11px 14px",borderRadius:"var(--r)",marginBottom:14,fontSize:fz(15),textAlign:"center",lineHeight:1.5,background:result.ok?"var(--sage-pale)":"var(--rust-pale)",border:`1px solid ${result.ok?"rgba(74,123,90,.22)":"rgba(139,58,42,.2)"}`,color:result.ok?"var(--sage)":"var(--rust)" }}>
            {result.msg}
            {result.cred && (
              <div className="cred">
                <div>登入 Email：<b>{result.cred.email}</b></div>
                <div>初始密碼：<b>{result.cred.password}</b></div>
                <button type="button" className="btn btn-sm" style={{ marginTop:8 }} onClick={() => {
                  const t = `iSTAR Alliance 星辰聯盟登入資訊\n網址：${location.origin}\n帳號：${result.cred.email}\n密碼：${result.cred.password}`;
                  navigator.clipboard?.writeText(t).then(() => setResult(r => ({ ...r, copied:true }))).catch(() => {});
                }}>{result.copied ? "已複製 ✓" : "複製登入資訊給對方"}</button>
              </div>
            )}
          </div>}
          {editTarget && <div style={{ padding:"7px 12px",background:"var(--slate-pale)",borderRadius:"var(--r)",marginBottom:14,fontSize:fz(15),color:"var(--slate)",border:"1px solid rgba(58,74,107,.18)" }}>✏ 編輯：{editTarget.name}</div>}
          {approving && <div style={{ padding:"10px 12px",background:"#FCEFD2",borderRadius:"var(--r)",marginBottom:14,fontSize:fz(15),color:"#8A5A10",border:"1px solid rgba(138,90,16,.25)",wordBreak:"break-all" }}>開通帳號：<b>{approving.email}</b><br/>登入帳號與密碼沿用對方原本的，不需要再設定。</div>}
          <form onSubmit={approving ? handleApprove : editTarget ? handleEdit : handleAdd}>
            <div className="input-label">身分（教練與管理員可同時勾選）</div>
            <div className="chip-group" style={{ marginBottom:6 }}>
              {[["student","✦ 學員"],["coach","🎓 教練"],["admin","⚙ 管理員"]].map(([r,l]) => (
                <div key={r} className={"chip"+(form.roles.includes(r)?" sel":"")} onClick={() => toggleRole(r)}>{form.roles.includes(r) ? "✓ " : ""}{l}</div>
              ))}
            </div>
            <div style={{ fontSize:fz(14), color:"var(--ink-4)", marginBottom:12 }}>
              {form.roles.length > 1 ? "此帳號登入後可在右上角切換身分" : isStudentForm ? "學員身分無法與教練、管理員同時擁有" : "可再勾選另一個身分"}
            </div>
            <div className="input-label">姓名 *</div>
            <input className="input-field" placeholder="王小明" value={form.name} onChange={e=>setField("name",e.target.value)} />
            {!editTarget && !approving && (
              <>
                <div className="input-label">Email *（登入帳號，建立後無法修改）</div>
                <input className="input-field" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="member@email.com" value={form.email} onChange={e=>setField("email",e.target.value)} />
                <div className="input-label">再輸入一次 Email *</div>
                <input className="input-field" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="避免打錯字" value={form.email2}
                  onChange={e=>setField("email2",e.target.value)} onPaste={e => e.preventDefault()}
                  style={form.email2 && form.email2.trim().toLowerCase() !== form.email.trim().toLowerCase() ? { borderColor:"var(--rust)" } : undefined} />
                {form.email2 && form.email2.trim().toLowerCase() !== form.email.trim().toLowerCase() && <div className="hint" style={{ color:"var(--rust)", marginTop:-4, marginBottom:10 }}>兩次輸入的 Email 不一樣</div>}
                <div className="input-label">初始密碼 *（至少 6 碼）</div>
                <input className="input-field" type="text" placeholder="設定後請告知對方" value={form.password} onChange={e=>setField("password",e.target.value)} />
              </>
            )}
            {isStudentForm && (
              <>
                <div className="input-label">出生年月日</div>
                <input className="input-field" type="date" value={form.birthdate} onChange={e=>setField("birthdate",e.target.value)} />
                <div className="input-label">課程班別</div>
                <div className="chip-group" style={{ marginBottom:12 }}>
                  {COURSE_TYPES.map(c=><div key={c} className={"chip"+(form.courseType===c?" sel":"")} onClick={()=>setField("courseType",c)}>{c}</div>)}
                </div>
                <div className="input-label">加入日期</div>
                <input className="input-field" type="date" value={form.joinDate} onChange={e=>setField("joinDate",e.target.value)} />
                <div className="input-label">主要聯絡教練（選填）</div>
                <input className="input-field" placeholder="留空代表由所有教練共同協助" value={form.coachName} onChange={e=>setField("coachName",e.target.value)} />
              </>
            )}
            <button type="submit" className="btn btn-primary" style={{ width:"100%",justifyContent:"center",marginTop:4 }} disabled={loading}>
              {loading ? "處理中…" : approving ? `✦ 開通為${form.roles.map(r => ROLE_NAME[r]).join("＋")}` : editTarget ? "✦ 儲存變更" : `✦ 確認新增${form.roles.map(r => ROLE_NAME[r]).join("＋")}`}
            </button>
          </form>
        </div>
      )}
      <BottomNav tabs={A_TABS} active="members" onSwitch={onSwitch} />
    </div>
  );
}

/* 管理員：單一模組的完整管理 */
function AdminModuleSheet({ m, coaches, students, onClose, onChanged, onEdit }) {
  const { updateModule, transferModule, deleteModule, fetchModuleUsage } = useAuth();
  const [usage,    setUsage]    = useState(null);
  const [panel,    setPanel]    = useState("");      // "" | "transfer" | "delete"
  const [toCoach,  setToCoach]  = useState("");
  const [typed,    setTyped]    = useState("");
  const [busy,     setBusy]     = useState(false);
  const [msg,      setMsg]      = useState("");
  const color = getCoachModuleColor(m.coachId || "");
  const hidden = m.status === "hidden";
  useEffect(() => { fetchModuleUsage(m.id).then(setUsage); }, [m.id]);
  const names = (usage?.studentUids || []).map(uid => students.find(s => s.uid === uid)?.name || "（已刪除的學員）");
  const upcoming = (usage?.sessions || []).filter(x => !isPast(x)).length;

  const run = async (fn, okMsg, close) => {
    setBusy(true); setMsg("");
    const r = await fn();
    setBusy(false);
    if (r.success) { onChanged(okMsg); if (close) onClose(); else setPanel(""); }
    else setMsg("操作失敗：" + (/permission/i.test(r.error || "") ? "沒有權限" : "請再試一次"));
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet" style={{ maxHeight:"94%" }}>
        <div className="modal-handle" />
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
          <span className="cal-dot" style={{ background: color.border, width:8, height:8 }} />
          <span style={{ fontSize:fz(15), color: color.border, fontWeight:700 }}>{m.coachName || "—"} 教練</span>
          <span className="attend-pill" style={hidden ? { background:"var(--cream-3)", color:"var(--ink-3)" } : { background:"#E3F1E7", color:"#2F6B45" }}>{hidden ? "已下架" : "上架中"}</span>
        </div>
        <div className="modal-title" style={{ marginBottom:8 }}>{m.title}</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
          {(m.stage || []).map(x => <span key={x} className="badge" style={{ background: color.bg, color: color.border, border:`1px solid ${color.border}` }}>{x}</span>)}
          {m.duration && <span className="badge" style={{ background:"var(--cream-2)", color:"var(--ink-3)", border:"1px solid var(--cream-3)" }}>⏱ {m.duration}</span>}
          {(m.method || []).map(x => <span key={x} className="badge" style={{ background:"var(--cream-2)", color:"var(--ink-3)", border:"1px solid var(--cream-3)" }}>{x}</span>)}
        </div>
        {m.outline && <div style={{ fontSize:fz(16), color:"var(--ink-2)", lineHeight:1.7, whiteSpace:"pre-wrap", marginBottom:12 }}>{m.outline}</div>}

        {/* 使用狀況 */}
        <div className="usage">
          <div><b>{usage ? names.length : "…"}</b><span>位學員已分配</span></div>
          <div><b>{usage ? upcoming : "…"}</b><span>堂即將上課</span></div>
          <div><b>{usage ? usage.resources : "…"}</b><span>份學習資料</span></div>
        </div>
        {names.length > 0 && <div className="hint" style={{ marginTop:-4, marginBottom:12 }}>分配給：{names.join("、")}</div>}

        {msg && <div className="login-error">{msg}</div>}

        {/* 主要操作 */}
        {!panel && (
          <div className="adm-acts">
            <button className="btn" onClick={() => onEdit(m)}>✎ 編輯課程資訊</button>
            <button className="btn" disabled={busy} onClick={() => run(() => updateModule(m.id, { status: hidden ? "published" : "hidden" }), hidden ? "已重新上架" : "已下架，學員暫時看不到這個模組")}>
              {hidden ? "↑ 重新上架" : "↓ 下架（暫停使用）"}
            </button>
            <button className="btn" onClick={() => { setPanel("transfer"); setToCoach(""); }}>⇄ 轉移給其他教練</button>
          </div>
        )}
        {panel === "transfer" && (
          <div className="alert-card" style={{ background:"var(--slate-pale)", borderColor:"rgba(58,74,107,.2)" }}>
            <div className="alert-t" style={{ color:"var(--slate)" }}>轉移給其他教練</div>
            <div className="alert-s">學習資料、學員分配都會跟著模組一起轉移，新教練可以編輯。</div>
            <select className="input-field" value={toCoach} onChange={e => setToCoach(e.target.value)} aria-label="選擇新教練">
              <option value="">選擇新教練</option>
              {coaches.filter(c => c.uid !== m.coachId).map(c => <option key={c.uid} value={c.uid}>{c.name}</option>)}
            </select>
            <div className="btn-row" style={{ marginTop:0 }}>
              <button className="btn btn-sm" onClick={() => setPanel("")}>取消</button>
              <button className="btn btn-sm btn-primary" disabled={!toCoach || busy}
                onClick={() => { const c = coaches.find(x => x.uid === toCoach); run(() => transferModule(m.id, c), `已轉移給 ${c.name}`, true); }}>確認轉移</button>
            </div>
          </div>
        )}

        <div className="sec-h">學習資料</div>
        <ResourceManager moduleId={m.id} canManage canAdd />

        {/* 危險操作：收在最下面，要輸入確認 */}
        <div className="danger-zone">
          {panel !== "delete" ? (
            <button className="link-btn" style={{ color:"var(--rust)" }} onClick={() => { setPanel("delete"); setTyped(""); }}>刪除這個模組…</button>
          ) : (
            <>
              <div className="alert-t" style={{ color:"var(--rust)" }}>永久刪除「{m.title}」</div>
              <div className="alert-s">
                會一併刪除 {usage?.resources ?? 0} 份學習資料，並從 {names.length} 位學員的課程中移除，無法復原。
                {upcoming > 0 && ` 還有 ${upcoming} 堂排定的課使用這個模組（課程時段會保留）。`}
                如果只是暫時不用，建議改用「下架」。
              </div>
              <label className="input-label" htmlFor="del-confirm">請輸入「刪除」確認</label>
              <input id="del-confirm" className="input-field" value={typed} onChange={e => setTyped(e.target.value)} placeholder="刪除" />
              <div className="btn-row" style={{ marginTop:0 }}>
                <button className="btn btn-sm" onClick={() => setPanel("")}>取消</button>
                <button className="btn btn-sm danger" disabled={typed.trim() !== "刪除" || busy}
                  onClick={() => run(() => deleteModule(m.id), "模組已刪除", true)}>{busy ? "刪除中…" : "永久刪除"}</button>
              </div>
            </>
          )}
        </div>
        <button className="btn" style={{ width:"100%", marginTop:12, border:"none", background:"none", color:"var(--ink-3)" }} onClick={onClose}>關閉</button>
      </div>
    </div>
  );
}

function AReview({ onSwitch }) {
  const { fetchModules, fetchMembers } = useAuth();
  const [modules,  setModules]  = useState([]);
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [refresh,  setRefresh]  = useState(0);
  const [q,        setQ]        = useState("");
  const [filter,   setFilter]   = useState("");      // "" | "published" | "hidden"
  const [sheetId,  setSheetId]  = useState(null);
  const [editing,  setEditing]  = useState(null);
  const [toast,    setToast]    = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchModules(), fetchMembers()]).then(([ms, mb]) => { setModules(ms); setMembers(mb); setLoading(false); }).catch(() => setLoading(false));
  }, [refresh]);
  const reload = (m) => { if (m) setToast(m); setRefresh(r => r + 1); };

  const coaches  = members.filter(m => rolesOf(m).includes("coach"));
  const students = members.filter(m => rolesOf(m).includes("student"));
  const kw = q.trim().toLowerCase();
  const shown = modules
    .filter(m => !filter || (filter === "hidden" ? m.status === "hidden" : m.status !== "hidden"))
    .filter(m => !kw || [m.title, m.outline, m.coachName, ...(m.stage || [])].join(" ").toLowerCase().includes(kw));
  const hiddenN = modules.filter(m => m.status === "hidden").length;
  const coachN = new Set(modules.map(m => m.coachId)).size;
  const sheet = modules.find(m => m.id === sheetId);

  return (
    <div className="screen-enter">
      <div className="topbar"><div className="topbar-title">課程管理</div></div>
      <div className="content" style={{ paddingTop:4 }}>
        <div className="stats-grid" style={{ gridTemplateColumns:"repeat(3,1fr)" }}>
          <div className="stat-tile"><div className="stat-num gold">{loading ? "—" : modules.length}</div><div className="stat-lbl">課程模組</div></div>
          <div className="stat-tile"><div className="stat-num" style={{ color:"var(--sage)" }}>{loading ? "—" : coachN}</div><div className="stat-lbl">開課教練</div></div>
          <div className="stat-tile"><div className="stat-num" style={{ color:"var(--ink-3)" }}>{loading ? "—" : hiddenN}</div><div className="stat-lbl">已下架</div></div>
        </div>
        <input className="input-field" type="search" placeholder="🔍 搜尋課程名稱、教練、階段" value={q} onChange={e => setQ(e.target.value)} aria-label="搜尋課程" />
        <div className="seg">
          {[["", "全部"], ["published", "上架中"], ["hidden", "已下架"]].map(([k, l]) => <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{l}</button>)}
        </div>
        <div className="hint" style={{ margin:"0 2px 10px" }}>點教練名字展開，點課程進入管理（編輯、學習資料、上下架、轉移、刪除）。管理員可調整每位教練的課程順序。</div>
        {loading ? <div className="empty">載入中…</div> :
          <ModuleGroups modules={shown} canSortAll onOpen={(m) => setSheetId(m.id)} onSaved={reload} showStatus
            emptyText={kw || filter ? "沒有符合條件的課程" : "系統尚無課程模組"} />}
      </div>
      {sheet && !editing && (
        <AdminModuleSheet m={sheet} coaches={coaches} students={students}
          onClose={() => setSheetId(null)} onChanged={reload} onEdit={(m) => setEditing(m)} />
      )}
      {editing && (
        <ModalAddModule editData={editing}
          onClose={(saved) => { setEditing(null); if (saved) reload("課程資訊已更新"); }} />
      )}
      <Toast msg={toast} onDone={() => setToast("")} />
      <BottomNav tabs={A_TABS} active="review" onSwitch={onSwitch} />
    </div>
  );
}


function ARecords({ onSwitch }) {
  const { fetchRecords, fetchSessions } = useAuth();
  const [tab,      setTab]      = useState("hours");
  const [records,  setRecords]  = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [sheet,    setSheet]    = useState(null);
  const [toast,    setToast]    = useState("");
  const [refresh,  setRefresh]  = useState(0);
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRecords(), fetchSessions()]).then(([r, s]) => {
      setRecords(r.sort((a,b) => (b.date||"").localeCompare(a.date||"")));
      setSessions(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [refresh]);
  const future = sortSessions(sessions.filter(s => !isPast(s)));
  const counts = countByStatus(future);
  return (
    <div className="screen-enter">
      <div className="topbar"><div className="topbar-title">交付與記錄</div></div>
      <div className="inner-tabs" style={{ padding:"0 16px" }}>
        <button className={"inner-tab"+(tab==="hours"?" active":"")} onClick={() => setTab("hours")}>時數報表</button>
        <button className={"inner-tab"+(tab==="records"?" active":"")} onClick={() => setTab("records")}>上課記錄</button>
        <button className={"inner-tab"+(tab==="sessions"?" active":"")} onClick={() => setTab("sessions")}>全聯盟課表</button>
      </div>
      <div className="content" style={{ paddingTop:12 }}>
        {loading ? (
          <div className="empty">載入中…</div>
        ) : tab === "hours" ? (
          <HoursReport sessions={sessions} viewer="admin" onOpen={setSheet} />
        ) : tab === "sessions" ? (
          <>
            <div className="filter-row">
              {["pending","reschedule","open","confirmed"].map(k => (
                <span key={k} className="filter-chip" style={{ color: SESSION_STATUS[k].color, cursor:"default" }}>
                  {SESSION_STATUS[k].label} <span className="n" style={{ background: SESSION_STATUS[k].bg, color: SESSION_STATUS[k].color }}>{counts[k] || 0}</span>
                </span>
              ))}
            </div>
            {future.length === 0
              ? <div className="empty">目前沒有即將到來的課程</div>
              : future.map(s => <SessionItem key={s.id} s={s} viewer="admin" onOpen={setSheet} showDate />)}
          </>
        ) : records.length === 0 ? (
          <div className="empty">尚無上課記錄</div>
        ) : records.map(r => (
          <div key={r.id} className="card" style={{ marginBottom:10 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
              <div>
                <div style={{ fontSize:fz(17),fontWeight:600,fontFamily:"var(--font)" }}>{r.topic}</div>
                <div style={{ fontSize:fz(14),color:"var(--ink-3)",marginTop:2 }}>
                  {r.date} · 學員：{r.studentName||"—"} · 教練：{r.coachName||"—"}
                </div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0,marginLeft:8 }}>
                {r.visibleStudent && <span className="badge badge-teal" style={{ fontSize:fz(12) }}>學員可見</span>}
              </div>
            </div>
            {r.feedback && <div className="record-note"><div className="record-note-label" style={{ color:"var(--sage)" }}>給學員的回饋</div>{r.feedback}</div>}
            {r.privateNote && <div className="record-note coach-only" style={{ marginTop:6 }}><div className="record-note-label" style={{ color:"var(--gold)" }}>教練私密備註</div>{r.privateNote}</div>}
          </div>
        ))}
      </div>
      {sheet && <SessionSheet s={sheet} viewer="admin" onClose={() => setSheet(null)} onChanged={(m) => { setToast(m); setRefresh(x => x + 1); }} />}
      <Toast msg={toast} onDone={() => setToast("")} />
      <BottomNav tabs={A_TABS} active="records" onSwitch={onSwitch} />
    </div>
  );
}

/* ════════════════════════════════════════
   財務管理（管理員）
   公積金 = 已收金額 − 教練分潤 − 其他支出
════════════════════════════════════════ */

function MoneyInput({ value, onChange, id, placeholder = "0" }) {
  return (
    <div className="money-wrap">
      <span>NT$</span>
      <input id={id} className="input-field" inputMode="numeric" placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value.replace(/[^\d,]/g, ""))} />
    </div>
  );
}

/* 新增／編輯：收款、分潤、支出 共用 */
function FinFormSheet({ kind, init, students, coaches, onClose, onSaved }) {
  const { finAdd, finUpdate } = useAuth();
  const isEdit = !!init?.id;
  const [f, setF] = useState(() => ({
    studentUid: "", coachId: "", item: "", category: "其他", method: "匯款", note: "", status: "pending",
    date: todayStr(), period: todayStr().slice(0, 7), ...init, amount: init?.amount != null ? String(init.amount) : "",
  }));
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const title = { payment: "登記收款", payout: "教練分潤", expense: "新增支出" }[kind];
  const save = async () => {
    const amount = parseAmount(f.amount);
    if (!(amount > 0)) { setErr("請輸入正確的金額"); return; }
    let data;
    if (kind === "payment") {
      const st = students.find(x => x.uid === f.studentUid);
      if (!st) { setErr("請選擇學員"); return; }
      if (!f.date) { setErr("請選擇收款日期"); return; }
      data = { studentUid: st.uid, studentName: st.name, amount, date: f.date, method: f.method, note: f.note.trim() };
    } else if (kind === "payout") {
      const c = coaches.find(x => x.uid === f.coachId);
      if (!c) { setErr("請選擇教練"); return; }
      if (!f.period) { setErr("請選擇分潤月份"); return; }
      data = { coachId: c.uid, coachName: c.name, amount, period: f.period, date: f.period + "-01", note: f.note.trim(),
               status: f.status || "pending", hours: f.hours ?? null, rate: f.rate ?? null };
    } else {
      if (!f.item.trim()) { setErr("請填寫支出項目"); return; }
      if (!f.date) { setErr("請選擇日期"); return; }
      data = { item: f.item.trim(), category: f.category, amount, date: f.date, note: f.note.trim() };
    }
    setBusy(true); setErr("");
    const col = { payment: "payments", payout: "payouts", expense: "expenses" }[kind];
    const r = isEdit ? await finUpdate(col, init.id, data) : await finAdd(col, data);
    setBusy(false);
    if (r.success) onSaved(isEdit ? "已更新 ✓" : `${title}已儲存 ✓`); else setErr("儲存失敗：" + (/permission/i.test(r.error || "") ? "沒有權限" : "請再試一次"));
  };
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">{isEdit ? "編輯" : ""}{title}</div>
        {err && <div className="login-error">{err}</div>}
        {kind === "payment" && (
          <>
            <label className="input-label" htmlFor="fin-st">學員 *</label>
            <select id="fin-st" className="input-field" value={f.studentUid} onChange={e => set("studentUid", e.target.value)}>
              <option value="">選擇學員</option>
              {students.map(x => <option key={x.uid} value={x.uid}>{x.name}{x.courseType ? `（${x.courseType}）` : ""}</option>)}
            </select>
          </>
        )}
        {kind === "payout" && (
          <>
            <label className="input-label" htmlFor="fin-c">教練 *</label>
            <select id="fin-c" className="input-field" value={f.coachId} onChange={e => set("coachId", e.target.value)}>
              <option value="">選擇教練</option>
              {coaches.map(x => <option key={x.uid} value={x.uid}>{x.name}</option>)}
            </select>
          </>
        )}
        {kind === "expense" && (
          <>
            <label className="input-label" htmlFor="fin-item">支出項目 *</label>
            <input id="fin-item" className="input-field" value={f.item} onChange={e => set("item", e.target.value)} placeholder="例：10 月場地租金" />
            <div className="input-label">類別</div>
            <div className="chip-group">{EXPENSE_CATS.map(c => <button type="button" key={c} className={"chip" + (f.category === c ? " sel" : "")} onClick={() => set("category", c)}>{c}</button>)}</div>
          </>
        )}
        <label className="input-label" htmlFor="fin-amt">金額 *</label>
        <MoneyInput id="fin-amt" value={f.amount} onChange={v => set("amount", v)} />
        {f.hours != null && kind === "payout" && <div className="hint" style={{ marginTop:-4, marginBottom:10 }}>試算依據：{f.hours} 小時 × NT$ {f.rate}</div>}
        {kind === "payout" ? (
          <>
            <label className="input-label" htmlFor="fin-per">分潤月份 *</label>
            <input id="fin-per" className="input-field" type="month" value={f.period} onChange={e => set("period", e.target.value)} />
          </>
        ) : (
          <>
            <label className="input-label" htmlFor="fin-date">{kind === "payment" ? "收款日期" : "支出日期"} *</label>
            <input id="fin-date" className="input-field" type="date" value={f.date} onChange={e => set("date", e.target.value)} />
          </>
        )}
        {kind === "payment" && (
          <>
            <div className="input-label">收款方式</div>
            <div className="chip-group">{PAY_METHODS.map(m => <button type="button" key={m} className={"chip" + (f.method === m ? " sel" : "")} onClick={() => set("method", m)}>{m}</button>)}</div>
          </>
        )}
        <label className="input-label" htmlFor="fin-note">備註</label>
        <input id="fin-note" className="input-field" value={f.note} onChange={e => set("note", e.target.value)}
          placeholder={kind === "payment" ? "例：第一期學費、帳號末五碼 12345" : kind === "payout" ? "例：10 月個人賦能班" : "選填"} />
        <button className="btn btn-primary btn-lg" style={{ width:"100%", marginTop:4 }} disabled={busy} onClick={save}>{busy ? "儲存中…" : "儲存"}</button>
        <button className="btn" style={{ width:"100%", marginTop:8, border:"none", background:"none" }} onClick={onClose}>取消</button>
      </div>
    </div>
  );
}

/* 單一學員：應收學費設定＋收款紀錄 */
function StudentPaySheet({ bal, payments, onClose, onAddPay, onChanged }) {
  const { setFinanceSetting, finDelete } = useAuth();
  const [due, setDue] = useState(bal.due ? String(bal.due) : "");
  const [msg, setMsg] = useState(""); const [armed, setArmed] = useState("");
  const list = payments.filter(p => p.studentUid === bal.uid);
  const saveDue = async () => {
    const v = due === "" ? 0 : parseAmount(due);
    if (Number.isNaN(v)) { setMsg("金額格式不正確"); return; }
    const r = await setFinanceSetting(`tuition.${bal.uid}`, v, bal.name);
    setMsg(r.success ? "應收學費已更新 ✓" : "儲存失敗"); if (r.success) onChanged();
  };
  const del = async (p) => {
    if (armed !== p.id) { setArmed(p.id); setTimeout(() => setArmed(a => a === p.id ? "" : a), 3000); return; }
    await finDelete("payments", p.id); onChanged();
  };
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title" style={{ marginBottom:4 }}>{bal.name}</div>
        <div className="hint" style={{ marginTop:0, marginBottom:14 }}>{bal.courseType || "—"}</div>
        <div className="fin-bal">
          <div><span>應收</span><b>{fmtMoney(bal.due)}</b></div>
          <div><span>已收</span><b style={{ color:"var(--sage)" }}>{fmtMoney(bal.paid)}</b></div>
          <div><span>{bal.over ? "溢收" : "未收"}</span><b style={{ color: bal.owed ? "var(--rust)" : "var(--ink)" }}>{fmtMoney(bal.over || bal.owed)}</b></div>
        </div>
        <label className="input-label" htmlFor="due">應收學費（課程總金額）</label>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ flex:1 }}><MoneyInput id="due" value={due} onChange={setDue} /></div>
          <button className="btn" style={{ height:48 }} onClick={saveDue}>儲存</button>
        </div>
        {msg && <div className="hint" style={{ marginTop:0 }}>{msg}</div>}
        <button className="btn btn-primary btn-lg" style={{ width:"100%", marginTop:10 }} onClick={() => onAddPay(bal.uid)}>＋ 登記這位學員的收款</button>
        <div className="sec-h">收款紀錄（{list.length}）</div>
        {list.length === 0 ? <div className="card empty">還沒有收款紀錄</div> : list.map(p => (
          <div key={p.id} className="fin-row">
            <div style={{ flex:1, minWidth:0 }}>
              <div className="fin-t">{fmtMoney(p.amount)}</div>
              <div className="fin-s">{p.date} · {p.method || "—"}{p.note ? ` · ${p.note}` : ""}</div>
            </div>
            <button className={"btn btn-sm" + (armed === p.id ? " danger" : "")} onClick={() => del(p)}>{armed === p.id ? "確定刪除" : "刪除"}</button>
          </div>
        ))}
        <button className="btn" style={{ width:"100%", marginTop:10, border:"none", background:"none" }} onClick={onClose}>關閉</button>
      </div>
    </div>
  );
}

/* 財務異動紀錄：誰、什麼時候、改了什麼（只能看，不能改） */
const FIN_FIELD = { amount:"金額", status:"狀態", date:"日期", method:"方式", note:"備註", item:"項目", category:"類別",
  period:"月份", coachName:"教練", studentName:"學員", paidAt:"匯款日", hours:"時數", rate:"每小時分潤" };
const finVal = (k, v) => v == null || v === "" ? "（空）" : k === "amount" || k === "rate" ? fmtMoney(v) : k === "status" ? (v === "paid" ? "已匯款" : "待匯款") : String(v);
function describeLog(l) {
  const d = l.after || l.before || {};
  const who = d.studentName || d.coachName || d.item || "";
  const head = { create:"新增", update:"修改", delete:"刪除", setting:"設定" }[l.action] || l.action;
  if (l.action === "setting") {
    const g = l.setting; const b = (l.before || {})[g], a = (l.after || {})[g];
    return { title: `${g === "tuition" ? "應收學費" : "每小時分潤"}：${l.target || "—"}`, lines: [`${b == null ? "（未設定）" : fmtMoney(b)} → ${fmtMoney(a)}`], head };
  }
  const title = `${l.colLabel}：${who}${d.amount != null && l.action !== "update" ? " " + fmtMoney(d.amount) : ""}`;
  if (l.action !== "update") {
    const extra = [d.date || d.period, d.method || d.category, d.status ? finVal("status", d.status) : "", d.note].filter(Boolean).join(" · ");
    return { title, lines: extra ? [extra] : [], head };
  }
  const lines = Object.keys(FIN_FIELD).filter(k => JSON.stringify((l.before || {})[k] ?? null) !== JSON.stringify((l.after || {})[k] ?? null))
    .map(k => `${FIN_FIELD[k]}：${finVal(k, (l.before || {})[k])} → ${finVal(k, (l.after || {})[k])}`);
  return { title, lines: lines.length ? lines : ["（內容未變更）"], head };
}
function FinanceLogList({ refresh }) {
  const { fetchFinanceLogs } = useAuth();
  const [logs, setLogs] = useState(null);
  const [kind, setKind] = useState("");
  useEffect(() => { fetchFinanceLogs().then(setLogs); }, [refresh]);
  if (!logs) return <div className="empty">載入中…</div>;
  const shown = logs.filter(l => !kind || (kind === "setting" ? l.action === "setting" : l.col === kind));
  return (
    <>
      <div className="hint" style={{ margin:"0 2px 10px" }}>所有收款、分潤、支出與設定的變更都會自動記錄，紀錄無法修改或刪除。顯示最近 300 筆。</div>
      <div className="filter-row">
        {[["","全部"],["payments","收款"],["payouts","教練分潤"],["expenses","支出"],["setting","設定"]].map(([k,l]) =>
          <button key={k} className={"filter-chip" + (kind === k ? " on" : "")} style={{ color: kind === k ? "var(--gold)" : "var(--ink-2)" }} onClick={() => setKind(k)}>{l}</button>)}
      </div>
      {shown.length === 0 ? <div className="card empty">還沒有異動紀錄</div> : (
        <div className="card" style={{ padding:"4px 14px" }}>
          {shown.map(l => { const d = describeLog(l); return (
            <div key={l.id} className="log-row">
              <span className={"log-tag " + l.action}>{d.head}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="log-t">{d.title}</div>
                {d.lines.map((x, i) => <div key={i} className="log-s">{x}</div>)}
                <div className="log-meta">{l.byName || "—"} · {fmtDateTime(l.at) || "剛剛"}</div>
              </div>
            </div>
          ); })}
        </div>
      )}
    </>
  );
}

function AFinance({ onSwitch }) {
  const { fetchFinance, fetchMembers, fetchSessions, finAdd, finUpdate, finDelete, setFinanceSetting } = useAuth();
  const [data,     setData]     = useState({ payments:[], payouts:[], expenses:[], settings:{ tuition:{}, rates:{} } });
  const [members,  setMembers]  = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState("");
  const [refresh,  setRefresh]  = useState(0);
  const [period,   setPeriod]   = useState(todayStr().slice(0, 7));
  const [tab,      setTab]      = useState("income");
  const [form,     setForm]     = useState(null);     // { kind, init }
  const [stu,      setStu]      = useState(null);     // 學員收款明細
  const [poFilter, setPoFilter] = useState("");
  const [armed,    setArmed]    = useState("");
  const [rates,    setRates]    = useState({});
  const [toast,    setToast]    = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchFinance(), fetchMembers(), fetchSessions()]).then(([d, m, s]) => {
      setData(d); setMembers(m); setSessions(s); setRates(r => ({ ...d.settings.rates, ...r })); setErr(""); setLoading(false);
    }).catch(e => { setErr(/permission/i.test(e.message || "") ? "沒有讀取財務資料的權限（需要發布最新的安全規則）。" : "載入失敗，請重新整理。"); setLoading(false); });
  }, [refresh]);
  const reload = (msg) => { if (msg) setToast(msg); setRefresh(r => r + 1); };

  const students = members.filter(m => rolesOf(m).includes("student"));
  const coaches  = members.filter(m => rolesOf(m).includes("coach"));
  const sum = financeSummary(data, period);
  const months = periodOptions(data, todayStr());
  const year = todayStr().slice(0, 4);
  const pLabel = !period ? "全部期間" : /^\d{4}$/.test(period) ? `${period} 全年` : `${Number(period.slice(5))} 月`;
  const balances = studentBalances(students, data.payments, data.settings.tuition);
  const owedTotal = balances.reduce((t, b) => t + b.owed, 0);
  const isMonth = /^\d{4}-\d{2}$/.test(period);
  const sugs = isMonth ? payoutSuggestions(sessions, period, rates, data.payouts) : [];
  const inP = (x, f = "date") => inPeriod(x[f], period);
  const periodPayouts = data.payouts.filter(o => inPeriod(o.period ? o.period + "-01" : o.date, period))
    .filter(o => !poFilter || (poFilter === "paid" ? o.status === "paid" : o.status !== "paid"));

  const arm = (id, fn) => { if (armed !== id) { setArmed(id); setTimeout(() => setArmed(a => a === id ? "" : a), 3000); return; } setArmed(""); fn(); };
  const markPaid = async (o, paid) => {
    const r = await finUpdate("payouts", o.id, paid ? { status:"paid", paidAt: todayStr() } : { status:"pending", paidAt: "" });
    if (r.success && paid) notify("payout_paid", { id: o.id });
    reload(r.success ? (paid ? `已標記 ${o.coachName} 已匯款 ✓` : "已改回待匯款") : "更新失敗");
  };
  const saveRate = async (cid) => {
    const v = rates[cid] === "" ? 0 : parseAmount(rates[cid]);
    if (Number.isNaN(v)) return;
    await setFinanceSetting(`rates.${cid}`, v, coaches.find(c => c.uid === cid)?.name || "");
  };
  const createFromSug = async (g) => {
    if (!(g.amount > 0)) { setToast("請先填寫每小時分潤"); return; }
    await saveRate(g.coachId);
    const r = await finAdd("payouts", { coachId: g.coachId, coachName: g.coachName, amount: g.amount, period, date: period + "-01",
      hours: g.hours, rate: g.rate, sessions: g.sessions, note: `${Number(period.slice(5))} 月完成交付 ${g.sessions} 堂`, status: "pending" });
    reload(r.success ? `已建立 ${g.coachName} 的分潤（待匯款）` : "建立失敗");
  };
  const download = () => {
    const blob = new Blob([financeCsv(data, period)], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `iSTAR財務_${period || "全部"}.csv`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="screen-enter">
      <div className="topbar"><div className="topbar-title">財務管理</div></div>
      <div className="content">
        {err && <div className="login-error">{err}</div>}
        <div className="filter-row">
          {months.map(m => <button key={m} className={"filter-chip" + (period === m ? " on" : "")} style={{ color: period === m ? "var(--gold)" : "var(--ink-2)" }} onClick={() => setPeriod(m)}>{Number(m.slice(5))} 月{m.slice(0,4) !== year ? ` ${m.slice(0,4)}` : ""}</button>)}
          <button className={"filter-chip" + (period === year ? " on" : "")} style={{ color: period === year ? "var(--gold)" : "var(--ink-2)" }} onClick={() => setPeriod(year)}>{year} 全年</button>
          <button className={"filter-chip" + (!period ? " on" : "")} style={{ color: !period ? "var(--gold)" : "var(--ink-2)" }} onClick={() => setPeriod("")}>全部</button>
        </div>

        {/* 公積金計算 */}
        <div className="fund-card">
          <div className="fund-k">星辰聯盟公積金 · {pLabel}</div>
          <div className="fund-v" style={{ color: sum.fund < 0 ? "var(--rust)" : "var(--sage)" }}>{loading ? "—" : fmtMoney(sum.fund)}</div>
          <div className="fund-lines">
            <div><span>已收金額</span><b>{fmtMoney(sum.received)}</b></div>
            <div><span>− 教練分潤</span><b>{fmtMoney(sum.payout)}</b></div>
            {sum.payoutPending > 0 && <div className="sub"><span>其中待匯款</span><b style={{ color:"#8A5A10" }}>{fmtMoney(sum.payoutPending)}</b></div>}
            <div><span>− 其他支出</span><b>{fmtMoney(sum.expense)}</b></div>
            <div className="eq"><span>＝ 公積金</span><b>{fmtMoney(sum.fund)}</b></div>
          </div>
          <button className="link-btn" onClick={download}>⬇ 匯出本期明細 CSV</button>
        </div>

        <div className="inner-tabs" style={{ margin:"4px -16px 12px", padding:"0 16px" }}>
          <button className={"inner-tab" + (tab === "income" ? " active" : "")} onClick={() => setTab("income")}>收款</button>
          <button className={"inner-tab" + (tab === "payout" ? " active" : "")} onClick={() => setTab("payout")}>教練分潤{sum.counts.pending ? <span className="tab-n">{sum.counts.pending}</span> : null}</button>
          <button className={"inner-tab" + (tab === "expense" ? " active" : "")} onClick={() => setTab("expense")}>支出</button>
          <button className={"inner-tab" + (tab === "log" ? " active" : "")} onClick={() => setTab("log")}>異動紀錄</button>
        </div>

        {loading ? <div className="empty">載入中…</div> : tab === "log" ? (
          <FinanceLogList refresh={refresh} />
        ) : tab === "income" ? (
          <>
            <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={() => setForm({ kind:"payment" })}>＋ 登記收款</button>
            <div className="sec-h">學員收款狀況<span className="sec-note">未收合計 {fmtMoney(owedTotal)}</span></div>
            {balances.length === 0 ? <div className="card empty">還沒有學員</div> : (
              <div className="card" style={{ padding:"4px 14px" }}>
                {balances.map(b => (
                  <button key={b.uid} className="hr-row" onClick={() => setStu(b)}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="hr-name">{b.name}</div>
                      <div className="hr-sub">已收 {fmtMoney(b.paid)}{b.due ? ` ／ 應收 ${fmtMoney(b.due)}` : " · 尚未設定應收學費"}</div>
                      {b.due > 0 && <div className="prog-track" style={{ marginTop:6 }}><div className="prog-fill" style={{ width:`${Math.min(100, Math.round(b.paid / b.due * 100))}%`, background: b.owed ? "var(--gold)" : "var(--sage)" }} /></div>}
                    </div>
                    <div className="fin-owed">{b.owed ? <><span>未收</span>{fmtMoney(b.owed)}</> : b.due ? <span className="ok">✓ 已收齊</span> : <span>設定 ›</span>}</div>
                  </button>
                ))}
              </div>
            )}
            <div className="sec-h">{pLabel}收款明細</div>
            {data.payments.filter(x => inP(x)).length === 0 ? <div className="card empty">這段期間沒有收款</div> :
              data.payments.filter(x => inP(x)).map(p => (
                <div key={p.id} className="fin-row card">
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="fin-t">{p.studentName} <span className="fin-amt in">+{fmtMoney(p.amount)}</span></div>
                    <div className="fin-s">{p.date} · {p.method || "—"}{p.note ? ` · ${p.note}` : ""}</div>
                  </div>
                  <button className="btn btn-sm" onClick={() => setForm({ kind:"payment", init:p })}>編輯</button>
                </div>
              ))}
          </>
        ) : tab === "payout" ? (
          <>
            {isMonth && (
              <div className="card" style={{ borderLeft:"3px solid var(--gold)" }}>
                <div className="alert-t">依 {Number(period.slice(5))} 月完成交付的時數試算</div>
                <div className="hint" style={{ marginTop:2 }}>只計算已簽到＋簽退的課程。填好每位教練的每小時分潤，按「建立分潤」即產生待匯款紀錄。</div>
                {sugs.length === 0 ? <div className="empty" style={{ padding:"14px 0 4px" }}>這個月還沒有完成交付的課程</div> : sugs.map(g => (
                  <div key={g.coachId} className="sug-row">
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="hr-name">{g.coachName}</div>
                      <div className="hr-sub">{g.sessions} 堂 · {g.hours} 小時</div>
                    </div>
                    <div className="sug-rate">
                      <span>每小時</span>
                      <input className="input-field" inputMode="numeric" value={rates[g.coachId] ?? ""} placeholder="0" aria-label={`${g.coachName} 每小時分潤`}
                        onChange={e => setRates(r => ({ ...r, [g.coachId]: e.target.value.replace(/[^\d]/g, "") }))} onBlur={() => saveRate(g.coachId)} />
                    </div>
                    <div className="sug-act">
                      <b>{fmtMoney(g.amount)}</b>
                      {g.existing.length
                        ? <span className="hint" style={{ margin:0 }}>已建立</span>
                        : <button className="btn btn-sm btn-gold" onClick={() => createFromSug(g)}>建立分潤</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="btn" style={{ width:"100%", marginBottom:4 }} onClick={() => setForm({ kind:"payout", init:{ period: isMonth ? period : todayStr().slice(0,7) } })}>＋ 手動新增分潤</button>
            <div className="seg" style={{ marginTop:12 }}>
              {[["","全部"],["pending","待匯款"],["paid","已匯款"]].map(([k,l]) => <button key={k} className={poFilter === k ? "on" : ""} onClick={() => setPoFilter(k)}>{l}</button>)}
            </div>
            {periodPayouts.length === 0 ? <div className="card empty">沒有分潤紀錄</div> : periodPayouts.map(o => (
              <div key={o.id} className={"card po-card" + (o.status === "paid" ? " paid" : "")}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
                  <div style={{ minWidth:0 }}>
                    <div className="hr-name">{o.coachName}</div>
                    <div className="fin-s">{o.period ? `${o.period.replace("-", " 年 ")} 月` : o.date}{o.hours ? ` · ${o.hours} 小時 × NT$ ${o.rate}` : ""}{o.note ? ` · ${o.note}` : ""}</div>
                  </div>
                  <span className="attend-pill" style={o.status === "paid" ? { background:"#E3F1E7", color:"#2F6B45" } : { background:"#FCEFD2", color:"#8A5A10" }}>{o.status === "paid" ? "已匯款" : "待匯款"}</span>
                </div>
                <div className="po-amt">{fmtMoney(o.amount)}</div>
                {o.status === "paid" && <div className="fin-s">匯款日期：{o.paidAt || "—"}</div>}
                <div className="btn-row">
                  {o.status === "paid"
                    ? <button className="btn btn-sm" onClick={() => markPaid(o, false)}>改回待匯款</button>
                    : <button className="btn btn-sm btn-primary" onClick={() => markPaid(o, true)}>✓ 確認已匯款</button>}
                  <button className="btn btn-sm" onClick={() => setForm({ kind:"payout", init:o })}>編輯</button>
                  <button className={"btn btn-sm" + (armed === o.id ? " danger" : "")} onClick={() => arm(o.id, async () => { await finDelete("payouts", o.id); reload("已刪除"); })}>{armed === o.id ? "確定刪除" : "刪除"}</button>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={() => setForm({ kind:"expense" })}>＋ 新增支出</button>
            <div className="sec-h">{pLabel}支出<span className="sec-note">合計 {fmtMoney(sum.expense)}</span></div>
            {data.expenses.filter(x => inP(x)).length === 0 ? <div className="card empty">這段期間沒有支出</div> :
              data.expenses.filter(x => inP(x)).map(x => (
                <div key={x.id} className="fin-row card">
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="fin-t">{x.item} <span className="fin-amt out">−{fmtMoney(x.amount)}</span></div>
                    <div className="fin-s">{x.date} · {x.category || "其他"}{x.note ? ` · ${x.note}` : ""}</div>
                  </div>
                  <button className="btn btn-sm" onClick={() => setForm({ kind:"expense", init:x })}>編輯</button>
                  <button className={"btn btn-sm" + (armed === x.id ? " danger" : "")} onClick={() => arm(x.id, async () => { await finDelete("expenses", x.id); reload("已刪除"); })}>{armed === x.id ? "確定" : "刪除"}</button>
                </div>
              ))}
          </>
        )}
      </div>
      {form && <FinFormSheet kind={form.kind} init={form.init} students={students} coaches={coaches} onClose={() => setForm(null)} onSaved={(m) => { setForm(null); reload(m); }} />}
      {stu && <StudentPaySheet bal={balances.find(b => b.uid === stu.uid) || stu} payments={data.payments} onClose={() => setStu(null)}
        onAddPay={(uid) => { setStu(null); setForm({ kind:"payment", init:{ studentUid: uid } }); }} onChanged={() => reload()} />}
      <Toast msg={toast} onDone={() => setToast("")} />
      <BottomNav tabs={A_TABS} active="finance" onSwitch={onSwitch} />
    </div>
  );
}

/* ── 手機推播通知 ── */
const PUSH_TEXT = {
  on: "已開啟", off: "未開啟", denied: "已被瀏覽器封鎖", unsupported: "這台裝置不支援", "ios-install": "需先加入主畫面", "not-ready": "系統尚未啟用",
};
function PushPrompt() {
  const [st,   setSt]   = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg]  = useState("");
  const [hide, setHide] = useState(promptDismissed());
  useEffect(() => { pushStatus().then(setSt).catch(() => setSt("unsupported")); }, []);
  if (hide || !st || st === "on" || st === "unsupported" || st === "denied" || st === "not-ready") return null;
  const close = () => { dismissPrompt(); setHide(true); };
  if (st === "ios-install") return (
    <div className="push-card">
      <div className="alert-t">🔔 想收到上課與排課通知？</div>
      <div className="alert-s">iPhone 要先把 App 加入主畫面：在 Safari 按下方「分享」→「加入主畫面」，之後從主畫面的 iSTAR 圖示打開，就能開啟通知。</div>
      <button className="btn btn-sm" onClick={close}>知道了</button>
    </div>
  );
  const on = async () => {
    setBusy(true); setMsg("");
    const r = await enablePush();
    setBusy(false);
    if (r.ok) { setSt("on"); return; }
    setMsg(r.reason === "denied" ? "你拒絕了通知權限，可到手機的瀏覽器設定重新允許。" : r.reason === "dismissed" ? "" : "開啟失敗，請稍後再試。");
  };
  return (
    <div className="push-card">
      <div className="alert-t">🔔 開啟手機通知</div>
      <div className="alert-s">排課、上課提醒、簽到、回饋、匯款等消息，會直接跳出通知給你，不用一直打開 App 查看。</div>
      {msg && <div className="hint" style={{ color:"var(--rust)", marginTop:0, marginBottom:8 }}>{msg}</div>}
      <div className="btn-row" style={{ marginTop:0 }}>
        <button className="btn btn-sm" onClick={close}>以後再說</button>
        <button className="btn btn-sm btn-primary" disabled={busy} onClick={on}>{busy ? "開啟中…" : "開啟通知"}</button>
      </div>
    </div>
  );
}
function PushSetting() {
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { pushStatus().then(setSt).catch(() => setSt("unsupported")); }, []);
  const toggle = async () => {
    setBusy(true);
    if (st === "on") await disablePush(); else await enablePush();
    setSt(await pushStatus()); setBusy(false);
  };
  return (
    <>
      <div className="role-menu-h" style={{ marginTop:6 }}>手機通知</div>
      <button className={"fs-opt" + (st === "on" ? " on" : "")} disabled={busy || !st || st === "unsupported" || st === "denied" || st === "ios-install" || st === "not-ready"} onClick={toggle}
        role="menuitemcheckbox" aria-checked={st === "on"}>
        <span>{busy ? "處理中…" : st === "on" ? "通知：開啟中" : "開啟通知"}</span>
        <span className="hint" style={{ margin:0 }}>{st ? (st === "on" ? "按一下關閉" : PUSH_TEXT[st]) : "…"}</span>
      </button>
    </>
  );
}

/* ── 字級設定（存在這台裝置）── */
const FS_OPTIONS = [["1", "標準"], ["1.12", "大"], ["1.25", "特大"]];
const FS_KEY = "istar.fontScale";
function applyFontScale(v) { document.documentElement.style.setProperty("--fs", v); }
function TextSizeControl({ showPush }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(() => { try { return localStorage.getItem(FS_KEY) || "1"; } catch { return "1"; } });
  useEffect(() => { applyFontScale(val); }, [val]);
  const pick = (v) => { setVal(v); try { localStorage.setItem(FS_KEY, v); } catch {} setOpen(false); };
  return (
    <div style={{ position:"relative" }}>
      <button className="fs-btn" onClick={() => setOpen(o => !o)} aria-label={showPush ? "字級與通知設定" : "調整字級"} aria-expanded={open}>Aa</button>
      {open && (
        <>
          <div style={{ position:"fixed", inset:0, zIndex:60 }} onClick={() => setOpen(false)} />
          <div className="fs-menu" role="menu">
            <div className="role-menu-h">字級大小</div>
            {FS_OPTIONS.map(([v, l]) => (
              <button key={v} role="menuitemradio" aria-checked={val === v} className={"fs-opt" + (val === v ? " on" : "")} onClick={() => pick(v)}>
                <span style={{ fontSize:`calc(16px * ${v})` }}>{l}</span>{val === v && <span>✓</span>}
              </button>
            ))}
            {showPush && <PushSetting />}
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   ROOT APP
════════════════════════════════════════ */
export default function App() {
  const { user, profile, role, roles, switchRole, loading, logout } = useAuth();
  const [roleMenu, setRoleMenu] = useState(false);
  const [sTab,  setSTab]  = useState("home");
  const [cTab,  setCTab]  = useState("home");
  const [aTab,  setATab]  = useState("home");
  const [modal, setModal] = useState(null);

  const openModal  = (type, onSuccess, payload) => setModal({ type, onSuccess: onSuccess || null, ...(payload || {}) });
  const closeModal = (didSave, result) => {
    if (didSave && modal?.onSuccess) modal.onSuccess(result);
    setModal(null);
  };

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  const renderStudent = () => {
    switch(sTab) {
      case "home":     return <SHome     onSwitch={setSTab} />;
      case "courses":  return <SCourses  onSwitch={setSTab} />;
      case "growth":   return <SGrowth   onSwitch={setSTab} />;
      case "feedback": return <SFeedback onSwitch={setSTab} />;
      default:         return <SHome     onSwitch={setSTab} />;
    }
  };

  const renderCoach = () => {
    switch(cTab) {
      case "home":    return <CHome    onSwitch={setCTab} onModal={openModal} />;
      case "modules": return <CModules onSwitch={setCTab} onModal={openModal} />;
      case "assign":  return <CSchedule onSwitch={setCTab} onModal={openModal} />;
      case "records": return <CRecords onSwitch={setCTab} onModal={openModal} />;
      default:        return <CHome    onSwitch={setCTab} onModal={openModal} />;
    }
  };

  const renderAdmin = () => {
    switch(aTab) {
      case "home":    return <AHome    onSwitch={setATab} />;
      case "members": return <AMembers onSwitch={setATab} />;
      case "review":  return <AReview  onSwitch={setATab} />;
      case "records": return <ARecords onSwitch={setATab} />;
      case "finance": return <AFinance onSwitch={setATab} />;
      default:        return <AHome    onSwitch={setATab} />;
    }
  };

  // 底部導覽紅點：學員＝待確認課程數；教練＝學員改期請求數
  const { fetchSessions, fetchJourneys, fetchAccessRequests } = useAuth();
  const [badges, setBadges] = useState({});
  useEffect(() => {
    if (profile?.uid && role === "admin") { fetchAccessRequests().then(rs => setBadges({ members: rs.length })).catch(() => setBadges({})); return; }
    if (!profile?.uid || (role !== "student" && role !== "coach")) { setBadges({}); return; }
    const q = role === "student" ? { studentUid: profile.uid } : { coachId: profile.uid };
    Promise.all([fetchSessions(q), role === "coach" ? fetchJourneys() : Promise.resolve([])]).then(([list, js]) => {
      const future = list.filter(s => !isPast(s));
      setBadges(role === "student"
        ? { courses: future.filter(s => s.status === "pending").length }
        : { assign:  future.filter(s => s.status === "reschedule").length,
            home:    js.reduce((n, j) => n + pendingClaims(j).length, 0) });
    }).catch(() => {});
  }, [profile?.uid, role, sTab, cTab, aTab, modal]);

  const ROLE_LABELS = { admin:"管理員", coach:"教練", student:"學員" };
  const ROLE_CLASS  = { admin:"admin",  coach:"coach",  student:"student" };

  if (loading) {
    return (
      <>
        <Starfield />
        <div className="app" style={{ alignItems:"center", justifyContent:"center" }}>
          <div style={{ marginBottom:14 }}><LogoMark size={64} /></div>
          <div style={{ fontSize:fz(15), color:"var(--ink-3)", letterSpacing:".02em" }}>載入中…</div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Starfield />
        <div className="app">
          <div className="app-header">
            <div className="header-brand">
              <LogoMark size={30} />
              <Wordmark small />
            </div>
            <TextSizeControl />
          </div>
          <LoginScreen />
        </div>
      </>
    );
  }

  if (!role) {
    return (
      <>
        <Starfield />
        <div className="app">
          <div className="app-header">
            <div className="header-brand">
              <LogoMark size={30} />
              <Wordmark small />
            </div>
          </div>
          <NoAccessScreen user={user} logout={logout} />
        </div>
      </>
    );
  }

  const displayName = profile?.name || user.email?.split("@")[0] || "";

  return (
    <>
      <Starfield />
      <div className="app">
        <div className="app-header">
          <div className="header-brand">
            <LogoMark size={30} />
            <Wordmark small />
          </div>
          <div className="header-right">
            {roles.length > 1 ? (
              <div style={{ position:"relative" }}>
                <button className={"role-badge role-switch " + (ROLE_CLASS[role] || "student")} onClick={() => setRoleMenu(v => !v)} aria-label="切換身分">
                  {ROLE_LABELS[role]} ▾
                </button>
                {roleMenu && (
                  <>
                    <div style={{ position:"fixed", inset:0, zIndex:60 }} onClick={() => setRoleMenu(false)} />
                    <div className="role-menu">
                      <div className="role-menu-h">切換身分</div>
                      {roles.map(r => (
                        <button key={r} className={"role-menu-item" + (r === role ? " on" : "")}
                          onClick={() => { switchRole(r); setRoleMenu(false); setSTab("home"); setCTab("home"); setATab("home"); }}>
                          <span>{{ admin:"⚙ 管理員", coach:"🎓 教練", student:"✦ 學員" }[r]}</span>
                          {r === role && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <span className={"role-badge " + (ROLE_CLASS[role] || "student")}>
                {ROLE_LABELS[role] || "學員"}
              </span>
            )}
            <span className="hdr-name">{displayName}</span>
            <TextSizeControl showPush />
            <button className="logout-btn" onClick={logout}>登出</button>
          </div>
        </div>

        <NavBadgeContext.Provider value={badges}>
          {role === "admin"   && renderAdmin()}
          {role === "coach"   && renderCoach()}
          {role === "student" && renderStudent()}
        </NavBadgeContext.Provider>

        {modal?.type === "module" && <ModalAddModule onClose={closeModal} />}
        {modal?.type === "record" && <ModalAddRecord onClose={closeModal} prefill={modal.prefill} editData={modal.editData} />}
      </div>
    </>
  );
}