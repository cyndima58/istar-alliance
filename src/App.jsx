import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";

const GLOBAL_CSS = `
:root {
  /* ── Neutral palette ── */
  --cream:   #FAFAF7;
  --cream-2: #F4F3EE;
  --cream-3: #ECEAE2;
  --cream-4: #E2DFD5;
  --ink:     #1C1A17;
  --ink-2:   #3D3A34;
  --ink-3:   #7A766C;
  --ink-4:   #B0AC9F;

  /* ── Gold accent ── */
  --gold:       #9A7B3F;
  --gold-light: #C4A05A;
  --gold-pale:  #F0E8D5;
  --gold-line:  rgba(154,123,63,0.22);

  /* ── Status colours ── */
  --sage:      #4A7B5A;
  --sage-pale: #EAF2EC;
  --rust:      #8B3A2A;
  --rust-pale: #F5EAE7;
  --slate:     #3A4A6B;
  --slate-pale:#ECF0F8;

  /* ── Radii ── */
  --r:    6px;
  --r-lg: 10px;
  --r-xl: 16px;
  --r-pill: 100px;

  /* ── Typography ── */
  --font: 'Cormorant Garamond', 'Noto Serif TC', serif;

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
  max-width: 430px;
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
  font-size: 18px;
  color: var(--gold);
  line-height: 1;
  font-style: italic;
}
.header-logo-text {
  font-family: var(--font);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: .14em;
  color: var(--ink);
  text-transform: uppercase;
}
.header-logo-text span { color: var(--gold); }
.header-right { display: flex; align-items: center; gap: 10px; }
.role-badge {
  font-family: var(--font);
  font-size: 10px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--r-pill);
  letter-spacing: .1em;
  text-transform: uppercase;
}
.role-badge.coach  { background: var(--sage-pale);  color: var(--sage);  border: 1px solid rgba(74,123,90,.2); }
.role-badge.student{ background: var(--slate-pale); color: var(--slate); border: 1px solid rgba(58,74,107,.2); }
.logout-btn {
  padding: 5px 12px;
  border-radius: var(--r-pill);
  border: 1px solid var(--cream-4);
  background: transparent;
  color: var(--ink-3);
  font-size: 11px;
  font-family: var(--font);
  letter-spacing: .08em;
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
  font-size: 14px; font-weight: 600;
  color: var(--gold);
  border: 1px solid var(--gold-line);
  flex-shrink: 0;
}
.avatar.coach-av-header { background: var(--sage-pale); color: var(--sage); border-color: rgba(74,123,90,.25); }
.coach-av { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font); font-size: 14px; font-weight: 600; flex-shrink: 0; }

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
  font-size: 24px; font-weight: 500;
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
  font-size: 28px; font-weight: 500;
  letter-spacing: -.01em; line-height: 1.2;
  color: var(--ink);
}
.greeting-sub { font-size: 15px; color: var(--ink-3); margin-top: 6px; line-height: 1.5; font-style: italic; }

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
  font-size: 32px; font-weight: 500;
  letter-spacing: -.02em; line-height: 1;
  color: var(--ink);
}
.stat-num.gold   { color: var(--gold); }
.stat-num.nebula { color: var(--slate); }
.stat-lbl { font-size: 11px; color: var(--ink-3); margin-top: 6px; letter-spacing: .1em; text-transform: uppercase; }

/* ── Section heading ── */
.sec-h {
  font-family: var(--font);
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  letter-spacing: .14em; text-transform: uppercase;
  margin: 20px 0 10px;
}

/* ── Badges ── */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 9px; border-radius: var(--r-pill);
  font-family: var(--font);
  font-size: 11px; font-weight: 500; letter-spacing: .06em;
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
.j-title { font-family: var(--font); font-size: 15px; font-weight: 500; letter-spacing: .01em; }
.j-title.active-stage { color: var(--gold); }
.j-sub { font-size: 13px; color: var(--ink-3); margin-top: 3px; font-style: italic; }

/* ── Course ── */
.course-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.course-name { font-family: var(--font); font-size: 18px; font-weight: 500; margin-bottom: 3px; letter-spacing: .01em; }
.course-meta { font-size: 13px; color: var(--ink-3); font-style: italic; }

/* ── People rows ── */
.coach-row {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid var(--cream-3);
}
.coach-row:last-child { border-bottom: none; }
.coach-name { font-family: var(--font); font-size: 15px; font-weight: 500; letter-spacing: .01em; }
.coach-tag { font-size: 12px; color: var(--ink-3); margin-top: 2px; font-style: italic; }

/* ── Buttons ── */
.btn {
  padding: 9px 18px; border-radius: var(--r);
  border: 1px solid var(--cream-3);
  font-family: var(--font);
  font-size: 13px; font-weight: 500; letter-spacing: .06em;
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
.btn-gold {
  background: var(--gold-pale);
  color: var(--gold);
  border-color: var(--gold-line);
}
.btn-gold:hover { background: #EDE0C4; }
.btn-sm { padding: 6px 13px; font-size: 12px; }
.btn-row { display: flex; gap: 8px; margin-top: 12px; }
.btn-row .btn { flex: 1; }

/* ── Feedback ── */
.feedback-quote {
  background: var(--cream-2);
  border-left: 2px solid var(--gold);
  border-radius: 0 var(--r) var(--r) 0;
  padding: 12px 16px; font-size: 14px;
  color: var(--ink-2); line-height: 1.7; margin-bottom: 8px;
  font-style: italic;
}
.feedback-author { font-size: 11px; color: var(--gold); margin-bottom: 8px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; }

/* ── Forms ── */
.input-label { font-family: var(--font); font-size: 11px; color: var(--ink-3); margin-bottom: 5px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; }
.input-field {
  width: 100%;
  padding: 11px 14px;
  background: var(--cream-2);
  border: 1px solid var(--cream-3);
  border-radius: var(--r);
  color: var(--ink); font-size: 15px;
  font-family: var(--font);
  margin-bottom: 10px;
  transition: border-color .2s, box-shadow .2s;
  outline: none;
  line-height: 1.5;
}
.input-field:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(154,123,63,.1); background: #fff; }
.input-field::placeholder { color: var(--ink-4); font-style: italic; }
textarea.input-field { resize: none; line-height: 1.7; }
select.input-field { appearance: none; cursor: pointer; }

/* ── Toggle ── */
.toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid var(--cream-3); }
.toggle-lbl { font-family: var(--font); font-size: 14px; color: var(--ink-2); display: flex; align-items: center; gap: 8px; }
.toggle-sw { width: 40px; height: 23px; border-radius: 12px; background: var(--cream-3); border: none; cursor: pointer; position: relative; transition: background .2s; flex-shrink: 0; }
.toggle-sw.on { background: var(--ink); }
.toggle-sw::after { content:''; position:absolute; top:3px; left:3px; width:17px; height:17px; border-radius:50%; background:#fff; transition:left .2s var(--ease-spring); box-shadow: 0 1px 3px rgba(0,0,0,.15); }
.toggle-sw.on::after { left: 20px; }

/* ── Chips ── */
.chip-group { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.chip {
  padding: 5px 13px; border-radius: var(--r-pill);
  font-family: var(--font);
  font-size: 12px; font-weight: 500; letter-spacing: .04em;
  border: 1px solid var(--cream-3);
  background: #fff; color: var(--ink-3);
  cursor: pointer; transition: all .2s;
}
.chip.sel { background: var(--gold-pale); border-color: var(--gold-line); color: var(--gold); }

/* ── Module chips ── */
.module-pool { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px; background: var(--cream-2); border-radius: var(--r); border: 1px dashed var(--cream-4); margin-bottom: 10px; min-height: 56px; }
.m-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: var(--r-pill); font-family: var(--font); font-size: 12px; font-weight: 500; background: var(--gold-pale); color: var(--gold); border: 1px solid var(--gold-line); cursor: pointer; user-select: none; transition: all .15s; letter-spacing: .04em; }
.m-chip:hover { background: #EDE0C4; }
.m-chip.assigned { background: var(--sage-pale); color: var(--sage); border-color: rgba(74,123,90,.22); }
.drop-zone { padding: 12px; background: var(--sage-pale); border: 1px dashed rgba(74,123,90,.3); border-radius: var(--r); min-height: 64px; }
.drop-label { font-family: var(--font); font-size: 12px; color: var(--sage); margin-bottom: 8px; letter-spacing: .04em; font-style: italic; }

/* ── Record notes ── */
.record-note { background: var(--cream-2); border-radius: var(--r); padding: 11px 14px; font-size: 14px; color: var(--ink-2); line-height: 1.7; margin-top: 8px; font-style: italic; }
.record-note.coach-only { background: var(--gold-pale); }
.record-note-label { font-family: var(--font); font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 5px; font-style: normal; }

/* ── Module cards ── */
.mod-card { background: #fff; border: 1px solid var(--cream-3); border-radius: var(--r-lg); padding: 14px 16px; margin-bottom: 8px; border-left: 2px solid var(--gold); }
.mod-card.teal-l { border-left-color: var(--sage); }
.mod-card.gold-l  { border-left-color: var(--gold); }
.mod-title { font-family: var(--font); font-size: 15px; font-weight: 500; margin-bottom: 6px; letter-spacing: .01em; }
.mod-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
.mod-outline { font-family: var(--font); font-size: 13px; color: var(--ink-3); line-height: 1.6; font-style: italic; }

/* ── Bottom nav ── */
.bottom-nav {
  height: 64px;
  background: #fff;
  border-top: 1px solid var(--cream-3);
  display: flex; flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
.nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-family: var(--font); font-size: 10px; font-weight: 600; color: var(--ink-4); border: none; background: none; cursor: pointer; position: relative; letter-spacing: .1em; text-transform: uppercase; transition: color .2s; }
.nav-item svg { width: 19px; height: 19px; }
.nav-item.active { color: var(--gold); }
.nav-item.active::before { content:''; position:absolute; top:0; left:50%; transform:translateX(-50%); width:20px; height:1.5px; background:var(--gold); border-radius:0 0 2px 2px; }

/* ── Modal ── */
.modal-overlay { position:absolute; inset:0; background:rgba(28,26,23,.5); backdrop-filter:blur(8px); z-index:50; display:flex; align-items:flex-end; }
.modal-sheet { background:var(--cream); border:1px solid var(--cream-3); border-top-left-radius:20px; border-top-right-radius:20px; padding:22px 20px 36px; width:100%; max-height:90%; overflow-y:auto; }
.modal-sheet::-webkit-scrollbar { display:none; }
.modal-handle { width:28px; height:2px; border-radius:2px; background:var(--cream-4); margin:0 auto 22px; }
.modal-title { font-family:var(--font); font-size:22px; font-weight:500; margin-bottom:20px; letter-spacing:.01em; color:var(--ink); }

/* ── Inner tabs ── */
.inner-tabs { display:flex; border-bottom:1px solid var(--cream-3); flex-shrink:0; }
.inner-tab { flex:1; padding:10px; font-family:var(--font); font-size:11px; font-weight:600; text-align:center; border:none; background:none; color:var(--ink-4); cursor:pointer; border-bottom:1.5px solid transparent; transition:all .2s; letter-spacing:.1em; text-transform:uppercase; }
.inner-tab.active { color:var(--gold); border-bottom-color:var(--gold); }

/* ── QA grid ── */
.qa-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.qa-card { background:#fff; border:1px solid var(--cream-3); border-radius:var(--r-lg); padding:16px; cursor:pointer; transition:all .2s; text-align:left; width:100%; }
.qa-card:hover { border-color:var(--gold-line); background:var(--gold-pale); }
.qa-icon { font-size:20px; margin-bottom:9px; display:block; line-height:1; }
.qa-label { font-family:var(--font); font-size:14px; font-weight:500; color:var(--ink); letter-spacing:.01em; }
.qa-sub { font-family:var(--font); font-size:12px; color:var(--ink-3); margin-top:3px; font-style:italic; }

/* ── iSTAR logo ── */
.istar-logo { font-family:var(--font); font-size:10px; letter-spacing:.2em; color:var(--gold); text-transform:uppercase; font-style:italic; }
.istar-mark { font-size:16px; font-weight:600; font-style:normal; }

/* ── Stage bar ── */
.stage-bar { display:flex; gap:3px; margin-bottom:6px; }
.stage-seg { flex:1; height:3px; border-radius:2px; }
.stage-seg.done    { background:var(--gold); }
.stage-seg.current { background:var(--ink); }
.stage-seg.future  { background:var(--cream-3); }

/* ── Detail rows ── */
.detail-meta-row { display:flex; gap:12px; padding:8px 0; border-bottom:1px solid var(--cream-3); align-items:flex-start; }
.detail-meta-lbl { font-family:var(--font); font-size:10px; color:var(--ink-4); min-width:56px; flex-shrink:0; padding-top:2px; letter-spacing:.1em; text-transform:uppercase; font-weight:600; }
.detail-meta-val { font-family:var(--font); font-size:14px; color:var(--ink-2); line-height:1.65; font-style:italic; }

/* ── Login ── */
.login-wrap { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:36px 26px; background:var(--cream); }
.login-logo { font-family:var(--font); font-size:56px; color:var(--gold); text-align:center; line-height:1; margin-bottom:16px; font-style:italic; }
.login-brand { font-family:var(--font); font-size:22px; font-weight:500; color:var(--ink); letter-spacing:.1em; text-align:center; margin-bottom:4px; text-transform:uppercase; }
.login-brand span { color:var(--gold); }
.login-sub { font-family:var(--font); font-size:14px; color:var(--ink-3); text-align:center; margin-bottom:36px; font-style:italic; }
.login-card { width:100%; background:#fff; border:1px solid var(--cream-3); border-radius:var(--r-xl); padding:28px 24px; box-shadow:0 4px 40px rgba(28,26,23,.06); }
.login-error { background:var(--rust-pale); border:1px solid rgba(139,58,42,.2); border-radius:var(--r); padding:11px 14px; font-family:var(--font); font-size:13px; color:var(--rust); margin-bottom:14px; text-align:center; line-height:1.5; }
.login-no-access { background:var(--gold-pale); border:1px solid var(--gold-line); border-radius:var(--r); padding:13px 16px; font-family:var(--font); font-size:13px; color:var(--gold); text-align:center; margin-top:14px; line-height:1.7; font-style:italic; }

/* ── Resource panel ── */
.resource-panel { background:var(--cream-2); border:1px solid var(--cream-3); border-radius:var(--r-lg); padding:16px; margin-top:12px; }
.resource-panel-title { font-family:var(--font); font-size:11px; font-weight:600; color:var(--ink-3); letter-spacing:.12em; text-transform:uppercase; margin-bottom:12px; }
.resource-tabs { display:flex; gap:4px; margin-bottom:14px; }
.resource-tab { flex:1; padding:7px 4px; border-radius:var(--r-pill); border:1px solid var(--cream-3); background:#fff; color:var(--ink-3); font-family:var(--font); font-size:11px; font-weight:500; cursor:pointer; transition:all .2s; letter-spacing:.04em; text-align:center; }
.resource-tab.active { background:var(--gold-pale); border-color:var(--gold-line); color:var(--gold); }
.resource-list { display:flex; flex-direction:column; gap:6px; margin-top:10px; }
.resource-item { display:flex; align-items:center; gap:10px; padding:10px 13px; background:#fff; border-radius:var(--r); border:1px solid var(--cream-3); }
.resource-icon { width:32px; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
.resource-icon.link { background:var(--slate-pale); }
.resource-icon.file { background:var(--sage-pale); }
.resource-icon.img  { background:var(--gold-pale); }
.resource-name { font-family:var(--font); font-size:14px; font-weight:500; color:var(--ink); line-height:1.3; }
.resource-meta { font-family:var(--font); font-size:12px; color:var(--ink-4); margin-top:2px; font-style:italic; }
.resource-empty { text-align:center; color:var(--ink-4); font-family:var(--font); font-size:13px; padding:18px 0; line-height:1.7; font-style:italic; }
.upload-hint { font-family:var(--font); font-size:12px; color:var(--ink-4); text-align:center; margin-top:8px; line-height:1.6; font-style:italic; }
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

/* ════════════════════════════════════════
   DATA
════════════════════════════════════════ */
const GROWTH_STAGES = [
  { num:"01", name:"探索",    tag:"入星",      sub:"定位體驗班 · 4小時",              status:"done",   dotColor:"#C5A24A", dotGlow:"rgba(197,162,74,.35)", tasks:"感受星辰聯盟氛圍，初步盤點個人能力",               output:"個人能力初步地圖（教練協助繪製）",              unlock:"完成體驗並決定進入個人賦能班",          course:"定位體驗班 · 4小時" },
  { num:"02", name:"自我認知", tag:"認識自己",   sub:"個人賦能班 Week 1–2",            status:"done",   dotColor:"#6C5CE7", dotGlow:"rgba(108,92,231,.35)", tasks:"MBTI · 優勢盤點 · 價值觀梳理 · 過去成就回顧",  output:"個人優勢清單 + 核心價值觀 Top 3",              unlock:"完成自我盤點並獲教練確認",              course:"個人賦能班 Week 1–2" },
  { num:"03", name:"內化",    tag:"沉澱",      sub:"教練引導對話 · 1–2週",            status:"done",   dotColor:"#6C5CE7", dotGlow:"rgba(108,92,231,.35)", tasks:"把洞察轉化成語言，第一次嘗試描述自己",               output:"個人一句話介紹初稿",                           unlock:"能在 90 秒內說完自己是誰",              course:"教練 1 對 1 引導對話" },
  { num:"04", name:"定位",    tag:"定位",      sub:"個人賦能班 Week 3–6",            status:"active", dotColor:"#C5A24A", dotGlow:"rgba(197,162,74,.4)",  tasks:"品牌定位 · 差異化分析 · 目標受眾輪廓 · 核心訊息", output:"個人品牌一頁紙（定位宣言）",                   unlock:"定位一頁紙通過教練審核，向同儕小組分享", course:"個人賦能班 Week 3–6", pct:68 },
  { num:"05", name:"方向",    tag:"方向",      sub:"個人賦能班 Week 7–12",           status:"future", opacity:.5, dotColor:"#6C5CE7", tasks:"商業模式設計 · 收入路徑規劃 · 90天里程碑",       output:"個人商業模式一頁紙 + 第一個 90 天計畫",          unlock:"完成 12 週，有具體行動計畫",            course:"個人賦能班 Week 7–12" },
  { num:"06", name:"小驗",    tag:"驗證",      sub:"低風險市場驗證 · 彈性時間",         status:"future", opacity:.37, dotColor:"#0FB89A", tasks:"設計最小可行驗證行動，執行並觀察市場反應",             output:"驗證報告：什麼最有共鳴、哪裡需要調整",           unlock:"完成至少一次真實的市場驗證並整理回饋",   course:"演講 / 文章 / 諮詢 / 免費工作坊（擇一）" },
  { num:"07", name:"實作",    tag:"實作",      sub:"創業預備班 Phase 1–2",           status:"future", opacity:.27, dotColor:"#E0614E", tasks:"系統化產品 / 服務設計，建立穩定的交付流程",           output:"可重複銷售的產品原型 + 第一張訂單",              unlock:"完成第一筆付費成交",                    course:"創業預備班 Phase 1–2" },
  { num:"08", name:"市場",    tag:"市場",      sub:"創業預備班 Phase 3–4",           status:"future", opacity:.2,  dotColor:"#E0614E", tasks:"流量策略 · 客戶旅程設計 · 銷售系統建立",             output:"穩定的月收入來源 + 可複製的獲客流程",            unlock:"達到可持續的月收入目標",                 course:"創業預備班 Phase 3–4" },
  { num:"09", name:"共創",    tag:"✦ 星辰成員", sub:"創業預備班 Phase 5–6 → 聯盟成員", status:"future", opacity:.14, dotColor:"#C5A24A", dotGlow:"rgba(197,162,74,.5)", tasks:"事業系統化 · 與聯盟夥伴協作 · 股權共創結構", output:"成立公司 + 與 iSTAR Alliance 完成股權綁定", unlock:"完成股權綁定，正式成為 iSTAR Alliance 成員", course:"創業預備班 Phase 5–6 + 聯盟導師陪跑" },
];
const STAGE_SEGS = ["done","done","done","current","future","future","future","future","future"];
const COURSE_TYPES = ["定位體驗班","個人賦能班","創業預備班"];

/* ════════════════════════════════════════
   SHARED COMPONENTS
════════════════════════════════════════ */

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
const IcPlus  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

function BottomNav({ tabs, active, onSwitch }) {
  return (
    <div className="bottom-nav">
      {tabs.map(({ key, label, Icon }) => (
        <button key={key} className={"nav-item"+(active===key?" active":"")} onClick={() => onSwitch(key)}>
          <Icon /><span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function ChipGroup({ options, defaultSel = [] }) {
  const [sel, setSel] = useState(() => new Set(defaultSel));
  const toggle = o => setSel(p => { const n=new Set(p); n.has(o)?n.delete(o):n.add(o); return n; });
  return (
    <div className="chip-group">
      {options.map(o => <div key={o} className={"chip"+(sel.has(o)?" sel":"")} onClick={() => toggle(o)}>{o}</div>)}
    </div>
  );
}

function Toggle({ label, icon: Icon, defaultOn=true, noBorder=false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="toggle-row" style={noBorder?{borderBottom:"none"}:{}}>
      <span className="toggle-lbl"><Icon />{label}</span>
      <button className={"toggle-sw"+(on?" on":"")} onClick={() => setOn(v=>!v)} />
    </div>
  );
}

/* ── Resource Upload Panel ── */
function ResourcePanel({ role: userRole }) {
  const [tab, setTab]       = useState("link");
  const [linkVal, setLink]  = useState("");
  const [linkName, setName] = useState("");
  const [resources, setRes] = useState([]);

  const addLink = () => {
    if (!linkVal.trim()) return;
    const url = linkVal.trim().startsWith("http") ? linkVal.trim() : "https://" + linkVal.trim();
    setRes(r => [...r, { type:"link", name: linkName.trim() || url, url, by: userRole, ts: new Date().toLocaleDateString("zh-TW") }]);
    setLink(""); setName("");
  };

  const handleFile = e => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => {
      const isImg = f.type.startsWith("image/");
      setRes(r => [...r, { type: isImg ? "img" : "file", name: f.name, size: (f.size/1024).toFixed(0)+"KB", by: userRole, ts: new Date().toLocaleDateString("zh-TW") }]);
    });
    e.target.value = "";
  };

  return (
    <div className="resource-panel">
      <div className="resource-panel-title">課程學習資料</div>
      <div className="resource-tabs">
        {[["link","🔗 連結"],["file","📎 檔案"],["img","🖼 圖片"]].map(([k,l]) => (
          <button key={k} className={"resource-tab"+(tab===k?" active":"")} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "link" && (
        <>
          <div className="input-label">說明名稱（選填）</div>
          <input className="input-field" placeholder="例：本週參考文章" value={linkName} onChange={e => setName(e.target.value)} style={{ marginBottom:6 }} />
          <div className="input-label">網址連結</div>
          <input className="input-field" placeholder="https://..." value={linkVal} onChange={e => setLink(e.target.value)} style={{ marginBottom:6 }} />
          <button className="btn btn-primary" style={{ width:"100%", justifyContent:"center" }} onClick={addLink}>
            <IcPlus /> 加入連結
          </button>
        </>
      )}

      {(tab === "file" || tab === "img") && (
        <>
          <label style={{ display:"block", width:"100%", cursor:"pointer" }}>
            <div style={{ border:"1.5px dashed rgba(255,255,255,.12)", borderRadius:"var(--r)", padding:"20px 12px", textAlign:"center", background:"var(--cream-3)" }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{tab==="img" ? "🖼" : "📎"}</div>
              <div style={{ fontSize:13, color:"var(--ink-2)", fontWeight:500 }}>點此上傳{tab==="img"?"圖片":"檔案"}</div>
              <div style={{ fontSize:11, color:"var(--ink-3)", marginTop:4 }}>
                {tab==="img" ? "支援 JPG、PNG、GIF、WEBP" : "支援 PDF、DOC、XLS、PPT 等"}
              </div>
            </div>
            <input type="file" style={{ display:"none" }} accept={tab==="img"?"image/*":".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"} multiple onChange={handleFile} />
          </label>
          <div className="upload-hint">
            ⚠ 目前為本地預覽，正式部署需整合 Firebase Storage
          </div>
        </>
      )}

      {resources.length > 0 && (
        <div className="resource-list" style={{ marginTop:12 }}>
          {resources.map((r, i) => (
            <div key={i} className="resource-item">
              <div className={"resource-icon " + r.type}>
                {r.type==="link" ? <IcLink /> : r.type==="img" ? <IcImg /> : <IcFile />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="resource-name" style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {r.type==="link"
                    ? <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color:"inherit", textDecoration:"none" }}>{r.name}</a>
                    : r.name
                  }
                </div>
                <div className="resource-meta">
                  {r.size ? r.size + " · " : ""}{r.by === "coach" ? "教練上傳" : "學員上傳"} · {r.ts}
                </div>
              </div>
              <button onClick={() => setRes(res => res.filter((_,j)=>j!==i))} style={{ border:"none",background:"none",color:"var(--ink-3)",cursor:"pointer",fontSize:16,padding:"0 2px",lineHeight:1 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {resources.length === 0 && (
        <div className="resource-empty">尚無學習資料<br/><span style={{ fontSize:11 }}>教練與學員都可以在這裡上傳資料</span></div>
      )}
    </div>
  );
}

/* ── GrowthItem ── */
function GrowthItem({ s }) {
  const [open, setOpen] = useState(false);
  const isCoCreate = s.num === "09";
  const dotStyle = {
    display:"flex", alignItems:"center", justifyContent:"center",
    ...(s.status==="done"
      ? { background:s.dotColor, borderColor:s.dotColor, boxShadow:`0 0 8px ${s.dotGlow||"transparent"}` }
      : s.status==="active"
      ? { background:"var(--cream)", borderColor:s.dotColor, borderWidth:2, boxShadow:`0 0 0 3px ${s.dotGlow||"transparent"},0 0 12px ${s.dotColor}` }
      : { background:"var(--cream-2)", borderColor:"var(--ink-3)" }),
  };
  const cardExtra = s.status==="active"
    ? { borderColor: open?"rgba(197,162,74,.55)":"rgba(197,162,74,.28)", background:"rgba(197,162,74,.04)" }
    : s.status==="done"
    ? { borderColor: open?"rgba(15,184,154,.35)":"rgba(255,255,255,.055)" }
    : { borderColor:"rgba(255,255,255,.055)" };

  return (
    <div className="journey-item" style={s.opacity!=null?{opacity:s.opacity}:{}}>
      <div className="journey-dot" style={dotStyle}>
        {s.status==="done"   && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
        {s.status==="active" && <div style={{ width:6, height:6, borderRadius:"50%", background:s.dotColor }} />}
        {s.status==="future" && <span style={{ fontSize:8, color:"var(--ink-3)", fontWeight:700 }}>{s.num}</span>}
      </div>
      <div
        className={"card"+(s.status==="done"?" card-sm":"")}
        style={{ ...cardExtra, cursor:s.status!=="future"?"pointer":"default" }}
        onClick={s.status!=="future"?()=>setOpen(o=>!o):undefined}
      >
        {s.status==="done" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
              <div>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", color:"var(--sage)", marginBottom:3, textTransform:"uppercase" }}>{s.tag}</div>
                <div className="j-title">{s.num}. {s.name}</div>
                <div className="j-sub">{s.sub}</div>
              </div>
              <span className="badge badge-teal" style={{ flexShrink:0, marginLeft:8 }}>✓ 完成</span>
            </div>
            {open && (
              <div style={{ paddingTop:10, borderTop:"1px solid rgba(255,255,255,.05)", marginTop:4 }}>
                <div className="detail-meta-row"><span className="detail-meta-lbl">核心任務</span><span className="detail-meta-val">{s.tasks}</span></div>
                <div className="detail-meta-row"><span className="detail-meta-lbl">關鍵產出</span><span className="detail-meta-val">{s.output}</span></div>
                <div className="detail-meta-row" style={{ border:"none" }}><span className="detail-meta-lbl">對應課程</span><span className="detail-meta-val">{s.course}</span></div>
              </div>
            )}
          </>
        )}
        {s.status==="active" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", color:"var(--gold)", marginBottom:3, textTransform:"uppercase" }}>{s.tag} · 當前階段 ▶</div>
                <div className="j-title active-stage">{s.num}. {s.name}</div>
                <div className="j-sub">{s.sub}</div>
              </div>
              <span className="badge badge-gold" style={{ flexShrink:0, marginLeft:8 }}>{s.pct}%</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontSize:11, color:"var(--ink-3)" }}>完成進度</span>
              <span style={{ fontSize:11, color:"var(--gold)" }}>{s.pct}%</span>
            </div>
            <div className="prog-track" style={{ marginBottom:10 }}><div className="prog-fill gold" style={{ width:`${s.pct}%` }} /></div>
            {open && (
              <div style={{ paddingTop:10, borderTop:"1px solid rgba(197,162,74,.18)", marginTop:4 }}>
                <div className="detail-meta-row"><span className="detail-meta-lbl">核心任務</span><span className="detail-meta-val">{s.tasks}</span></div>
                <div className="detail-meta-row"><span className="detail-meta-lbl">關鍵產出</span><span className="detail-meta-val">{s.output}</span></div>
                <div className="detail-meta-row"><span className="detail-meta-lbl">對應課程</span><span className="detail-meta-val">{s.course}</span></div>
                <div className="detail-meta-row" style={{ border:"none" }}><span className="detail-meta-lbl">升階條件</span><span className="detail-meta-val" style={{ color:"var(--gold)" }}>{s.unlock}</span></div>
              </div>
            )}
          </>
        )}
        {s.status==="future" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", color:isCoCreate?"rgba(197,162,74,.45)":"var(--ink-3)", marginBottom:3, textTransform:"uppercase" }}>{s.tag}</div>
                <div className="j-title" style={isCoCreate?{color:"rgba(197,162,74,.45)"}:{}}>{s.num}. {s.name}</div>
                <div className="j-sub">{s.sub}</div>
              </div>
              <IcLock />
            </div>
            {isCoCreate && (
              <div style={{ marginTop:10, padding:"8px 12px", background:"rgba(197,162,74,.05)", borderRadius:"var(--r)", border:"1px solid rgba(197,162,74,.12)", fontSize:12, color:"rgba(197,162,74,.45)", lineHeight:1.6 }}>
                ✦ 完成創業預備班並通過審核，即正式成為星辰聯盟成員
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   MODALS
════════════════════════════════════════ */
function ModalAddModule({ onClose }) {
  return (
    <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget)onClose(); }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">新增課程模組</div>
        <div className="input-label">課程主題</div>
        <input className="input-field" placeholder="例：商業模式設計工作坊" />
        <div className="input-label">大綱</div>
        <textarea className="input-field" rows={3} placeholder={"第一步：…\n第二步：…"} />
        <div className="input-label">時間</div>
        <input className="input-field" placeholder="例：3小時 / 2天" />
        <div className="input-label">上課方式</div>
        <ChipGroup options={["線上","實體","混合","非同步"]} defaultSel={["線上"]} />
        <div className="input-label">對應成長階段</div>
        <ChipGroup options={["探索","自我認知","內化","定位","方向","小驗","實作","市場","共創"]} defaultSel={["定位"]} />
        <div className="btn-row">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={onClose}>✦ 儲存模組</button>
        </div>
      </div>
    </div>
  );
}

function ModalAddRecord({ onClose }) {
  const { fetchMembers } = useAuth();
  const [students, setStudents] = useState([]);
  useEffect(() => {
    fetchMembers().then(all => setStudents(all.filter(m => m.role==="student"))).catch(() => {});
  }, []);
  return (
    <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget)onClose(); }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">新增上課記錄</div>
        <div className="input-label">學員</div>
        <select className="input-field">
          <option value="">— 選擇學員 —</option>
          {students.map(s => <option key={s.uid} value={s.uid}>{s.name}</option>)}
        </select>
        <div className="input-label">上課日期</div>
        <input className="input-field" type="date" defaultValue={new Date().toISOString().slice(0,10)} />
        <div className="input-label">課程主題</div>
        <input className="input-field" placeholder="例：個人品牌定位工作坊" />
        <div className="input-label">給學員的回饋</div>
        <textarea className="input-field" rows={2} placeholder="課後鼓勵與建議…" />
        <div className="input-label">教練私密備註</div>
        <textarea className="input-field" rows={2} placeholder="教練群內部觀察…" />
        <Toggle label="學員可見"   icon={IcEye}   defaultOn={true} />
        <Toggle label="教練群可見" icon={IcUsers} defaultOn={true} noBorder={true} />
        <div className="btn-row" style={{ marginTop:14 }}>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={onClose}>✦ 儲存記錄</button>
        </div>
      </div>
    </div>
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

function SHome({ onSwitch }) {
  const { profile } = useAuth();
  const name       = profile?.name || "同學";
  const courseType = profile?.courseType || "";
  const coachName  = profile?.coachName  || "";
  return (
    <div className="screen-enter">
      <div className="topbar">
        <div>
          <div className="istar-logo"><span className="istar-mark">✦</span> iSTAR</div>
          <div style={{ fontSize:11, color:"var(--ink-3)", marginTop:2, letterSpacing:".04em" }}>星辰聯盟</div>
        </div>
        <div className="avatar" style={(() => { const c = getAvatarColor(name); return { background: c.bg, color: c.text, borderColor: c.bg }; })()}>{name.slice(0,1)}</div>
      </div>
      <div className="content">
        <div className="card-gold" style={{ marginBottom:14 }}>
          <div className="greeting-name">歡迎回來，{name} <span style={{ fontSize:20 }}>✦</span></div>
          <div className="greeting-sub">
            {courseType ? `${courseType} · ` : ""}繼續前進，你的星辰正在等你
          </div>
          <div style={{ marginTop:14 }}>
            <div className="stage-bar">{STAGE_SEGS.map((s,i)=><div key={i} className={`stage-seg ${s}`}/>)}</div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
              <span style={{ fontSize:11, color:"var(--gold-light)" }}>第 4 / 9 階段 · 定位</span>
            </div>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-tile"><div className="stat-num gold">—</div><div className="stat-lbl">已完成課程</div></div>
          <div className="stat-tile"><div className="stat-num nebula">—</div><div className="stat-lbl">路徑進度</div></div>
        </div>
        {courseType ? (
          <>
            <div className="sec-h">我的課程</div>
            <div className="card" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, fontFamily:"var(--font)", letterSpacing:"-.01em" }}>{courseType}</div>
                {coachName && <div style={{ fontSize:12, color:"var(--ink-3)", marginTop:3 }}>主要聯絡教練：{coachName}</div>}
              </div>
              <button className="btn btn-sm" onClick={() => onSwitch("courses")}>查看</button>
            </div>
          </>
        ) : (
          <>
            <div className="sec-h">課程</div>
            <div className="card" style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, padding:"22px 16px", lineHeight:1.65 }}>
              尚未分配課程<br /><span style={{ fontSize:12 }}>請聯絡您的教練</span>
            </div>
          </>
        )}
        <div className="sec-h">快速入口</div>
        <div className="qa-grid">
          <button className="qa-card" onClick={() => onSwitch("growth")}>
            <span className="qa-icon">🗺</span>
            <div className="qa-label">成長路徑</div>
            <div className="qa-sub">9 個里程碑</div>
          </button>
          <button className="qa-card" onClick={() => onSwitch("feedback")}>
            <span className="qa-icon">💬</span>
            <div className="qa-label">互動反饋</div>
            <div className="qa-sub">回覆教練</div>
          </button>
        </div>
      </div>
      <BottomNav tabs={S_TABS} active="home" onSwitch={onSwitch} />
    </div>
  );
}

function SCourses({ onSwitch }) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const courseType = profile?.courseType || "";
  const coachName  = profile?.coachName  || "";
  const joinDate   = profile?.joinDate   || "";
  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">我的課程</div>
        <div className="avatar" style={(() => { const c = getAvatarColor(profile?.name||""); return { background: c.bg, color: c.text, borderColor: c.bg }; })()}>{(profile?.name||"?").slice(0,1)}</div>
      </div>
      <div className="inner-tabs" style={{ padding:"0 16px" }}>
        {[["all","全部"],["ongoing","進行中"],["done","已完成"]].map(([k,l])=>(
          <button key={k} className={"inner-tab"+(activeTab===k?" active":"")} onClick={()=>setActiveTab(k)}>{l}</button>
        ))}
      </div>
      <div className="content" style={{ paddingTop:10 }}>
        {!courseType ? (
          <div style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, marginTop:48, lineHeight:1.7 }}>
            尚未分配課程<br /><span style={{ fontSize:12 }}>請聯絡您的教練</span>
          </div>
        ) : (
          <>
            {(activeTab==="all"||activeTab==="ongoing") && (
              <div className="card-glow">
                <div className="course-header">
                  <span className="badge badge-teal">進行中</span>
                  {joinDate && <span style={{ fontSize:11, color:"var(--ink-3)" }}>加入 {joinDate}</span>}
                </div>
                <div className="course-name" style={{ marginTop:8 }}>{courseType}</div>
                {coachName && <div className="course-meta" style={{ marginBottom:10 }}>主要聯絡教練：{coachName}</div>}
                <div className="prog-track" style={{ marginBottom:5 }}><div className="prog-fill" style={{ width:"0%" }}/></div>
                <div style={{ fontSize:11, color:"var(--ink-3)", marginBottom:14 }}>課程進行中</div>
                <div className="btn-row" style={{ marginTop:0 }}>
                  <button className="btn btn-sm">查看課程模組</button>
                  <button className="btn btn-primary btn-sm">聯絡教練</button>
                </div>
                <ResourcePanel role="student" />
              </div>
            )}
            {activeTab==="done" && (
              <div style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, marginTop:48 }}>尚無已完成課程</div>
            )}
          </>
        )}
      </div>
      <BottomNav tabs={S_TABS} active="courses" onSwitch={onSwitch} />
    </div>
  );
}

function SGrowth({ onSwitch }) {
  const { profile } = useAuth();
  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">成長路徑</div>
        <div className="avatar" style={(() => { const c = getAvatarColor(profile?.name||""); return { background: c.bg, color: c.text, borderColor: c.bg }; })()}>{(profile?.name||"?").slice(0,1)}</div>
      </div>
      <div className="content">
        <div className="card-gold" style={{ marginBottom:14 }}>
          <div style={{ fontSize:9, color:"var(--gold)", letterSpacing:".12em", fontWeight:700, marginBottom:8, textTransform:"uppercase" }}>✦ 目前所在階段</div>
          <div style={{ fontFamily:"var(--font)", fontSize:28, fontWeight:600, letterSpacing:"-.02em" }}>定位</div>
          <div style={{ fontSize:13, color:"rgba(197,162,74,.7)", marginTop:4, lineHeight:1.5 }}>找到屬於你的位置，讓能力被市場看見</div>
          <div style={{ marginTop:16 }}>
            <div className="stage-bar">{STAGE_SEGS.map((s,i)=><div key={i} className={`stage-seg ${s}`}/>)}</div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:7 }}>
              <span style={{ fontSize:11, color:"var(--gold-light)" }}>第 4 / 9 階段</span>
              <span style={{ fontSize:11, color:"var(--ink-3)" }}>預計還需 8 週</span>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:12, padding:"8px 14px", background:"var(--cream-2)", borderRadius:"var(--r)", marginBottom:14, flexWrap:"wrap" }}>
          {[["#C5A24A","入星"],["#6C5CE7","賦能"],["#0FB89A","驗證"],["#E0614E","創業"]].map(([c,l])=>(
            <div key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--ink-3)" }}>
              <div style={{ width:7,height:7,borderRadius:"50%",background:c }}/>{l}
            </div>
          ))}
        </div>
        <div className="journey">
          {GROWTH_STAGES.map(s => <GrowthItem key={s.num} s={s} />)}
        </div>
      </div>
      <BottomNav tabs={S_TABS} active="growth" onSwitch={onSwitch} />
    </div>
  );
}

function SFeedback({ onSwitch }) {
  const { profile } = useAuth();
  const coachName = profile?.coachName || "";
  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">互動反饋</div>
        <div className="avatar" style={(() => { const c = getAvatarColor(profile?.name||""); return { background: c.bg, color: c.text, borderColor: c.bg }; })()}>{(profile?.name||"?").slice(0,1)}</div>
      </div>
      <div className="content">
        <div className="sec-h">我的教練</div>
        <div className="card">
          {coachName ? (
            <div className="coach-row" style={{ borderBottom:"none" }}>
              <div className="coach-av" style={(() => { const c = getAvatarColor(coachName); return { background: c.bg, color: c.text }; })()}>{coachName.slice(0,2)}</div>
              <div style={{ flex:1 }}>
                <div className="coach-name">{coachName}<span className="badge badge-gold" style={{ fontSize:10, marginLeft:6 }}>主要聯絡</span></div>
                <div className="coach-tag">{profile?.courseType||""}</div>
              </div>
              <button className="btn btn-sm">聯絡</button>
            </div>
          ) : (
            <div style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, padding:"14px 0" }}>尚未指定教練</div>
          )}
        </div>
        <div className="sec-h">填寫本週反饋</div>
        <textarea className="input-field" rows={3} placeholder="記錄這週的學習心得、疑問或想法…" />
        <button className="btn btn-primary" style={{ width:"100%" }}><IcSend />送出反饋</button>
      </div>
      <BottomNav tabs={S_TABS} active="feedback" onSwitch={onSwitch} />
    </div>
  );
}

/* ════════════════════════════════════════
   COACH SCREENS
════════════════════════════════════════ */
const C_TABS = [
  { key:"home",    label:"總覽", Icon:IcHome  },
  { key:"modules", label:"模組", Icon:IcLayer },
  { key:"assign",  label:"分配", Icon:IcSwap  },
  { key:"records", label:"記錄", Icon:IcDoc   },
  { key:"members", label:"成員", Icon:IcUsers },
];

function CHome({ onSwitch }) {
  const { profile, fetchMembers } = useAuth();
  const [students, setStudents] = useState([]);
  useEffect(() => {
    if (!profile?.uid) return;
    fetchMembers().then(all => setStudents(all.filter(m=>m.role==="student"))).catch(()=>{});
  }, [profile?.uid]);
  return (
    <div className="screen-enter">
      <div className="topbar">
        <div>
          <div className="istar-logo"><span className="istar-mark">✦</span> iSTAR · 教練</div>
          <div style={{ fontSize:11, color:"var(--ink-3)", marginTop:2, letterSpacing:".04em" }}>Coach Dashboard</div>
        </div>
        <div className="avatar coach-av-header" style={(() => { const c = getAvatarColor(profile?.name||"教"); return { background: c.bg, color: c.text, borderColor: c.bg }; })()}>{(profile?.name||"教").slice(0,1)}</div>
      </div>
      <div className="content">
        <div className="card-glass" style={{ marginBottom:14 }}>
          <div style={{ fontFamily:"var(--font)", fontSize:20, fontWeight:600, letterSpacing:"-.01em" }}>{profile?.name||"教練"}</div>
          <div style={{ fontSize:13, color:"var(--ink-2)", marginTop:4 }}>負責全部 {students.length} 位學員</div>
        </div>
        <div className="stats-grid">
          <div className="stat-tile"><div className="stat-num" style={{ color:"var(--sage)" }}>{students.length}</div><div className="stat-lbl">全部學員</div></div>
          <div className="stat-tile"><div className="stat-num" style={{ color:"#9B8BF4" }}>—</div><div className="stat-lbl">課程模組</div></div>
        </div>
        <div className="sec-h">所有學員</div>
        <div className="card" style={{ padding:"6px 14px" }}>
          {students.length===0 ? (
            <div style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, padding:"14px 0", lineHeight:1.65 }}>
              尚無學員<br /><span style={{ fontSize:12 }}>前往成員管理新增</span>
            </div>
          ) : students.map((s,i) => (
            <div key={s.uid} className="coach-row" style={i===students.length-1?{borderBottom:"none"}:{}}>
              <div className="coach-av" style={(() => { const c = getAvatarColor(s.name||""); return { background: c.bg, color: c.text, fontSize:12 }; })()}>{s.name?.slice(0,2)||"??"}</div>
              <div style={{ flex:1 }}>
                <div className="coach-name">{s.name}</div>
                <div className="coach-tag">{s.courseType||""}</div>
              </div>
              <button className="btn btn-sm" onClick={()=>onSwitch("assign")}>分配</button>
            </div>
          ))}
        </div>
        <div className="sec-h">快速操作</div>
        <div className="qa-grid">
          <button className="qa-card" onClick={()=>onSwitch("modules")}><span className="qa-icon">✦</span><div className="qa-label">課程模組</div><div className="qa-sub">新增 / 編輯</div></button>
          <button className="qa-card" onClick={()=>onSwitch("assign")}><span className="qa-icon">🎯</span><div className="qa-label">分配課程</div><div className="qa-sub">指派至學員</div></button>
          <button className="qa-card" onClick={()=>onSwitch("records")}><span className="qa-icon">📝</span><div className="qa-label">上課記錄</div><div className="qa-sub">課後填寫</div></button>
          <button className="qa-card" onClick={()=>onSwitch("members")}><span className="qa-icon">👥</span><div className="qa-label">成員管理</div><div className="qa-sub">新增成員</div></button>
        </div>
      </div>
      <BottomNav tabs={C_TABS} active="home" onSwitch={onSwitch} />
    </div>
  );
}

function CModules({ onSwitch, onModal }) {
  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">課程模組</div>
        <button className="btn btn-primary btn-sm" onClick={()=>onModal("module")}><IcPlus />新增</button>
      </div>
      <div className="content">
        <div style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, marginTop:48, marginBottom:18, lineHeight:1.7 }}>
          尚未建立課程模組<br /><span style={{ fontSize:12 }}>點右上角「新增」開始建立</span>
        </div>
        <button className="btn" style={{ width:"100%", justifyContent:"center" }} onClick={()=>onModal("module")}><IcPlus />新增第一個課程模組</button>
      </div>
      <BottomNav tabs={C_TABS} active="modules" onSwitch={onSwitch} />
    </div>
  );
}

function CAssign({ onSwitch }) {
  const { profile, fetchMembers } = useAuth();
  const [students,   setStudents]   = useState([]);
  const [selStudent, setSelStudent] = useState(null);
  const [assigned,   setAssigned]   = useState([]);
  const pool = [];
  useEffect(() => {
    if (!profile?.uid) return;
    fetchMembers().then(all => setStudents(all.filter(m=>m.role==="student"))).catch(()=>{});
  }, [profile?.uid]);
  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">分配課程</div>
        {selStudent && <span className="badge badge-nebula">{selStudent.name}</span>}
      </div>
      <div className="content">
        {students.length===0 ? (
          <div style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, marginTop:48, lineHeight:1.7 }}>
            尚無學員<br /><span style={{ fontSize:12 }}>請先在「成員管理」新增學員</span>
          </div>
        ) : (
          <>
            <div className="sec-h">選擇學員</div>
            <div className="chip-group">
              {students.map(s=>(
                <div key={s.uid} className={"chip"+(selStudent?.uid===s.uid?" sel":"")}
                  onClick={()=>{setSelStudent(s);setAssigned([]);}}>{s.name}</div>
              ))}
            </div>
            {selStudent && (
              <>
                <div style={{ fontSize:13, color:"var(--ink-3)", marginBottom:12, lineHeight:1.6 }}>
                  為 <strong style={{ color:"var(--ink)" }}>{selStudent.name}</strong> 加入課程模組
                </div>
                <div className="sec-h">可用模組庫</div>
                <div className="module-pool">
                  {pool.length===0
                    ? <span style={{ fontSize:12, color:"var(--ink-3)" }}>尚未建立課程模組，請先至「模組」頁面新增</span>
                    : pool.map(p=><span key={p} className="m-chip" onClick={()=>setAssigned(a=>a.includes(p)?a:[...a,p])}>✦ {p}</span>)
                  }
                </div>
                <div className="sec-h">{selStudent.name} 的專屬課程</div>
                <div className="drop-zone">
                  <div className="drop-label">↑ 點擊上方模組加入</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {assigned.map(a=><span key={a} className="m-chip assigned">✓ {a}</span>)}
                  </div>
                </div>
                <div className="btn-row" style={{ marginTop:12 }}>
                  <button className="btn btn-primary">儲存課程安排</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
      <BottomNav tabs={C_TABS} active="assign" onSwitch={onSwitch} />
    </div>
  );
}

function CRecords({ onSwitch, onModal }) {
  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">上課記錄</div>
        <button className="btn btn-primary btn-sm" onClick={()=>onModal("record")}><IcPlus />新增</button>
      </div>
      <div className="content">
        <div style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, marginTop:48, marginBottom:18, lineHeight:1.7 }}>
          尚無上課記錄<br /><span style={{ fontSize:12 }}>點右上角「新增」記錄上課狀況</span>
        </div>
        <div className="sec-h">課程學習資料</div>
        <ResourcePanel role="coach" />
      </div>
      <BottomNav tabs={C_TABS} active="records" onSwitch={onSwitch} />
    </div>
  );
}

function CMembers({ onSwitch }) {
  const { addMember, fetchMembers, profile } = useAuth();
  const [members, setMembers] = useState([]);
  const [tab,     setTab]     = useState("list");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [form, setForm] = useState({
    name:"", email:"", password:"", birthdate:"",
    coachName: profile?.name||"", courseType:"個人賦能班",
    joinDate: new Date().toISOString().slice(0,10), role:"student",
  });
  useEffect(() => {
    if (tab==="list") fetchMembers().then(setMembers).catch(()=>{});
  }, [tab]);
  const setField = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleAdd = async e => {
    e.preventDefault();
    if (!form.name||!form.email||!form.password) { setResult({ok:false,msg:"姓名、Email、密碼為必填。"}); return; }
    setLoading(true); setResult(null);
    const res = await addMember({...form});
    setLoading(false);
    if (res.success) {
      setResult({ok:true,msg:`${form.name} 已成功新增！`});
      setForm({ name:"", email:"", password:"", birthdate:"", coachName:profile?.name||"", courseType:"個人賦能班", joinDate:new Date().toISOString().slice(0,10), role:form.role });
    } else { setResult({ok:false,msg:res.error}); }
  };
  const roleLabel = r => r==="coach"?"教練":"學員";
  const rColor    = r => r==="coach"?"var(--sage)":"#A89CF4";
  const rBg       = r => r==="coach"?"var(--sage-pale)":"var(--slate-pale)";
  const rBorder   = r => r==="coach"?"rgba(15,184,154,.25)":"rgba(108,92,231,.25)";
  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">成員管理</div>
        <button className={tab==="add"?"btn btn-primary btn-sm":"btn btn-sm"}
          onClick={()=>{setTab(t=>t==="add"?"list":"add");setResult(null);}}>
          {tab==="add"?"← 返回":"+ 新增成員"}
        </button>
      </div>
      {tab==="list" ? (
        <div className="content">
          <div className="sec-h">所有成員（{members.length} 人）</div>
          {members.length===0 && (
            <div style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, marginTop:36, lineHeight:1.7 }}>
              還沒有成員<br /><span style={{ fontSize:12 }}>點右上角「+ 新增成員」</span>
            </div>
          )}
          {members.map(m=>(
            <div key={m.uid} className="card card-sm" style={{ marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div className="coach-av" style={(() => { const c = getAvatarColor(m.name||""); return { background: c.bg, color: c.text, fontSize:12, flexShrink:0 }; })()}>
                  {m.name?.slice(0,2)||"??"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                    <span style={{ fontSize:14, fontWeight:600, letterSpacing:"-.01em" }}>{m.name}</span>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:"var(--r-pill)", background:rBg(m.role), color:rColor(m.role), border:`1px solid ${rBorder(m.role)}` }}>{roleLabel(m.role)}</span>
                  </div>
                  <div style={{ fontSize:11, color:"var(--ink-3)" }}>{m.email}</div>
                  {m.courseType && <div style={{ fontSize:11, color:"var(--ink-3)", marginTop:2 }}>{m.courseType}{m.joinDate?" · "+m.joinDate:""}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="content">
          {result && (
            <div style={{ padding:"11px 14px", borderRadius:"var(--r)", marginBottom:14, fontSize:13, textAlign:"center", lineHeight:1.5,
              background:result.ok?"var(--sage-pale)":"rgba(224,97,78,.1)",
              border:`1px solid ${result.ok?"rgba(15,184,154,.25)":"rgba(224,97,78,.25)"}`,
              color:result.ok?"var(--sage)":"var(--rust)" }}>{result.msg}</div>
          )}
          <form onSubmit={handleAdd}>
            <div className="input-label">角色</div>
            <div className="chip-group" style={{ marginBottom:12 }}>
              {["student","coach"].map(r=>(
                <div key={r} className={"chip"+(form.role===r?" sel":"")} onClick={()=>setField("role",r)}>
                  {r==="student"?"✦ 學員":"🎓 教練"}
                </div>
              ))}
            </div>
            <div className="input-label">姓名 *</div>
            <input className="input-field" placeholder="王小明" value={form.name} onChange={e=>setField("name",e.target.value)} />
            <div className="input-label">Email *</div>
            <input className="input-field" type="email" placeholder="member@email.com" value={form.email} onChange={e=>setField("email",e.target.value)} />
            <div className="input-label">初始密碼 * （至少 6 碼）</div>
            <input className="input-field" type="text" placeholder="設定後請告知對方" value={form.password} onChange={e=>setField("password",e.target.value)} />
            {form.role==="student" && (
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
            <button type="submit" className="btn btn-primary" style={{ width:"100%", justifyContent:"center", marginTop:4 }} disabled={loading}>
              {loading?"新增中…":`✦ 確認新增${form.role==="student"?"學員":"教練"}`}
            </button>
          </form>
        </div>
      )}
      <BottomNav tabs={C_TABS} active="members" onSwitch={onSwitch} />
    </div>
  );
}

/* ════════════════════════════════════════
   LOGIN / NO ACCESS
════════════════════════════════════════ */
function LoginScreen() {
  const { loginWithEmail, error, loading } = useAuth();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = e => { e.preventDefault(); if(email&&password)loginWithEmail(email,password); };
  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, minHeight:0 }}>
      <div className="login-wrap">
        <div className="login-logo">✦</div>
        <div className="login-brand">iSTAR <span>Alliance</span></div>
        <div className="login-sub">星辰聯盟 · 學員成長平台</div>
        <div className="login-card">
          {error && <div className="login-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="input-label">Email</div>
            <input className="input-field" type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" />
            <div className="input-label">密碼</div>
            <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" style={{ marginBottom:18 }} />
            <button type="submit" className="btn btn-primary" style={{ width:"100%", justifyContent:"center", padding:"13px" }} disabled={loading}>
              {loading?"登入中…":"登入"}
            </button>
          </form>
          <div className="login-no-access">
            沒有帳號？請聯絡星辰聯盟管理員<br />取得您的專屬登入資格
          </div>
        </div>
      </div>
    </div>
  );
}

function NoAccessScreen({ user, logout }) {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32 }}>
      <div style={{ fontFamily:"var(--font)", fontSize:40, color:"var(--gold)", marginBottom:14 }}>✦</div>
      <div style={{ fontFamily:"var(--font)", fontSize:20, fontWeight:600, color:"var(--gold)", marginBottom:10 }}>尚未取得存取權限</div>
      <div style={{ fontSize:13, color:"var(--ink-3)", textAlign:"center", lineHeight:1.75, marginBottom:28 }}>
        帳號（{user?.email}）<br />尚未被加入星辰聯盟系統。<br />請聯絡管理員開通您的權限。
      </div>
      <button className="btn" onClick={logout}>登出</button>
    </div>
  );
}

/* ════════════════════════════════════════
   ROOT APP
════════════════════════════════════════ */
export default function App() {
  const { user, profile, role, loading, logout } = useAuth();
  const [sTab,  setSTab]  = useState("home");
  const [cTab,  setCTab]  = useState("home");
  const [modal, setModal] = useState(null);

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
      case "home":    return <CHome    onSwitch={setCTab} />;
      case "modules": return <CModules onSwitch={setCTab} onModal={setModal} />;
      case "assign":  return <CAssign  onSwitch={setCTab} />;
      case "records": return <CRecords onSwitch={setCTab} onModal={setModal} />;
      case "members": return <CMembers onSwitch={setCTab} />;
      default:        return <CHome    onSwitch={setCTab} />;
    }
  };

  if (loading) {
    return (
      <>
        <Starfield />
        <div className="app" style={{ alignItems:"center", justifyContent:"center" }}>
          <div style={{ fontFamily:"var(--font)", fontSize:36, color:"var(--gold)", marginBottom:14 }}>✦</div>
          <div style={{ fontSize:13, color:"var(--ink-3)", letterSpacing:".06em" }}>載入中…</div>
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
              <span className="header-logo-mark">✦</span>
              <span className="header-logo-text">iSTAR <span>Alliance</span></span>
            </div>
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
              <span className="header-logo-mark">✦</span>
              <span className="header-logo-text">iSTAR <span>Alliance</span></span>
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
            <span className="header-logo-mark">✦</span>
            <span className="header-logo-text">iSTAR <span>Alliance</span></span>
          </div>
          <div className="header-right">
            <span className={"role-badge "+(role==="coach"?"coach":"student")}>
              {role==="coach"?"COACH":"STUDENT"}
            </span>
            <span style={{ fontSize:13, color:"var(--ink-2)", fontWeight:500 }}>{displayName}</span>
            <button className="logout-btn" onClick={logout}>登出</button>
          </div>
        </div>

        {role==="student" ? renderStudent() : renderCoach()}

        {modal==="module" && <ModalAddModule onClose={()=>setModal(null)} />}
        {modal==="record" && <ModalAddRecord onClose={()=>setModal(null)} />}
      </div>
    </>
  );
}