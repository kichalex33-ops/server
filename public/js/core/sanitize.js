(function () {
  "use strict";

  var App = window.App = window.App || {};
  var map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
    "`": "&#096;"
  };

  function toString(value) {
    return value === null || value === undefined ? "" : String(value);
  }

  function escapeHtml(value) {
    return toString(value).replace(/[&<>"'`]/g, function (char) { return map[char]; });
  }

  function setText(node, value) {
    if (node) node.textContent = toString(value);
    return node;
  }

  function clear(node) {
    if (!node) return node;
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function appendText(parent, tagName, value, className) {
    var el = document.createElement(tagName || "span");
    if (className) el.className = className;
    el.textContent = toString(value);
    if (parent) parent.appendChild(el);
    return el;
  }

  function onlyDigits(value) {
    return toString(value).replace(/\D+/g, "");
  }

  function maskCpf(value) {
    var cpf = onlyDigits(value);
    if (cpf.length < 11) return cpf ? "***." + cpf.slice(-3) : "--";
    return "***." + cpf.slice(3, 6) + ".***-" + cpf.slice(-2);
  }

  function maskName(value) {
    var parts = toString(value).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "--";
    if (parts.length === 1) return parts[0].charAt(0) + ".";
    return parts[0] + " " + parts.slice(1).map(function (part) {
      return part.charAt(0).toUpperCase() + ".";
    }).join(" ");
  }

  function maskPhone(value) {
    var digits = onlyDigits(value);
    if (digits.length < 4) return digits ? "****" : "--";
    return "****-" + digits.slice(-4);
  }

  function hardenSensitiveInputs(root) {
    root = root || document;
    var selector = [
      'input[name*="cpf" i]',
      'input[id*="cpf" i]',
      'input[name*="paciente" i]',
      'input[id*="paciente" i]',
      'input[name*="patient" i]',
      'input[id*="patient" i]',
      'input[name*="nome" i]',
      'input[id*="nome" i]',
      'input[name*="login" i]',
      'input[id*="login" i]',
      'textarea[name*="observ" i]',
      'textarea[id*="observ" i]',
      '[data-sensitive-input]'
    ].join(',');

    root.querySelectorAll(selector).forEach(function (input) {
      input.setAttribute('autocomplete', input.type === 'password' ? 'current-password' : 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('spellcheck', 'false');
      input.setAttribute('data-lgpd-hardened', 'true');
      if (/cpf/i.test(input.name || input.id || '')) input.setAttribute('inputmode', 'numeric');
    });
  }

  function renderRows(tbody, rows, columns, emptyText) {
    clear(tbody);
    var fragment = document.createDocumentFragment();
    if (!rows || !rows.length) {
      var trEmpty = document.createElement('tr');
      var tdEmpty = document.createElement('td');
      tdEmpty.colSpan = Math.max(columns.length, 1);
      tdEmpty.textContent = emptyText || 'Nenhum registro encontrado.';
      trEmpty.appendChild(tdEmpty);
      fragment.appendChild(trEmpty);
      tbody.appendChild(fragment);
      return;
    }

    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      columns.forEach(function (column) {
        var td = document.createElement('td');
        if (typeof column.render === 'function') {
          var rendered = column.render(row, td);
          if (rendered instanceof Node) td.appendChild(rendered);
          else if (rendered !== undefined && rendered !== null) td.textContent = String(rendered);
        } else {
          td.textContent = toString(row[column.key] || '');
        }
        tr.appendChild(td);
      });
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
  }

  App.Sanitize = {
    escapeHtml: escapeHtml,
    escapeAttr: escapeHtml,
    setText: setText,
    clear: clear,
    appendText: appendText,
    maskCpf: maskCpf,
    maskName: maskName,
    maskPhone: maskPhone,
    hardenSensitiveInputs: hardenSensitiveInputs,
    renderRows: renderRows
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { hardenSensitiveInputs(document); }, { once: true });
  } else {
    hardenSensitiveInputs(document);
  }
})();
