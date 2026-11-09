/* Modo projetor: tema claro de alto contraste, com letras maiores. Vale para todas as páginas. */
(function () {
  var K = 'modo_projetor', on = false;
  try { on = localStorage.getItem(K) === '1'; } catch (e) {}
  var st = document.createElement('style');
  st.textContent =
    '@media screen{html.proj{filter:invert(1) hue-rotate(180deg);font-size:112%;--muted:#e2e8f0;--soft:#f1f5f9;--border:#5b6b85;}' +
    'html.proj img,html.proj #reportView,html.proj .no-inv{filter:invert(1) hue-rotate(180deg);}}' +
    '#btnProj{position:fixed;left:10px;bottom:10px;z-index:9990;background:#111827;color:#e2e8f0;border:1px solid #C9A961;border-radius:999px;' +
    'padding:.45rem .85rem;font:700 12px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.4);opacity:.92;}' +
    '@media print{#btnProj{display:none!important;}}';
  document.head.appendChild(st);
  if (on) document.documentElement.classList.add('proj');
  function rotulo(b) { b.textContent = on ? '🌙 Tema escuro' : '☀ Modo projetor'; }
  function montar() {
    var b = document.createElement('button');
    b.id = 'btnProj'; b.type = 'button';
    b.title = 'Tema claro, com mais contraste e letras maiores, para projetar em sala';
    rotulo(b);
    b.onclick = function () {
      on = !on;
      document.documentElement.classList.toggle('proj', on);
      try { localStorage.setItem(K, on ? '1' : '0'); } catch (e) {}
      rotulo(b);
    };
    document.body.appendChild(b);
  }
  if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
})();
