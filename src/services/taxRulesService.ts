import { TransactionType, CarneLeaoQuoteResult } from '@/types';
import { getFirstFortnightEndDateOfPreviousMonth, formatDateISO } from '@/utils/dateUtils';
import { fetchBCBPTAXRate } from '@/services/currencyService';

/**
 * Calculates the exact Carnê-Leão rate for a transaction event date and type according to Receita Federal rules:
 * - Revenues (Income / Receita): PTAX VENDA rate from the last business day of the 1st fortnight (15th) of previous month.
 * - Expenses (Despesa): PTAX COMPRA rate from the last business day of the 1st fortnight (15th) of previous month.
 */
export async function calculateCarneLeaoRate(
  eventDateStr: string,
  type: TransactionType
): Promise<CarneLeaoQuoteResult> {
  const referenceFortnightDate = getFirstFortnightEndDateOfPreviousMonth(eventDateStr);
  const refDateFormatted = formatDateISO(referenceFortnightDate);

  const quoteType = type === 'INCOME' ? 'PTAX_VENDA' : 'PTAX_COMPRA';

  const exchangeRate = await fetchBCBPTAXRate(refDateFormatted);

  const rate = quoteType === 'PTAX_VENDA'
    ? (exchangeRate.rateVenda ?? 0)
    : (exchangeRate.rateCompra ?? 0);

  const referenceMonth = eventDateStr.substring(0, 7); // YYYY-MM

  return {
    eventDate: eventDateStr,
    transactionType: type,
    referenceMonth,
    referenceFortnightEndDate: refDateFormatted,
    quoteType,
    rate,
    effectiveDate: exchangeRate.date,
  };
}
