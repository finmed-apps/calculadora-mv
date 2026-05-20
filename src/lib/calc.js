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
// COEFICIENTES DE DESVALORIZAÇÃO DA MOEDA
// Aplicam-se aos imóveis alienados nos anos abaixo, com base no ano de aquisição.
// Regra: detenção mínima de 24 meses entre aquisição e venda (art. 50.º CIRS).
//
// Fontes:
//   2023 — Portaria 340/2023, de 8 de novembro
//   2024 — Portaria 376/2024, de 8 de novembro
//   2025 — Portaria 382/2025/1, de 11 de novembro
// ============================================================
const COEFICIENTES = {
  2023: {
    portaria: 'Portaria 340/2023',
    // ranges: [anoInicio, anoFim, coeficiente]
    ranges: [
      [0, 1903, 5238.38], [1904, 1910, 4876.60], [1911, 1914, 4667.20],
      [1915, 1915, 4161.28], [1916, 1916, 3406.03], [1917, 1917, 2719.02],
      [1918, 1918, 1939.94], [1919, 1919, 1486.75], [1920, 1920, 982.38],
      [1921, 1921, 640.97], [1922, 1922, 474.69], [1923, 1923, 290.49],
      [1924, 1924, 244.54], [1925, 1936, 210.77], [1937, 1939, 204.69],
      [1940, 1940, 172.24], [1941, 1941, 152.98], [1942, 1942, 132.08],
      [1943, 1943, 112.47], [1944, 1950, 95.46], [1951, 1957, 87.59],
      [1958, 1963, 82.36], [1964, 1964, 78.71], [1965, 1965, 75.81],
      [1966, 1966, 72.45], [1967, 1969, 67.75], [1970, 1970, 62.73],
      [1971, 1971, 59.71], [1972, 1972, 55.82], [1973, 1973, 50.75],
      [1974, 1974, 38.92], [1975, 1975, 33.26], [1976, 1976, 27.86],
      [1977, 1977, 21.34], [1978, 1978, 16.72], [1979, 1979, 13.19],
      [1980, 1980, 11.89], [1981, 1981, 9.72], [1982, 1982, 8.07],
      [1983, 1983, 6.46], [1984, 1984, 5.01], [1985, 1985, 4.20],
      [1986, 1986, 3.79], [1987, 1987, 3.48], [1988, 1988, 3.13],
      [1989, 1989, 2.81], [1990, 1990, 2.52], [1991, 1991, 2.23],
      [1992, 1992, 2.04], [1993, 1993, 1.89], [1994, 1994, 1.80],
      [1995, 1995, 1.73], [1996, 1996, 1.69], [1997, 1997, 1.66],
      [1998, 1998, 1.61], [1999, 1999, 1.55], [2000, 2000, 1.56],
      [2001, 2001, 1.46], [2002, 2002, 1.40], [2003, 2003, 1.36],
      [2004, 2004, 1.34], [2005, 2005, 1.31], [2006, 2006, 1.26],
      [2007, 2007, 1.24], [2008, 2008, 1.20], [2009, 2009, 1.22],
      [2010, 2010, 1.20], [2011, 2011, 1.16], [2012, 2015, 1.12],
      [2016, 2016, 1.11], [2017, 2017, 1.10], [2018, 2020, 1.09],
      [2021, 2021, 1.08], [2022, 2022, 1.00],
    ],
  },
  2024: {
    portaria: 'Portaria 376/2024',
    ranges: [
      [0, 1903, 5407.45], [1904, 1910, 5033.93], [1911, 1914, 4817.32],
      [1915, 1915, 4295.49], [1916, 1916, 3515.94], [1917, 1917, 2806.74],
      [1918, 1918, 2002.69], [1919, 1919, 1534.85], [1920, 1920, 1014.07],
      [1921, 1921, 661.84], [1922, 1922, 490.10], [1923, 1923, 299.91],
      [1924, 1924, 252.46], [1925, 1936, 217.55], [1937, 1939, 211.32],
      [1940, 1940, 177.79], [1941, 1941, 157.92], [1942, 1942, 136.34],
      [1943, 1943, 116.10], [1944, 1950, 98.55], [1951, 1957, 90.43],
      [1958, 1963, 85.02], [1964, 1964, 81.24], [1965, 1965, 78.25],
      [1966, 1966, 74.79], [1967, 1969, 69.95], [1970, 1970, 64.74],
      [1971, 1971, 61.63], [1972, 1972, 57.62], [1973, 1973, 52.40],
      [1974, 1974, 40.17], [1975, 1975, 34.34], [1976, 1976, 28.76],
      [1977, 1977, 22.03], [1978, 1978, 17.27], [1979, 1979, 13.62],
      [1980, 1980, 12.28], [1981, 1981, 10.04], [1982, 1982, 8.34],
      [1983, 1983, 6.67], [1984, 1984, 5.18], [1985, 1985, 4.34],
      [1986, 1986, 3.91], [1987, 1987, 3.59], [1988, 1988, 3.23],
      [1989, 1989, 2.90], [1990, 1990, 2.60], [1991, 1991, 2.30],
      [1992, 1992, 2.11], [1993, 1993, 1.95], [1994, 1994, 1.86],
      [1995, 1995, 1.79], [1996, 1996, 1.75], [1997, 1997, 1.71],
      [1998, 1998, 1.67], [1999, 1999, 1.65], [2000, 2000, 1.61],
      [2001, 2001, 1.50], [2002, 2002, 1.44], [2003, 2003, 1.40],
      [2004, 2004, 1.38], [2005, 2005, 1.35], [2006, 2006, 1.30],
      [2007, 2007, 1.28], [2008, 2008, 1.24], [2009, 2009, 1.26],
      [2010, 2010, 1.24], [2011, 2011, 1.20], [2012, 2015, 1.16],
      [2016, 2016, 1.15], [2017, 2017, 1.14], [2018, 2020, 1.13],
      [2021, 2021, 1.12], [2022, 2022, 1.03], [2023, 2023, 1.00],
    ],
  },
  2025: {
    portaria: 'Portaria 382/2025/1',
    ranges: [
      [0, 1903, 5585.78], [1904, 1910, 5199.71], [1911, 1914, 4987.11],
      [1915, 1915, 4437.01], [1916, 1916, 3631.71], [1917, 1917, 2899.18],
      [1918, 1918, 2068.48], [1919, 1919, 1585.26], [1920, 1920, 1047.47],
      [1921, 1921, 683.44], [1922, 1922, 506.14], [1923, 1923, 309.74],
      [1924, 1924, 260.75], [1925, 1936, 224.73], [1937, 1939, 218.25],
      [1940, 1940, 183.66], [1941, 1941, 163.12], [1942, 1942, 140.83],
      [1943, 1943, 119.93], [1944, 1950, 101.78], [1951, 1957, 93.40],
      [1958, 1963, 87.82], [1964, 1964, 83.92], [1965, 1965, 80.83],
      [1966, 1966, 77.26], [1967, 1969, 72.24], [1970, 1970, 66.89],
      [1971, 1971, 63.67], [1972, 1972, 59.52], [1973, 1973, 54.11],
      [1974, 1974, 41.50], [1975, 1975, 35.46], [1976, 1976, 29.71],
      [1977, 1977, 22.76], [1978, 1978, 17.83], [1979, 1979, 14.07],
      [1980, 1980, 12.68], [1981, 1981, 10.37], [1982, 1982, 8.61],
      [1983, 1983, 6.89], [1984, 1984, 5.35], [1985, 1985, 4.48],
      [1986, 1986, 4.04], [1987, 1987, 3.71], [1988, 1988, 3.33],
      [1989, 1989, 3.00], [1990, 1990, 2.69], [1991, 1991, 2.38],
      [1992, 1992, 2.18], [1993, 1993, 2.01], [1994, 1994, 1.92],
      [1995, 1995, 1.84], [1996, 1996, 1.80], [1997, 1997, 1.77],
      [1998, 1998, 1.72], [1999, 1999, 1.70], [2000, 2000, 1.67],
      [2001, 2001, 1.55], [2002, 2002, 1.49], [2003, 2003, 1.45],
      [2004, 2004, 1.43], [2005, 2005, 1.40], [2006, 2006, 1.34],
      [2007, 2007, 1.32], [2008, 2008, 1.28], [2009, 2009, 1.30],
      [2010, 2010, 1.28], [2011, 2011, 1.24], [2012, 2015, 1.20],
      [2016, 2016, 1.19], [2017, 2017, 1.18], [2018, 2020, 1.17],
      [2021, 2021, 1.16], [2022, 2022, 1.06], [2023, 2023, 1.02],
      [2024, 2024, 1.00],
    ],
  },
};

