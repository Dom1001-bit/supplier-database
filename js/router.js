/* ============================================================
   js/router.js — Simple hash-based SPA router
   ============================================================ */

const Router = (() => {
  const _routes = {};

  function register(path, handler) {
    _routes[path] = handler;
  }

  function parse() {
    const hash = window.location.hash.replace('#', '') || '';
    const [path, ...rest] = hash.split('/');
    return { path: path || 'home', param: rest.join('/') };
  }

  function navigate(to) {
    window.location.hash = to;
  }

  function dispatch() {
    const { path, param } = parse();
    const handler = _routes[path] || _routes['404'];
    if (handler) handler(param);
  }

  function init() {
    window.addEventListener('hashchange', dispatch);
    dispatch();
  }

  function currentPath() { return parse().path; }
  function currentParam() { return parse().param; }

  return { register, navigate, init, dispatch, currentPath, currentParam };
})();
