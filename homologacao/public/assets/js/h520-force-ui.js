
(function () {
  'use strict';
  const storageKey = 'painel-logistico-theme';
  function normalize(theme) { return theme === 'dark' ? 'dark' : 'light'; }
  function currentTheme() {
    try { return normalize(localStorage.getItem(storageKey) || document.documentElement.dataset.theme || document.body?.dataset.theme || 'light'); }
    catch (_) { return 'light'; }
  }
  function applyTheme(theme) {
    const t = normalize(theme);
    document.documentElement.dataset.theme = t;
    document.documentElement.classList.toggle('theme-dark', t === 'dark');
    document.documentElement.classList.toggle('theme-light', t !== 'dark');
    if (document.body) {
      document.body.dataset.theme = t;
      document.body.classList.toggle('theme-dark', t === 'dark');
      document.body.classList.toggle('theme-light', t !== 'dark');
    }
    try { localStorage.setItem(storageKey, t); } catch (_) {}
    document.querySelectorAll('#themeToggle,[data-theme-toggle]').forEach((btn) => {
      btn.textContent = t === 'dark' ? '☾' : '☀';
      btn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
      btn.setAttribute('title', t === 'dark' ? 'Usar modo claro' : 'Usar modo escuro');
    });
  }
  function ensureShellClass() {
    const shell = document.querySelector('.dashboard-shell');
    if (!shell) return;
    if (shell.classList.contains('operator-app') || shell.classList.contains('manager-app')) return;
    const title = `${document.title || ''} ${document.body?.textContent?.slice(0, 400) || ''}`.toLowerCase();
    if (title.includes('gestor') || title.includes('gerencial') || document.querySelector('#dashboard')) {
      shell.classList.add('manager-app');
    }
  }
  function closeMenu() {
    document.body.classList.remove('operator-menu-open', 'manager-menu-open');
  }
  function bindMenu() {
    const sideNav = document.querySelector('.side-nav');
    const button = document.querySelector('.menu-button');
    if (!sideNav || !button || button.dataset.h520MenuBound === '1') return;
    button.dataset.h520MenuBound = '1';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      document.body.classList.toggle('operator-menu-open');
      document.body.classList.toggle('manager-menu-open', document.body.classList.contains('operator-menu-open'));
    });
    document.addEventListener('click', (event) => {
      if (!document.body.classList.contains('operator-menu-open') && !document.body.classList.contains('manager-menu-open')) return;
      if (sideNav.contains(event.target) || button.contains(event.target)) return;
      closeMenu();
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
    sideNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  }
  function bindTheme() {
    document.querySelectorAll('#themeToggle,[data-theme-toggle]').forEach((btn) => {
      if (btn.dataset.h520ThemeBound === '1') return;
      btn.dataset.h520ThemeBound = '1';
      btn.addEventListener('click', () => applyTheme((document.body?.dataset.theme || document.documentElement.dataset.theme) === 'dark' ? 'light' : 'dark'));
    });
  }
  function init() {
    ensureShellClass();
    applyTheme(currentTheme());
    bindMenu();
    bindTheme();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.addEventListener('storage', init);
  window.h520ApplyTheme = applyTheme;
})();
