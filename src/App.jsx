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
.role-badge.admin  { background: var(--gold-pale);  color: var(--gold);  border: 1px solid var(--gold-line); }
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
function ResourcePanel({ moduleId }) {
  const { role: userRole, addModuleResource, fetchModuleResources } = useAuth();
  const [tab,       setTab]     = useState("link");
  const [linkVal,   setLink]    = useState("");
  const [linkName,  setName]    = useState("");
  const [resources, setRes]     = useState([]);
  const [saving,    setSaving]  = useState(false);

  useEffect(() => {
    if (moduleId) {
      fetchModuleResources(moduleId).then(list => {
        setRes(list.map(r => ({
          type: r.type || "link",
          name: r.name || r.url,
          url:  r.url  || "",
          size: r.size || "",
          by:   r.addedRole || userRole,
          ts:   r.createdAt?.toDate?.()?.toLocaleDateString("zh-TW") || "—",
          id:   r.id,
        })));
      }).catch(() => {});
    }
  }, [moduleId]);

  const addLink = async () => {
    if (!linkVal.trim()) return;
    const url  = linkVal.trim().startsWith("http") ? linkVal.trim() : "https://" + linkVal.trim();
    const name = linkName.trim() || url;
    setSaving(true);
    if (moduleId) {
      await addModuleResource(moduleId, { type:"link", name, url });
    }
    setRes(r => [...r, { type:"link", name, url, by: userRole, ts: new Date().toLocaleDateString("zh-TW") }]);
    setLink(""); setName(""); setSaving(false);
  };

  const handleFile = e => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => {
      const isImg = f.type.startsWith("image/");
      setRes(r => [...r, {
        type: isImg ? "img" : "file",
        name: f.name,
        size: (f.size/1024).toFixed(0) + "KB",
        by:   userRole,
        ts:   new Date().toLocaleDateString("zh-TW"),
      }]);
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
          <input className="input-field" placeholder="例：本週參考文章"
            value={linkName} onChange={e => setName(e.target.value)}
            style={{ marginBottom:6 }} />
          <div className="input-label">網址連結</div>
          <input className="input-field" placeholder="https://..."
            value={linkVal} onChange={e => setLink(e.target.value)}
            style={{ marginBottom:6 }} />
          <button className="btn btn-primary" style={{ width:"100%", justifyContent:"center" }}
            onClick={addLink} disabled={saving}>
            <IcPlus />{saving ? "儲存中…" : "加入連結"}
          </button>
        </>
      )}

      {(tab === "file" || tab === "img") && (
        <>
          <label style={{ display:"block", width:"100%", cursor:"pointer" }}>
            <div style={{ border:"1.5px dashed var(--cream-4)", borderRadius:"var(--r)", padding:"20px 12px", textAlign:"center", background:"var(--cream-3)" }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{tab==="img" ? "🖼" : "📎"}</div>
              <div style={{ fontSize:13, color:"var(--ink-2)", fontWeight:500 }}>點此上傳{tab==="img" ? "圖片" : "檔案"}</div>
              <div style={{ fontSize:11, color:"var(--ink-3)", marginTop:4 }}>
                {tab==="img" ? "支援 JPG、PNG、GIF、WEBP" : "支援 PDF、DOC、XLS、PPT 等"}
              </div>
            </div>
            <input type="file" style={{ display:"none" }}
              accept={tab==="img" ? "image/*" : ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"}
              multiple onChange={handleFile} />
          </label>
          <div className="upload-hint">⚠ 檔案上傳需整合 Firebase Storage（即將支援）</div>
        </>
      )}

      {resources.length > 0 && (
        <div className="resource-list" style={{ marginTop:12 }}>
          {resources.map((r, i) => (
            <div key={r.id || i} className="resource-item">
              <div className={"resource-icon " + r.type}>
                {r.type==="link" ? <IcLink /> : r.type==="img" ? <IcImg /> : <IcFile />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="resource-name" style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {r.type==="link"
                    ? <a href={r.url} target="_blank" rel="noopener noreferrer"
                        style={{ color:"var(--ink)", textDecoration:"underline", textDecorationColor:"var(--gold)" }}>
                        {r.name}
                      </a>
                    : r.name
                  }
                </div>
                <div className="resource-meta">
                  {r.size ? r.size + " · " : ""}{r.by === "coach" ? "教練上傳" : "學員上傳"} · {r.ts}
                </div>
              </div>
              <button onClick={() => setRes(res => res.filter((_,j) => j!==i))}
                style={{ border:"none", background:"none", color:"var(--ink-4)", cursor:"pointer", fontSize:18, padding:"0 2px", lineHeight:1 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {resources.length === 0 && (
        <div className="resource-empty">
          尚無學習資料<br />
          <span style={{ fontSize:11 }}>教練與學員都可以在這裡上傳連結或資料</span>
        </div>
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
    if (res.success) onClose(true);
    else setError("儲存失敗，請再試一次。");
  };

  return (
    <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) onClose(false); }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">{isEdit ? "編輯課程模組" : "新增課程模組"}</div>

        {error && (
          <div style={{ background:"var(--rust-pale)", border:"1px solid rgba(139,58,42,.2)", borderRadius:"var(--r)", padding:"10px 14px", fontSize:13, color:"var(--rust)", marginBottom:14 }}>
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

function ModalAddRecord({ onClose }) {
  const { fetchMembers, addRecord } = useAuth();
  const [students,  setStudents]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [form, setForm] = useState({
    studentUid:   "",
    studentName:  "",
    date:         new Date().toISOString().slice(0,10),
    topic:        "",
    feedback:     "",
    privateNote:  "",
    visibleStudent: true,
    visibleCoach:   true,
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
    const res = await addRecord({
      studentUid:     form.studentUid,
      studentName:    form.studentName,
      date:           form.date,
      topic:          form.topic.trim(),
      feedback:       form.feedback.trim(),
      privateNote:    form.privateNote.trim(),
      visibleStudent: form.visibleStudent,
      visibleCoach:   form.visibleCoach,
    });
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
        <div className="modal-title">新增上課記錄</div>

        {error && (
          <div style={{ background:"var(--rust-pale)", border:"1px solid rgba(139,58,42,.2)", borderRadius:"var(--r)", padding:"10px 14px", fontSize:13, color:"var(--rust)", marginBottom:14 }}>
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
   STUDENT SCREENS
════════════════════════════════════════ */
const S_TABS = [
  { key:"home",     label:"首頁", Icon:IcHome },
  { key:"courses",  label:"課程", Icon:IcGrid },
  { key:"growth",   label:"路徑", Icon:IcPath },
  { key:"feedback", label:"反饋", Icon:IcMsg  },
];

function SHome({ onSwitch }) {
  const { profile, fetchRecords, fetchAssignment, fetchModules } = useAuth();
  const name       = profile?.name || "同學";
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
    // 載入下一個待完成模組
    fetchAssignment(profile.uid).then(async (ids) => {
      if (!ids.length) return;
      const mods = await fetchModules();
      const assigned = mods.filter(m => ids.includes(m.id));
      if (assigned.length) setNextModule(assigned[0]);
    }).catch(() => {});
  }, [profile?.uid]);

  // 計算問候語
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "早安" : hour < 18 ? "午安" : "晚安";

  // 取當前成長階段
  const currentStage = GROWTH_STAGES.find(s => s.status === "active");

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

        {/* ── 問候卡（升級版：顯示當前成長階段）── */}
        <div className="card-gold" style={{ marginBottom:12 }}>
          <div className="greeting-name">{greeting}，{name} <span style={{ fontSize:18 }}>✦</span></div>
          <div className="greeting-sub" style={{ marginTop:5 }}>
            {courseType ? courseType : "你的旅程正在前進"}
          </div>
          {currentStage && (
            <div style={{ marginTop:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                <span style={{ fontSize:10, letterSpacing:".1em", textTransform:"uppercase", color:"var(--gold)", fontWeight:700 }}>
                  當前階段 · {currentStage.num}
                </span>
                <span style={{ fontSize:12, color:"var(--gold)", fontWeight:500 }}>
                  {currentStage.name}
                </span>
              </div>
              <div className="stage-bar">{STAGE_SEGS.map((s,i)=><div key={i} className={`stage-seg ${s}`}/>)}</div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                <span style={{ fontSize:11, color:"rgba(197,162,74,.7)" }}>{currentStage.sub}</span>
                <span className="badge badge-gold" style={{ fontSize:10 }} onClick={() => onSwitch("growth")}>
                  查看路徑 →
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── 下一步行動（最重要的 CTA）── */}
        {nextModule ? (
          <>
            <div className="sec-h">下一個課程</div>
            <div className="card" style={{ borderLeft:"2px solid var(--gold)", cursor:"pointer" }} onClick={() => onSwitch("courses")}>
              <div style={{ fontSize:10, letterSpacing:".1em", textTransform:"uppercase", color:"var(--gold)", marginBottom:5, fontWeight:700 }}>待完成</div>
              <div style={{ fontSize:15, fontWeight:600, fontFamily:"var(--font)", marginBottom:3 }}>{nextModule.title}</div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {(nextModule.stage||[]).map(s => <span key={s} className="badge badge-gold" style={{ fontSize:10 }}>{s}</span>)}
                {nextModule.duration && <span style={{ fontSize:11, color:"var(--ink-3)", fontStyle:"italic" }}>⏱ {nextModule.duration}</span>}
              </div>
            </div>
          </>
        ) : courseType ? (
          <>
            <div className="sec-h">我的課程</div>
            <div className="card" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }} onClick={() => onSwitch("courses")}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, fontFamily:"var(--font)" }}>{courseType}</div>
                {coachName && <div style={{ fontSize:12, color:"var(--ink-3)", marginTop:3, fontStyle:"italic" }}>聯絡教練：{coachName}</div>}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </>
        ) : (
          <>
            <div className="sec-h">課程</div>
            <div className="card" style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, padding:"20px 16px", lineHeight:1.7 }}>
              尚未分配課程<br /><span style={{ fontSize:12, fontStyle:"italic" }}>請聯絡您的教練</span>
            </div>
          </>
        )}

        {/* ── 最新教練回饋（有才顯示）── */}
        {latestFeedback && (
          <>
            <div className="sec-h">最新回饋</div>
            <div className="card" style={{ cursor:"pointer" }} onClick={() => onSwitch("feedback")}>
              <div className="feedback-author">✦ {latestFeedback.coachName} · {latestFeedback.date}</div>
              <div className="feedback-quote" style={{ fontSize:13, marginBottom:0 }}>
                {latestFeedback.feedback.length > 80
                  ? latestFeedback.feedback.slice(0,80) + "…"
                  : latestFeedback.feedback}
              </div>
              <div style={{ fontSize:11, color:"var(--ink-4)", marginTop:8, fontStyle:"italic" }}>
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
              <div style={{ fontSize:24 }}>💬</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, fontFamily:"var(--font)" }}>填寫本週反饋</div>
                <div style={{ fontSize:12, color:"var(--ink-3)", marginTop:3, fontStyle:"italic" }}>記錄你的學習收穫與感受</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="2" style={{ marginLeft:"auto" }}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </>
        )}

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
                <ResourcePanel moduleId={null} />
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

function CHome({ onSwitch }) {
  const { profile, fetchMembers, fetchModules, fetchRecords } = useAuth();
  const [students,        setStudents]        = useState([]);
  const [moduleCount,     setModuleCount]     = useState(0);
  const [unassigned,      setUnassigned]      = useState([]);  // 尚未分配課程的學員
  const [recentRecords,   setRecentRecords]   = useState([]);  // 最近 3 筆上課記錄
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    Promise.all([
      fetchMembers(),
      fetchModules(),
      fetchRecords(),
    ]).then(async ([members, modules, records]) => {
      const studentList = members.filter(m => m.role === "student");
      setStudents(studentList);
      setModuleCount(modules.length);

      // 找出尚未有任何分配記錄的學員（簡易判斷）
      const { getDocs, collection } = await import("firebase/firestore");
      const { db } = await import("./firebase");
      const assignedUids = new Set();
      try {
        const snap = await getDocs(collection(db, "assignments"));
        snap.docs.forEach(d => { if (d.data().moduleIds?.length) assignedUids.add(d.id); });
      } catch {}
      setUnassigned(studentList.filter(s => !assignedUids.has(s.uid)));

      // 最近 3 筆記錄
      const sorted = records.sort((a,b) => (b.date||"").localeCompare(a.date||""));
      setRecentRecords(sorted.slice(0,3));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [profile?.uid]);

  return (
    <div className="screen-enter">
      <div className="topbar">
        <div>
          <div className="istar-logo"><span className="istar-mark">✦</span> iSTAR · 教練</div>
          <div style={{ fontSize:11, color:"var(--ink-3)", marginTop:2, letterSpacing:".04em" }}>Coach Dashboard</div>
        </div>
        <div className="avatar coach-av-header" style={(() => { const c = getAvatarColor(profile?.name||"教"); return { background: c.bg, color: c.text, borderColor: c.bg }; })()}>
          {(profile?.name||"教").slice(0,1)}
        </div>
      </div>
      <div className="content">

        {/* ── 今日摘要卡 ── */}
        <div className="card-glass" style={{ marginBottom:12 }}>
          <div style={{ fontFamily:"var(--font)", fontSize:20, fontWeight:600 }}>{profile?.name||"教練"}</div>
          <div style={{ display:"flex", gap:20, marginTop:12 }}>
            <div>
              <div style={{ fontFamily:"var(--font)", fontSize:26, fontWeight:600, color:"var(--sage)" }}>{students.length}</div>
              <div style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase", marginTop:2 }}>學員</div>
            </div>
            <div style={{ width:1, background:"var(--cream-3)" }} />
            <div>
              <div style={{ fontFamily:"var(--font)", fontSize:26, fontWeight:600, color:"var(--gold)" }}>{moduleCount}</div>
              <div style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase", marginTop:2 }}>課程模組</div>
            </div>
            <div style={{ width:1, background:"var(--cream-3)" }} />
            <div>
              <div style={{ fontFamily:"var(--font)", fontSize:26, fontWeight:600, color: unassigned.length > 0 ? "var(--rust)" : "var(--ink)" }}>{unassigned.length}</div>
              <div style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase", marginTop:2 }}>待分配</div>
            </div>
          </div>
        </div>

        {/* ── 待辦事項：需要關注的學員 ── */}
        {!loading && unassigned.length > 0 && (
          <>
            <div className="sec-h">需要關注</div>
            <div className="card" style={{ borderLeft:"2px solid var(--rust)", padding:"12px 16px", cursor:"pointer" }} onClick={() => onSwitch("assign")}>
              <div style={{ fontSize:10, letterSpacing:".1em", textTransform:"uppercase", color:"var(--rust)", marginBottom:6, fontWeight:700 }}>尚未分配課程</div>
              {unassigned.slice(0,3).map((s, i) => (
                <div key={s.uid} style={{ display:"flex", alignItems:"center", gap:10, paddingTop: i > 0 ? 8 : 0, borderTop: i > 0 ? "1px solid var(--cream-3)" : "none" }}>
                  <div className="coach-av" style={{ ...(() => { const c = getAvatarColor(s.name||""); return { background:c.bg, color:c.text }; })(), width:28, height:28, fontSize:11 }}>
                    {s.name?.slice(0,2)||"??"}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{s.name}</div>
                    <div style={{ fontSize:11, color:"var(--ink-3)", fontStyle:"italic" }}>{s.courseType||"—"}</div>
                  </div>
                </div>
              ))}
              {unassigned.length > 3 && (
                <div style={{ fontSize:12, color:"var(--rust)", marginTop:8, fontStyle:"italic" }}>
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
                  <div className="coach-av" style={(() => { const c = getAvatarColor(s.name||""); return { background:c.bg, color:c.text, fontSize:12 }; })()} >{s.name?.slice(0,2)||"??"}</div>
                  <div style={{ flex:1 }}>
                    <div className="coach-name">{s.name}</div>
                    <div className="coach-tag">{s.courseType||"—"}</div>
                  </div>
                  <button className="btn btn-sm" style={{ fontSize:11, padding:"4px 10px" }} onClick={() => onSwitch("assign")}>分配</button>
                </div>
              ))}
              {students.length > 4 && (
                <div style={{ textAlign:"center", fontSize:12, color:"var(--ink-3)", padding:"8px 0", fontStyle:"italic", borderTop:"1px solid var(--cream-3)" }}>
                  共 {students.length} 位學員
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 最近上課記錄 ── */}
        {!loading && recentRecords.length > 0 && (
          <>
            <div className="sec-h" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>最近記錄</span>
              <button style={{ fontSize:11, color:"var(--gold)", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--font)", fontStyle:"italic" }} onClick={() => onSwitch("records")}>查看全部 →</button>
            </div>
            {recentRecords.map(r => (
              <div key={r.id} className="card card-sm" style={{ marginBottom:7 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, fontFamily:"var(--font)" }}>{r.topic}</div>
                    <div style={{ fontSize:11, color:"var(--ink-3)", marginTop:2, fontStyle:"italic" }}>{r.date} · {r.studentName||"—"}</div>
                  </div>
                  {r.visibleStudent && <span className="badge badge-teal" style={{ fontSize:10, flexShrink:0, marginLeft:8 }}>學員可見</span>}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── 空狀態 ── */}
        {!loading && students.length === 0 && (
          <div className="card" style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, padding:"28px 16px", lineHeight:1.7 }}>
            還沒有學員<br />
            <span style={{ fontSize:12, fontStyle:"italic" }}>請聯絡管理員新增學員至系統</span>
          </div>
        )}

      </div>
      <BottomNav tabs={C_TABS} active="home" onSwitch={onSwitch} />
    </div>
  );
}

/* ── 模組狀態標籤 ── */
const MODULE_STATUS = {
  draft:     { label:"草稿",   bg:"var(--cream-2)",   color:"var(--ink-3)",  border:"var(--cream-3)" },
  pending:   { label:"待審核", bg:"#FEF3D0",           color:"#8A6820",       border:"rgba(138,104,32,.2)" },
  published: { label:"已發布", bg:"var(--sage-pale)",  color:"var(--sage)",   border:"rgba(74,123,90,.22)" },
  rejected:  { label:"已退回", bg:"var(--rust-pale)",  color:"var(--rust)",   border:"rgba(139,58,42,.2)" },
};

function ModuleCard({ m, stageColors, canEdit, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const st = MODULE_STATUS[m.status] || MODULE_STATUS.pending;
  return (
    <div className="mod-card" style={{ borderLeftColor: stageColors[m.stage?.[0]] || "var(--gold)", marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", cursor:"pointer" }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ flex:1 }}>
          <div className="mod-tags" style={{ marginBottom:6 }}>
            {/* 狀態 badge */}
            <span className="badge" style={{ background:st.bg, color:st.color, border:`1px solid ${st.border}`, fontSize:10 }}>
              {st.label}
            </span>
            {(m.stage||[]).map(s => (
              <span key={s} className="badge" style={{ background:"var(--gold-pale)", color:"var(--gold)", border:"1px solid var(--gold-line)", fontSize:10 }}>{s}</span>
            ))}
            {m.duration && <span className="badge" style={{ background:"var(--cream-2)", color:"var(--ink-3)", border:"1px solid var(--cream-3)", fontSize:10 }}>⏱ {m.duration}</span>}
            {(m.method||[]).map(mt => (
              <span key={mt} className="badge" style={{ background:"var(--cream-2)", color:"var(--ink-3)", border:"1px solid var(--cream-3)", fontSize:10 }}>{mt}</span>
            ))}
          </div>
          <div className="mod-title">{m.title}</div>
          {m.outline && <div className="mod-outline">{m.outline}</div>}
          {m.reviewNote && m.status === "rejected" && (
            <div style={{ fontSize:12, color:"var(--rust)", marginTop:6, fontStyle:"italic", background:"var(--rust-pale)", padding:"6px 10px", borderRadius:"var(--r)" }}>
              退回原因：{m.reviewNote}
            </div>
          )}
          {m.coachName && <div style={{ fontSize:11, color:"var(--ink-4)", marginTop:6, fontStyle:"italic" }}>建立者：{m.coachName}</div>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:10, flexShrink:0 }}>
          {/* 只有 pending/rejected 狀態可以編輯刪除 */}
          {canEdit && (
            <>
              <button className="btn btn-sm" style={{ padding:"4px 9px", fontSize:11 }}
                onClick={e => { e.stopPropagation(); onEdit(m); }}>編輯</button>
              <button className="btn btn-sm"
                style={{ padding:"4px 9px", fontSize:11, color:"var(--rust)", borderColor:"rgba(139,58,42,.2)", background:"var(--rust-pale)" }}
                onClick={e => { e.stopPropagation(); onDelete(m.id); }}>刪除</button>
            </>
          )}
          <span style={{ fontSize:14, color:"var(--ink-4)" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ borderTop:"1px solid var(--cream-3)", marginTop:12, paddingTop:4 }}>
          <ResourcePanel moduleId={m.id} />
        </div>
      )}
    </div>
  );
}

function CModules({ onSwitch, onModal }) {
  const { fetchModules, deleteModule } = useAuth();
  const [modules,    setModules]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchModules().then(all => { setModules(all); setLoading(false); }).catch(() => setLoading(false));
  }, [refreshKey]);

  const handleModal = () => onModal("module", () => setRefreshKey(k => k+1));
  const handleEdit  = (m) => {
    setEditTarget(m);
    onModal("module_edit", () => setRefreshKey(k => k+1));
  };
  const handleDelete = async (id) => {
    await deleteModule(id);
    setConfirmDel(null);
    setRefreshKey(k => k+1);
  };

  const stageColors = {
    "探索":"var(--gold)","自我認知":"var(--slate)","內化":"var(--slate)",
    "定位":"var(--gold)","方向":"var(--slate)","小驗":"var(--sage)",
    "實作":"var(--rust)","市場":"var(--rust)","共創":"var(--gold)",
  };

  return (
    <div className="screen-enter">
      {confirmDel && (
        <div style={{ position:"absolute",inset:0,background:"rgba(28,26,23,.5)",backdropFilter:"blur(6px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
          <div style={{ background:"var(--cream)",border:"1px solid var(--cream-3)",borderRadius:"var(--r-xl)",padding:"26px 24px",width:"100%",maxWidth:320 }}>
            <div style={{ fontFamily:"var(--font)",fontSize:18,fontWeight:600,marginBottom:10 }}>確認刪除模組</div>
            <div style={{ fontSize:14,color:"var(--ink-2)",lineHeight:1.65,marginBottom:20 }}>確定要刪除此課程模組嗎？此動作無法復原。</div>
            <div className="btn-row" style={{ marginTop:0 }}>
              <button className="btn" onClick={() => setConfirmDel(null)}>取消</button>
              <button className="btn" style={{ background:"var(--rust-pale)",color:"var(--rust)",borderColor:"rgba(139,58,42,.2)" }} onClick={() => handleDelete(confirmDel)}>確認刪除</button>
            </div>
          </div>
        </div>
      )}
      <div className="topbar">
        <div className="topbar-title">課程模組</div>
        <button className="btn btn-primary btn-sm" onClick={handleModal}><IcPlus />新增</button>
      </div>
      <div className="content">
        {loading ? (
          <div style={{ textAlign:"center",color:"var(--ink-3)",fontSize:13,marginTop:48 }}>載入中…</div>
        ) : modules.length === 0 ? (
          <>
            <div style={{ textAlign:"center",color:"var(--ink-3)",fontSize:13,marginTop:48,marginBottom:18,lineHeight:1.7 }}>
              尚未建立課程模組<br/><span style={{ fontSize:12,fontStyle:"italic" }}>點右上角「新增」開始建立</span>
            </div>
            <button className="btn" style={{ width:"100%",justifyContent:"center" }} onClick={handleModal}><IcPlus />新增第一個課程模組</button>
          </>
        ) : modules.map(m => (
          <ModuleCard key={m.id} m={m} stageColors={stageColors}
            canEdit={true}
            onEdit={handleEdit}
            onDelete={id => setConfirmDel(id)} />
        ))}
      </div>
      {/* 編輯 Modal */}
      {editTarget && (
        <ModalAddModule
          editData={editTarget}
          onClose={(saved) => { setEditTarget(null); if(saved) setRefreshKey(k=>k+1); }} />
      )}
      <BottomNav tabs={C_TABS} active="modules" onSwitch={onSwitch} />
    </div>
  );
}

function CAssign({ onSwitch }) {
  const { profile, fetchMembers, fetchModules, fetchAssignment, saveAssignment } = useAuth();
  const [students,   setStudents]   = useState([]);
  const [modulePool, setModulePool] = useState([]);
  const [selStudent, setSelStudent] = useState(null);
  const [assigned,   setAssigned]   = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    fetchMembers().then(all => setStudents(all.filter(m => m.role === "student"))).catch(() => {});
    fetchModules().then(setModulePool).catch(() => {});
  }, [profile?.uid]);

  // 選擇學員後載入已分配的模組
  const selectStudent = async (s) => {
    setSelStudent(s);
    setSaved(false);
    const ids = await fetchAssignment(s.uid);
    // 用 id 找回完整模組資料
    const current = modulePool.filter(m => ids.includes(m.id));
    setAssigned(current);
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
    const res = await saveAssignment(selStudent.uid, assigned.map(m => m.id));
    setSaving(false);
    if (res.success) setSaved(true);
  };

  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">分配課程</div>
        {selStudent && <span className="badge badge-nebula">{selStudent.name}</span>}
      </div>
      <div className="content">
        {students.length === 0 ? (
          <div style={{ textAlign:"center",color:"var(--ink-3)",fontSize:13,marginTop:48,lineHeight:1.7 }}>
            尚無學員<br/><span style={{ fontSize:12 }}>請先在「成員管理」新增學員</span>
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
                <div style={{ fontSize:13,color:"var(--ink-3)",marginBottom:12,lineHeight:1.6 }}>
                  為 <strong style={{ color:"var(--ink)" }}>{selStudent.name}</strong> 分配課程模組
                </div>
                <div className="sec-h">可用模組</div>
                <div className="module-pool">
                  {modulePool.length === 0
                    ? <span style={{ fontSize:12,color:"var(--ink-3)",fontStyle:"italic" }}>尚無課程模組，請先至「模組」頁面新增</span>
                    : modulePool.map(m => (
                        <span key={m.id} className="m-chip" onClick={() => addModule(m)}>✦ {m.title}</span>
                      ))
                  }
                </div>
                <div className="sec-h">{selStudent.name} 的專屬課程</div>
                <div className="drop-zone">
                  <div className="drop-label">↑ 點擊上方模組加入 · 點 × 移除</div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                    {assigned.map(a => (
                      <span key={a.id} className="m-chip assigned" style={{ cursor:"pointer" }}
                        onClick={() => removeModule(a.id)}>
                        ✓ {a.title} ×
                      </span>
                    ))}
                  </div>
                </div>
                {saved && (
                  <div style={{ padding:"10px 14px",borderRadius:"var(--r)",marginTop:10,fontSize:13,textAlign:"center",background:"var(--sage-pale)",border:"1px solid rgba(74,123,90,.22)",color:"var(--sage)" }}>
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
      <BottomNav tabs={C_TABS} active="assign" onSwitch={onSwitch} />
    </div>
  );
}

function CRecords({ onSwitch, onModal }) {
  const { fetchRecords } = useAuth();
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
  }, [refreshKey]);

  const handleModal = () => onModal("record", () => setRefreshKey(k => k + 1));

  return (
    <div className="screen-enter">
      <div className="topbar">
        <div className="topbar-title">上課記錄</div>
        <button className="btn btn-primary btn-sm" onClick={handleModal}><IcPlus />新增</button>
      </div>
      <div className="content">
        {loading ? (
          <div style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, marginTop:48 }}>載入中…</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, marginTop:48, lineHeight:1.7 }}>
            尚無上課記錄<br /><span style={{ fontSize:12, fontStyle:"italic" }}>點右上角「新增」記錄上課狀況</span>
          </div>
        ) : (
          records.map(r => (
            <div key={r.id} className="card" style={{ marginBottom:10 }}>
              {/* 標題列 */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, fontFamily:"var(--font)" }}>{r.topic}</div>
                  <div style={{ fontSize:12, color:"var(--ink-3)", marginTop:2, fontStyle:"italic" }}>
                    {r.date} · {r.studentName || "—"} · {r.coachName || "—"}
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end", flexShrink:0, marginLeft:8 }}>
                  {r.visibleStudent && <span className="badge badge-teal" style={{ fontSize:10 }}>學員可見</span>}
                  {r.visibleCoach   && <span className="badge badge-nebula" style={{ fontSize:10 }}>教練可見</span>}
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
            </div>
          ))
        )}
      </div>
      <BottomNav tabs={C_TABS} active="records" onSwitch={onSwitch} />
    </div>
  );
}

function CMembers({ onSwitch }) {
  const { addMember, fetchMembers, updateMember, deleteMember, profile } = useAuth();
  const [members,   setMembers]   = useState([]);
  const [tab,       setTab]       = useState("list");
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [editTarget, setEditTarget] = useState(null); // 編輯中的成員
  const [confirmDel, setConfirmDel] = useState(null); // 待確認刪除的 uid

  const blankForm = {
    name:"", email:"", password:"", birthdate:"",
    coachName: profile?.name||"", courseType:"個人賦能班",
    joinDate: new Date().toISOString().slice(0,10), role:"student",
  };
  const [form, setForm] = useState(blankForm);

  const loadMembers = () => fetchMembers().then(setMembers).catch(() => {});

  useEffect(() => {
    if (tab === "list") loadMembers();
  }, [tab]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // 新增
  const handleAdd = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setResult({ ok:false, msg:"姓名、Email、密碼為必填。" }); return;
    }
    setLoading(true); setResult(null);
    const res = await addMember({ ...form });
    setLoading(false);
    if (res.success) {
      setResult({ ok:true, msg:`${form.name} 已成功新增！` });
      setForm({ ...blankForm, role: form.role });
    } else {
      setResult({ ok:false, msg: res.error });
    }
  };

  // 進入編輯模式
  const startEdit = m => {
    setEditTarget(m);
    setForm({
      name:       m.name       || "",
      email:      m.email      || "",
      password:   "",
      birthdate:  m.birthdate  || "",
      coachName:  m.coachName  || "",
      courseType: m.courseType || "個人賦能班",
      joinDate:   m.joinDate   || "",
      role:       m.role       || "student",
    });
    setTab("add");
    setResult(null);
  };

  // 儲存編輯
  const handleEdit = async e => {
    e.preventDefault();
    if (!form.name) { setResult({ ok:false, msg:"姓名為必填。" }); return; }
    setLoading(true); setResult(null);
    const data = {
      name:       form.name,
      birthdate:  form.birthdate,
      coachName:  form.coachName,
      courseType: form.courseType,
      joinDate:   form.joinDate,
    };
    const res = await updateMember(editTarget.uid, data);
    setLoading(false);
    if (res.success) {
      setResult({ ok:true, msg:`${form.name} 資料已更新！` });
      setEditTarget(null);
      loadMembers();
    } else {
      setResult({ ok:false, msg:"更新失敗，請再試一次。" });
    }
  };

  // 刪除確認
  const handleDelete = async uid => {
    const res = await deleteMember(uid);
    setConfirmDel(null);
    if (res.success) {
      setMembers(ms => ms.filter(m => m.uid !== uid));
    }
  };

  const roleLabel = r => r === "coach" ? "教練" : "學員";
  const rColor    = r => r === "coach" ? "var(--sage)"      : "var(--slate)";
  const rBg       = r => r === "coach" ? "var(--sage-pale)" : "var(--slate-pale)";
  const rBorder   = r => r === "coach" ? "rgba(74,123,90,.22)" : "rgba(58,74,107,.18)";

  const isEdit = !!editTarget;

  return (
    <div className="screen-enter">
      {/* 確認刪除 Dialog */}
      {confirmDel && (
        <div style={{ position:"absolute", inset:0, background:"rgba(28,26,23,.5)", backdropFilter:"blur(6px)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:"var(--cream)", border:"1px solid var(--cream-3)", borderRadius:"var(--r-xl)", padding:"26px 24px", width:"100%", maxWidth:320 }}>
            <div style={{ fontFamily:"var(--font)", fontSize:18, fontWeight:600, marginBottom:10 }}>確認刪除</div>
            <div style={{ fontSize:14, color:"var(--ink-2)", lineHeight:1.65, marginBottom:20 }}>
              確定要刪除 <strong>{members.find(m => m.uid === confirmDel)?.name}</strong> 嗎？<br />
              <span style={{ fontSize:12, color:"var(--ink-3)", fontStyle:"italic" }}>此動作只會刪除系統資料，登入帳號仍保留。</span>
            </div>
            <div className="btn-row" style={{ marginTop:0 }}>
              <button className="btn" onClick={() => setConfirmDel(null)}>取消</button>
              <button className="btn" style={{ background:"var(--rust-pale)", color:"var(--rust)", borderColor:"rgba(139,58,42,.2)" }}
                onClick={() => handleDelete(confirmDel)}>確認刪除</button>
            </div>
          </div>
        </div>
      )}

      <div className="topbar">
        <div className="topbar-title">成員管理</div>
        <button
          className={tab === "add" ? "btn btn-primary btn-sm" : "btn btn-sm"}
          onClick={() => {
            if (tab === "add") { setTab("list"); setEditTarget(null); setResult(null); }
            else { setForm(blankForm); setEditTarget(null); setTab("add"); setResult(null); }
          }}>
          {tab === "add" ? "← 返回" : "+ 新增成員"}
        </button>
      </div>

      {tab === "list" ? (
        <div className="content">
          <div className="sec-h">所有成員（{members.length} 人）</div>
          {members.length === 0 && (
            <div style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, marginTop:36, lineHeight:1.7 }}>
              還沒有成員<br /><span style={{ fontSize:12 }}>點右上角「+ 新增成員」</span>
            </div>
          )}
          {members.map(m => (
            <div key={m.uid} className="card card-sm" style={{ marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div className="coach-av" style={(() => { const c = getAvatarColor(m.name||""); return { background: c.bg, color: c.text, fontSize:12, flexShrink:0 }; })()}>
                  {m.name?.slice(0,2) || "??"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                    <span style={{ fontSize:14, fontWeight:600, letterSpacing:"-.01em" }}>{m.name}</span>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:"var(--r-pill)", background:rBg(m.role), color:rColor(m.role), border:`1px solid ${rBorder(m.role)}` }}>
                      {roleLabel(m.role)}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:"var(--ink-3)" }}>{m.email}</div>
                  {m.courseType && (
                    <div style={{ fontSize:11, color:"var(--ink-3)", marginTop:2 }}>
                      {m.courseType}{m.joinDate ? " · " + m.joinDate : ""}
                    </div>
                  )}
                </div>
                {/* 操作按鈕 */}
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button className="btn btn-sm" style={{ padding:"5px 10px", fontSize:12 }}
                    onClick={() => startEdit(m)}>編輯</button>
                  <button className="btn btn-sm"
                    style={{ padding:"5px 10px", fontSize:12, color:"var(--rust)", borderColor:"rgba(139,58,42,.2)", background:"var(--rust-pale)" }}
                    onClick={() => setConfirmDel(m.uid)}>刪除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="content">
          {result && (
            <div style={{ padding:"11px 14px", borderRadius:"var(--r)", marginBottom:14, fontSize:13, textAlign:"center", lineHeight:1.5,
              background: result.ok ? "var(--sage-pale)" : "var(--rust-pale)",
              border: `1px solid ${result.ok ? "rgba(74,123,90,.22)" : "rgba(139,58,42,.2)"}`,
              color: result.ok ? "var(--sage)" : "var(--rust)" }}>
              {result.msg}
            </div>
          )}

          {isEdit && (
            <div style={{ padding:"8px 12px", background:"var(--slate-pale)", borderRadius:"var(--r)", marginBottom:14, fontSize:13, color:"var(--slate)", border:"1px solid rgba(58,74,107,.18)" }}>
              ✏ 編輯模式：{editTarget.name} ({editTarget.email})
            </div>
          )}

          <form onSubmit={isEdit ? handleEdit : handleAdd}>
            {!isEdit && (
              <>
                <div className="input-label">角色</div>
                <div className="chip-group" style={{ marginBottom:12 }}>
                  {["student","coach"].map(r => (
                    <div key={r} className={"chip" + (form.role === r ? " sel" : "")} onClick={() => setField("role", r)}>
                      {r === "student" ? "✦ 學員" : "🎓 教練"}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="input-label">姓名 *</div>
            <input className="input-field" placeholder="王小明" value={form.name}
              onChange={e => setField("name", e.target.value)} />

            {!isEdit && (
              <>
                <div className="input-label">Email *</div>
                <input className="input-field" type="email" placeholder="member@email.com" value={form.email}
                  onChange={e => setField("email", e.target.value)} />
                <div className="input-label">初始密碼 *（至少 6 碼）</div>
                <input className="input-field" type="text" placeholder="設定後請告知對方" value={form.password}
                  onChange={e => setField("password", e.target.value)} />
              </>
            )}

            {(form.role === "student" || isEdit) && (
              <>
                <div className="input-label">出生年月日</div>
                <input className="input-field" type="date" value={form.birthdate}
                  onChange={e => setField("birthdate", e.target.value)} />
                <div className="input-label">課程班別</div>
                <div className="chip-group" style={{ marginBottom:12 }}>
                  {COURSE_TYPES.map(c => (
                    <div key={c} className={"chip" + (form.courseType === c ? " sel" : "")}
                      onClick={() => setField("courseType", c)}>{c}</div>
                  ))}
                </div>
                <div className="input-label">加入日期</div>
                <input className="input-field" type="date" value={form.joinDate}
                  onChange={e => setField("joinDate", e.target.value)} />
                <div className="input-label">主要聯絡教練（選填）</div>
                <input className="input-field" placeholder="留空代表由所有教練共同協助" value={form.coachName}
                  onChange={e => setField("coachName", e.target.value)} />
              </>
            )}

            <button type="submit" className="btn btn-primary"
              style={{ width:"100%", justifyContent:"center", marginTop:4 }}
              disabled={loading}>
              {loading ? "處理中…" : isEdit ? "✦ 儲存變更" : `✦ 確認新增${form.role === "student" ? "學員" : "教練"}`}
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
   COACH TABS（無成員管理，移至管理員）
════════════════════════════════════════ */
const C_TABS = [
  { key:"home",    label:"總覽", Icon:IcHome  },
  { key:"modules", label:"模組", Icon:IcLayer },
  { key:"assign",  label:"分配", Icon:IcSwap  },
  { key:"records", label:"記錄", Icon:IcDoc   },
];

/* ════════════════════════════════════════
   ADMIN SCREENS
════════════════════════════════════════ */
const A_TABS = [
  { key:"home",    label:"總覽", Icon:IcHome  },
  { key:"members", label:"成員", Icon:IcUsers },
  { key:"review",  label:"課程審核", Icon:IcLayer },
  { key:"records", label:"所有記錄", Icon:IcDoc  },
];

function AHome({ onSwitch }) {
  const { profile, fetchMembers, fetchModules, fetchRecords } = useAuth();
  const [data,    setData]    = useState({ members:[], coaches:[], students:[], modules:[], recentRecords:[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchMembers(),
      fetchModules(),
      fetchRecords(),
    ]).then(([members, modules, records]) => {
      const coaches  = members.filter(m => m.role === "coach");
      const students = members.filter(m => m.role === "student");
      const sorted   = records.sort((a,b) => (b.date||"").localeCompare(a.date||""));
      setData({ members, coaches, students, modules, recentRecords: sorted.slice(0,4) });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="screen-enter">
      <div className="topbar">
        <div>
          <div className="istar-logo"><span className="istar-mark">✦</span> iSTAR · 管理員</div>
          <div style={{ fontSize:11, color:"var(--ink-3)", marginTop:2, letterSpacing:".04em" }}>Admin Dashboard</div>
        </div>
        <div className="avatar" style={(() => { const c = getAvatarColor(profile?.name||"管"); return { background:c.bg, color:c.text, borderColor:c.bg }; })()}>
          {(profile?.name||"管").slice(0,1)}
        </div>
      </div>
      <div className="content">

        {/* ── 歡迎卡 ── */}
        <div className="card-gold" style={{ marginBottom:12 }}>
          <div style={{ fontFamily:"var(--font)", fontSize:20, fontWeight:600 }}>{profile?.name||"管理員"}</div>
          <div style={{ fontSize:13, color:"rgba(197,162,74,.7)", marginTop:3, fontStyle:"italic" }}>iSTAR Alliance 系統管理員</div>
          <div style={{ display:"flex", gap:18, marginTop:14, paddingTop:14, borderTop:"1px solid rgba(197,162,74,.2)" }}>
            {[
              { num: data.members.length, label:"總成員" },
              { num: data.coaches.length, label:"教練" },
              { num: data.students.length, label:"學員" },
              { num: data.modules.length, label:"課程模組" },
            ].map(({ num, label }) => (
              <div key={label} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"var(--font)", fontSize:22, fontWeight:600, color:"var(--gold)" }}>{loading ? "—" : num}</div>
                <div style={{ fontSize:10, color:"rgba(197,162,74,.6)", letterSpacing:".08em", textTransform:"uppercase", marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 近期活動：最新成員 ── */}
        {!loading && data.members.length > 0 && (
          <>
            <div className="sec-h" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>成員概況</span>
              <button style={{ fontSize:11, color:"var(--gold)", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--font)", fontStyle:"italic" }} onClick={() => onSwitch("members")}>管理全部 →</button>
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
                    <div className="coach-av" style={(() => { const c=getAvatarColor(m.name||""); return {background:c.bg,color:c.text,fontSize:12}; })()}>{m.name?.slice(0,2)||"??"}</div>
                    <div style={{ flex:1 }}>
                      <div className="coach-name">{m.name}</div>
                      <div className="coach-tag">{m.email}</div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:"var(--r-pill)", background:rc.bg, color:rc.color, border:`1px solid ${rc.border}`, flexShrink:0 }}>{rc.label}</span>
                  </div>
                );
              })}
              {data.members.length > 4 && (
                <div style={{ textAlign:"center", fontSize:12, color:"var(--ink-3)", padding:"8px 0", fontStyle:"italic", borderTop:"1px solid var(--cream-3)" }}>
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
              <button style={{ fontSize:11, color:"var(--gold)", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--font)", fontStyle:"italic" }} onClick={() => onSwitch("records")}>查看全部 →</button>
            </div>
            {data.recentRecords.map(r => (
              <div key={r.id} className="card card-sm" style={{ marginBottom:7 }}>
                <div style={{ fontSize:13, fontWeight:600, fontFamily:"var(--font)" }}>{r.topic}</div>
                <div style={{ fontSize:11, color:"var(--ink-3)", marginTop:2, fontStyle:"italic" }}>
                  {r.date} · 學員：{r.studentName||"—"} · 教練：{r.coachName||"—"}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── 空狀態 ── */}
        {!loading && data.members.length === 0 && (
          <div className="card" style={{ textAlign:"center", color:"var(--ink-3)", fontSize:13, padding:"28px 16px", lineHeight:1.7 }}>
            系統尚無成員<br />
            <button className="btn btn-primary" style={{ marginTop:14, fontSize:13 }} onClick={() => onSwitch("members")}>
              + 新增第一位成員
            </button>
          </div>
        )}

      </div>
      <BottomNav tabs={A_TABS} active="home" onSwitch={onSwitch} />
    </div>
  );
}

function AMembers({ onSwitch }) {
  // 與 CMembers 相同邏輯，管理員版
  const { addMember, fetchMembers, updateMember, deleteMember, profile } = useAuth();
  const [members,    setMembers]    = useState([]);
  const [tab,        setTab]        = useState("list");
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const blankForm = { name:"",email:"",password:"",birthdate:"",coachName:"",courseType:"個人賦能班",joinDate:new Date().toISOString().slice(0,10),role:"student" };
  const [form, setForm] = useState(blankForm);

  const loadMembers = () => fetchMembers().then(setMembers).catch(() => {});
  useEffect(() => { if(tab==="list") loadMembers(); }, [tab]);

  const setField = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleAdd = async e => {
    e.preventDefault();
    if (!form.name||!form.email||!form.password) { setResult({ok:false,msg:"姓名、Email、密碼為必填。"}); return; }
    setLoading(true); setResult(null);
    const res = await addMember({...form});
    setLoading(false);
    if (res.success) { setResult({ok:true,msg:`${form.name} 已成功新增！`}); setForm({...blankForm,role:form.role}); }
    else setResult({ok:false,msg:res.error});
  };

  const startEdit = m => { setEditTarget(m); setForm({name:m.name||"",email:m.email||"",password:"",birthdate:m.birthdate||"",coachName:m.coachName||"",courseType:m.courseType||"個人賦能班",joinDate:m.joinDate||"",role:m.role||"student"}); setTab("add"); setResult(null); };

  const handleEdit = async e => {
    e.preventDefault();
    if (!form.name) { setResult({ok:false,msg:"姓名為必填。"}); return; }
    setLoading(true); setResult(null);
    const res = await updateMember(editTarget.uid, {name:form.name,birthdate:form.birthdate,coachName:form.coachName,courseType:form.courseType,joinDate:form.joinDate});
    setLoading(false);
    if (res.success) { setResult({ok:true,msg:`${form.name} 資料已更新！`}); setEditTarget(null); loadMembers(); }
    else setResult({ok:false,msg:"更新失敗。"});
  };

  const handleDelete = async uid => { await deleteMember(uid); setConfirmDel(null); setMembers(ms=>ms.filter(m=>m.uid!==uid)); };

  const roleColors = { admin:{bg:"var(--gold-pale)",color:"var(--gold)",border:"var(--gold-line)"}, coach:{bg:"var(--sage-pale)",color:"var(--sage)",border:"rgba(74,123,90,.22)"}, student:{bg:"var(--slate-pale)",color:"var(--slate)",border:"rgba(58,74,107,.18)"} };
  const rc = r => roleColors[r] || roleColors.student;

  return (
    <div className="screen-enter">
      {confirmDel && (
        <div style={{ position:"absolute",inset:0,background:"rgba(28,26,23,.5)",backdropFilter:"blur(6px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
          <div style={{ background:"var(--cream)",border:"1px solid var(--cream-3)",borderRadius:"var(--r-xl)",padding:"26px 24px",width:"100%",maxWidth:320 }}>
            <div style={{ fontFamily:"var(--font)",fontSize:18,fontWeight:600,marginBottom:10 }}>確認刪除成員</div>
            <div style={{ fontSize:14,color:"var(--ink-2)",lineHeight:1.65,marginBottom:20 }}>確定要刪除 <strong>{members.find(m=>m.uid===confirmDel)?.name}</strong> 嗎？</div>
            <div className="btn-row" style={{ marginTop:0 }}>
              <button className="btn" onClick={() => setConfirmDel(null)}>取消</button>
              <button className="btn" style={{ background:"var(--rust-pale)",color:"var(--rust)",borderColor:"rgba(139,58,42,.2)" }} onClick={() => handleDelete(confirmDel)}>確認刪除</button>
            </div>
          </div>
        </div>
      )}
      <div className="topbar">
        <div className="topbar-title">成員管理</div>
        <button className={tab==="add"?"btn btn-primary btn-sm":"btn btn-sm"} onClick={() => { if(tab==="add"){setTab("list");setEditTarget(null);setResult(null);}else{setForm(blankForm);setEditTarget(null);setTab("add");setResult(null);} }}>
          {tab==="add" ? "← 返回" : "+ 新增成員"}
        </button>
      </div>
      {tab==="list" ? (
        <div className="content">
          <div className="sec-h">所有成員（{members.length} 人）</div>
          {members.length===0 && <div style={{ textAlign:"center",color:"var(--ink-3)",fontSize:13,marginTop:36,lineHeight:1.7 }}>還沒有成員<br/><span style={{ fontSize:12 }}>點右上角「+ 新增成員」</span></div>}
          {members.map(m => {
            const c = rc(m.role);
            return (
              <div key={m.uid} className="card card-sm" style={{ marginBottom:8 }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div className="coach-av" style={(() => { const ac=getAvatarColor(m.name||""); return {background:ac.bg,color:ac.text,fontSize:12,flexShrink:0}; })()}>{m.name?.slice(0,2)||"??"}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
                      <span style={{ fontSize:14,fontWeight:600,letterSpacing:"-.01em" }}>{m.name}</span>
                      <span style={{ fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:"var(--r-pill)",background:c.bg,color:c.color,border:`1px solid ${c.border}` }}>{m.role==="admin"?"管理員":m.role==="coach"?"教練":"學員"}</span>
                    </div>
                    <div style={{ fontSize:11,color:"var(--ink-3)" }}>{m.email}</div>
                    {m.courseType && <div style={{ fontSize:11,color:"var(--ink-3)",marginTop:2 }}>{m.courseType}{m.joinDate?" · "+m.joinDate:""}</div>}
                  </div>
                  <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                    <button className="btn btn-sm" style={{ padding:"5px 10px",fontSize:12 }} onClick={() => startEdit(m)}>編輯</button>
                    <button className="btn btn-sm" style={{ padding:"5px 10px",fontSize:12,color:"var(--rust)",borderColor:"rgba(139,58,42,.2)",background:"var(--rust-pale)" }} onClick={() => setConfirmDel(m.uid)}>刪除</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="content">
          {result && <div style={{ padding:"11px 14px",borderRadius:"var(--r)",marginBottom:14,fontSize:13,textAlign:"center",lineHeight:1.5,background:result.ok?"var(--sage-pale)":"var(--rust-pale)",border:`1px solid ${result.ok?"rgba(74,123,90,.22)":"rgba(139,58,42,.2)"}`,color:result.ok?"var(--sage)":"var(--rust)" }}>{result.msg}</div>}
          {editTarget && <div style={{ padding:"7px 12px",background:"var(--slate-pale)",borderRadius:"var(--r)",marginBottom:14,fontSize:13,color:"var(--slate)",border:"1px solid rgba(58,74,107,.18)" }}>✏ 編輯：{editTarget.name}</div>}
          <form onSubmit={editTarget ? handleEdit : handleAdd}>
            {!editTarget && (
              <>
                <div className="input-label">角色</div>
                <div className="chip-group" style={{ marginBottom:12 }}>
                  {[["student","✦ 學員"],["coach","🎓 教練"],["admin","⚙ 管理員"]].map(([r,l]) => (
                    <div key={r} className={"chip"+(form.role===r?" sel":"")} onClick={() => setField("role",r)}>{l}</div>
                  ))}
                </div>
              </>
            )}
            <div className="input-label">姓名 *</div>
            <input className="input-field" placeholder="王小明" value={form.name} onChange={e=>setField("name",e.target.value)} />
            {!editTarget && (
              <>
                <div className="input-label">Email *</div>
                <input className="input-field" type="email" placeholder="member@email.com" value={form.email} onChange={e=>setField("email",e.target.value)} />
                <div className="input-label">初始密碼 *（至少 6 碼）</div>
                <input className="input-field" type="text" placeholder="設定後請告知對方" value={form.password} onChange={e=>setField("password",e.target.value)} />
              </>
            )}
            {(form.role==="student"||editTarget?.role==="student") && (
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
              {loading ? "處理中…" : editTarget ? "✦ 儲存變更" : `✦ 確認新增${form.role==="student"?"學員":form.role==="coach"?"教練":"管理員"}`}
            </button>
          </form>
        </div>
      )}
      <BottomNav tabs={A_TABS} active="members" onSwitch={onSwitch} />
    </div>
  );
}

function AReview({ onSwitch }) {
  const { fetchModules, reviewModule } = useAuth();
  const [pending,    setPending]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [noteTarget, setNoteTarget] = useState(null);
  const [note,       setNote]       = useState("");

  const load = () => {
    setLoading(true);
    fetchModules("pending").then(all => { setPending(all); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    await reviewModule(id, "approve");
    setPending(p => p.filter(m => m.id !== id));
  };

  const reject = async (id) => {
    await reviewModule(id, "reject", note);
    setNoteTarget(null); setNote("");
    setPending(p => p.filter(m => m.id !== id));
  };

  return (
    <div className="screen-enter">
      {noteTarget && (
        <div style={{ position:"absolute",inset:0,background:"rgba(28,26,23,.5)",backdropFilter:"blur(6px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
          <div style={{ background:"var(--cream)",border:"1px solid var(--cream-3)",borderRadius:"var(--r-xl)",padding:"26px 24px",width:"100%",maxWidth:340 }}>
            <div style={{ fontFamily:"var(--font)",fontSize:18,fontWeight:600,marginBottom:14 }}>退回原因</div>
            <textarea className="input-field" rows={3} placeholder="請填寫退回原因，教練將會看到此訊息…" value={note} onChange={e => setNote(e.target.value)} />
            <div className="btn-row" style={{ marginTop:4 }}>
              <button className="btn" onClick={() => { setNoteTarget(null); setNote(""); }}>取消</button>
              <button className="btn" style={{ background:"var(--rust-pale)",color:"var(--rust)",borderColor:"rgba(139,58,42,.2)" }} onClick={() => reject(noteTarget)}>確認退回</button>
            </div>
          </div>
        </div>
      )}
      <div className="topbar"><div className="topbar-title">課程審核</div></div>
      <div className="content">
        {loading ? (
          <div style={{ textAlign:"center",color:"var(--ink-3)",fontSize:13,marginTop:48 }}>載入中…</div>
        ) : pending.length === 0 ? (
          <div style={{ textAlign:"center",color:"var(--ink-3)",fontSize:13,marginTop:48,lineHeight:1.7 }}>
            目前沒有待審課程 ✓<br/><span style={{ fontSize:12,fontStyle:"italic" }}>所有課程模組均已審核完畢</span>
          </div>
        ) : pending.map(m => (
          <div key={m.id} className="card" style={{ marginBottom:10 }}>
            <div style={{ marginBottom:8 }}>
              <div className="mod-tags" style={{ marginBottom:6 }}>
                {(m.stage||[]).map(s=><span key={s} className="badge badge-gold" style={{ fontSize:10 }}>{s}</span>)}
                {m.duration && <span className="badge" style={{ background:"var(--cream-2)",color:"var(--ink-3)",border:"1px solid var(--cream-3)",fontSize:10 }}>⏱ {m.duration}</span>}
                {(m.method||[]).map(mt=><span key={mt} className="badge" style={{ background:"var(--cream-2)",color:"var(--ink-3)",border:"1px solid var(--cream-3)",fontSize:10 }}>{mt}</span>)}
              </div>
              <div style={{ fontFamily:"var(--font)",fontSize:16,fontWeight:600 }}>{m.title}</div>
              {m.outline && <div style={{ fontSize:13,color:"var(--ink-3)",marginTop:4,fontStyle:"italic",lineHeight:1.6 }}>{m.outline}</div>}
              <div style={{ fontSize:12,color:"var(--ink-4)",marginTop:6,fontStyle:"italic" }}>建立者：{m.coachName} · {m.createdAt?.toDate?.()?.toLocaleDateString("zh-TW")||"—"}</div>
            </div>
            <div className="btn-row" style={{ marginTop:0 }}>
              <button className="btn" style={{ color:"var(--rust)",borderColor:"rgba(139,58,42,.2)",background:"var(--rust-pale)" }}
                onClick={() => setNoteTarget(m.id)}>退回</button>
              <button className="btn btn-primary" onClick={() => approve(m.id)}>✦ 核准發布</button>
            </div>
          </div>
        ))}
      </div>
      <BottomNav tabs={A_TABS} active="review" onSwitch={onSwitch} />
    </div>
  );
}

function ARecords({ onSwitch }) {
  const { fetchRecords } = useAuth();
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  useEffect(() => {
    fetchRecords().then(all => {
      setRecords(all.sort((a,b) => (b.date||"").localeCompare(a.date||"")));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  return (
    <div className="screen-enter">
      <div className="topbar"><div className="topbar-title">所有記錄</div></div>
      <div className="content">
        {loading ? (
          <div style={{ textAlign:"center",color:"var(--ink-3)",fontSize:13,marginTop:48 }}>載入中…</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign:"center",color:"var(--ink-3)",fontSize:13,marginTop:48,lineHeight:1.7 }}>尚無上課記錄</div>
        ) : records.map(r => (
          <div key={r.id} className="card" style={{ marginBottom:10 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
              <div>
                <div style={{ fontSize:15,fontWeight:600,fontFamily:"var(--font)" }}>{r.topic}</div>
                <div style={{ fontSize:12,color:"var(--ink-3)",marginTop:2,fontStyle:"italic" }}>
                  {r.date} · 學員：{r.studentName||"—"} · 教練：{r.coachName||"—"}
                </div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0,marginLeft:8 }}>
                {r.visibleStudent && <span className="badge badge-teal" style={{ fontSize:10 }}>學員可見</span>}
              </div>
            </div>
            {r.feedback && <div className="record-note"><div className="record-note-label" style={{ color:"var(--sage)" }}>給學員的回饋</div>{r.feedback}</div>}
            {r.privateNote && <div className="record-note coach-only" style={{ marginTop:6 }}><div className="record-note-label" style={{ color:"var(--gold)" }}>教練私密備註</div>{r.privateNote}</div>}
          </div>
        ))}
      </div>
      <BottomNav tabs={A_TABS} active="records" onSwitch={onSwitch} />
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
  const [aTab,  setATab]  = useState("home");
  const [modal, setModal] = useState(null);

  const openModal  = (type, onSuccess) => setModal({ type, onSuccess: onSuccess || null });
  const closeModal = (didSave) => {
    if (didSave && modal?.onSuccess) modal.onSuccess();
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
      case "home":    return <CHome    onSwitch={setCTab} />;
      case "modules": return <CModules onSwitch={setCTab} onModal={openModal} />;
      case "assign":  return <CAssign  onSwitch={setCTab} />;
      case "records": return <CRecords onSwitch={setCTab} onModal={openModal} />;
      default:        return <CHome    onSwitch={setCTab} />;
    }
  };

  const renderAdmin = () => {
    switch(aTab) {
      case "home":    return <AHome    onSwitch={setATab} />;
      case "members": return <AMembers onSwitch={setATab} />;
      case "review":  return <AReview  onSwitch={setATab} />;
      case "records": return <ARecords onSwitch={setATab} />;
      default:        return <AHome    onSwitch={setATab} />;
    }
  };

  const ROLE_LABELS = { admin:"ADMIN", coach:"COACH", student:"STUDENT" };
  const ROLE_CLASS  = { admin:"admin",  coach:"coach",  student:"student" };

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
            <span className={"role-badge " + (ROLE_CLASS[role] || "student")}>
              {ROLE_LABELS[role] || "STUDENT"}
            </span>
            <span style={{ fontSize:13, color:"var(--ink-2)", fontWeight:500 }}>{displayName}</span>
            <button className="logout-btn" onClick={logout}>登出</button>
          </div>
        </div>

        {role === "admin"   && renderAdmin()}
        {role === "coach"   && renderCoach()}
        {role === "student" && renderStudent()}

        {modal?.type === "module" && <ModalAddModule onClose={closeModal} />}
        {modal?.type === "record" && <ModalAddRecord onClose={closeModal} />}
      </div>
    </>
  );
}