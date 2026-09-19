/* Runs before every app script. No API call or storage write escapes the RAM sandbox. */
(() => {
  'use strict';
  let host = null;
  try {
    host = window.parent !== window ? window.parent.StudyFlowSandbox : null;
  } catch (_) { /* Cross-origin or inaccessible parents are never valid hosts. */ }
  if (!window.__sandboxIsolated || !host || typeof host.request !== 'function'
      || typeof host.navigate !== 'function' || !host.storage || !host.sessionStorage) {
    window.fetch = async () => { throw new Error('Network disabled in sandbox'); };
    window.stop();
    window.location.replace('/sandbox');
    throw new Error('Isolated sandbox host required');
  }
  window.SandboxBridge = host;
  window.fetch = async (input, options = {}) => {
    if (typeof input !== 'string' && !(input instanceof URL)) {
      throw new Error('Unsupported request in sandbox');
    }
    const url = new URL(input, location.origin);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) throw new Error('Network disabled in sandbox');
    const reply = await host.request(url.pathname + url.search, options);
    if (reply.status < 400 && typeof CustomEvent === 'function' && typeof document.dispatchEvent === 'function') {
      document.dispatchEvent(new CustomEvent('studyflow:tour-action', {
        detail: { method: String(options.method || 'GET').toUpperCase(), path: url.pathname, status: reply.status }
      }));
    }
    return new Response(reply.status === 204 ? null : JSON.stringify(reply.data), {status:reply.status, headers:{'Content-Type':'application/json'}});
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented) return;
    const url = new URL(link.href);
    if (url.protocol === 'blob:') return;
    if (url.origin !== location.origin) {event.preventDefault(); return;}
    if (url.pathname === '/sandbox/vista' && url.hash) return;
    event.preventDefault(); host.navigate(url.pathname + url.search + url.hash);
  });
  document.addEventListener('submit', event => { if (!event.defaultPrevented) event.preventDefault(); });
})();
