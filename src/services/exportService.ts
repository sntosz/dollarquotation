import { Transaction } from '@/types';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Downloads a sample CSV template for transaction imports.
 */
export function downloadCSVTemplate() {
  const sampleData = [
    {
      Data: '2026-10-15',
      Descricao: 'Prestacao de Servicos de TI EUA',
      Tipo: 'RECEITA',
      Moeda: 'USD',
      Valor: 1500.0,
    },
    {
      Data: '2026-10-18',
      Descricao: 'Assinatura de Servidor Cloud AWS',
      Tipo: 'DESPESA',
      Moeda: 'USD',
      Valor: 120.50,
    },
  ];

  const csv = Papa.unparse(sampleData);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'modelo_importacao_transacoes_usd.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports transaction list to Excel (.xlsx) file.
 */
export function exportToXLSX(transactions: Transaction[], filename = 'relatorio_cotacoes_impostos.xlsx') {
  const exportData = transactions.map((t) => ({
    Data: t.date,
    Descrição: t.description,
    Tipo: t.type === 'INCOME' ? 'Receita' : 'Despesa',
    'Moeda Origem': t.originalCurrency,
    'Valor Origem': t.originalAmount,
    'Tipo Cotação': t.appliedQuoteType,
    'Data Cotação': t.effectiveQuoteDate,
    'Taxa Aplicada (R$)': t.appliedRate,
    'Valor Convertido (R$)': t.convertedAmountBRL,
    'Observação / Regra': t.ruleNotes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transações');
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports transaction list to CSV file.
 */
export function exportToCSV(transactions: Transaction[], filename = 'relatorio_cotacoes_impostos.csv') {
  const exportData = transactions.map((t) => ({
    Data: t.date,
    Descricao: t.description,
    Tipo: t.type === 'INCOME' ? 'RECEITA' : 'DESPESA',
    MoedaOrigem: t.originalCurrency,
    ValorOrigem: t.originalAmount,
    TipoCotacao: t.appliedQuoteType,
    DataCotacao: t.effectiveQuoteDate,
    TaxaAplicadaR$: t.appliedRate,
    ValorConvertidoR$: t.convertedAmountBRL,
    ObservacaoRegra: t.ruleNotes || '',
  }));

  const csv = Papa.unparse(exportData);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports transactions to a formatted PDF Tax Report (Carnê-Leão / IRPF).
 */
export function exportToPDF(transactions: Transaction[], filename = 'relatorio_carne_leao_irpf.pdf') {
  const doc = new jsPDF();

  // Document Title
  doc.setFontSize(16);
  doc.setTextColor(16, 185, 129); // Emerald color
  doc.text('Relatório de Cotações Dólar - Carnê-Leão / IRPF', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 27);
  doc.text(`Total de Registros: ${transactions.length}`, 14, 32);

  // Summary calculation
  let totalIncomeBRL = 0;
  let totalExpenseBRL = 0;
  transactions.forEach((t) => {
    if (t.type === 'INCOME') {
      totalIncomeBRL += t.convertedAmountBRL;
    } else {
      totalExpenseBRL += t.convertedAmountBRL;
    }
  });
  const netTaxableBRL = totalIncomeBRL - totalExpenseBRL;

  // Summary box
  doc.setFillColor(245, 247, 250);
  doc.rect(14, 36, 182, 22, 'F');
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(`Total Receitas: R$ ${totalIncomeBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, 43);
  doc.text(`Total Despesas: R$ ${totalExpenseBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, 50);
  doc.setFont('helvetica', 'bold');
  doc.text(`Base de Cálculo Líquida: R$ ${netTaxableBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 100, 47);
  doc.setFont('helvetica', 'normal');

  // Table Data
  const tableData = transactions.map((t) => [
    t.date,
    t.description.length > 25 ? t.description.substring(0, 22) + '...' : t.description,
    t.type === 'INCOME' ? 'Receita' : 'Despesa',
    `${t.originalCurrency} ${t.originalAmount.toFixed(2)}`,
    t.effectiveQuoteDate,
    `R$ ${t.appliedRate.toFixed(4)}`,
    `R$ ${t.convertedAmountBRL.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 63,
    head: [['Data', 'Descrição', 'Tipo', 'Origem', 'Data Cotação', 'Taxa (R$)', 'Convertido (R$)']],
    body: tableData,
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8 },
  });

  doc.save(filename);
}
