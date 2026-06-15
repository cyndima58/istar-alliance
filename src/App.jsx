import React, { useState, useEffect, useRef } from 'react';

/* ════════════════════════════════════════
   GLOBAL CSS
════════════════════════════════════════ */
// Google Fonts 已在 public/index.html 的 <link> 載入，此處只注入變數與元件樣式
const GLOBAL_CSS = `
:root {
  --space:#0A0B14; --space-2:#10121F; --space-3:#181B2E; --space-4:#1E2238;
  --nebula:#6C5CE7; --nebula-dim:rgba(108,92,231,0.18); --nebula-glow:rgba(108,92,231,0.35);
  --gold:#C9A84C; --gold-dim:rgba(201,168,76,0.15); --gold-glow:rgba(201,168,76,0.3);
  --star:#E8E6F0; --star-2:#A8A4C0; --star-3:#5C5878;
  --teal:#00B89C; --teal-dim:rgba(0,184,156,0.15); --coral:#E05C5C;
  --r:12px; --r-lg:18px; --r-pill:100px;
  --font-display:'Inter','Noto Sans TC',sans-serif;
  --font-body:'Noto Sans TC','Inter',sans-serif;
  --ease-out:cubic-bezier(0.16,1,0.3,1);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;}
body{font-family:var(--font-body);background:var(--space);color:var(--star);overflow:hidden;-webkit-font-smoothing:antialiased;}
#starfield{position:fixed;inset:0;z-index:0;pointer-events:none;}
.app{position:relative;z-index:1;width:100%;max-width:430px;height:100dvh;margin:0 auto;display:flex;flex-direction:column;overflow:hidden;}
.status-bar{height:32px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;font-size:11px;font-family:var(--font-display);color:var(--star-2);flex-shrink:0;}
.status-bar .brand{color:var(--gold);font-weight:600;letter-spacing:.06em;font-size:10px;}
.role-toggle{margin:0 16px 2px;background:var(--space-3);border:1px solid rgba(108,92,231,.25);border-radius:var(--r);padding:4px;display:flex;flex-shrink:0;}
.role-btn{flex:1;padding:8px;border:none;border-radius:9px;background:transparent;color:var(--star-3);font-size:13px;font-family:var(--font-body);font-weight:500;cursor:pointer;transition:all .25s var(--ease-out);display:flex;align-items:center;justify-content:center;gap:6px;}
.role-btn svg{width:14px;height:14px;}
.role-btn.active{background:var(--nebula);color:#fff;box-shadow:0 2px 16px var(--nebula-glow);}
@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.screen-enter{animation:slideUp .22s var(--ease-out) both;}
.topbar{padding:12px 20px 10px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.topbar-title{font-size:18px;font-weight:600;font-family:var(--font-display);letter-spacing:-.01em;}
.avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--nebula),#9B8BF4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;border:1.5px solid rgba(108,92,231,.5);}
.content{flex:1;overflow-y:auto;padding:4px 16px 16px;scrollbar-width:none;}
.content::-webkit-scrollbar{display:none;}
.card{background:var(--space-2);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-lg);padding:16px;margin-bottom:10px;}
.card-sm{padding:12px 14px;border-radius:var(--r);margin-bottom:8px;}
.card-glow{background:var(--space-2);border:1px solid rgba(108,92,231,.3);border-radius:var(--r-lg);padding:16px;margin-bottom:10px;box-shadow:0 0 24px rgba(108,92,231,.12);}
.card-gold{background:var(--gold-dim);border:1px solid rgba(201,168,76,.3);border-radius:var(--r-lg);padding:16px;margin-bottom:10px;}
.greeting-name{font-size:22px;font-weight:700;font-family:var(--font-display);letter-spacing:-.02em;}
.greeting-sub{font-size:13px;color:var(--star-2);margin-top:3px;}
.stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;}
.stat-tile{background:var(--space-3);border:1px solid rgba(255,255,255,.06);border-radius:var(--r);padding:12px 14px;}
.stat-num{font-size:26px;font-weight:700;font-family:var(--font-display);}
.stat-num.gold{color:var(--gold);}
.stat-num.nebula{color:var(--nebula);}
.stat-lbl{font-size:11px;color:var(--star-3);margin-top:3px;letter-spacing:.02em;}
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:var(--r-pill);font-size:11px;font-weight:500;}
.badge-nebula{background:var(--nebula-dim);color:#A89CF4;border:1px solid rgba(108,92,231,.3);}
.badge-gold{background:var(--gold-dim);color:var(--gold);border:1px solid rgba(201,168,76,.3);}
.badge-teal{background:var(--teal-dim);color:var(--teal);border:1px solid rgba(0,184,156,.3);}
.badge-coral{background:rgba(224,92,92,.12);color:var(--coral);border:1px solid rgba(224,92,92,.3);}
.sec-h{font-size:11px;font-weight:600;color:var(--star-3);letter-spacing:.08em;text-transform:uppercase;margin:16px 0 8px;}
.prog-track{height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;}
.prog-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--nebula),#9B8BF4);}
.prog-fill.gold{background:linear-gradient(90deg,#A0742A,var(--gold));}
.journey{padding-left:32px;}
.journey-item{position:relative;margin-bottom:10px;}
.journey-item::before{content:'';position:absolute;left:-20px;top:22px;bottom:-10px;width:1px;background:linear-gradient(to bottom,rgba(108,92,231,.4),transparent);}
.journey-item:last-child::before{display:none;}
.journey-dot{position:absolute;left:-26px;top:8px;width:12px;height:12px;border-radius:50%;border:1.5px solid var(--star-3);display:flex;align-items:center;justify-content:center;}
.j-title{font-size:14px;font-weight:600;}
.j-title.active-stage{color:var(--gold);}
.j-sub{font-size:12px;color:var(--star-3);margin-top:2px;}
.course-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
.course-name{font-size:15px;font-weight:600;margin-bottom:3px;}
.course-meta{font-size:12px;color:var(--star-2);}
.coach-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);}
.coach-row:last-child{border-bottom:none;}
.coach-av{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;}
.coach-name{font-size:14px;font-weight:500;}
.coach-tag{font-size:11px;color:var(--star-3);margin-top:2px;}
.btn{padding:9px 16px;border-radius:var(--r);border:1px solid rgba(255,255,255,.12);font-size:13px;font-weight:500;font-family:var(--font-body);cursor:pointer;background:var(--space-3);color:var(--star);transition:all .2s;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
.btn:hover{border-color:rgba(108,92,231,.5);}
.btn-primary{background:var(--nebula);color:#fff;border-color:transparent;box-shadow:0 2px 16px var(--nebula-glow);}
.btn-primary:hover{opacity:.9;}
.btn-row{display:flex;gap:8px;margin-top:12px;}
.btn-row .btn{flex:1;}
.feedback-quote{background:var(--nebula-dim);border-left:2px solid var(--nebula);border-radius:0 var(--r) var(--r) 0;padding:10px 12px;font-size:13px;color:var(--star);line-height:1.6;margin-bottom:8px;}
.feedback-author{font-size:11px;color:var(--nebula);margin-bottom:6px;font-weight:600;letter-spacing:.04em;}
.input-field{width:100%;padding:10px 14px;background:var(--space-3);border:1px solid rgba(255,255,255,.1);border-radius:var(--r);color:var(--star);font-size:13px;font-family:var(--font-body);margin-bottom:8px;transition:border-color .2s;outline:none;}
.input-field:focus{border-color:var(--nebula);}
.input-label{font-size:11px;color:var(--star-3);margin-bottom:5px;letter-spacing:.03em;}
textarea.input-field{resize:none;line-height:1.6;}
select.input-field{appearance:none;}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);}
.toggle-lbl{font-size:13px;color:var(--star-2);display:flex;align-items:center;gap:8px;}
.toggle-sw{width:38px;height:22px;border-radius:11px;background:var(--space-4);border:none;cursor:pointer;position:relative;transition:background .2s;}
.toggle-sw.on{background:var(--nebula);box-shadow:0 0 10px var(--nebula-glow);}
.toggle-sw::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;}
.toggle-sw.on::after{left:19px;}
.chip-group{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}
.chip{padding:5px 12px;border-radius:var(--r-pill);font-size:12px;font-weight:500;border:1px solid rgba(255,255,255,.1);background:var(--space-3);color:var(--star-3);cursor:pointer;transition:all .2s;}
.chip.sel{background:var(--nebula-dim);border-color:rgba(108,92,231,.5);color:#A89CF4;}
.module-pool{display:flex;flex-wrap:wrap;gap:6px;padding:12px;background:var(--space-3);border-radius:var(--r);border:1px dashed rgba(108,92,231,.3);margin-bottom:8px;min-height:56px;}
.m-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:var(--r-pill);font-size:12px;font-weight:500;background:var(--nebula-dim);color:#A89CF4;border:1px solid rgba(108,92,231,.3);cursor:pointer;user-select:none;}
.drop-zone{padding:12px;background:rgba(0,184,156,.06);border:1px dashed rgba(0,184,156,.35);border-radius:var(--r);min-height:64px;}
.drop-label{font-size:11px;color:var(--teal);margin-bottom:8px;}
.m-chip.assigned{background:var(--teal-dim);color:var(--teal);border-color:rgba(0,184,156,.3);}
.record-note{background:var(--space-3);border-radius:var(--r);padding:10px 12px;font-size:13px;color:var(--star-2);line-height:1.6;margin-top:8px;}
.record-note.coach-only{background:var(--nebula-dim);}
.record-note-label{font-size:10px;font-weight:700;letter-spacing:.06em;margin-bottom:5px;}
.mod-card{background:var(--space-2);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-lg);padding:14px;margin-bottom:8px;border-left:2px solid var(--nebula);}
.mod-card.teal-l{border-left-color:var(--teal);}
.mod-card.gold-l{border-left-color:var(--gold);}
.mod-title{font-size:14px;font-weight:600;margin-bottom:6px;}
.mod-tags{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;}
.mod-outline{font-size:12px;color:var(--star-3);line-height:1.5;}
.bottom-nav{height:60px;background:var(--space-2);border-top:1px solid rgba(255,255,255,.06);display:flex;flex-shrink:0;}
.nav-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:10px;font-weight:500;color:var(--star-3);border:none;background:none;cursor:pointer;position:relative;letter-spacing:.03em;transition:color .2s;}
.nav-item svg{width:20px;height:20px;}
.nav-item.active{color:var(--gold);}
.nav-item.active::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:28px;height:2px;background:var(--gold);border-radius:0 0 2px 2px;box-shadow:0 0 8px var(--gold-glow);}
.modal-overlay{position:absolute;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:50;display:flex;align-items:flex-end;}
.modal-sheet{background:var(--space-2);border:1px solid rgba(255,255,255,.09);border-top-left-radius:20px;border-top-right-radius:20px;padding:20px 16px 32px;width:100%;max-height:85%;overflow-y:auto;}
.modal-sheet::-webkit-scrollbar{display:none;}
.modal-handle{width:36px;height:3px;border-radius:2px;background:rgba(255,255,255,.15);margin:0 auto 18px;}
.modal-title{font-size:16px;font-weight:700;margin-bottom:16px;font-family:var(--font-display);}
.inner-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0;}
.inner-tab{flex:1;padding:9px;font-size:13px;font-weight:500;text-align:center;border:none;background:none;color:var(--star-3);cursor:pointer;border-bottom:2px solid transparent;font-family:var(--font-body);transition:all .2s;}
.inner-tab.active{color:var(--gold);border-bottom-color:var(--gold);}
.qa-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.qa-card{background:var(--space-3);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-lg);padding:14px;cursor:pointer;transition:border-color .2s;text-align:left;width:100%;}
.qa-card:hover{border-color:rgba(108,92,231,.4);}
.qa-icon{font-size:22px;margin-bottom:6px;display:block;}
.qa-label{font-size:13px;font-weight:600;color:var(--star);}
.qa-sub{font-size:11px;color:var(--star-3);margin-top:2px;}
.istar-logo{font-family:var(--font-display);font-weight:300;font-size:10px;letter-spacing:.2em;color:var(--gold);text-transform:uppercase;}
.istar-mark{font-size:14px;font-weight:700;}
.stage-bar{display:flex;gap:3px;margin-bottom:6px;}
.stage-seg{flex:1;height:6px;border-radius:3px;}
.stage-seg.done{background:var(--nebula);}
.stage-seg.current{background:var(--gold);}
.stage-seg.future{background:rgba(255,255,255,.08);}
.detail-meta-row{display:flex;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);align-items:flex-start;}
.detail-meta-lbl{font-size:11px;color:var(--star-3);min-width:54px;flex-shrink:0;padding-top:1px;letter-spacing:.02em;}
.detail-meta-val{font-size:12px;color:var(--star-2);line-height:1.55;}
`;

