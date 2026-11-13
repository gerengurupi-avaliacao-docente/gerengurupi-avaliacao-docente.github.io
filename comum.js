// Funções usadas pela página do aluno e pela área do gestor.

/** Chama o servidor (Google Apps Script). Envia texto JSON simples, sem cabeçalhos especiais, para o navegador não bloquear. */
function api(acao, dados) {
  var cfg = window.AVALIACAO || {};
  if (!cfg.api || /COLE_AQUI/.test(cfg.api)) return Promise.reject(new Error('O endereço do servidor ainda não foi configurado (arquivo config.js).'));
  return fetch(cfg.api, { method: 'POST', body: JSON.stringify(Object.assign({ acao: acao }, dados || {})) })
    .then(function (r) {
      if (!r.ok) throw new Error('o servidor respondeu ' + r.status);
      return r.json();
    });
}

/** Cria um elemento: h('div', {class:'x', text:'oi', onclick: f}, [filhos]) */
function h(tag, attrs, filhos) {
  var el = document.createElement(tag);
  Object.keys(attrs || {}).forEach(function (k) {
    var v = attrs[k];
    if (v === null || v === undefined || v === false) return;
    if (k.slice(0, 2) === 'on') el[k] = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'value' || k === 'checked' || k === 'disabled') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  });
  [].concat(filhos || []).forEach(function (f) { if (f) el.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
  return el;
}

/** '2026/2' -> '2º semestre de 2026' */
function nomeSem(s) { var p = String(s).split('/'); return p[1] + 'º semestre de ' + p[0]; }

/** 8.25 -> '8,3' */
function notaBr(x, casas) { return x === null || x === undefined || x === '' ? '–' : Number(x).toFixed(casas === undefined ? 1 : casas).replace('.', ','); }

/** cor da nota: vermelho (1) -> amarelo (5/6) -> verde (10) */
function cor(n) { return 'hsl(' + Math.round((n - 1) * 13.5) + ',72%,' + (n >= 8 ? 34 : n >= 4 ? 37 : 44) + '%)'; }

function semAcento(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

/** Entrega um arquivo ao usuário (download). */
function baixar(blob, nome) {
  var a = h('a', { href: URL.createObjectURL(blob), download: nome });
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
