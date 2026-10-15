export type QuoteType = 'PTAX_COMPRA' | 'PTAX_VENDA' | 'COMERCIAL';

export interface ExchangeRate {
  date: string; // YYYY-MM-DD
  rateCompra?: number;
  rateVenda?: number;
  rateComercial?: number;
  source: 'BCB' | 'AwesomeAPI' | 'Calculated';
  bulletinType?: string;
  timestamp?: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE'; // Receita / Despesa
export type Currency = 'USD' | 'BRL';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: TransactionType;
  originalCurrency: Currency;
  originalAmount: number;
  appliedQuoteType: QuoteType;
  effectiveQuoteDate: string; // Date of the applied quotation (may differ due to Carnê-Leão rule or weekend fallback)
  appliedRate: number;
  convertedAmountBRL: number;
  ruleNotes?: string;
}

export interface CarneLeaoQuoteResult {
  eventDate: string;
  transactionType: TransactionType;
  referenceMonth: string; // YYYY-MM
  referenceFortnightEndDate: string; // YYYY-MM-DD (Last business day of 1st fortnight of previous month)
  quoteType: 'PTAX_VENDA' | 'PTAX_COMPRA';
  rate: number;
  effectiveDate: string;
}

export type Language = 'pt-BR' | 'en-US';
export type Theme = 'light' | 'dark';
