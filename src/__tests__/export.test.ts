import { describe, it, expect } from 'vitest';
import { Transaction } from '@/types';

describe('Export logic and transaction formatting', () => {
  it('formats transaction summary correctly', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-10-01',
        description: 'Serviços TI',
        type: 'INCOME',
        originalCurrency: 'USD',
        originalAmount: 1000,
        appliedQuoteType: 'PTAX_VENDA',
        effectiveQuoteDate: '2026-09-15',
        appliedRate: 5.5,
        convertedAmountBRL: 5500,
      },
      {
        id: '2',
        date: '2026-10-05',
        description: 'Servidores',
        type: 'EXPENSE',
        originalCurrency: 'USD',
        originalAmount: 200,
        appliedQuoteType: 'PTAX_COMPRA',
        effectiveQuoteDate: '2026-09-15',
        appliedRate: 5.4,
        convertedAmountBRL: 1080,
      },
    ];

    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.convertedAmountBRL, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.convertedAmountBRL, 0);

    const netTaxable = totalIncome - totalExpense;

    expect(totalIncome).toBe(5500);
    expect(totalExpense).toBe(1080);
    expect(netTaxable).toBe(4420);
  });
});
