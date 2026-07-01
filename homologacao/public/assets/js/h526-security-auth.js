/**
 * H526 — Proteção de rotas frontend
 *
 * Garante que TODAS as páginas de painel (operador e gestor)
 * verificam autenticação e redireciona para o portal se sem sessão.
 *
 * Substitui a chamada manual a requirePanelAccess() que nunca foi feita
 * nos scripts individuais.
 */
(function () {
  'use strict';

  // Só executa em páginas de painel (não no portal de login)
  var isPortal = document.body.classList.contains('portal-page');
  if (isPortal) return;

  function getSession() {
    try {
      var raw = sessionStorage.getItem('painel-logistico-auth') ||
                localStorage.getItem('painel-logistico-auth');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function redirectToLogin(msg) {
    try {
      sessionStorage.removeItem('painel-logistico-auth');
      localStorage.removeItem('painel-logistico-auth');
      if (msg) sessionStorage.setItem('painel-logistico-login-message', msg);
    } catch (e) {}
    window.location.replace(window.appUrl ? window.appUrl('/') : '/');
  }

  var session = getSession();
  if (!session || !session.accessToken) {
    redirectToLogin('Faça login para acessar o painel.');
    return;
  }

  var perfil = String((session.usuario && session.usuario.perfil) || '').toUpperCase();
  var isGestao = document.body.classList.contains('manager-app') ||
                 document.title.toLowerCase().indexOf('gestor') !== -1 ||
                 window.location.pathname.indexOf('gestao') !== -1;

  if (isGestao && !['GESTOR', 'ADMIN'].includes(perfil)) {
    redirectToLogin('Este acesso é exclusivo do Painel Gestor.');
    return;
  }

  var isOperador = document.body.classList.contains('operator-app') ||
                   window.location.pathname.indexOf('operador') !== -1;

  if (isOperador && !['OPERADOR', 'GESTOR', 'ADMIN'].includes(perfil)) {
    redirectToLogin('Este acesso é exclusivo do Painel Operador.');
    return;
  }
})();
