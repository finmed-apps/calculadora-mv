// ============================================================
// FINMED — Engine de cálculo de Mais-Valias
// Funções puras. Sem dependência de DOM. Testável.
// ============================================================

// Escalões de IRS 2026 (oficiais — espelham o Excel Simulador_MV_HPP_2026)
export const ESCALOES_IRS = [
  { min: 0,      max: 8342,     taxa: 0.1250, abater: 0.00 },
  { min: 8342,   max: 12587,    taxa: 0.1570, abater: 266.94 },
  { min: 12587,  max: 17838,    taxa: 0.2150, abater: 959.26 },
  { min: 17838,  max: 23089,    taxa: 0.2410, abater: 1476.45 },
  { min: 23089,  max: 29397,    taxa: 0.3110, abater: 3092.77 },
  { min: 29397,  max: 43090,    taxa: 0.3490, abater: 4209.94 },
  { min: 43090,  max: 46566,    taxa: 0.4310, abater: 7743.27 },
  { min: 46566,  max: 86634,    taxa: 0.4460, abater: 8441.48 },
  { min: 86634,  max: Infinity, taxa: 0.4800, abater: 11387.17 },
];

export function taxaIRSpara(rendimento) {
  for (const e of ESCALOES_IRS) {
    if (rendimento >= e.min && rendimento < e.max) return e;
  }
  return ESCALOES_IRS[ESCALOES_IRS.length - 1];
}

// ============================================================
// CÁLCULO PRINCIPAL
// inputs = {
//   scenario: 'hpp' | 'geral',
//   dataCompra: '2020-05-01',
//   dataVenda: '2025-08-15',
//   valorCompra: 200000,
//   valorVenda: 320000,
//   despesas: { escritura, selo, imt, cert, comissao, melhoria },
//   hpp?: { dividaBanco, novaValor, novaPercent }  // só se scenario=hpp
// }
// ============================================================
export function calcular(inputs) {
  const {
    scenario,
    dataCompra,
    dataVenda,
    valorCompra = 0,
    valorVenda = 0,
    despesas = {},
    hpp = {},
  } = inputs;

  // Coeficiente fixo (assumimos margem de erro — decisão de produto)
  const coef = 1;

  const dC = dataCompra ? new Date(dataCompra) : null;
  const anoCompra = dC ? dC.getFullYear() : null;

  const totalDespesas =
    (Number(despesas.escritura) || 0) +
    (Number(despesas.selo) || 0) +
    (Number(despesas.imt) || 0) +
    (Number(despesas.cert) || 0) +
    (Number(despesas.comissao) || 0) +
    (Number(despesas.melhoria) || 0);

  const valorCompraAtual = valorCompra * coef;
  const maisValia = valorVenda - valorCompraAtual - totalDespesas;
  const tributavel50 = Math.max(maisValia * 0.5, 0);

  const isHPP = scenario === 'hpp';
  const dividaBanco = isHPP ? Number(hpp.dividaBanco) || 0 : 0;
  const novaValor = isHPP ? Number(hpp.novaValor) || 0 : 0;
  const novaPercent = isHPP ? (Number(hpp.novaPercent) || 0) / 100 : 0;
  const novoEmprestimo = novaValor * novaPercent;

  const ganhoVenda = Math.max(valorVenda - dividaBanco, 0);
  const valorReinvestido = Math.max(novaValor - novoEmprestimo, 0);
  const valorNaoReinvestido = isHPP ? Math.max(ganhoVenda - valorReinvestido, 0) : 0;
  const percentNaoReinv = isHPP && ganhoVenda > 0 ? valorNaoReinvestido / ganhoVenda : 1;

  let tributavelFinal;
  if (isHPP) {
    tributavelFinal = maisValia <= 0 ? 0 : (valorNaoReinvestido * tributavel50) / ganhoVenda;
    if (!isFinite(tributavelFinal)) tributavelFinal = 0;
  } else {
    tributavelFinal = tributavel50;
  }

  const escalao = taxaIRSpara(tributavelFinal);
  const irsIsolado = Math.max(tributavelFinal * escalao.taxa - escalao.abater, 0);
  const taxaEfetiva = tributavelFinal > 0 ? irsIsolado / tributavelFinal : 0;

  // Avisos / alertas calculados
  const alerts = [];
  if (anoCompra && anoCompra < 1989 && scenario !== 'pre1989') {
    alerts.push({
      level: 'warning',
      text: `O imóvel foi adquirido em ${anoCompra}, antes de 1989. Pode estar isento de IRS por antiguidade.`,
    });
  }
  if (maisValia < 0) {
    alerts.push({
      level: 'info',
      text: 'Menos-valia: o valor de venda não cobre o valor de aquisição + despesas. Pode ser compensada em IRS nos anos seguintes.',
    });
  } else if (isHPP && valorNaoReinvestido === 0 && ganhoVenda > 0) {
    alerts.push({
      level: 'success',
      text: `Isenção total: reinveste a totalidade do ganho (${formatEuro(ganhoVenda)}) na nova HPP. A mais-valia fica isenta de IRS, desde que cumpra os requisitos de morada fiscal e prazo de 36 meses.`,
    });
  } else if (isHPP && valorNaoReinvestido > 0) {
    alerts.push({
      level: 'warning',
      text: `Reinvestimento parcial: está a reinvestir ${formatPct(1 - percentNaoReinv)} do ganho. A parte não reinvestida (${formatEuro(valorNaoReinvestido)}) fica tributada proporcionalmente.`,
    });
  }
  alerts.push({
    level: 'info',
    text: 'O IRS apresentado é uma estimativa isolada sobre esta mais-valia. O imposto real depende do englobamento com os restantes rendimentos do agregado.',
  });

  return {
    // Inputs ecoados (para guardar em DB)
    inputs: { ...inputs, totalDespesas },
    // Resultados
    valorCompraAtual,
    totalDespesas,
    maisValia,
    tributavel50,
    ganhoVenda: isHPP ? ganhoVenda : null,
    valorReinvestido: isHPP ? valorReinvestido : null,
    valorNaoReinvestido: isHPP ? valorNaoReinvestido : null,
    percentNaoReinv: isHPP ? percentNaoReinv : null,
    tributavelFinal,
    escalao,
    irsIsolado,
    taxaEfetiva,
    alerts,
  };
}

// ============================================================
// FORMATTERS
// ============================================================
export const formatEuro = (v) =>
  new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v || 0);

export const formatEuro2 = (v) =>
  new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(v || 0);

export const formatPct = (v) =>
  new Intl.NumberFormat('pt-PT', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(v || 0);

export const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
