// supabase/functions/generate-pdf/index.ts
//
// Gera PDF do relatório de simulação usando Puppeteer (via Browserless ou
// Puppeteer-core + Chromium na Edge — em Supabase Functions o mais fácil
// é chamar uma API externa de PDF rendering ou usar deno-puppeteer).
//
// Estratégia simples e fiável: usamos a API gratuita do Browserless
// (ou alternativa) com um template HTML inline. Para a v1 do MVP, geramos
// HTML formatado para impressão e o browser do utilizador faz print-to-PDF
// ao abrir o URL — não há custo de infra.
//
// Esta versão devolve HTML pronto a imprimir (window.print() automático).
// Se quiseres PDF "real" gerado no servidor, troca por chamada ao Browserless
// (ver comentários abaixo).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const fmtEuro = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'percent', maximumFractionDigits: 1 }).format(v || 0);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });

serve(async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  // Autenticar
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // Buscar a simulação (RLS valida ownership via service_role)
  const { data: sim, error } = await supabase
    .from('simulations')
    .select('*, profiles(email, full_name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !sim) return new Response('Not found', { status: 404 });

  const html = renderHtml(sim);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});

function renderHtml(sim: any) {
  const inp = sim.inputs || {};
  const out = sim.outputs || {};
  const isHPP = inp.scenario === 'hpp';

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<title>Relatório Mais-Valias · FINMED</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    color: #1e2b13; line-height: 1.55;
  }
  .header { display: flex; justify-content: space-between; align-items: end; padding-bottom: 18px; border-bottom: 2px solid #2d3f1f; margin-bottom: 30px; }
  .brand { font-weight: 800; letter-spacing: 2px; font-size: 14px; color: #2d3f1f; }
  .meta  { text-align: right; font-size: 12px; color: #5a6451; }
  h1 { font-family: 'Fraunces', serif; font-size: 28px; color: #1e2b13; margin: 24px 0 8px; }
  h2 { font-family: 'Fraunces', serif; font-size: 18px; color: #2d3f1f; margin: 24px 0 10px; }
  .label-name { font-size: 14px; color: #5a6451; margin-bottom: 18px; }
  .hero { background: #2d3f1f; color: white; border-radius: 12px; padding: 28px; margin-bottom: 22px; }
  .hero-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #f4c542; font-weight: bold; }
  .hero-value { font-family: 'Fraunces', serif; font-size: 56px; color: #f4c542; font-weight: 700; margin-top: 6px; line-height: 1; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e4dfc9; font-size: 14px; }
  .row .lbl { color: #5a6451; }
  .row .val { font-weight: 700; font-variant-numeric: tabular-nums; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .card { border: 1px solid #e4dfc9; border-radius: 8px; padding: 14px 16px; }
  .card .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #8a8e7f; font-weight: bold; }
  .card .val { font-family: 'Fraunces', serif; font-size: 20px; color: #1e2b13; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e4dfc9; font-size: 11px; color: #8a8e7f; line-height: 1.5; }
  .disclaimer { background: #faf6ec; border-left: 4px solid #c97a1d; padding: 12px 14px; margin-top: 18px; font-size: 12px; color: #6b3f0d; border-radius: 4px; }
</style>
</head>
<body onload="window.print()">

<div class="header">
  <div class="brand">≡· FINMED</div>
  <div class="meta">
    Relatório de Simulação · ${fmtDate(sim.created_at)}<br>
    <strong>${sim.profiles?.email ?? ''}</strong>
  </div>
</div>

<h1>${sim.label || 'Simulação de Mais-Valia'}</h1>
<div class="label-name">${isHPP ? 'Cenário: HPP com reinvestimento' : 'Cenário: Caso geral (tributável)'}</div>

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
  Este relatório é gerado automaticamente pela calculadora de Mais-Valias FINMED.<br>
  Os valores apresentados são estimativos e não substituem consultoria profissional.
</div>

</body>
</html>`;
}
