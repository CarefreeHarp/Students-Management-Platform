// A routed view owns its DOM, subscriptions and listeners for exactly one visit.
export function createPageScope(root, options) {
  const controller = new AbortController();
  const signal = controller.signal;
  const cleanups = [];
  const realDocument = root.ownerDocument;
  const viewDocument = new Proxy(realDocument, {
    get(target, key) {
      if (key === 'getElementById') return id => root.querySelector('#' + CSS.escape(id));
      if (key === 'querySelector' || key === 'querySelectorAll') return root[key].bind(root);
      if (key === 'addEventListener') return (type, callback, opts) => listen(target, type, callback, opts);
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, key, value) {
      return Reflect.set(target, key, value, target);
    }
  });

  function listen(target, type, callback, opts) {
    target?.addEventListener(type, callback, { ...(typeof opts === 'boolean' ? { capture: opts } : opts), signal });
  }

  function later(callback, ms) {
    return window.setTimeout(() => { if (!signal.aborted) callback(); }, ms);
  }

  function animate(callback) {
    return window.requestAnimationFrame(time => { if (!signal.aborted) callback(time); });
  }

  function objectUrl(blob) {
    const url = URL.createObjectURL(blob);
    cleanups.push(() => URL.revokeObjectURL(url));
    return url;
  }

  const scope = {
    root, signal, document: viewDocument, listen, later, animate, objectUrl,
    onDestroy: callback => cleanups.push(callback),
    request: (url, info) => options.request(url, info, signal),
    loginAdmin: (usuario, contrasena) => options.loginAdmin(usuario, contrasena, signal),
    navigate: options.navigate,
    logout: options.logout,
    poll: (refresh, ms) => options.poll?.(refresh, ms, signal),
    user: options.user,
    sandbox: options.sandbox,
    destroy() {
      controller.abort();
      for (const cleanup of cleanups.reverse()) cleanup();
    }
  };
  return scope;
}
