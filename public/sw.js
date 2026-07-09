/* 云TB百科全书 · Service Worker
 * 策略：
 *  - 非 GET（方案/PPT/报价生成的 POST 等）一律直通，绝不拦截或缓存
 *  - 页面导航 / HTML：网络优先，失败回退缓存，再回退离线页
 *  - 站内静态资源（图标/css/js/manifest）：stale-while-revalidate（缓存优先，后台更新）
 *  - CDN（tailwind 等跨域）：缓存优先，后台更新
 *  - /api/ 的 GET：网络优先，失败回退缓存
 */
const VERSION = 'v1.0.0';
const SHELL_CACHE = 'ytb-shell-' + VERSION;
const RUNTIME_CACHE = 'ytb-runtime-' + VERSION;

// 站内 app shell —— 安装时预缓存（同源，允许个别失败不阻断安装）
const SHELL_ASSETS = [
  '/journey.html',
  '/index.html',
  '/admin.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/icons/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.allSettled(SHELL_ASSETS.map((u) => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// 允许页面主动触发跳过等待
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isHTMLRequest(request) {
  return request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
}

async function networkFirst(request, cacheName, offlineFallback) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200 && fresh.type !== 'opaqueredirect') {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (offlineFallback) {
      const off = await caches.match(offlineFallback);
      if (off) return off;
    }
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetching = fetch(request).then((resp) => {
    if (resp && (resp.status === 200 || resp.type === 'opaque')) {
      cache.put(request, resp.clone());
    }
    return resp;
  }).catch(() => null);
  return cached || fetching || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 只处理 GET —— 生成类 POST / PUT 等直通网络
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 忽略 chrome-extension 等非 http(s)
  if (!url.protocol.startsWith('http')) return;

  const sameOrigin = url.origin === self.location.origin;

  // 页面 / HTML 导航：网络优先，回退缓存，再回退离线页
  if (isHTMLRequest(request)) {
    event.respondWith(networkFirst(request, SHELL_CACHE, '/offline.html'));
    return;
  }

  // 同源 API 的 GET：网络优先
  if (sameOrigin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // 同源静态资源：stale-while-revalidate
  if (sameOrigin) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }

  // 跨域（CDN：tailwind 等）：缓存优先 + 后台更新
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});
