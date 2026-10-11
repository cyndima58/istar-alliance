# 兩份說明頁共用的區塊
import pathlib
ROOT = pathlib.Path(__file__).parent
APP_URL = "https://star.iwillstar.com"
VERSION = "istarallinance_v1.0"
LAUNCH = "2026/10/11"

LOGO = (ROOT.parent / "public/logo-mark.svg").read_text().replace(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">')

def icon(d, sw=1.8):
    return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{d}</svg>'

I = {
  "bell": icon('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  "share": icon('<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M8 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2"/>'),
  "plus": icon('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>'),
  "dots": icon('<circle cx="12" cy="5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/>'),
  "home": icon('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>'),
  "cal": icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  "check": icon('<path d="M20 6 9 17l-5-5"/>'),
  "cam": icon('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  "doc": icon('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
  "path": icon('<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>'),
  "msg": icon('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
  "users": icon('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>'),
  "layer": icon('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>'),
  "coin": icon('<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2s1.2 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.3 0-2.5-.5-3-1.5M12 6.5v11"/>'),
  "chart": icon('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  "shield": icon('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  "clock": icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  "text": icon('<path d="M4 7V5h10v2M9 5v14M7 19h4"/><path d="M14 12v-1h7v1M17.5 11v8M16 19h3"/>'),
  "key": icon('<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>'),
  "star": icon('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
  "phone": icon('<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>'),
  "link": icon('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
}

def head(title, desc):
    css = (ROOT / "base.css").read_text()
    return f'''<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
<style>{css}</style>
</head>
<body>'''

def hero(kicker, title, lead, role_chip):
    return f'''
<header class="hero"><div class="wrap">
  <div class="brand">iSTAR ALLIANCE 星辰聯盟︱專屬APP功能操作說明</div>
  <h1><small>{kicker}</small>{title}</h1>
  <p class="lead">{lead}</p>
  <div class="meta">
    <span class="chip">{role_chip}</span>
    <span class="chip">版本 <b>{VERSION}</b></span>
    <span class="chip">正式上線 <b>{LAUNCH}</b></span>
  </div>
  <div class="btns">
    <a class="btn" href="{APP_URL}" target="_blank" rel="noopener">開啟星辰聯盟 App ↗</a>
    <a class="btn ghost" href="#install">先安裝到手機桌面</a>
  </div>
</div></header>'''

def toc(items):
    links = "".join(f'<a href="#{k}">{v}</a>' for k, v in items)
    return f'<nav class="toc" aria-label="章節"><div class="wrap">{links}</div></nav>'

def install(num, alt=True):
    return f'''
<section id="install" class="{'alt' if alt else ''}"><div class="wrap">
  <div class="sec-head"><div class="num">{num}</div>
    <h2>把 App 放到手機桌面：30 秒完成</h2>
    <p class="sub">星辰聯盟 App 不需要到 App Store 或 Google Play 下載。用手機瀏覽器打開 <b>{APP_URL.replace("https://","")}</b>，加入主畫面後，它就會像一般 App 一樣有自己的圖示、全螢幕開啟，還能收到手機通知。</p>
  </div>
  <div class="tabs" role="tablist">
    <button class="on" data-pane="ios" role="tab">iPhone／iPad</button>
    <button data-pane="android" role="tab">Android 安卓</button>
  </div>

  <div class="pane on" id="pane-ios">
    <div class="steps">
      <div class="step"><h3>用 Safari 打開網址</h3><p>一定要用 iPhone 內建的 <b>Safari</b>（LINE、Facebook 內建的瀏覽器無法加入主畫面）。在網址列輸入 <span class="kbd">star.iwillstar.com</span>。</p>
        <div class="phone"><div class="top"><span>star.iwillstar.com</span></div><div class="bar">{I["home"]}{I["share"]}{I["layer"]}</div></div></div>
      <div class="step"><h3>點「分享」按鈕</h3><p>畫面下方（iPad 在右上方）中間那個<b>方框加向上箭頭</b>的圖示。</p>
        <div class="phone"><div class="top"><span>star.iwillstar.com</span></div><div class="bar">{I["home"]}<span class="hl">{I["share"]}</span>{I["layer"]}</div></div></div>
      <div class="step"><h3>選「加入主畫面」</h3><p>在分享選單往下滑，找到 <span class="kbd">加入主畫面</span>（圖示是方框裡一個＋號）。</p>
        <div class="phone"><div class="sheet"><div>拷貝 <span>⧉</span></div><div>加入書籤 <span>☆</span></div><div class="hl2">加入主畫面 <span>⊞</span></div></div></div></div>
      <div class="step"><h3>按「新增」，從桌面開啟</h3><p>右上角按 <span class="kbd">新增</span>。之後請一律<b>點桌面上的星辰聯盟圖示</b>開啟，才能使用通知功能。</p>
        <div class="phone"><div class="home"><i></i><i></i><i class="me"></i><i></i><i></i><i></i><i></i><i></i></div></div></div>
    </div>
    <p class="note"><b>iPhone 小提醒：</b>手機通知需要 <b>iOS 16.4 以上</b>（設定 → 一般 → 關於本機 → iOS 版本）。在 Safari 網頁裡無法開通知，必須從主畫面圖示開啟 App 後才能開啟。</p>
  </div>

  <div class="pane" id="pane-android">
    <div class="steps">
      <div class="step"><h3>用 Chrome 打開網址</h3><p>使用 <b>Chrome</b> 瀏覽器，在網址列輸入 <span class="kbd">star.iwillstar.com</span>。</p>
        <div class="phone"><div class="top"><span>star.iwillstar.com</span>{I["dots"]}</div></div></div>
      <div class="step"><h3>點右上角「⋮」選單</h3><p>網址列右邊的<b>三個點</b>。有些手機會直接跳出「安裝應用程式」提示，點它也可以。</p>
        <div class="phone"><div class="top"><span>star.iwillstar.com</span><span class="hl" style="flex:none;padding:1px">{I["dots"]}</span></div></div></div>
      <div class="step"><h3>選「安裝應用程式」</h3><p>選單中的 <span class="kbd">安裝應用程式</span> 或 <span class="kbd">加到主畫面</span>（不同手機用語略有不同），再按「安裝」。</p>
        <div class="phone"><div class="sheet"><div>新增分頁</div><div>書籤</div><div class="hl2">安裝應用程式</div><div>分享…</div></div></div></div>
      <div class="step"><h3>從桌面或應用程式列表開啟</h3><p>桌面會出現星辰聯盟圖示，之後直接點圖示即可，跟一般 App 一樣。</p>
        <div class="phone"><div class="home"><i></i><i class="me"></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div>
    </div>
    <p class="note"><b>Samsung 手機：</b>如果用的是 Samsung Internet 瀏覽器，點右下角「≡」→「新增頁面至」→「主畫面」。電腦版 Chrome／Edge 也可以在網址列右側點「安裝」圖示，把 App 裝在電腦上。</p>
  </div>
</div></section>'''

def notify_steps():
    return f'''
  <div class="grid g3" style="margin-bottom:26px">
    <div class="card"><div class="ic">{I["phone"]}</div><div class="k">STEP 1</div><h3>從桌面圖示開啟 App 並登入</h3><p>iPhone 一定要從主畫面圖示開啟；Android 用 Chrome 或已安裝的 App 都可以。</p></div>
    <div class="card"><div class="ic">{I["bell"]}</div><div class="k">STEP 2</div><h3>點「開啟手機通知」</h3><p>首頁上方會出現 <span class="kbd">開啟手機通知</span> 卡片，直接點它。如果已經關掉卡片，也可以點右上角 <span class="kbd">Aa</span> 選單裡的「手機通知」開關。</p></div>
    <div class="card"><div class="ic">{I["check"]}</div><div class="k">STEP 3</div><h3>在系統視窗按「允許」</h3><p>手機跳出詢問時請按 <b>允許</b>。幾秒內你會收到一則「<b>通知已開啟 ✓</b>」測試通知，代表設定成功。</p></div>
  </div>
  <p class="note warn"><b>不小心按到「不允許」？</b>　iPhone：設定 → 通知 → 找到「星辰聯盟」→ 開啟「允許通知」。　Android：長按桌面的星辰聯盟圖示 → 應用程式資訊 → 通知 → 開啟。設定好後回到 App，重新點一次「開啟手機通知」。<br>每一支手機要各自開啟一次；換手機或重新安裝後，也要再開一次。</p>'''

def footer():
    return f'''
<footer><div class="wrap foot">
  <div><b>星辰聯盟 iSTAR Alliance App</b><br>版本 {VERSION}・正式上線 {LAUNCH}<br>App 網址：<a href="{APP_URL}" target="_blank" rel="noopener">star.iwillstar.com</a></div>
  <div><b>使用上有任何問題</b><br>請洽星辰聯盟管理員<br>Email：<a href="mailto:iwillstar58@gmail.com">iwillstar58@gmail.com</a></div>
  <div style="flex-basis:100%;font-size:13px;opacity:.75">© 2017 - 2026 鈊誠集團 iSTAR Group</div>
</div></footer>
<script>
document.querySelectorAll('.tabs button').forEach(function(b){{b.addEventListener('click',function(){{
  var box=b.closest('section');box.querySelectorAll('.tabs button').forEach(function(x){{x.classList.toggle('on',x===b)}});
  box.querySelectorAll('.pane').forEach(function(p){{p.classList.toggle('on',p.id==='pane-'+b.dataset.pane)}});
}})}});
(function(){{var ua=navigator.userAgent;if(/android/i.test(ua)){{var a=document.querySelector('.tabs button[data-pane=android]');a&&a.click()}}}})();
var links=[].slice.call(document.querySelectorAll('.toc a'));
if('IntersectionObserver' in window){{var io=new IntersectionObserver(function(es){{es.forEach(function(e){{if(e.isIntersecting){{links.forEach(function(a){{a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id)}})}}}})}},{{rootMargin:'-45% 0px -50% 0px'}});
document.querySelectorAll('section[id]').forEach(function(s){{io.observe(s)}})}}
</script>
</body></html>'''