/**
 * Determina o coeficiente a aplicar com base nas datas de compra e venda.
 * Regra (art. 50.º CIRS): aplica-se apenas se entre aquisição e alienação
 * tiverem decorrido pelo menos 2 anos (24 meses).
 *
 * Se o ano de venda não tiver Portaria publicada na base, usa a Portaria
 * mais recente disponível (assumindo coeficiente conservador).
 */
export function obterCoeficiente(dataCompra, dataVenda) {
  if (!dataCompra || !dataVenda) return { coef: 1, motivo: 'datas em falta' };
  const dC = new Date(dataCompra);
  const dV = new Date(dataVenda);
  const meses = (dV.getFullYear() - dC.getFullYear()) * 12 + (dV.getMonth() - dC.getMonth());

  if (meses < 24) {
    return { coef: 1, motivo: 'detenção inferior a 24 meses' };
  }

  const anoCompra = dC.getFullYear();
  const anoVenda = dV.getFullYear();

  // Usar a tabela do ano de venda; se não houver, usar a mais recente disponível
  const anosDisponiveis = Object.keys(COEFICIENTES).map(Number).sort((a, b) => b - a);
  const anoTabela = COEFICIENTES[anoVenda] ? anoVenda : anosDisponiveis[0];
  const tabela = COEFICIENTES[anoTabela];

  for (const [ini, fim, coef] of tabela.ranges) {
    if (anoCompra >= ini && anoCompra <= fim) {
      return {
        coef,
        motivo: `${tabela.portaria}, ano de aquisição ${anoCompra}`,
        anoTabela,
        portaria: tabela.portaria,
      };
    }
  }

  // ano de aquisição anterior à tabela (muito antigo) — usa o coeficiente mais alto
  const maxCoef = tabela.ranges[0][2];
  return {
    coef: maxCoef,
    motivo: `aquisição muito antiga, aplicado coeficiente máximo (${tabela.portaria})`,
    anoTabela,
    portaria: tabela.portaria,
  };
}

// ============================================================
// CÁLCULO PRINCIPAL
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

  // Lookup automático do coeficiente (silencioso)
  const coefInfo = obterCoeficiente(dataCompra, dataVenda);
  const coef = coefInfo.coef;

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
    inputs: { ...inputs, totalDespesas },
    coef,
    coefMotivo: coefInfo.motivo,
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
