import React, { useState, useMemo } from 'react';
import { Anomaly } from '../types/energy';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Info
} from 'lucide-react';

interface AnomaliesProps {
  anomalies: Anomaly[];
  setAnomalies: React.Dispatch<React.SetStateAction<Anomaly[]>>;
}

export default function Anomalies({ anomalies, setAnomalies }: AnomaliesProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [showResolved, setShowResolved] = useState<boolean>(false);

  // Available sectors from anomalies
  const sectors = useMemo(() => {
    return ['all', ...Array.from(new Set(anomalies.map(a => a.sector)))];
  }, [anomalies]);

  // Handle resolve toggle
  const toggleResolve = (id: string) => {
    setAnomalies(prev => 
      prev.map(a => a.id === id ? { ...a, resolved: !a.resolved } : a)
    );
  };

  // Filtered anomalies list
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(a => {
      const matchSeverity = selectedSeverity === 'all' || a.severity === selectedSeverity;
      const matchSector = selectedSector === 'all' || a.sector === selectedSector;
      const matchResolved = showResolved ? true : !a.resolved;
      return matchSeverity && matchSector && matchResolved;
    });
  }, [anomalies, selectedSeverity, selectedSector, showResolved]);

  // Statistics
  const pendingCount = useMemo(() => anomalies.filter(a => !a.resolved).length, [anomalies]);
  const criticalCount = useMemo(() => anomalies.filter(a => !a.resolved && a.severity === 'critica').length, [anomalies]);
  const highCount = useMemo(() => anomalies.filter(a => !a.resolved && a.severity === 'alta').length, [anomalies]);

  // Severity color utility
  const getSeverityBadge = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'critica':
        return 'bg-red-500/15 border border-red-500/30 text-red-400';
      case 'alta':
        return 'bg-orange-500/15 border border-orange-500/30 text-orange-400';
      case 'media':
        return 'bg-amber-500/15 border border-amber-500/30 text-amber-400';
      case 'baja':
        return 'bg-blue-500/15 border border-blue-500/30 text-blue-400';
      default:
        return 'bg-slate-500/15 border border-slate-500/30 text-slate-400';
    }
  };

  const getSeverityIndicator = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'critica':
        return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
      case 'alta':
        return 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]';
      case 'media':
        return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]';
      case 'baja':
        return 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Detección de Anomalías</h2>
          <p className="text-slate-400 mt-1">
            Historial de anomalías e ineficiencias detectadas por análisis heurístico.
          </p>
        </div>
        
        {/* Quick Counters */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl border border-red-950 bg-red-950/20 text-red-400 text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Críticas: {criticalCount}
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-orange-950 bg-orange-950/20 text-orange-400 text-xs font-mono font-bold flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
            Altas: {highCount}
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 text-xs font-mono">
            Pendientes: {pendingCount}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Severity filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">Gravedad:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 text-xs focus:border-cyan-500 focus:outline-none cursor-pointer"
            >
              <option value="all">Todas</option>
              <option value="critica">Crítica</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          {/* Sector filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">Sector:</span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 text-xs focus:border-cyan-500 focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los Sectores</option>
              {sectors.filter(s => s !== 'all').map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resolved Checkbox */}
        <div className="flex items-center gap-2 self-start md:self-auto cursor-pointer">
          <input
            type="checkbox"
            id="showResolvedCheckbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <label htmlFor="showResolvedCheckbox" className="text-xs text-slate-400 select-none cursor-pointer font-medium">
            Mostrar anomalías ya resueltas
          </label>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="space-y-4">
        {filteredAnomalies.length > 0 ? (
          filteredAnomalies.map((anom) => (
            <div 
              key={anom.id}
              className={`glass-panel p-6 rounded-2xl border transition-all flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden ${
                anom.resolved 
                  ? 'border-slate-900 bg-slate-950/20 opacity-60' 
                  : anom.severity === 'critica'
                    ? 'border-red-500/20 bg-red-950/5 hover:border-red-500/35'
                    : anom.severity === 'alta'
                      ? 'border-orange-500/20 bg-orange-950/5 hover:border-orange-500/35'
                      : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Left Color strip */}
              <div className="absolute top-0 left-0 bottom-0 w-1 flex flex-col">
                <span className={`w-full h-full ${getSeverityIndicator(anom.severity)}`}></span>
              </div>

              {/* Core Information */}
              <div className="space-y-3 flex-1 pl-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xxs font-bold uppercase tracking-wider font-mono ${getSeverityBadge(anom.severity)}`}>
                    {anom.severity.toUpperCase()}
                  </span>
                  
                  <span className="text-slate-500 font-mono text-xs flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {anom.timestamp}
                  </span>

                  <span className="text-slate-400 text-xs font-semibold">
                    Sector: <span className="text-white">{anom.sector}</span>
                  </span>

                  <span className="text-slate-400 text-xs font-semibold">
                    Equipo: <span className="text-white">{anom.equipment}</span>
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <ShieldAlert className="h-4.5 w-4.5 text-cyan-400 shrink-0" /> {anom.type}
                  </h4>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed font-sans">
                    {anom.explanation}
                  </p>
                </div>

                {/* Technical Action Plan */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 text-slate-300 flex gap-2.5 text-xs">
                  <Wrench className="h-4.5 w-4.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-200">Acción sugerida por EnergIA Sur:</span>
                    <p className="mt-1 leading-relaxed text-slate-400">{anom.recommendation}</p>
                  </div>
                </div>
              </div>

              {/* Action Resolution Button */}
              <div className="flex flex-col justify-center shrink-0 border-t md:border-t-0 md:border-l border-slate-900 pt-4 md:pt-0 md:pl-6">
                <button
                  onClick={() => toggleResolve(anom.id)}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    anom.resolved
                      ? 'bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-900'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {anom.resolved ? 'Reabrir Alerta' : 'Marcar Resuelto'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center space-y-3">
            <Info className="h-10 w-10 text-slate-600 mx-auto animate-bounce-slow" />
            <h4 className="text-slate-300 font-bold">Sin anomalías encontradas</h4>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              No hay alertas con los filtros seleccionados actualmente. Active 'Mostrar anomalías ya resueltas' para ver registros anteriores.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
