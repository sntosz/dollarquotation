import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Currency, QuoteType, TransactionType } from '@/types';
import { fetchFullExchangeRates } from '@/services/currencyService';
import { calculateCarneLeaoRate } from '@/services/taxRulesService';
import { ArrowLeftRight, Calculator, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const CurrencyConverter: React.FC = () => {
  const { t } = useSettings();

  const [amount, setAmount] = useState<number>(1000);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [transactionType, setTransactionType] = useState<TransactionType>('INCOME');
  const [eventDate, setEventDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [isCarneLeaoPreset, setIsCarneLeaoPreset] = useState<boolean>(true);
  const [quoteType, setQuoteType] = useState<QuoteType>('PTAX_VENDA');

  const [loading, setLoading] = useState<boolean>(false);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [appliedRate, setAppliedRate] = useState<number | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [ruleNotes, setRuleNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const performConversion = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isCarneLeaoPreset) {
        // Calculate rate based on Receita Federal Carnê-Leão rules
        const result = await calculateCarneLeaoRate(eventDate, transactionType);
        setAppliedRate(result.rate);
        setEffectiveDate(result.effectiveDate);

        if (currency === 'USD') {
          setConvertedAmount(amount * result.rate);
        } else {
          setConvertedAmount(amount / result.rate);
        }

        const typeLabel = transactionType === 'INCOME' ? 'Receita (PTAX Venda)' : 'Despesa (PTAX Compra)';
        setRuleNotes(
          `Regra Carnê-Leão: Usado PTAX do último dia útil da 1ª quinzena do mês anterior (${result.effectiveDate}). Tipo: ${typeLabel}.`
        );
      } else {
        // Direct conversion using selected quote type and date
        const fullRates = await fetchFullExchangeRates(eventDate);
        let selectedRate = fullRates.rateVenda ?? 0;

        if (quoteType === 'PTAX_COMPRA') {
          selectedRate = fullRates.rateCompra ?? selectedRate;
        } else if (quoteType === 'COMERCIAL') {
          selectedRate = fullRates.rateComercial ?? selectedRate;
        }

        setAppliedRate(selectedRate);
        setEffectiveDate(fullRates.date);

        if (currency === 'USD') {
          setConvertedAmount(amount * selectedRate);
        } else {
          setConvertedAmount(amount / selectedRate);
        }

        setRuleNotes(`Conversão Direta por ${quoteType} na data ${fullRates.date}.`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('errorFetching'));
      }
      setConvertedAmount(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performConversion();
  }, [amount, currency, transactionType, eventDate, isCarneLeaoPreset, quoteType]);

  const toggleCurrency = () => {
    setCurrency((prev) => (prev === 'USD' ? 'BRL' : 'USD'));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
      <div className="pb-6 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          {t('navConverter')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Calcule a conversão instantânea com regras oficiais de impostos (Carnê-Leão / IRPF).
        </p>
      </div>

      {/* Preset Toggle Switch */}
      <div className="mt-6 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <div>
              <span className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                {t('carneLeaoPreset')}
              </span>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                {t('carneLeaoInfo')}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isCarneLeaoPreset}
              onChange={(e) => setIsCarneLeaoPreset(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* Inputs Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Amount & Currency */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {t('amount')} ({currency})
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <button
              onClick={toggleCurrency}
              className="absolute right-2 p-1 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors"
              title="Inverter Moeda"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Event Date */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Data da Ocorrência / Fato Gerador
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Transaction Type (Income / Expense) */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {t('type')}
          </label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as TransactionType)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="INCOME">{t('income')}</option>
            <option value="EXPENSE">{t('expense')}</option>
          </select>
        </div>

        {/* Quote Type selector (Only active when Carne-Leão preset is off) */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Tipo de Cotação
          </label>
          <select
            disabled={isCarneLeaoPreset}
            value={quoteType}
            onChange={(e) => setQuoteType(e.target.value as QuoteType)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="PTAX_VENDA">{t('ptaxVenda')}</option>
            <option value="PTAX_COMPRA">{t('ptaxCompra')}</option>
            <option value="COMERCIAL">{t('comercial')}</option>
          </select>
        </div>
      </div>

      {/* Result Card */}
      <div className="mt-8">
        {loading && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Calculando conversão...</span>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-3 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {convertedAmount !== null && appliedRate !== null && !loading && (
          <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Resultado da Conversão
              </span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {currency === 'USD' ? 'R$' : '$'}{' '}
                {convertedAmount.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>
                  Taxa aplicada: 1 USD = R$ {appliedRate.toFixed(4)} (Data efetiva da taxa: {effectiveDate})
                </span>
              </p>
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 max-w-md w-full">
              <span className="font-bold block text-gray-900 dark:text-white mb-1">
                Nota da Regra Aplicada:
              </span>
              {ruleNotes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
