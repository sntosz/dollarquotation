'use client';

import React, { useState } from 'react';
import { SettingsProvider } from '@/context/SettingsContext';
import { Header } from '@/components/Header';
import { RateSearch } from '@/components/RateSearch';
import { CurrencyConverter } from '@/components/CurrencyConverter';
import { BatchTransactions } from '@/components/BatchTransactions';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'rates' | 'converter' | 'batch'>('converter');

  return (
    <SettingsProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'rates' && <RateSearch />}
          {activeTab === 'converter' && <CurrencyConverter />}
          {activeTab === 'batch' && <BatchTransactions />}
        </main>

        <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 mt-12">
          <p>
            Cotação Dólar PTAX & Comercial — Desenvolvido para Contabilidade, Carnê-Leão e Declaração de Imposto de Renda.
          </p>
          <p className="mt-1">
            Dados de cotação obtidos diretamente da API Olinda do Banco Central do Brasil (BCB) e AwesomeAPI.
          </p>
        </footer>
      </div>
    </SettingsProvider>
  );
}
