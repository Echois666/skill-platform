/* 云TB百科全书 · PWA 引导脚本
 * - 注册 Service Worker
 * - Android/桌面：捕获 beforeinstallprompt，展示「安装到桌面」浮条
 * - iOS Safari：展示「添加到主屏幕」引导（iOS 不支持 beforeinstallprompt）
 * - 已安装/已忽略：不再打扰（localStorage 记忆）
 */
(function () {
  'use strict';

  // 1) 注册 Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function (e) {
        console.warn('[PWA] SW 注册失败', e);
      });
    });
  }

  var GOLD = '#D6A84F', GOLD2 = '#F5D78E', INK = '#0B0B0D';
  var DISMISS_KEY = 'ytb_pwa_dismiss_v1';
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  var ua = window.navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
  var isMobile = isIOS || /android/i.test(ua);
  var deferredPrompt = null;

  if (isStandalone) return;                 // 已作为 App 打开，无需引导
  if (localStorage.getItem(DISMISS_KEY)) return; // 用户已忽略

  function makeBar(html) {
    var bar = document.createElement('div');
    bar.id = 'ytb-pwa-bar';
    bar.style.cssText = [
      'position:fixed', 'left:12px', 'right:12px', 'bottom:calc(12px + env(safe-area-inset-bottom))',
      'z-index:2147483000', 'max-width:520px', 'margin:0 auto',
      'background:linear-gradient(150deg,#1b160f,#0d0b08)',
      'border:1px solid rgba(214,168,79,.4)', 'border-radius:16px',
      'box-shadow:0 16px 44px rgba(0,0,0,.55)', 'padding:12px 14px',
      'display:flex', 'align-items:center', 'gap:12px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif',
      'color:#f4ecda', 'transform:translateY(140%)', 'transition:transform .38s cubic-bezier(.2,.8,.2,1)'
    ].join(';');
    bar.innerHTML = html;
    document.body.appendChild(bar);
    requestAnimationFrame(function () { bar.style.transform = 'translateY(0)'; });
    return bar;
  }

  function dismiss(bar, remember) {
    if (remember) { try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {} }
    bar.style.transform = 'translateY(140%)';
    setTimeout(function () { bar.remove(); }, 400);
  }

  var iconHTML = '<img src="/icons/icon-192.png" alt="" style="width:42px;height:42px;border-radius:11px;flex:0 0 auto;">';
  var closeBtn = '<button data-act="close" aria-label="关闭" style="flex:0 0 auto;background:transparent;border:none;color:#9c927b;font-size:20px;line-height:1;cursor:pointer;padding:4px 6px;">×</button>';

  // Android / 桌面：可直接调起安装
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (document.getElementById('ytb-pwa-bar')) return;
    var bar = makeBar(
      iconHTML +
      '<div style="flex:1 1 auto;min-width:0;">' +
        '<div style="font-weight:700;font-size:15px;">安装「云TB百科」到桌面</div>' +
        '<div style="font-size:12px;color:#bcb199;margin-top:2px;">全屏打开 · 秒开资料 · 随手生成方案</div>' +
      '</div>' +
      '<button data-act="install" style="flex:0 0 auto;background:linear-gradient(90deg,' + GOLD2 + ',' + GOLD + ');color:' + INK + ';font-weight:700;border:none;border-radius:12px;padding:9px 16px;font-size:14px;cursor:pointer;">安装</button>' +
      closeBtn
    );
    bar.addEventListener('click', function (ev) {
      var act = ev.target.getAttribute('data-act');
      if (act === 'install') {
        dismiss(bar, false);
        deferredPrompt.prompt();
        deferredPrompt.userChoice.finally(function () { deferredPrompt = null; });
      } else if (act === 'close') {
        dismiss(bar, true);
      }
    });
  });

  window.addEventListener('appinstalled', function () {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
    var bar = document.getElementById('ytb-pwa-bar');
    if (bar) dismiss(bar, true);
  });

  // iOS Safari：无 beforeinstallprompt，给出手动引导
  if (isIOS && isMobile) {
    window.addEventListener('load', function () {
      setTimeout(function () {
        if (document.getElementById('ytb-pwa-bar')) return;
        var bar = makeBar(
          iconHTML +
          '<div style="flex:1 1 auto;min-width:0;">' +
            '<div style="font-weight:700;font-size:15px;">添加到主屏幕</div>' +
            '<div style="font-size:12px;color:#bcb199;margin-top:2px;">点击底部 <span style="color:' + GOLD2 + ';">分享</span> ↗ → 「添加到主屏幕」</div>' +
          '</div>' +
          closeBtn
        );
        bar.addEventListener('click', function (ev) {
          if (ev.target.getAttribute('data-act') === 'close') dismiss(bar, true);
        });
      }, 2600);
    });
  }
})();
