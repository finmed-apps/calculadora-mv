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

const pdfRow = (lbl, val) => `<div class="row"><span class="lbl">${lbl}</span><span class="val">${val}</span></div>`;
const pdfCard = (lbl, val) => `<div class="card"><div class="lbl">${lbl}</div><div class="val">${val}</div></div>`;
const heroBox = (label, value) => `<div class="hero"><div class="hero-label">${label}</div><div class="hero-value">${fmtEuro(value)}</div></div>`;
const coefTxt = (c) => String(c ?? '').replace('.', ',');

// Corpo do relatório por cenário (mantém o geral/HPP exatamente como antes).
function buildBody(scenario, sim, inp, out) {
  const title = escapeHtml(sim.label || 'Simulação de Mais-Valia');

  if (scenario === 'doacao') {
    const tipo = out.tipoDoacao === 'indireta' ? 'Indireta' : 'Direta';
    return `<h1>${title}</h1>
<div class="scenario-label">Cenário: Imóvel recebido por doação (${tipo.toLowerCase()})</div>
${heroBox('IRS estimado sobre a mais-valia', out.irsIsolado)}
<h2>Dados introduzidos</h2>
<div class="rows">
${pdfRow('Tipo de doação', tipo)}
${pdfRow('Data da doação', fmtDate(inp.dataDoacao))}
${pdfRow('Valor de aquisição (VPT)', fmtEuro(out.valorAquisicao))}
${pdfRow('Valor de venda', fmtEuro(inp.valorVenda))}
${pdfRow('Total despesas', fmtEuro(out.totalDespesas))}
</div>
<h2>Resultados</h2>
<div class="grid">
${pdfCard('Coeficiente aplicado', coefTxt(out.coef))}
${pdfCard('Mais-valia apurada', fmtEuro(out.maisValiaBruta))}
${pdfCard('Valor a englobar (50%)', fmtEuro(out.mvEnglobada))}
${pdfCard('Taxa efetiva', out.mvEnglobada > 0 ? fmtPct(out.taxaEfetiva) : 'n/a')}
</div>`;
  }

  if (scenario === 'heranca') {
    const p1 = Math.round((inp.pct1 || 0) * 100), p2 = Math.round((inp.pct2 || 0) * 100);
    return `<h1>${title}</h1>
<div class="scenario-label">Cenário: Imóvel recebido por herança (1.º e 2.º óbito)</div>
${heroBox('IRS estimado sobre a mais-valia', out.irsIsolado)}
<h2>Dados introduzidos</h2>
<div class="rows">
${pdfRow('Data do 1.º óbito', fmtDate(inp.data1))}
${pdfRow('Data do 2.º óbito', fmtDate(inp.data2))}
${pdfRow('VPT 1.º óbito · % adquirida', fmtEuro(inp.vpt1) + ' · ' + p1 + '%')}
${pdfRow('VPT 2.º óbito · % adquirida', fmtEuro(inp.vpt2) + ' · ' + p2 + '%')}
${pdfRow('Valor de venda', fmtEuro(inp.valorVenda))}
${pdfRow('Total despesas', fmtEuro(out.totalDespesas))}
</div>
<h2>Resultados</h2>
<div class="grid">
${pdfCard('Aquisição 1.º óbito', fmtEuro(out.aq1))}
${pdfCard('Mais-valia 1.º momento', fmtEuro(out.mv1))}
${pdfCard('Aquisição 2.º óbito', fmtEuro(out.aq2))}
${pdfCard('Mais-valia 2.º momento', fmtEuro(out.mv2))}
${pdfCard('Total mais-valias', fmtEuro(out.totalMV))}
${pdfCard('Valor a englobar (50%)', fmtEuro(out.mvEnglobada))}
</div>`;
  }

  if (scenario === 'hs_novo') {
    return `<h1>${title}</h1>
<div class="scenario-label">Cenário: Habitação secundária com reinvestimento (Novo Pacote)</div>
${heroBox('IRS estimado sobre a mais-valia', out.irsIsolado)}
<h2>Dados introduzidos</h2>
<div class="rows">
${pdfRow('Data de compra', fmtDate(inp.dataCompra))}
${pdfRow('Data de venda', fmtDate(inp.dataVenda))}
${pdfRow('Valor de compra', fmtEuro(inp.valorCompra))}
${pdfRow('Valor de venda', fmtEuro(inp.valorVenda))}
${pdfRow('Valor em dívida ao banco', fmtEuro(inp.dividaBanco))}
${pdfRow('Total despesas', fmtEuro(out.totalDespesas))}
${inp.valorNovaCasa ? pdfRow('Valor da nova casa', fmtEuro(inp.valorNovaCasa)) : ''}
</div>
<h2>Resultados</h2>
<div class="grid">
${pdfCard('Mais-valia apurada', fmtEuro(out.maisValiaBruta))}
${pdfCard('Tributável (50%)', fmtEuro(out.mvTributavelBase))}
${pdfCard('Ganho da venda', fmtEuro(out.ganho))}
${out.temNovaCasa ? pdfCard('Financiamento máx. (70%)', fmtEuro(out.finMax)) : ''}
${out.temNovaCasa ? pdfCard('Valor não reinvestido', fmtEuro(Math.max(out.valorNaoReinvestido || 0, 0))) : ''}
${out.mvTributavelFinal != null ? pdfCard('MV tributável final', fmtEuro(out.mvTributavelFinal)) : ''}
</div>`;
  }

  // geral / hpp (comportamento original)
  const isHPP = inp.scenario === 'hpp';
  return `<h1>${title}</h1>
<div class="scenario-label">${isHPP ? 'Cenário: HPP com reinvestimento' : 'Cenário: Caso geral (tributável)'}</div>
${heroBox('IRS estimado sobre a mais-valia', out.irsIsolado)}
<h2>Dados introduzidos</h2>
<div class="rows">
${pdfRow('Data de aquisição', fmtDate(inp.dataCompra))}
${pdfRow('Data de venda', fmtDate(inp.dataVenda))}
${pdfRow('Valor de aquisição', fmtEuro(inp.valorCompra))}
${pdfRow('Valor de venda', fmtEuro(inp.valorVenda))}
${pdfRow('Despesas dedutíveis', fmtEuro(out.totalDespesas))}
${isHPP ? pdfRow('Capital em dívida', fmtEuro(inp.hpp?.dividaBanco)) + pdfRow('Valor nova HPP', fmtEuro(inp.hpp?.novaValor)) + pdfRow('% financiada nova HPP', (inp.hpp?.novaPercent ?? 0) + '%') : ''}
</div>
<h2>Resultados</h2>
<div class="grid">
${pdfCard('Mais-valia bruta', fmtEuro(out.maisValia))}
${pdfCard('Tributável 50%', fmtEuro(out.tributavel50))}
${isHPP ? pdfCard('Ganho da venda', fmtEuro(out.ganhoVenda)) + pdfCard('Reinvestido (próprio)', fmtEuro(out.valorReinvestido)) + pdfCard('Não reinvestido', fmtEuro(out.valorNaoReinvestido)) : ''}
${pdfCard('Tributável final', fmtEuro(out.tributavelFinal))}
${pdfCard('Taxa efetiva', out.tributavelFinal > 0 ? fmtPct(out.taxaEfetiva) : 'n/a')}
</div>`;
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
  const bodyHtml = buildBody(inp.scenario, sim, inp, out);

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
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html {
    background: #e8e6dc;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
    color: #1e2b13;
    line-height: 1.45;
    font-size: 11px;
    background: white;
    max-width: 210mm;
    min-height: 297mm;
    margin: 24px auto;
    padding: 18mm 16mm;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  }
  @media print {
    html { background: white; }
    body {
      margin: 0;
      padding: 0;
      max-width: none;
      min-height: 0;
      box-shadow: none;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  }
  .header {
    display: flex; justify-content: space-between; align-items: center;
    padding-bottom: 12px; border-bottom: 2px solid #2d3f1f;
    margin-bottom: 16px;
  }
  .header-left { display: flex; align-items: center; gap: 11px; }
  .brand { font-weight: 800; letter-spacing: 2px; font-size: 13px; color: #2d3f1f; }
  .meta { text-align: right; font-size: 10px; color: #5a6451; line-height: 1.5; }
  .avatar {
    width: 36px; height: 36px; border-radius: 50%;
    object-fit: cover; border: 2px solid #2d3f1f;
  }
  .avatar-fallback {
    width: 36px; height: 36px; border-radius: 50%;
    background: #f4c542; color: #1e2b13;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold; font-size: 13px;
  }
  h1 {
    font-family: Georgia, serif; font-size: 20px; color: #1e2b13;
    margin: 14px 0 2px; font-weight: 700;
  }
  h2 {
    font-family: Georgia, serif; font-size: 14px; color: #2d3f1f;
    margin: 16px 0 8px;
    page-break-after: avoid;
  }
  .scenario-label { font-size: 11px; color: #5a6451; margin-bottom: 12px; }
  .hero {
    background: #2d3f1f; color: white; border-radius: 10px;
    padding: 16px 22px; margin-bottom: 16px;
    page-break-inside: avoid;
  }
  .hero-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #f4c542; font-weight: bold; }
  .hero-value { font-family: Georgia, serif; font-size: 38px; color: #f4c542; font-weight: 700; margin-top: 2px; line-height: 1; }
  .rows {
    page-break-inside: avoid;
  }
  .row {
    display: flex; justify-content: space-between;
    padding: 5px 0; border-bottom: 1px solid #e4dfc9;
    font-size: 11px;
  }
  .row .lbl { color: #5a6451; }
  .row .val { font-weight: 700; font-variant-numeric: tabular-nums; }
  .grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    page-break-inside: avoid;
  }
  .card { border: 1px solid #e4dfc9; border-radius: 6px; padding: 8px 11px; }
  .card .lbl { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.8px; color: #8a8e7f; font-weight: bold; }
  .card .val { font-family: Georgia, serif; font-size: 15px; color: #1e2b13; margin-top: 2px; font-variant-numeric: tabular-nums; font-weight: 700; }
  .footer {
    margin-top: 18px; padding-top: 10px;
    border-top: 1px solid #e4dfc9;
    font-size: 9px; color: #8a8e7f; line-height: 1.4;
  }
  .disclaimer {
    background: #faf6ec; border-left: 3px solid #c97a1d;
    padding: 8px 11px; margin-top: 12px;
    font-size: 9.5px; color: #6b3f0d; border-radius: 3px;
    line-height: 1.4;
    page-break-inside: avoid;
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

${bodyHtml}

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
 * Usa Blob + ObjectURL para dar à janela uma URL real (em vez de about:blank).
 * @param {object} args — mesmo formato de renderReportHtml
 */
export function exportarPdf({ simulation, profile }) {
  const html = renderReportHtml({ simulation, profile });

  // Criar Blob com o HTML — dá-nos uma URL real
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    alert('O browser bloqueou a abertura da nova janela. Permita pop-ups para calc.finmed.pt e tente novamente.');
    return;
  }

  // Disparar print quando a janela carregar
  win.addEventListener('load', () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  });

  // Libertar a memória do Blob 30s depois (depois do print já ter sido disparado)
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
