const express = require('express');

// createApiRoutes returns a Router and adapts top-level route modules that register paths starting with /api
// It creates an app-like object with get/post/put/patch/delete that registers handlers on the router
module.exports = function createApiRoutes({ repository } = {}) {
  const router = express.Router();

  const methods = ['get', 'post', 'put', 'patch', 'delete', 'options'];
  const appLike = {};
  for (const m of methods) {
    appLike[m] = (path, handler) => {
      // if the path starts with /api remove that prefix so mounting under /api results in expected URL
      const p = (typeof path === 'string' && path.startsWith('/api')) ? path.replace(/^\/api/, '') : path;
      router[m](p, handler);
    };
  }

  // allow register functions to access a store/repository if exported
  appLike.repository = repository;

  // Require and register the top-level route modules that were authored for an app instance
  try {
    const register = require('../../routes/logisaude.routes');
    if (typeof register === 'function') {
      register(appLike);
    }
  } catch (e) {
    // if the top-level routes cannot be loaded, log and continue with an empty router
    console.error('Could not load top-level routes/logisaude.routes:', e && e.message ? e.message : e);
  }

  return router;
};
