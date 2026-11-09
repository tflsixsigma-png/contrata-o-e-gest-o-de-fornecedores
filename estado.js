/* Estado compartilhado entre as páginas (dashboard, Parte 1, Parte 2, Impacto Financeiro) e link de compartilhamento. */
const Estado = (function () {
  const KEY = 'pcb_dashboard_v1';
  function ler() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && typeof d === 'object') { if (!Array.isArray(d.suppliers)) d.suppliers = []; if (!Array.isArray(d.risks)) d.risks = []; return d; }
    } catch (e) {}
    return { v: 1, suppliers: [], risks: [], curId: null };
  }
  // Grava uma única chave, relendo o que está salvo para não apagar o que outra página escreveu
  function gravarChave(k, val) {
    try { const d = ler(); d[k] = val; d.salvoEm = new Date().toISOString(); localStorage.setItem(KEY, JSON.stringify(d)); return true; }
    catch (e) { return false; }
  }
  function codificar(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodificar(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    const bin = atob(s), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  function link(obj) {
    const u = new URL('index.html', location.href); u.search = ''; u.hash = 'dados=' + codificar(obj || ler());
    return u.toString();
  }
  function doHash() {
    const m = /^#dados=(.+)$/.exec(location.hash || '');
    if (!m) return null;
    try { const d = decodificar(m[1]); return (d && Array.isArray(d.suppliers)) ? d : null; } catch (e) { return null; }
  }
  // Copia (ou compartilha, no celular) o link com o trabalho inteiro. Devolve a mensagem para mostrar ao usuário.
  async function compartilhar(obj) {
    const url = link(obj);
    try { if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) { await navigator.share({ title: 'Análise de categoria de compras', url: url }); return 'Link compartilhado.'; } }
    catch (e) { if (e && e.name === 'AbortError') return ''; }
    try { await navigator.clipboard.writeText(url); return 'Link copiado! Quem abrir vê este trabalho.'; }
    catch (e) { window.prompt('Copie o link do trabalho:', url); return ''; }
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  const P1_PERGUNTAS = [
    'Em que quadrante da Kraljic o motor CC ficou, e por quê?',
    'Quem tem mais poder nessa negociação, a Whirlpool ou os fornecedores?',
    'Qual caminho Castelletti deve seguir: A, B ou uma combinação dos dois?',
    'A Whirlpool exige que o prazo de pagamento só comece a contar quando as peças saem do estoque em consignação. Nessa categoria, vale manter essa exigência?'
  ];
  return { KEY, ler, gravarChave, link, doHash, compartilhar, esc, P1_PERGUNTAS };
})();
