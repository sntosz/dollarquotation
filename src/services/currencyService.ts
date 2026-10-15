import { ExchangeRate } from '@/types';
import { formatDateBCB, formatDateISO, formatDateAwesome, getPreviousBusinessDayIfWeekend } from '@/utils/dateUtils';
import { parseISO, subDays } from 'date-fns';

/**
 * Fetches PTAX dollar rates from Banco Central do Brasil (BCB Olinda API).
 * Tries requested date; if no bulletin is available (e.g. weekend or holiday),
 * rolls back day by day until a rate is found (up to 7 days).
 */
export async function fetchBCBPTAXRate(dateStr: string): Promise<ExchangeRate> {
  let targetDate = parseISO(dateStr);
  let attempts = 0;
  const maxAttempts = 7;

  while (attempts < maxAttempts) {
    const bcbDate = formatDateBCB(targetDate);
    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='USD'&@dataCotacao='${bcbDate}'&$top=100&$format=json&$select=cotacaoCompra,cotacaoVenda,dataHoraCotacao,tipoBoletim`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data.value && data.value.length > 0) {
          // Find Closing rate ('Fechamento') if available, or last available bulletin
          const fechamento = data.value.find((b: { tipoBoletim?: string }) => b.tipoBoletim === 'Fechamento') || data.value[data.value.length - 1];
          if (fechamento && fechamento.cotacaoCompra && fechamento.cotacaoVenda) {
            return {
              date: formatDateISO(targetDate),
              rateCompra: Number(fechamento.cotacaoCompra),
              rateVenda: Number(fechamento.cotacaoVenda),
              source: 'BCB',
              bulletinType: fechamento.tipoBoletim,
              timestamp: fechamento.dataHoraCotacao,
            };
          }
        }
      }
    } catch (err) {
      console.warn(`Attempt ${attempts + 1} failed for BCB PTAX on ${bcbDate}`, err);
    }

    // Try previous day
    targetDate = subDays(targetDate, 1);
    attempts++;
  }

  throw new Error(`Cotação PTAX não encontrada no BCB para a data ${dateStr} ou dias anteriores.`);
}

/**
 * Fetches Commercial Dollar rate from AwesomeAPI for a given date.
 */
export async function fetchCommercialRate(dateStr: string): Promise<number> {
  let targetDate = parseISO(dateStr);
  let attempts = 0;
  const maxAttempts = 7;

  while (attempts < maxAttempts) {
    const dateFormatted = formatDateAwesome(targetDate);
    // AwesomeAPI daily history endpoint
    const url = `https://economia.awesomeapi.com.br/json/daily/USD-BRL/?start_date=${dateFormatted}&end_date=${dateFormatted}`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0 && data[0].bid) {
          return Number(data[0].bid);
        }
      }
    } catch (err) {
      console.warn(`Attempt ${attempts + 1} failed for Commercial Dollar on ${dateStr}`, err);
    }

    targetDate = subDays(targetDate, 1);
    attempts++;
  }

  // Fallback: If historic daily fails, fetch current commercial rate
  try {
    const fallbackResponse = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      if (fallbackData.USDBRL && fallbackData.USDBRL.bid) {
        return Number(fallbackData.USDBRL.bid);
      }
    }
  } catch (err) {
    console.error('Fallback commercial dollar rate request failed', err);
  }

  throw new Error(`Cotação Comercial não encontrada para a data ${dateStr}.`);
}

/**
 * Combined function to fetch all rate details for a given date.
 */
export async function fetchFullExchangeRates(dateStr: string): Promise<ExchangeRate> {
  const ptaxData = await fetchBCBPTAXRate(dateStr);
  let rateComercial: number | undefined;

  try {
    rateComercial = await fetchCommercialRate(dateStr);
  } catch (e) {
    console.warn('Commercial rate fetch failed, using PTAX Venda as fallback', e);
    rateComercial = ptaxData.rateVenda;
  }

  return {
    ...ptaxData,
    rateComercial,
  };
}
