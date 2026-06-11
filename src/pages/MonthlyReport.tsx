import React, { useMemo, useState } from 'react';
import { EnergyRecord, Anomaly } from '../types/energy';
import { generateMonthlyReportText } from '../services/reportGenerator';
import { FileText, Copy, Check, Printer, Briefcase } from 'lucide-react';

interface MonthlyReportProps {
  records: EnergyRecord[];
  anomalies: Anomaly[];
}

export default function MonthlyReport({ records, anomalies }: MonthlyReportProps) {
  const [copied, setCopied] = useState<boolean>(false);

  // Generate Report content
  const reportText = useMemo(() => {
    return generateMonthlyReportText(records, anomalies);
  }, [records, anomalies]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar el texto: ', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Convert markdown to clean HTML mockup for display
  const renderedHtml = useMemo(() => {
    return reportText
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          return `<h3 class="text-xl font-extrabold text-white mt-6 mb-3 border-b border-slate-900 pb-2">${trimmed.substring(2)}</h3>`;
        }
        if (trimmed.startsWith('## ')) {
          return `<h4 class="text-base font-bold text-cyan-400 mt-5 mb-2">${trimmed.substring(3)}</h4>`;
        }
        if (trimmed.startsWith('- **')) {
          // Bullet point bold
          return `<li class="ml-4 list-disc text-xs text-slate-300 py-1">${trimmed.replace(/^- /, '')}</li>`;
        }
        if (trimmed.startsWith('- ')) {
          return `<li class="ml-4 list-disc text-xs text-slate-300 py-1">${trimmed.substring(2)}</li>`;
        }
        if (trimmed.startsWith('|')) {
          // Simulating table support simply
          return `<div class="font-mono text-xxs text-cyan-500 py-0.5 bg-slate-950/20 px-2">${trimmed}</div>`;
        }
        if (trimmed === '---') {
          return `<hr class="border-slate-900 my-4" />`;
        }
        if (trimmed === '') {
          return '';
        }
        return `<p class="text-xs text-slate-400 leading-relaxed font-sans pb-2">${trimmed}</p>`;
      })
      .filter(l => l !== '')
      .join('');
  }, [reportText]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Reporte de Prospectiva Mensual</h2>
          <p className="text-slate-400 mt-1">
            Generación automática de auditoría energética y prospectiva de subsidios para copiar o imprimir.
          </p>
        </div>
        
        {/* Report Operations */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" /> Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiar Texto
              </>
            )}
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/20 hover:translate-y-[-1px] transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir Reporte
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Printable/Editable Preview Sheet */}
        <div className="lg:col-span-3 glass-panel p-8 rounded-2xl border border-slate-800 bg-slate-950/30 overflow-y-auto max-h-[70vh] print-sheet scrollbar-thin">
          <div className="flex justify-between items-center pb-4 border-b border-slate-900 mb-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              <span className="text-xxs font-mono text-slate-500">AUDIT_REPORT_PREVIEW.md</span>
            </div>
            <span className="text-xxs font-mono text-slate-500">FORMAT: GFM MARKDOWN</span>
          </div>

          {/* Formatted Text Preview */}
          <div 
            className="prose prose-invert max-w-none space-y-2 select-text"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>

        {/* Side recommendations checklist */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Instructions card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="h-4.5 w-4.5 text-cyan-400" /> Plan de Prospectiva
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Este reporte consolidado detalla consumos, ineficiencias de climatización, mitigación ambiental y el impacto de los subsidios en Tierra del Fuego.
            </p>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-900 text-xxs leading-relaxed font-mono text-slate-500">
              * Ideal para adjuntar en reportes de gerencia o enviar por correo electrónico a mantenimiento técnico.
            </div>
          </div>

          {/* Quick Actions checklist */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-850 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Plan de Trabajo sugerido</h4>
            
            <div className="space-y-3">
              <div className="flex gap-2.5 items-start">
                <input type="checkbox" className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-200">Revisión de cámaras</span>
                  <p className="text-[10px] text-slate-500">Mantenimiento de burletes en Cámara Congeladora.</p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <input type="checkbox" className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-200">Apagado de Radiadores</span>
                  <p className="text-[10px] text-slate-500">Temporizadores para Calefacción Eléctrica Soporte en oficinas.</p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <input type="checkbox" className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-200">Desplazamiento de pico</span>
                  <p className="text-[10px] text-slate-500">Coordinar turnos industriales fuera de la franja pico (18 a 22h).</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
