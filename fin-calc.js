/* ================================================================
   FIN-CALC · Impacto financeiro das decisões de Compras
   Compartilhado por impacto-financeiro.html e index.html (relatório)
   Unidade: R$ milhões / ano · Convenção B (Contas a Pagar como alavanca separada)
   ================================================================ */
const FinCalc = (function () {

  // ---------- Bases de empresa ----------
  const PRESETS = {
    whirlpool: {
      nome: 'Whirlpool S.A. (Brasil) · 2024',
      receita: 12930, cpv: 82.9, ebit: 9.0,
      dioh: 50, dso: 55, dpo: 95, fixo: 2500, ir: 34, wacc: 14,
      fonte: 'Receita líquida (R$ 12,93 bi), CPV (R$ 10,72 bi) e EBIT (R$ 1,17 bi) da DFP 2024 da Whirlpool S.A. ' +
             'Prazos (DIOH, DSO, DPO), ativo fixo e WACC são valores didáticos, calibrados para um ROIC próximo ao reportado (~24%).'
    },
    neutra: {
      nome: 'Base neutra (simulador SCF)',
      receita: 1500, cpv: 60, ebit: 12,
      dioh: 55, dso: 45, dpo: 35, fixo: 400, ir: 30, wacc: 11,
      fonte: 'Mesma base do Simulador de Supply Chain Finance usado nas aulas de SCM.'
    }
  };

  const BASE_PADRAO = PRESETS.whirlpool;

  // Alavanca vazia
  const ALAV_ZERO = {
    saving: 0, dpo: 0, precoPrazo: 0, estoque: 0,
    receita: 0, mc: null, p0: 0, p1: 0, imp: 0, custoMit: 0
  };

  // Pontos de partida didáticos por quadrante Kraljic (o aluno ajusta)
  function sugestaoQuadrante(quad, spend, base) {
    const z = Object.assign({}, ALAV_ZERO);
    const mg = Math.round((100 - base.cpv) * 10) / 10;
    switch (quad) {
      case 'Alavancagem':
        return Object.assign(z, { saving: 6, dpo: 15 });
      case 'Estratégico':
        return Object.assign(z, {
          saving: 2, dpo: 30, precoPrazo: 0.4, estoque: -15,
          receita: Math.round(base.receita * 0.005), mc: mg
        });
      case 'Gargalo':
        return Object.assign(z, {
          estoque: 15, p0: 20, p1: 5,
          imp: Math.round(spend * 3), custoMit: +(spend * 0.02).toFixed(1)
        });
      case 'Não-crítico':
        return Object.assign(z, { saving: 4, dpo: 10 });
      default:
        return z;
    }
  }

  // Escala de probabilidade 1–5 do registro de riscos → % anual (conversão didática)
  const PROB_ESCALA = { 1: 2, 2: 5, 3: 10, 4: 20, 5: 40 };

  // ---------- Situação base da empresa ----------
  function base(b) {
    const cogs = b.receita * b.cpv / 100;
    const ebit = b.receita * b.ebit / 100;
    const est = cogs / 365 * b.dioh;
    const rec = b.receita / 365 * b.dso;
    const pag = cogs / 365 * b.dpo;
    const ci = est + rec - pag + b.fixo;          // Capital Investido (Convenção B)
    const ce = est + rec + b.fixo;                // Capital Empregado (sem subtrair fornecedores)
    const nopat = ebit * (1 - b.ir / 100);
    const w = b.wacc / 100;
    return {
      cogs, ebit, est, rec, pag, ci, ce, nopat,
      roic: nopat / ci * 100,
      roce: ebit / ce * 100,
      eva: nopat - w * ci,
      ccc: b.dioh + b.dso - b.dpo
    };
  }

  // ---------- Impacto de uma categoria ----------
  // cat: { spend (R$ mi), direto (bool) } · a: alavancas
  function impacto(b, cat, a) {
    a = Object.assign({}, ALAV_ZERO, a || {});
    const B = base(b);
    const t = b.ir / 100, w = b.wacc / 100;
    const S = Math.max(0, +cat.spend || 0);
    const mc = (a.mc === null || a.mc === undefined || a.mc === '') ? (100 - b.cpv) : +a.mc;

    // Efeitos (saldos calculados sobre o spend base — efeito de 2ª ordem do novo preço ignorado)
    const L = [];
    const push = (k, nome, dEbit, dCi, dCe) => {
      L.push({ k, nome, dEbit, dCi, dCe, dEva: dEbit * (1 - t) - w * dCi });
    };

    push('saving', 'Saving de preço', S * a.saving / 100, 0, 0);
    push('precoPrazo', 'Preço do prazo', -S * a.precoPrazo / 100, 0, 0);

    const dPag = S / 365 * a.dpo;
    push('dpo', 'Prazo de pagamento', 0, -dPag, 0);

    const dEst = cat.direto ? S / 365 * a.estoque : 0;
    push('estoque', 'Estoque da categoria', 0, dEst, dEst);

    // Receita habilitada pelo fornecedor: margem de contribuição + capital de giro que ela consome
    const R = Math.max(0, +a.receita || 0);
    const cogsR = R * b.cpv / 100;
    const wcR = R / 365 * b.dso + cogsR / 365 * b.dioh - cogsR / 365 * b.dpo;
    const ceR = R / 365 * b.dso + cogsR / 365 * b.dioh;
    push('receita', 'Receita habilitada', R * mc / 100, wcR, ceR);

    // Risco: variação da perda esperada (prob × impacto) menos o custo anual da mitigação
    const perdaAntes = a.p0 / 100 * a.imp;
    const perdaDepois = a.p1 / 100 * a.imp;
    push('risco', 'Risco (perda esperada)', (perdaAntes - perdaDepois) - a.custoMit, 0, 0);

    const sum = (f) => L.reduce((s, x) => s + x[f], 0);
    const dEbit = sum('dEbit'), dCi = sum('dCi'), dCe = sum('dCe'), dEva = sum('dEva');

    const N = {
      ebit: B.ebit + dEbit,
      nopat: (B.ebit + dEbit) * (1 - t),
      ci: B.ci + dCi,
      ce: B.ce + dCe
    };
    N.roic = N.nopat / N.ci * 100;
    N.roce = N.ebit / N.ce * 100;
    N.eva = N.nopat - w * N.ci;

    const precoLiquido = S * (a.saving - a.precoPrazo) / 100;
    const taxaPrazo = (a.dpo > 0 && a.precoPrazo > 0) ? (a.precoPrazo / a.dpo * 365) : null;

    return {
      B, N, L, dEbit, dCi, dCe, dEva, dNopat: dEbit * (1 - t),
      dRoic: N.roic - B.roic, dRoce: N.roce - B.roce,
      caixaUnico: -dCi,                                   // >0 = capital liberado uma única vez
      recorrente: dEbit,                                  // efeito anual no resultado
      equivReceita: b.ebit > 0 ? precoLiquido / (b.ebit / 100) : 0,
      valorPerpetuidade: w > 0 ? dEva / w : 0,
      taxaPrazo, perdaAntes, perdaDepois, mcUsada: mc, spend: S
    };
  }

  // ---------- Utilidades ----------
  // Converte o texto livre do campo "Spend anual (R$)" do dashboard em R$ milhões
  function parseSpend(txt) {
    if (txt === null || txt === undefined) return 0;
    let s = String(txt).toLowerCase().replace(/r\$|\s|\/\s*ano|ano/g, '');
    let mult = 1;
    if (/(bi|bilh|b)$/.test(s)) { mult = 1e9; s = s.replace(/(bilh(õ|o)es|bilhão|bilhao|bi|b)$/, ''); }
    else if (/(mi|milh|mm|m)$/.test(s)) { mult = 1e6; s = s.replace(/(milh(õ|o)es|milhão|milhao|mi|mm|m)$/, ''); }
    else if (/(mil|k)$/.test(s)) { mult = 1e3; s = s.replace(/(mil|k)$/, ''); }
    // Formato brasileiro: ponto = milhar, vírgula = decimal
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
    const v = parseFloat(s);
    if (!isFinite(v)) return 0;
    return v * mult / 1e6;
  }

  const fmtMi = (v, d) => {
    if (!isFinite(v)) return '—';
    const abs = Math.abs(v);
    if (abs < 0.05) return 'R$ 0';
    if (abs >= 1000) return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' bi';
    const dd = d !== undefined ? d : (abs < 10 ? 1 : 0);
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: dd, maximumFractionDigits: dd }) + ' mi';
  };
  const fmtSig = (v, d) => (v > 0.0049 ? '+' : (v < -0.0049 ? '−' : '')) + fmtMi(Math.abs(v), d).replace('R$ ', 'R$ ');
  const fmtPct = (v, d = 1) => isFinite(v) ? v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%' : '—';
  const fmtPP = (v, d = 1) => (v > 0.049 ? '+' : (v < -0.049 ? '−' : '')) + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' p.p.';

  return { PRESETS, BASE_PADRAO, ALAV_ZERO, PROB_ESCALA, base, impacto, sugestaoQuadrante, parseSpend, fmtMi, fmtSig, fmtPct, fmtPP };
})();
