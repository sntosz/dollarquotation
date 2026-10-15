import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Transaction, TransactionType, Currency, QuoteType } from '@/types';
import { calculateCarneLeaoRate } from '@/services/taxRulesService';
import { fetchFullExchangeRates } from '@/services/currencyService';
import { exportToCSV, exportToXLSX, exportToPDF, downloadCSVTemplate } from '@/services/exportService';
import Papa from 'papaparse';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Trash2,
  FileText,
  Table,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const BatchTransactions: React.FC = () => {
  const { t } = useSettings();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states for manual entry
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [newDesc, setNewDesc] = useState<string>('');
  const [newType, setNewType] = useState<TransactionType>('INCOME');
  const [newCurrency, setNewCurrency] = useState<Currency>('USD');
  const [newAmount, setNewAmount] = useState<number>(100);
  const [useCarneLeaoRule, setUseCarneLeaoRule] = useState<boolean>(true);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('app_transactions');
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved transactions', e);
      }
    }
  }, []);

  // Save to localStorage when updated
  const updateTransactions = (newTxList: Transaction[]) => {
    setTransactions(newTxList);
    localStorage.setItem('app_transactions', JSON.stringify(newTxList));
  };

  const handleAddManualTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || newAmount <= 0) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      let appliedRate = 1;
      let effectiveQuoteDate = newDate;
      let appliedQuoteType: QuoteType = 'PTAX_VENDA';
      let ruleNotes = '';

      if (useCarneLeaoRule && newCurrency === 'USD') {
        const carneLeaoResult = await calculateCarneLeaoRate(newDate, newType);
        appliedRate = carneLeaoResult.rate;
        effectiveQuoteDate = carneLeaoResult.effectiveDate;
        appliedQuoteType = carneLeaoResult.quoteType;
        ruleNotes = `Carnê-Leão (1ª quinzena mês anterior: ${effectiveQuoteDate})`;
      } else {
        const rates = await fetchFullExchangeRates(newDate);
        appliedRate = newType === 'INCOME' ? (rates.rateVenda ?? 1) : (rates.rateCompra ?? 1);
        effectiveQuoteDate = rates.date;
        appliedQuoteType = newType === 'INCOME' ? 'PTAX_VENDA' : 'PTAX_COMPRA';
        ruleNotes = `PTAX Direta (${effectiveQuoteDate})`;
      }

      const convertedAmountBRL = newCurrency === 'USD' ? newAmount * appliedRate : newAmount;

      const newTx: Transaction = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        date: newDate,
        description: newDesc || (newType === 'INCOME' ? 'Receita Exterior' : 'Despesa Exterior'),
        type: newType,
        originalCurrency: newCurrency,
        originalAmount: newAmount,
        appliedQuoteType,
        effectiveQuoteDate,
        appliedRate,
        convertedAmountBRL,
        ruleNotes,
      };

      updateTransactions([newTx, ...transactions]);
      setNewDesc('');
      setNewAmount(100);
      setSuccessMessage('Transação adicionada e convertida com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Erro ao adicionar transação.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMessage(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const parsedTransactions: Transaction[] = [];

          for (const row of results.data as Record<string, string>[]) {
            const date = row['Data'] || row['data'] || new Date().toISOString().substring(0, 10);
            const description = row['Descricao'] || row['Descrição'] || row['descricao'] || 'Transação CSV';
            const rawType = (row['Tipo'] || row['tipo'] || 'RECEITA').toUpperCase();
            const type: TransactionType = rawType.includes('DESPESA') || rawType === 'EXPENSE' ? 'EXPENSE' : 'INCOME';
            const originalCurrency: Currency = (row['Moeda'] || row['moeda'] || 'USD').toUpperCase() as Currency;
            const originalAmount = parseFloat(row['Valor'] || row['valor'] || '0') || 0;

            if (originalAmount <= 0) continue;

            let appliedRate = 1;
            let effectiveQuoteDate = date;
            let appliedQuoteType: QuoteType = 'PTAX_VENDA';
            let ruleNotes = '';

            if (originalCurrency === 'USD') {
              const carneLeaoResult = await calculateCarneLeaoRate(date, type);
              appliedRate = carneLeaoResult.rate;
              effectiveQuoteDate = carneLeaoResult.effectiveDate;
              appliedQuoteType = carneLeaoResult.quoteType;
              ruleNotes = `Carnê-Leão (1ª quinzena mês anterior: ${effectiveQuoteDate})`;
            }

            const convertedAmountBRL = originalCurrency === 'USD' ? originalAmount * appliedRate : originalAmount;

            parsedTransactions.push({
              id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
              date,
              description,
              type,
              originalCurrency,
              originalAmount,
              appliedQuoteType,
              effectiveQuoteDate,
              appliedRate,
              convertedAmountBRL,
              ruleNotes,
            });
          }

          updateTransactions([...parsedTransactions, ...transactions]);
          setSuccessMessage(`${parsedTransactions.length} transações importadas e convertidas com sucesso!`);
          setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err: unknown) {
          if (err instanceof Error) {
            setErrorMessage(err.message);
          } else {
            setErrorMessage('Erro ao processar o arquivo CSV.');
          }
        } finally {
          setLoading(false);
          e.target.value = '';
        }
      },
      error: () => {
        setErrorMessage('Erro ao ler o arquivo CSV.');
        setLoading(false);
      },
    });
  };

  const handleRemoveTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    updateTransactions(updated);
  };

  const handleClearAll = () => {
    if (confirm('Tem certeza que deseja apagar todas as transações cadastradas?')) {
      updateTransactions([]);
    }
  };

  // Calculate totals
  const totalIncomeUSD = transactions
    .filter((t) => t.type === 'INCOME' && t.originalCurrency === 'USD')
    .reduce((sum, t) => sum + t.originalAmount, 0);

  const totalExpenseUSD = transactions
    .filter((t) => t.type === 'EXPENSE' && t.originalCurrency === 'USD')
    .reduce((sum, t) => sum + t.originalAmount, 0);

  const totalIncomeBRL = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.convertedAmountBRL, 0);

  const totalExpenseBRL = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.convertedAmountBRL, 0);

  const netTaxableBRL = totalIncomeBRL - totalExpenseBRL;

  return (
    <div className="space-y-6">
      {/* Top Banner & CSV Import */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {t('navBatch')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Importe planilhas de lançamentos em USD e exporte relatórios consolidados para imposto de renda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={downloadCSVTemplate}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t('downloadTemplate')}
            </button>

            <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              {t('importCSV')}
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Manual Add Form */}
        <form onSubmit={handleAddManualTransaction} className="mt-6">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-3">
            Adicionar Transação Individual
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Data</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Descrição</label>
              <input
                type="text"
                placeholder="Ex: Pagamento de Cliente Ext."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Tipo</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="INCOME">{t('income')}</option>
                <option value="EXPENSE">{t('expense')}</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Valor ($ USD)</label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={newAmount}
                onChange={(e) => setNewAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {t('addTransaction')}
              </button>
            </div>
          </div>
        </form>

        {/* Notifications */}
        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs rounded-lg flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 text-xs rounded-lg flex items-center gap-2 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Financial Summary Dashboard */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
              {t('summaryTotalIncomeUSD')}
            </span>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
              $ {totalIncomeUSD.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
              {t('summaryTotalExpenseUSD')}
            </span>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
              $ {totalExpenseUSD.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block">
              {t('summaryTotalIncomeBRL')}
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              R$ {totalIncomeBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <span className="text-xs text-red-500 dark:text-red-400 font-medium block">
              {t('summaryTotalExpenseBRL')}
            </span>
            <div className="text-xl font-black text-red-500 dark:text-red-400 mt-1">
              R$ {totalExpenseBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm">
            <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold block">
              {t('summaryNetTaxableBRL')}
            </span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
              R$ {netTaxableBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table & Export Tools */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Tabela de Transações e Cotações Aplicadas ({transactions.length})
            </h3>
          </div>

          {transactions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => exportToPDF(transactions)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
              >
                <FileText className="w-4 h-4" />
                {t('exportPDF')}
              </button>
              <button
                onClick={() => exportToXLSX(transactions)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {t('exportXLSX')}
              </button>
              <button
                onClick={() => exportToCSV(transactions)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('exportCSV')}
              </button>
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('clearAll')}
              </button>
            </div>
          )}
        </div>

        {/* Table view */}
        <div className="overflow-x-auto">
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-gray-400 dark:text-gray-500 text-sm">
              {t('noData')}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">{t('date')}</th>
                  <th className="px-4 py-3">{t('description')}</th>
                  <th className="px-4 py-3">{t('type')}</th>
                  <th className="px-4 py-3">{t('amount')}</th>
                  <th className="px-4 py-3">Data Cotação</th>
                  <th className="px-4 py-3">{t('rate')}</th>
                  <th className="px-4 py-3">{t('converted')}</th>
                  <th className="px-4 py-3">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-700 dark:text-gray-300">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{tx.date}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{tx.description}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          tx.type === 'INCOME'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        }`}
                      >
                        {tx.type === 'INCOME' ? t('income') : t('expense')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold whitespace-nowrap">
                      {tx.originalCurrency} {tx.originalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {tx.effectiveQuoteDate}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      R$ {tx.appliedRate.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 font-extrabold text-gray-900 dark:text-white whitespace-nowrap">
                      R$ {tx.convertedAmountBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleRemoveTransaction(tx.id)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
