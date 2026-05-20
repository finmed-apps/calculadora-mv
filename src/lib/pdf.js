// ============================================================
// FINMED — Gerador de relatório PDF client-side
// Abre uma janela nova com o relatório formatado e dispara
// window.print() automaticamente. O utilizador escolhe
// "Guardar como PDF" no diálogo de impressão.
// ============================================================

const fmtEuro = (v) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) =>
  new Intl.NumberFormat('pt-PT', { style: 'percent', maximumFractionDigits: 1 }).format(v || 0);
const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
};

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function getInitials(name) {
  if (!name) return '?';
  if (name.includes('@')) return name.split('@')[0].slice(0, 2).toUpperCase();
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

/**
 * Renderiza o HTML do relatório.
 * @param {object} args
 * @param {object} args.simulation — { label, scenario, inputs, outputs, created_at }
 * @param {object} args.profile — { email, full_name, phone, avatar_url }
 */
export function renderReportHtml({ simulation, profile }) {
  const sim = simulation || {};
  const inp = sim.inputs || {};
  const out = sim.outputs || {};
  const isHPP = inp.scenario === 'hpp';

  const userName = profile?.full_name || profile?.email || 'Cliente';
  const userEmail = profile?.email || '';
  const userPhone = profile?.phone || '';
  const avatarUrl = profile?.avatar_url || '';

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<title>Relatório Mais-Valias · FINMED</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
    color: #1e2b13;
    line-height: 1.55;
    background: white;
  }
  .header {
    display: flex; justify-content: space-between; align-items: center;
    padding-bottom: 18px; border-bottom: 2px solid #2d3f1f;
    margin-bottom: 30px;
  }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .brand { font-weight: 800; letter-spacing: 2px; font-size: 16px; color: #2d3f1f; }
  .meta { text-align: right; font-size: 12px; color: #5a6451; line-height: 1.55; }
  .avatar {
    width: 44px; height: 44px; border-radius: 50%;
    object-fit: cover; border: 2px solid #2d3f1f;
  }
  .avatar-fallback {
    width: 44px; height: 44px; border-radius: 50%;
    background: #f4c542; color: #1e2b13;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold; font-size: 16px;
  }
  h1 { font-family: Georgia, serif; font-size: 26px; color: #1e2b13; margin: 24px 0 4px; font-weight: 700; }
  h2 { font-family: Georgia, serif; font-size: 17px; color: #2d3f1f; margin: 24px 0 10px; }
  .scenario-label { font-size: 13px; color: #5a6451; margin-bottom: 18px; }
  .hero {
    background: #2d3f1f; color: white; border-radius: 12px;
    padding: 26px 28px; margin-bottom: 22px;
  }
  .hero-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #f4c542; font-weight: bold; }
  .hero-value { font-family: Georgia, serif; font-size: 50px; color: #f4c542; font-weight: 700; margin-top: 4px; line-height: 1; }
  .row {
    display: flex; justify-content: space-between;
    padding: 7px 0; border-bottom: 1px solid #e4dfc9;
    font-size: 13.5px;
  }
  .row .lbl { color: #5a6451; }
  .row .val { font-weight: 700; font-variant-numeric: tabular-nums; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .card { border: 1px solid #e4dfc9; border-radius: 8px; padding: 12px 14px; }
  .card .lbl { font-size: 9.5px; text-transform: uppercase; letter-spacing: 1px; color: #8a8e7f; font-weight: bold; }
  .card .val { font-family: Georgia, serif; font-size: 18px; color: #1e2b13; margin-top: 3px; font-variant-numeric: tabular-nums; font-weight: 700; }
  .footer {
    margin-top: 36px; padding-top: 14px;
    border-top: 1px solid #e4dfc9;
    font-size: 10.5px; color: #8a8e7f; line-height: 1.5;
  }
  .disclaimer {
    background: #faf6ec; border-left: 4px solid #c97a1d;
    padding: 11px 14px; margin-top: 18px;
    font-size: 11.5px; color: #6b3f0d; border-radius: 4px;
  }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    ${avatarUrl
      ? `<img class="avatar" src="${escapeHtml(avatarUrl)}" alt="" onerror="this.outerHTML='<div class=\\'avatar-fallback\\'>${escapeHtml(getInitials(userName))}</div>'">`
      : `<div class="avatar-fallback">${escapeHtml(getInitials(userName))}</div>`}
    <div>
      <div style="font-size: 13px; font-weight: 700;">${escapeHtml(userName)}</div>
      <div style="font-size: 11px; color: #5a6451;">${escapeHtml(userEmail)}${userPhone ? ' · ' + escapeHtml(userPhone) : ''}</div>
    </div>
  </div>
  <div class="meta">
    <div class="brand">FINMED</div>
    <div>Relatório · ${fmtDate(sim.created_at || new Date().toISOString())}</div>
  </div>
</div>

<h1>${escapeHtml(sim.label || 'Simulação de Mais-Valia')}</h1>
<div class="scenario-label">${isHPP ? 'Cenário: HPP com reinvestimento' : 'Cenário: Caso geral (tributável)'}</div>

<div class="hero">
  <div class="hero-label">IRS estimado sobre a mais-valia</div>
  <div class="hero-value">${fmtEuro(out.irsIsolado)}</div>
</div>

<h2>Dados introduzidos</h2>
<div class="row"><span class="lbl">Data de aquisição</span><span class="val">${fmtDate(inp.dataCompra)}</span></div>
<div class="row"><span class="lbl">Data de venda</span><span class="val">${fmtDate(inp.dataVenda)}</span></div>
<div class="row"><span class="lbl">Valor de aquisição</span><span class="val">${fmtEuro(inp.valorCompra)}</span></div>
<div class="row"><span class="lbl">Valor de venda</span><span class="val">${fmtEuro(inp.valorVenda)}</span></div>
<div class="row"><span class="lbl">Despesas dedutíveis</span><span class="val">${fmtEuro(out.totalDespesas)}</span></div>
${isHPP ? `
<div class="row"><span class="lbl">Capital em dívida</span><span class="val">${fmtEuro(inp.hpp?.dividaBanco)}</span></div>
<div class="row"><span class="lbl">Valor nova HPP</span><span class="val">${fmtEuro(inp.hpp?.novaValor)}</span></div>
<div class="row"><span class="lbl">% financiada nova HPP</span><span class="val">${inp.hpp?.novaPercent ?? 0}%</span></div>
` : ''}

<h2>Resultados</h2>
<div class="grid">
  <div class="card"><div class="lbl">Mais-valia bruta</div><div class="val">${fmtEuro(out.maisValia)}</div></div>
  <div class="card"><div class="lbl">Tributável 50%</div><div class="val">${fmtEuro(out.tributavel50)}</div></div>
  ${isHPP ? `
  <div class="card"><div class="lbl">Ganho da venda</div><div class="val">${fmtEuro(out.ganhoVenda)}</div></div>
  <div class="card"><div class="lbl">Reinvestido (próprio)</div><div class="val">${fmtEuro(out.valorReinvestido)}</div></div>
  <div class="card"><div class="lbl">Não reinvestido</div><div class="val">${fmtEuro(out.valorNaoReinvestido)}</div></div>
  ` : ''}
  <div class="card"><div class="lbl">Tributável final</div><div class="val">${fmtEuro(out.tributavelFinal)}</div></div>
  <div class="card"><div class="lbl">Taxa efetiva</div><div class="val">${out.tributavelFinal > 0 ? fmtPct(out.taxaEfetiva) : '—'}</div></div>
</div>

<div class="disclaimer">
  <strong>Nota importante:</strong> Este relatório apresenta o IRS isolado sobre esta mais-valia, calculado com a taxa e parcela a abater do escalão correspondente. O imposto real depende do <strong>englobamento</strong> com os restantes rendimentos do agregado e pode ser superior ou inferior consoante o escalão marginal aplicável. Para confirmação técnica, agende consultoria com a equipa FINMED.
</div>

<div class="footer">
  <strong>FINMED</strong> · Especialistas em Fiscalidade Imobiliária<br>
  Relatório gerado automaticamente pela calculadora FINMED em ${escapeHtml(window.location.hostname)}. Valores estimativos.
</div>

</body>
</html>`;
}

/**
 * Abre uma nova janela com o relatório e dispara print-to-PDF.
 * @param {object} args — mesmo formato de renderReportHtml
 */
export function exportarPdf({ simulation, profile }) {
  const html = renderReportHtml({ simulation, profile });

  // Abrir em nova janela
  const win = window.open('', '_blank');
  if (!win) {
    alert('O browser bloqueou a abertura da nova janela. Permita pop-ups para calc.finmed.pt e tente novamente.');
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  // Esperar fontes/imagens carregarem antes de chamar print
  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
  };
}