/* ════════════════════════════════════════
   DATA
════════════════════════════════════════ */
const GROWTH_STAGES = [
  {
    num: '01',
    name: '探索',
    tag: '入星',
    sub: '定位體驗班 · 4小時',
    status: 'done',
    dotColor: '#C9A84C',
    dotGlow: 'rgba(201,168,76,.35)',
    tasks: '感受星辰聯盟氛圍，初步盤點個人能力',
    output: '個人能力初步地圖（教練協助繪製）',
    unlock: '完成體驗並決定進入個人賦能班',
    course: '定位體驗班 · 4小時',
  },
  {
    num: '02',
    name: '自我認知',
    tag: '認識自己',
    sub: '個人賦能班 Week 1–2',
    status: 'done',
    dotColor: '#6C5CE7',
    dotGlow: 'rgba(108,92,231,.35)',
    tasks: 'MBTI · 優勢盤點 · 價值觀梳理 · 過去成就回顧',
    output: '個人優勢清單 + 核心價值觀 Top 3',
    unlock: '完成自我盤點並獲教練確認',
    course: '個人賦能班 Week 1–2',
  },
  {
    num: '03',
    name: '內化',
    tag: '沉澱',
    sub: '教練引導對話 · 1–2週',
    status: 'done',
    dotColor: '#6C5CE7',
    dotGlow: 'rgba(108,92,231,.35)',
    tasks: '把洞察轉化成語言，第一次嘗試描述自己',
    output: '個人一句話介紹初稿',
    unlock: '能在 90 秒內說完自己是誰',
    course: '教練 1 對 1 引導對話',
  },
  {
    num: '04',
    name: '定位',
    tag: '定位',
    sub: '個人賦能班 Week 3–6',
    status: 'active',
    dotColor: '#C9A84C',
    dotGlow: 'rgba(201,168,76,.4)',
    tasks: '品牌定位 · 差異化分析 · 目標受眾輪廓 · 核心訊息',
    output: '個人品牌一頁紙（定位宣言）',
    unlock: '定位一頁紙通過教練審核，並向同儕小組分享',
    course: '個人賦能班 Week 3–6',
    pct: 68,
  },
  {
    num: '05',
    name: '方向',
    tag: '方向',
    sub: '個人賦能班 Week 7–12',
    status: 'future',
    opacity: 0.55,
    dotColor: '#6C5CE7',
    tasks: '商業模式設計 · 收入路徑規劃 · 90天里程碑',
    output: '個人商業模式一頁紙 + 第一個 90 天計畫',
    unlock: '完成 12 週，有具體行動計畫',
    course: '個人賦能班 Week 7–12',
  },
  {
    num: '06',
    name: '小驗',
    tag: '驗證',
    sub: '低風險市場驗證 · 彈性時間',
    status: 'future',
    opacity: 0.4,
    dotColor: '#00B89C',
    tasks: '設計最小可行驗證行動，執行並觀察市場反應',
    output: '驗證報告：什麼最有共鳴、哪裡需要調整',
    unlock: '完成至少一次真實的市場驗證並整理回饋',
    course: '演講 / 文章 / 諮詢 / 免費工作坊（擇一）',
  },
  {
    num: '07',
    name: '實作',
    tag: '實作',
    sub: '創業預備班 Phase 1–2',
    status: 'future',
    opacity: 0.3,
    dotColor: '#E05C5C',
    tasks: '系統化產品 / 服務設計，建立穩定的交付流程',
    output: '可重複銷售的產品原型 + 第一張訂單',
    unlock: '完成第一筆付費成交',
    course: '創業預備班 Phase 1–2',
  },
  {
    num: '08',
    name: '市場',
    tag: '市場',
    sub: '創業預備班 Phase 3–4',
    status: 'future',
    opacity: 0.2,
    dotColor: '#E05C5C',
    tasks: '流量策略 · 客戶旅程設計 · 銷售系統建立',
    output: '穩定的月收入來源 + 可複製的獲客流程',
    unlock: '達到可持續的月收入目標',
    course: '創業預備班 Phase 3–4',
  },
  {
    num: '09',
    name: '共創',
    tag: '✦ 星辰成員',
    sub: '創業預備班 Phase 5–6 → 聯盟成員',
    status: 'future',
    opacity: 0.15,
    dotColor: '#C9A84C',
    dotGlow: 'rgba(201,168,76,.5)',
    tasks: '事業系統化 · 與聯盟夥伴協作 · 股權共創結構',
    output: '成立公司 + 與 iSTAR Alliance 完成股權綁定',
    unlock: '完成股權綁定，正式成為 iSTAR Alliance 成員',
    course: '創業預備班 Phase 5–6 + 聯盟導師陪跑',
  },
];

