import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { fetchFullExchangeRates } from '@/services/currencyService';
import { ExchangeRate } from '@/types';
import { Calendar, Search, RefreshCw, AlertCircle, CheckCircle, Info } from 'lucide-react';

export const RateSearch: React.FC = () => {
  const { t } = useSettings();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [rateData, setRateData] = useState<ExchangeRate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (dateToFetch: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFullExchangeRates(dateToFetch);
      setRateData(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('errorFetching'));
      }
      setRateData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch(selectedDate);
  }, [selectedDate]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t('navRates')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Consulte as cotações oficiais do Banco Central (PTAX) e Comercial para qualquer data.
          </p>
        </div>

        {/* Date Picker Input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => handleSearch(selectedDate)}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {t('search')}
          </button>
        </div>
      </div>

      {/* Results Display */}
      <div className="mt-6">
        {loading && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 flex items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span>{t('fetchingRates')}</span>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-3 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {rateData && !loading && (
          <div className="space-y-4">
            {rateData.date !== selectedDate && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs rounded-lg flex items-center gap-2 border border-amber-200 dark:border-amber-800">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                  A data selecionada ({selectedDate}) não possui boletim de negociação (ex: fim de semana ou feriado). Exibindo cotação do último dia útil disponível ({rateData.date}).
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* PTAX Compra */}
              <div className="p-5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {t('ptaxCompra')}
                </span>
                <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  R$ {rateData.rateCompra?.toFixed(4) ?? 'N/A'}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Usado na conversão de despesas e deduções para o IRPF / Carnê-Leão.
                </p>
              </div>

              {/* PTAX Venda */}
              <div className="p-5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  {t('ptaxVenda')}
                </span>
                <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  R$ {rateData.rateVenda?.toFixed(4) ?? 'N/A'}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Usado na conversão de receitas e rendimentos para o IRPF / Carnê-Leão.
                </p>
              </div>

              {/* Comercial */}
              <div className="p-5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                  {t('comercial')}
                </span>
                <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  R$ {rateData.rateComercial?.toFixed(4) ?? 'N/A'}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Cotação comercial de mercado para transações gerais do dia.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Fonte: Banco Central do Brasil (BCB) / Olinda OData API. Boletim: {rateData.bulletinType || 'Fechamento'}.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
