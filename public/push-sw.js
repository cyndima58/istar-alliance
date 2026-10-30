/* 推播通知：由 PWA 的 service worker 載入（vite.config.js → workbox.importScripts） */
self.addEventListener("push", (event) => {
  let p = {};
  try { p = event.data ? event.data.json() : {}; } catch { p = { data: { body: event.data ? event.data.text() : "" } }; }
  const d = p.data || p.notification || p;
  const title = d.title || "iSTAR Alliance";
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || "", icon: "/app-icon-192.png", badge: "/app-icon-192.png",
    tag: d.tag || undefined, renotify: !!d.tag, data: { url: d.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (c.url.startsWith(self.location.origin) && "focus" in c) { if ("navigate" in c) c.navigate(url).catch(() => {}); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