const STAGE_SEGS = [
  'done',
  'done',
  'done',
  'current',
  'future',
  'future',
  'future',
  'future',
  'future',
];

/* ════════════════════════════════════════
   SHARED COMPONENTS
════════════════════════════════════════ */

// ── 星空背景 ──
function Starfield() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let stars = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = Array.from({ length: 160 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.2,
        a: Math.random(),
        sp: Math.random() * 0.008 + 0.002,
        ph: Math.random() * Math.PI * 2,
      }));
    };
    const draw = (t) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const op = ((Math.sin(t * s.sp + s.ph) + 1) / 2) * 0.7 + 0.15;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232,230,240,${(op * s.a).toFixed(3)})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener('resize', resize);
    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return <canvas id="starfield" ref={ref} />;
}

// ── SVG Icons ──
const IcHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IcGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IcPath = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IcMsg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);
const IcLayer = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);
const IcSwap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polyline points="8 6 2 12 8 18" />
    <polyline points="16 6 22 12 16 18" />
  </svg>
);
const IcDoc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const IcSend = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IcEye = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IcUsers = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IcLock = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--star-3)"
    strokeWidth="2"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

// ── Bottom Navigation ──
function BottomNav({ tabs, active, onSwitch }) {
  return (
    <div className="bottom-nav">
      {tabs.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={'nav-item' + (active === key ? ' active' : '')}
          onClick={() => onSwitch(key)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Chip Group (controlled) ──
function ChipGroup({ options, defaultSel = [] }) {
  const [sel, setSel] = useState(() => new Set(defaultSel));
  const toggle = (o) =>
    setSel((prev) => {
      const n = new Set(prev);
      n.has(o) ? n.delete(o) : n.add(o);
      return n;
    });
  return (
    <div className="chip-group">
      {options.map((o) => (
        <div
          key={o}
          className={'chip' + (sel.has(o) ? ' sel' : '')}
          onClick={() => toggle(o)}
        >
          {o}
        </div>
      ))}
    </div>
  );
}

// ── Toggle Switch ──
function Toggle({ label, icon: Icon, defaultOn = true, noBorder = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div
      className="toggle-row"
      style={noBorder ? { borderBottom: 'none' } : {}}
    >
      <span className="toggle-lbl">
        <Icon />
        {label}
      </span>
      <button
        className={'toggle-sw' + (on ? ' on' : '')}
        onClick={() => setOn((v) => !v)}
      />
    </div>
  );
}

/* ════════════════════════════════════════
   GROWTH PATH ITEM
════════════════════════════════════════ */
function GrowthItem({ s }) {
  const [open, setOpen] = useState(false);
  const isCoCreate = s.num === '09';

  const dotStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...(s.status === 'done'
      ? {
          background: s.dotColor,
          borderColor: s.dotColor,
          boxShadow: `0 0 8px ${s.dotGlow || 'transparent'}`,
        }
      : s.status === 'active'
      ? {
          background: 'var(--space)',
          borderColor: s.dotColor,
          borderWidth: 2,
          boxShadow: `0 0 0 3px ${s.dotGlow || 'transparent'}, 0 0 12px ${
            s.dotColor
          }`,
        }
      : { background: 'var(--space-3)', borderColor: 'var(--star-3)' }),
  };

  const cardExtraStyle =
    s.status === 'active'
      ? {
          borderColor: open ? 'rgba(201,168,76,.6)' : 'rgba(201,168,76,.35)',
          background: 'rgba(201,168,76,.04)',
        }
      : s.status === 'done'
      ? { borderColor: open ? 'rgba(0,184,156,.4)' : 'rgba(255,255,255,.07)' }
      : { borderColor: 'rgba(255,255,255,.07)' };

  return (
    <div
      className="journey-item"
      style={s.opacity != null ? { opacity: s.opacity } : {}}
    >
      <div className="journey-dot" style={dotStyle}>
        {s.status === 'done' && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {s.status === 'active' && (
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: s.dotColor,
            }}
          />
        )}
        {s.status === 'future' && (
          <span
            style={{ fontSize: 9, color: 'var(--star-3)', fontWeight: 700 }}
          >
            {s.num}
          </span>
        )}
      </div>

      <div
        className={'card' + (s.status === 'done' ? ' card-sm' : '')}
        style={{
          ...cardExtraStyle,
          cursor: s.status !== 'future' ? 'pointer' : 'default',
        }}
        onClick={s.status !== 'future' ? () => setOpen((o) => !o) : undefined}
      >
        {/* ── 已完成 ── */}
        {s.status === 'done' && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '.08em',
                    color: 'var(--teal)',
                    marginBottom: 3,
                  }}
                >
                  {s.tag.toUpperCase()}
                </div>
                <div className="j-title">
                  {s.num}. {s.name}
                </div>
                <div className="j-sub">{s.sub}</div>
              </div>
              <span
                className="badge badge-teal"
                style={{ flexShrink: 0, marginLeft: 8 }}
              >
                ✓ 完成
              </span>
            </div>
            {open && (
              <div
                style={{
                  paddingTop: 10,
                  borderTop: '1px solid rgba(255,255,255,.06)',
                  marginTop: 4,
                }}
              >
                <div className="detail-meta-row">
                  <span className="detail-meta-lbl">核心任務</span>
                  <span className="detail-meta-val">{s.tasks}</span>
                </div>
                <div className="detail-meta-row">
                  <span className="detail-meta-lbl">關鍵產出</span>
                  <span className="detail-meta-val">{s.output}</span>
                </div>
                <div className="detail-meta-row" style={{ border: 'none' }}>
                  <span className="detail-meta-lbl">對應課程</span>
                  <span className="detail-meta-val">{s.course}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── 進行中 ── */}
        {s.status === 'active' && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '.08em',
                    color: 'var(--gold)',
                    marginBottom: 3,
                  }}
                >
                  {s.tag.toUpperCase()} · 當前階段 ▶
                </div>
                <div className="j-title active-stage">
                  {s.num}. {s.name}
                </div>
                <div className="j-sub">{s.sub}</div>
              </div>
              <span
                className="badge badge-gold"
                style={{ flexShrink: 0, marginLeft: 8 }}
              >
                {s.pct}%
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 5,
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--star-3)' }}>
                完成進度
              </span>
              <span style={{ fontSize: 11, color: 'var(--gold)' }}>
                {s.pct}%
              </span>
            </div>
            <div className="prog-track" style={{ marginBottom: 10 }}>
              <div className="prog-fill gold" style={{ width: `${s.pct}%` }} />
            </div>
            {open && (
              <div
                style={{
                  paddingTop: 10,
                  borderTop: '1px solid rgba(201,168,76,.2)',
                  marginTop: 4,
                }}
              >
                <div className="detail-meta-row">
                  <span className="detail-meta-lbl">核心任務</span>
                  <span className="detail-meta-val">{s.tasks}</span>
                </div>
                <div className="detail-meta-row">
                  <span className="detail-meta-lbl">關鍵產出</span>
                  <span className="detail-meta-val">{s.output}</span>
                </div>
                <div className="detail-meta-row">
                  <span className="detail-meta-lbl">對應課程</span>
                  <span className="detail-meta-val">{s.course}</span>
                </div>
                <div className="detail-meta-row" style={{ border: 'none' }}>
                  <span className="detail-meta-lbl">升階條件</span>
                  <span
                    className="detail-meta-val"
                    style={{ color: 'var(--gold)' }}
                  >
                    {s.unlock}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── 未解鎖 ── */}
        {s.status === 'future' && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '.08em',
                    color: isCoCreate ? 'rgba(201,168,76,.5)' : 'var(--star-3)',
                    marginBottom: 3,
                  }}
                >
                  {s.tag.toUpperCase()}
                </div>
                <div
                  className="j-title"
                  style={isCoCreate ? { color: 'rgba(201,168,76,.5)' } : {}}
                >
                  {s.num}. {s.name}
                </div>
                <div className="j-sub">{s.sub}</div>
              </div>
              <IcLock />
            </div>
            {isCoCreate && (
              <div
                style={{
                  marginTop: 10,
                  padding: '8px 10px',
                  background: 'rgba(201,168,76,.06)',
                  borderRadius: 8,
                  border: '1px solid rgba(201,168,76,.15)',
                  fontSize: 11,
                  color: 'rgba(201,168,76,.5)',
                }}
              >
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
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">新增課程模組</div>
        <div className="input-label">課程主題</div>
        <input className="input-field" placeholder="例：商業模式設計工作坊" />
        <div className="input-label">大綱</div>
        <textarea
          className="input-field"
          rows={3}
          placeholder={'第一步：…\n第二步：…'}
        />
        <div className="input-label">時間</div>
        <input className="input-field" placeholder="例：3小時 / 2天" />
        <div className="input-label">上課方式</div>
        <ChipGroup
          options={['線上', '實體', '混合', '非同步']}
          defaultSel={['線上']}
        />
        <div className="input-label">對應成長階段</div>
        <ChipGroup
          options={[
            '探索',
            '自我認知',
            '內化',
            '定位',
            '方向',
            '小驗',
            '實作',
            '市場',
            '共創',
          ]}
          defaultSel={['定位']}
        />
        <div className="btn-row">
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            ✦ 儲存模組
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalAddRecord({ onClose }) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">新增上課記錄</div>
        <div className="input-label">課程模組</div>
        <select className="input-field">
          <option>品牌定位工作坊</option>
          <option>市場驗證策略</option>
          <option>MBTI優勢盤點</option>
        </select>
        <div className="input-label">學員</div>
        <select className="input-field">
          <option>林○○</option>
          <option>張○○</option>
          <option>陳○○</option>
        </select>
        <div className="input-label">給學員的回饋</div>
        <textarea
          className="input-field"
          rows={2}
          placeholder="課後鼓勵與建議…"
        />
        <div className="input-label">教練私密備註</div>
        <textarea
          className="input-field"
          rows={2}
          placeholder="教練群內部觀察…"
        />
        <Toggle label="學員可見" icon={IcEye} defaultOn={true} />
        <Toggle
          label="教練群可見"
          icon={IcUsers}
          defaultOn={true}
          noBorder={true}
        />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            ✦ 儲存記錄
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
  { key: 'home', label: '首頁', Icon: IcHome },
  { key: 'courses', label: '課程', Icon: IcGrid },
  { key: 'growth', label: '路徑', Icon: IcPath },
  { key: 'feedback', label: '反饋', Icon: IcMsg },
];

function SHome({ onSwitch }) {
  return (
    <div
      className="screen-enter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div className="topbar">
        <div>
          <div className="istar-logo">
            <span className="istar-mark">✦</span> iSTAR
          </div>
          <div style={{ fontSize: 11, color: 'var(--star-3)', marginTop: 1 }}>
            星辰聯盟
          </div>
        </div>
        <div className="avatar">林O</div>
      </div>
      <div className="content">
        <div className="card-gold" style={{ marginBottom: 12 }}>
          <div className="greeting-name">
            早安，林同學 <span style={{ fontSize: 18 }}>✦</span>
          </div>
          <div className="greeting-sub" style={{ marginTop: 4 }}>
            你正在「定位」階段的路上，保持前進
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="stage-bar">
              {STAGE_SEGS.map((s, i) => (
                <div key={i} className={`stage-seg ${s}`} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gold)' }}>
              第 4 / 9 階段 · 定位
            </div>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-tile">
            <div className="stat-num gold">8</div>
            <div className="stat-lbl">已完成課程</div>
          </div>
          <div className="stat-tile">
            <div className="stat-num nebula">68%</div>
            <div className="stat-lbl">當前路徑進度</div>
          </div>
        </div>
        <div className="sec-h">本週課程</div>
        <div className="card-glow">
          <div className="course-header">
            <div>
              <span className="badge badge-nebula" style={{ marginBottom: 7 }}>
                🌱 個人賦能班
              </span>
              <div className="course-name">個人品牌定位工作坊</div>
              <div className="course-meta">週四 20:00 · 線上課程</div>
            </div>
            <span className="badge badge-teal">即將開始</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 5,
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--star-3)' }}>
              預習進度
            </span>
            <span style={{ fontSize: 11, color: 'var(--nebula)' }}>35%</span>
          </div>
          <div className="prog-track">
            <div className="prog-fill" style={{ width: '35%' }} />
          </div>
        </div>
        <div
          className="card card-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>市場驗證策略</div>
            <div style={{ fontSize: 11, color: 'var(--star-3)' }}>
              週六 14:00 · 實體
            </div>
          </div>
          <span className="badge badge-gold">備課中</span>
        </div>
        <div className="sec-h">教練回饋</div>
        <div className="card">
          <div className="feedback-author">✦ 王教練 · 昨天</div>
          <div className="feedback-quote">
            你的定位草稿很清晰，下週試著加入「對象痛點」的描述，會更有說服力。
          </div>
        </div>
        <div className="sec-h">快速入口</div>
        <div className="qa-grid">
          <button className="qa-card" onClick={() => onSwitch('growth')}>
            <span className="qa-icon">🗺</span>
            <div className="qa-label">成長路徑</div>
            <div className="qa-sub">9 個里程碑</div>
          </button>
          <button className="qa-card" onClick={() => onSwitch('feedback')}>
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
  const [activeTab, setActiveTab] = useState('all');
  return (
    <div
      className="screen-enter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div className="topbar">
        <div className="topbar-title">我的課程</div>
        <div className="avatar">林O</div>
      </div>
      <div className="inner-tabs" style={{ padding: '0 16px' }}>
        {[
          ['all', '全部'],
          ['ongoing', '進行中'],
          ['done', '已完成'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={'inner-tab' + (activeTab === key ? ' active' : '')}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="content" style={{ paddingTop: 8 }}>
        {(activeTab === 'all' || activeTab === 'ongoing') && (
          <div className="card-glow">
            <div className="course-header">
              <span className="badge badge-teal">進行中</span>
              <span style={{ fontSize: 11, color: 'var(--star-3)' }}>
                第 3 週 / 共 12 週
              </span>
            </div>
            <div className="course-name" style={{ marginTop: 8 }}>
              🌱 個人賦能班
            </div>
            <div className="course-meta" style={{ marginBottom: 10 }}>
              主教練：王志遠 · 個人品牌 × 收入轉化
            </div>
            <div className="prog-track" style={{ marginBottom: 5 }}>
              <div className="prog-fill" style={{ width: '25%' }} />
            </div>
            <div
              style={{ fontSize: 11, color: 'var(--star-3)', marginBottom: 12 }}
            >
              25% 完成
            </div>
            <div className="btn-row" style={{ marginTop: 0 }}>
              <button className="btn" style={{ fontSize: 12 }}>
                查看課程模組
              </button>
              <button className="btn btn-primary" style={{ fontSize: 12 }}>
                聯絡教練
              </button>
            </div>
          </div>
        )}
        {(activeTab === 'all' || activeTab === 'done') && (
          <div className="card">
            <div className="course-header">
              <span className="badge badge-nebula">已完成</span>
              <span style={{ fontSize: 11, color: 'var(--star-3)' }}>
                2025.01
              </span>
            </div>
            <div className="course-name" style={{ marginTop: 8 }}>
              🔍 定位體驗班
            </div>
            <div className="course-meta" style={{ marginBottom: 10 }}>
              主教練：陳美珍 · 4 小時沉浸體驗
            </div>
            <div className="prog-track">
              <div className="prog-fill" style={{ width: '100%' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--teal)', marginTop: 5 }}>
              ✓ 已完成
            </div>
          </div>
        )}
      </div>
      <BottomNav tabs={S_TABS} active="courses" onSwitch={onSwitch} />
    </div>
  );
}

function SGrowth({ onSwitch }) {
  return (
    <div
      className="screen-enter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div className="topbar">
        <div className="topbar-title">成長路徑</div>
        <div className="avatar">林O</div>
      </div>
      <div className="content">
        <div className="card-gold" style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 10,
              color: 'var(--gold)',
              letterSpacing: '.1em',
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            ✦ 目前所在階段
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-.02em',
            }}
          >
            定位
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'rgba(201,168,76,.75)',
              marginTop: 3,
            }}
          >
            找到屬於你的位置，讓能力被市場看見
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="stage-bar">
              {STAGE_SEGS.map((s, i) => (
                <div key={i} className={`stage-seg ${s}`} />
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 6,
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--gold)' }}>
                第 4 / 9 階段
              </span>
              <span style={{ fontSize: 11, color: 'var(--star-3)' }}>
                預計還需 8 週
              </span>
            </div>
          </div>
        </div>
        {/* 圖例 */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '8px 12px',
            background: 'var(--space-3)',
            borderRadius: 'var(--r)',
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          {[
            ['#C9A84C', '入星'],
            ['#6C5CE7', '賦能'],
            ['#00B89C', '驗證'],
            ['#E05C5C', '創業'],
          ].map(([c, l]) => (
            <div
              key={l}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                color: 'var(--star-3)',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: c,
                }}
              />
              {l}
            </div>
          ))}
        </div>
        <div className="journey">
          {GROWTH_STAGES.map((s) => (
            <GrowthItem key={s.num} s={s} />
          ))}
        </div>
      </div>
      <BottomNav tabs={S_TABS} active="growth" onSwitch={onSwitch} />
    </div>
  );
}

function SFeedback({ onSwitch }) {
  return (
    <div
      className="screen-enter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div className="topbar">
        <div className="topbar-title">互動反饋</div>
        <div className="avatar">林O</div>
      </div>
      <div className="content">
        <div className="sec-h">我的教練團隊</div>
        <div className="card">
          {[
            {
              av: '王志',
              bg: 'linear-gradient(135deg,#6C5CE7,#9B8BF4)',
              name: '王志遠',
              badge: true,
              tag: '個人品牌 · 商業模式',
            },
            {
              av: '陳美',
              bg: 'linear-gradient(135deg,#00B89C,#00D4B8)',
              name: '陳美珍',
              badge: false,
              tag: '自我認知 · 職涯定向',
              last: true,
            },
          ].map((c) => (
            <div
              key={c.name}
              className="coach-row"
              style={c.last ? { borderBottom: 'none' } : {}}
            >
              <div className="coach-av" style={{ background: c.bg }}>
                {c.av}
              </div>
              <div style={{ flex: 1 }}>
                <div className="coach-name">
                  {c.name}
                  {c.badge && (
                    <span
                      className="badge badge-gold"
                      style={{ fontSize: 10, marginLeft: 4 }}
                    >
                      主教練
                    </span>
                  )}
                </div>
                <div className="coach-tag">{c.tag}</div>
              </div>
              <button
                className="btn"
                style={{ fontSize: 12, padding: '7px 10px' }}
              >
                聯絡
              </button>
            </div>
          ))}
        </div>
        <div className="sec-h">最新回饋</div>
        <div className="card">
          <div className="feedback-author">✦ 王教練 · 2025.06.12</div>
          <div className="feedback-quote">
            這週的品牌定位工作坊你表現積極，對「差異化」的思考更清晰了，下週試著加入目標受眾的輪廓描述。
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--star-3)' }}>
              情緒狀態
            </span>
            <span style={{ fontSize: 18 }}>😊😊😊😐😐</span>
          </div>
        </div>
        <div className="sec-h">填寫本週反饋</div>
        <textarea
          className="input-field"
          rows={3}
          placeholder="記錄這週的學習心得、疑問或想法…"
        />
        <button className="btn btn-primary" style={{ width: '100%' }}>
          <IcSend />
          送出反饋
        </button>
      </div>
      <BottomNav tabs={S_TABS} active="feedback" onSwitch={onSwitch} />
    </div>
  );
}

/* ════════════════════════════════════════
   COACH SCREENS
════════════════════════════════════════ */
const C_TABS = [
  { key: 'home', label: '總覽', Icon: IcHome },
  { key: 'modules', label: '模組', Icon: IcLayer },
  { key: 'assign', label: '分配', Icon: IcSwap },
  { key: 'records', label: '記錄', Icon: IcDoc },
];

function CHome({ onSwitch }) {
  const students = [
    {
      av: '林O',
      bg: 'linear-gradient(135deg,#6C5CE7,#9B8BF4)',
      name: '林○○',
      badge: true,
      sub: '個人賦能班 · 定位 68%',
    },
    {
      av: '張O',
      bg: 'linear-gradient(135deg,#BA7517,#EF9F27)',
      name: '張○○',
      badge: false,
      sub: '創業預備班 · 方向 40%',
    },
    {
      av: '陳O',
      bg: 'linear-gradient(135deg,#00B89C,#00D4B8)',
      name: '陳○○',
      badge: false,
      sub: '個人賦能班 · 自我認知 90%',
      last: true,
    },
  ];
  return (
    <div
      className="screen-enter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div className="topbar">
        <div>
          <div className="istar-logo">
            <span className="istar-mark">✦</span> iSTAR · 教練
          </div>
          <div style={{ fontSize: 11, color: 'var(--star-3)', marginTop: 1 }}>
            Coach Dashboard
          </div>
        </div>
        <div
          className="avatar"
          style={{ background: 'linear-gradient(135deg,#00B89C,#00D4B8)' }}
        >
          王志
        </div>
      </div>
      <div className="content">
        <div
          className="card"
          style={{ borderColor: 'rgba(0,184,156,.2)', marginBottom: 12 }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
            }}
          >
            王志遠教練
          </div>
          <div style={{ fontSize: 13, color: 'var(--star-2)', marginTop: 3 }}>
            本週 2 堂課 · 負責 4 位學員
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-tile">
            <div className="stat-num" style={{ color: 'var(--teal)' }}>
              4
            </div>
            <div className="stat-lbl">負責學員</div>
          </div>
          <div className="stat-tile">
            <div className="stat-num" style={{ color: 'var(--nebula)' }}>
              12
            </div>
            <div className="stat-lbl">課程模組</div>
          </div>
        </div>
        <div className="sec-h">我的學員</div>
        <div className="card" style={{ padding: '8px 14px' }}>
          {students.map((r) => (
            <div
              key={r.name}
              className="coach-row"
              style={r.last ? { borderBottom: 'none' } : {}}
            >
              <div
                className="coach-av"
                style={{ background: r.bg, fontSize: 12 }}
              >
                {r.av}
              </div>
              <div style={{ flex: 1 }}>
                <div className="coach-name" style={{ fontSize: 13 }}>
                  {r.name}
                  {r.badge && (
                    <span
                      className="badge badge-gold"
                      style={{ fontSize: 10, marginLeft: 4 }}
                    >
                      主教練
                    </span>
                  )}
                </div>
                <div className="coach-tag">{r.sub}</div>
              </div>
              <button
                className="btn"
                style={{ fontSize: 11, padding: '6px 10px' }}
                onClick={() => onSwitch('assign')}
              >
                分配
              </button>
            </div>
          ))}
        </div>
        <div className="sec-h">快速操作</div>
        <div className="qa-grid">
          <button className="qa-card" onClick={() => onSwitch('modules')}>
            <span className="qa-icon">✦</span>
            <div className="qa-label">課程模組</div>
            <div className="qa-sub">新增 / 編輯</div>
          </button>
          <button className="qa-card" onClick={() => onSwitch('assign')}>
            <span className="qa-icon">🎯</span>
            <div className="qa-label">分配課程</div>
            <div className="qa-sub">指派至學員</div>
          </button>
          <button className="qa-card" onClick={() => onSwitch('records')}>
            <span className="qa-icon">📝</span>
            <div className="qa-label">上課記錄</div>
            <div className="qa-sub">課後填寫</div>
          </button>
          <button className="qa-card">
            <span className="qa-icon">🗺</span>
            <div className="qa-label">成長路徑</div>
            <div className="qa-sub">後台設定</div>
          </button>
        </div>
      </div>
      <BottomNav tabs={C_TABS} active="home" onSwitch={onSwitch} />
    </div>
  );
}

function CModules({ onSwitch, onModal }) {
  const mods = [
    {
      cls: '',
      tags: [{ cls: 'badge-nebula', t: '定位' }, { t: '3小時' }, { t: '線上' }],
      title: '個人品牌定位工作坊',
      outline: '品牌定義 → 差異化分析 → 核心訊息萃取',
    },
    {
      cls: 'teal-l',
      tags: [{ cls: 'badge-teal', t: '市場' }, { t: '2小時' }, { t: '實體' }],
      title: '市場驗證策略',
      outline: 'MVP設計 → 用戶訪談 → 數據解讀',
    },
    {
      cls: 'gold-l',
      tags: [
        { cls: 'badge-gold', t: '自我認知' },
        { t: '4小時' },
        { t: '實體' },
      ],
      title: 'MBTI 優勢盤點',
      outline: '測評解析 → 優勢地圖 → 行動計畫',
    },
  ];
  const dimTag = {
    background: 'rgba(255,255,255,.05)',
    color: 'var(--star-3)',
    border: '1px solid rgba(255,255,255,.08)',
  };
  return (
    <div
      className="screen-enter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div className="topbar">
        <div className="topbar-title">課程模組</div>
        <button
          className="btn btn-primary"
          style={{ fontSize: 12, padding: '7px 14px' }}
          onClick={() => onModal('module')}
        >
          + 新增
        </button>
      </div>
      <div className="content">
        {mods.map((m) => (
          <div key={m.title} className={`mod-card ${m.cls}`}>
            <div className="mod-tags">
              {m.tags.map((tg) => (
                <span
                  key={tg.t}
                  className={'badge ' + (tg.cls || '')}
                  style={tg.cls ? {} : dimTag}
                >
                  {tg.t}
                </span>
              ))}
            </div>
            <div className="mod-title">{m.title}</div>
            <div className="mod-outline">{m.outline}</div>
          </div>
        ))}
        <button
          className="btn"
          style={{ width: '100%', marginTop: 4 }}
          onClick={() => onModal('module')}
        >
          + 新增課程模組
        </button>
      </div>
      <BottomNav tabs={C_TABS} active="modules" onSwitch={onSwitch} />
    </div>
  );
}

function CAssign({ onSwitch }) {
  const pool = [
    '品牌定位工作坊',
    '市場驗證策略',
    'MBTI優勢盤點',
    '商業模式設計',
    '第一筆收入策略',
  ];
  const [assigned, setAssigned] = useState(['MBTI優勢盤點', '品牌定位工作坊']);
  const addToStudent = (label) => {
    setAssigned((prev) => (prev.includes(label) ? prev : [...prev, label]));
  };
  return (
    <div
      className="screen-enter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div className="topbar">
        <div className="topbar-title">分配課程</div>
        <span className="badge badge-nebula">林○○</span>
      </div>
      <div className="content">
        <div style={{ fontSize: 13, color: 'var(--star-3)', marginBottom: 12 }}>
          點擊下方模組，加入學員的專屬課程清單
        </div>
        <div className="sec-h">可用模組庫</div>
        <div className="module-pool">
          {pool.map((p) => (
            <span key={p} className="m-chip" onClick={() => addToStudent(p)}>
              ✦ {p}
            </span>
          ))}
        </div>
        <div className="sec-h">林○○ 的專屬課程</div>
        <div className="drop-zone">
          <div className="drop-label">↑ 點擊上方模組加入</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {assigned.map((a) => (
              <span key={a} className="m-chip assigned">
                ✓ {a}
              </span>
            ))}
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn btn-primary">儲存學員課程安排</button>
        </div>
      </div>
      <BottomNav tabs={C_TABS} active="assign" onSwitch={onSwitch} />
    </div>
  );
}

function CRecords({ onSwitch, onModal }) {
  return (
    <div
      className="screen-enter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div className="topbar">
        <div className="topbar-title">上課記錄</div>
        <button
          className="btn btn-primary"
          style={{ fontSize: 12, padding: '7px 14px' }}
          onClick={() => onModal('record')}
        >
          + 新增
        </button>
      </div>
      <div className="content">
        <div className="card" style={{ marginBottom: 8 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                品牌定位工作坊
              </div>
              <div style={{ fontSize: 12, color: 'var(--star-3)' }}>
                2025.06.12 · 林○○
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                alignItems: 'flex-end',
              }}
            >
              <span className="badge badge-teal">學員可見</span>
              <span className="badge badge-nebula">教練可見</span>
            </div>
          </div>
          <div className="record-note">
            <div className="record-note-label" style={{ color: 'var(--teal)' }}>
              給學員的回饋
            </div>
            本週表現積極，品牌訊息抓得很準，下週可試著延伸到目標客群描述。
          </div>
          <div className="record-note coach-only" style={{ marginTop: 6 }}>
            <div
              className="record-note-label"
              style={{ color: 'var(--nebula)' }}
            >
              教練私密備註
            </div>
            學員對「差異化」仍有些模糊，需加強案例討論，備案例 3–5 個。
          </div>
        </div>
        <div
          className="card card-sm"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>MBTI優勢盤點</div>
            <div style={{ fontSize: 11, color: 'var(--star-3)' }}>
              2025.05.28 · 林○○
            </div>
          </div>
          <span className="badge badge-teal">學員可見</span>
        </div>
      </div>
      <BottomNav tabs={C_TABS} active="records" onSwitch={onSwitch} />
    </div>
  );
}

/* ════════════════════════════════════════
   ROOT APP
════════════════════════════════════════ */
export default function App() {
  const [role, setRole] = useState('student');
  const [sTab, setSTab] = useState('home');
  const [cTab, setCTab] = useState('home');
  const [modal, setModal] = useState(null); // null | "module" | "record"

  // 注入 CSS（只執行一次）
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const renderStudent = () => {
    switch (sTab) {
      case 'home':
        return <SHome onSwitch={setSTab} />;
      case 'courses':
        return <SCourses onSwitch={setSTab} />;
      case 'growth':
        return <SGrowth onSwitch={setSTab} />;
      case 'feedback':
        return <SFeedback onSwitch={setSTab} />;
      default:
        return <SHome onSwitch={setSTab} />;
    }
  };

  const renderCoach = () => {
    switch (cTab) {
      case 'home':
        return <CHome onSwitch={setCTab} />;
      case 'modules':
        return <CModules onSwitch={setCTab} onModal={setModal} />;
      case 'assign':
        return <CAssign onSwitch={setCTab} />;
      case 'records':
        return <CRecords onSwitch={setCTab} onModal={setModal} />;
      default:
        return <CHome onSwitch={setCTab} />;
    }
  };

  return (
    <>
      <Starfield />
      <div className="app">
        {/* Status Bar */}
        <div className="status-bar">
          <span>{timeStr}</span>
          <span className="brand">✦ iSTAR Alliance</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
            </svg>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="7" width="16" height="10" rx="2" />
              <path d="M20 10.5v3a1.5 1.5 0 000-3z" />
            </svg>
          </span>
        </div>

        {/* Role Toggle */}
        <div className="role-toggle">
          <button
            className={'role-btn' + (role === 'student' ? ' active' : '')}
            onClick={() => setRole('student')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M6 20v-1a6 6 0 0112 0v1" />
            </svg>
            學員端
          </button>
          <button
            className={'role-btn' + (role === 'coach' ? ' active' : '')}
            onClick={() => setRole('coach')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="9" cy="7" r="4" />
              <path d="M3 21v-2a4 4 0 014-4h4" />
              <path d="M16 11l2 2 4-4" />
            </svg>
            教練端
          </button>
        </div>

        {/* Screen content */}
        {role === 'student' ? renderStudent() : renderCoach()}

        {/* Modals (teleported inside .app for correct z-index) */}
        {modal === 'module' && (
          <ModalAddModule onClose={() => setModal(null)} />
        )}
        {modal === 'record' && (
          <ModalAddRecord onClose={() => setModal(null)} />
        )}
      </div>
    </>
  );
}
