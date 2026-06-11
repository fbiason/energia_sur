import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Download,
  Server,
  CloudSun
} from 'lucide-react';
import { EnergyRecord } from '../types/energy';
import { parseEnergyCSV } from '../utils/csv';

interface DataUploadProps {
  records: EnergyRecord[];
  setRecords: (records: EnergyRecord[]) => void;
  isSimulated: boolean;
  setIsSimulated: (val: boolean) => void;
  onResetDemo: () => void;
}

export default function DataUpload({
  records,
  setRecords,
  isSimulated,
  setIsSimulated,
  onResetDemo
}: DataUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Statistics of loaded data
  const recordCount = records.length;
  const uniqueSectors = Array.from(new Set(records.map(r => r.sector)));
  const uniqueEquip = Array.from(new Set(records.map(r => r.equipment)));
  
  const dates = records.map(r => r.date).sort();
  const dateRange = dates.length > 0 
    ? `${dates[0]} al ${dates[dates.length - 1]}`
    : 'N/D';

  const totalKwh = records.reduce((sum, r) => sum + r.consumption_kwh, 0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = parseEnergyCSV(text);

      if (result.success && result.records.length > 0) {
        setRecords(result.records);
        setIsSimulated(false);
        setSuccessMsg(`¡Archivo cargado con éxito! Se importaron ${result.records.length} registros horarios distribuidos en ${Array.from(new Set(result.records.map(r => r.sector))).length} sectores.`);
      } else {
        setError(result.error || 'Error al procesar el archivo CSV. Verifique el formato.');
      }
    };
    reader.onerror = () => {
      setError('Error al leer el archivo.');
    };
    reader.readAsText(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleUseDemo = () => {
    onResetDemo();
    setSuccessMsg('Se ha restablecido el conjunto de datos de simulación (60 días para Tierra del Fuego).');
    setError(null);
  };

  const downloadCSVSample = () => {
    const csvContent = 
`date,hour,sector,equipment,consumption_kwh,production_units,external_temperature,shift,cost_per_kwh
2026-06-01,08,Línea de Producción 1,Motor Principal L1,38.5,110,14.5,Mañana,45.0
2026-06-01,08,Línea de Producción 1,Tablero Auxiliar L1,4.2,0,14.5,Mañana,45.0
2026-06-01,08,Cámara de frío,Cámara Frigorífica,18.3,0,14.5,Mañana,45.0
2026-06-01,08,Compresores,Compresor A,22.1,0,14.5,Mañana,45.0
2026-06-01,08,Iluminación,Iluminación Planta,2.1,0,14.5,Mañana,45.0
2026-06-01,08,Calefacción,Sistema de Calefacción,8.4,0,14.5,Mañana,45.0
2026-06-01,08,Administración,Calefacción Oficinas,5.2,0,14.5,Mañana,45.0
2026-06-01,08,Administración,Iluminación Oficinas,2.1,0,14.5,Mañana,45.0`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'energy_manager_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Centro de Carga de Datos</h2>
        <p className="text-slate-400 mt-1">
          Carga archivos de mediciones eléctricas (facturas, telemedición, SCADA) o activa la simulación integrada.
        </p>
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Source Selector Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 lg:col-span-1">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-400" /> Origen de Datos Activo
          </h3>
          
          <div className="space-y-3">
            <button
              onClick={handleUseDemo}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                isSimulated 
                  ? 'border-cyan-500 bg-cyan-950/20 text-white' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex justify-between items-center font-bold">
                <span>Datos Simulados</span>
                {isSimulated && <span className="text-xs bg-cyan-500 text-slate-950 font-mono font-bold px-2 py-0.5 rounded-full">Activo</span>}
              </div>
              <p className="text-xs mt-1 text-slate-400 leading-relaxed">
                60 días de mediciones horarias de sectores urbanos e industriales de Tierra del Fuego. Incluye desvíos e ineficiencias para demostración.
              </p>
            </button>

            <button
              onClick={triggerFileSelect}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                !isSimulated 
                  ? 'border-cyan-500 bg-cyan-950/20 text-white' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex justify-between items-center font-bold">
                <span>Carga por CSV</span>
                {!isSimulated && <span className="text-xs bg-cyan-500 text-slate-950 font-mono font-bold px-2 py-0.5 rounded-full">Activo</span>}
              </div>
              <p className="text-xs mt-1 text-slate-400 leading-relaxed">
                Importá datos propios de tu empresa estructurados por hora. Valida formato automáticamente en el navegador.
              </p>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-900 flex flex-col gap-2.5">
            <button 
              onClick={downloadCSVSample}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white transition-all text-xs font-semibold"
            >
              <Download className="h-4 w-4" /> Descargar Plantilla CSV
            </button>
            
            {isSimulated && (
              <button 
                onClick={handleUseDemo}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-cyan-800/40 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-400 transition-all text-xs font-semibold"
              >
                <RefreshCw className="h-4 w-4 animate-spin-slow" /> Regenerar Demo Data
              </button>
            )}
          </div>
        </div>

        {/* Upload Interface & Stats */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* File Dropzone */}
          <div className="glass-panel p-8 rounded-2xl border border-dashed border-slate-700 bg-slate-900/20 hover:bg-slate-900/30 transition-all flex flex-col items-center justify-center text-center group cursor-pointer" onClick={triggerFileSelect}>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv" 
              className="hidden" 
            />
            
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-all shadow-lg">
              <Upload className="h-8 w-8" />
            </div>
            
            <h4 className="text-white font-bold mt-4 text-base">Arrastrá tu reporte de consumos (.csv) o hacé clic para buscar</h4>
            <p className="text-slate-500 text-xs mt-1.5 max-w-md">
              Columnas requeridas: <code className="text-cyan-400 font-mono">date</code> (AAAA-MM-DD), <code className="text-cyan-400 font-mono">hour</code> (0-23), <code className="text-cyan-400 font-mono">sector</code>, <code className="text-cyan-400 font-mono">equipment</code> y <code className="text-cyan-400 font-mono">consumption_kwh</code>.
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/30 text-rose-300 flex items-start gap-3 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <span className="font-bold">Error en la carga:</span>
                <p className="mt-1 text-rose-400/90 leading-relaxed font-mono text-xs">{error}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/30 text-emerald-300 flex items-start gap-3 text-sm">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <span className="font-bold">Carga procesada:</span>
                <p className="mt-1 text-emerald-400/90 leading-relaxed">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Current Dataset Metadata Summary */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Resumen del Set de Datos Cargado</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-900">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Mediciones Horarias</span>
                <p className="text-lg font-bold font-mono mt-1 text-white">{recordCount.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-900">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Consumo total</span>
                <p className="text-lg font-bold font-mono mt-1 text-cyan-400">{totalKwh.toLocaleString(undefined, {maximumFractionDigits:0})} kWh</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-900">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Sectores</span>
                <p className="text-lg font-bold font-mono mt-1 text-white">{uniqueSectors.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-900">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Equipos Monitoreados</span>
                <p className="text-lg font-bold font-mono mt-1 text-white">{uniqueEquip.length}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Rango temporal:</span>
              <span className="font-mono font-bold text-slate-200">{dateRange}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Public Datasets Guide */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CloudSun className="h-5 w-5 text-amber-500" /> Integración con Fuentes Externas y Datos Públicos
          </h3>
          <span className="text-xs bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded border border-slate-700">Fase 2 API Config</span>
        </div>
        
        <p className="text-sm text-slate-400 leading-relaxed">
          Para enriquecer el análisis predictivo y correlacionar consumos con la actividad económica general o el clima regional, EnergIA SUR permite planificar conexiones API con las siguientes entidades abiertas. Visite la pestaña <strong className="text-slate-200">"Fuentes de Datos"</strong> para simular sus credenciales de acceso:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-900 space-y-2">
            <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span> Servicio Meteorológico Nacional
            </h5>
            <p className="text-xxs text-slate-500 leading-relaxed">
              API de pronóstico y clima histórico. Permite estimar la carga de refrigeración (Cámaras frigoríficas) y calefacción de la planta según la amplitud térmica proyectada.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-900 space-y-2">
            <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span> INDEC & IPIEC (Tierra del Fuego)
            </h5>
            <p className="text-xxs text-slate-500 leading-relaxed">
              Índices sectoriales y actividad industrial manufacturera. Correlaciona la demanda energética con las tendencias de producción y precios de insumos regionales.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-900 space-y-2">
            <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span> Secretaría de Energía Abierta
            </h5>
            <p className="text-xxs text-slate-500 leading-relaxed">
              Precios regulados, factores de emisión y datos del MEM (Mercado Eléctrico Mayorista). Esencial para estimar huella de carbono real (tCO2/MWh) y tarifas estacionales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
