import React, { useMemo, useState } from 'react';
import { EnergyRecord, Anomaly } from '../types/energy';
import { 
  CloudSun, 
  Thermometer, 
  Sun, 
  AlertTriangle, 
  MapPin, 
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

interface SeasonalAnalysisProps {
  records: EnergyRecord[];
  anomalies: Anomaly[];
}

export default function SeasonalAnalysis({ records, anomalies }: SeasonalAnalysisProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Filter records by location
  const filteredRecords = useMemo(() => {
    if (selectedLocation === 'all') return records;
    return records.filter(r => r.location === selectedLocation);
  }, [records, selectedLocation]);

  // 1. Calculate General Seasonal Metrics
  const stats = useMemo(() => {
    if (filteredRecords.length === 0) return null;

    // Group by season
    const seasonData: Record<string, { kwh: number; count: number; tempSum: number; windSum: number }> = {
      Verano: { kwh: 0, count: 0, tempSum: 0, windSum: 0 },
      Otoño: { kwh: 0, count: 0, tempSum: 0, windSum: 0 },
      Invierno: { kwh: 0, count: 0, tempSum: 0, windSum: 0 },
      Primavera: { kwh: 0, count: 0, tempSum: 0, windSum: 0 }
    };

    const dailyLoads: Record<string, { kwh: number; temp: number; wind: number; season: string }> = {};

    filteredRecords.forEach(r => {
      seasonData[r.season].kwh += r.consumption_kwh;
      seasonData[r.season].count += 1;
      seasonData[r.season].tempSum += r.external_temperature;
      seasonData[r.season].windSum += r.wind_speed_kmh;

      // Aggregate daily
      if (!dailyLoads[r.date]) {
        dailyLoads[r.date] = { kwh: 0, temp: r.external_temperature, wind: r.wind_speed_kmh, season: r.season };
      }
      dailyLoads[r.date].kwh += r.consumption_kwh;
    });

    // Average per season (daily averages)
    const seasonalAverages = Object.entries(seasonData).map(([season, data]) => {
      const days = data.count / 24 || 1;
      return {
        name: season,
        Consumo: Math.round(data.kwh / days),
        Temperatura: parseFloat((data.tempSum / data.count).toFixed(1)),
        Viento: Math.round(data.windSum / data.count)
      };
    });

    const avgVerano = seasonalAverages.find(s => s.name === 'Verano')?.Consumo || 1;
    const avgInvierno = seasonalAverages.find(s => s.name === 'Invierno')?.Consumo || 1;
    const variation = ((avgInvierno - avgVerano) / avgVerano) * 100;

    // Daily records for line chart
    const dailyChartData = Object.entries(dailyLoads).map(([date, data]) => ({
      date,
      dateFormatted: new Date(`${date}T00:00:00`).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }),
      Consumo: parseFloat(data.kwh.toFixed(0)),
      Temperatura: parseFloat(data.temp.toFixed(1)),
      Viento: data.wind,
      Estación: data.season
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Count extreme events in filtered dataset
    const extremeDays = Array.from(
      new Set(
        filteredRecords
          .filter(r => r.extreme_event !== 'Ninguno')
          .map(r => `${r.date}_${r.extreme_event}`)
      )
    );

    // Calculate Vulnerability Index (0-100)
    // - Base TDF isolated grid dependence: 35 points
    // - Seasonality variation factor (capped at 30 points): variation % * 0.5
    // - Climate hazard factor (wind average + extreme days, capped at 15 points)
    // - Active anomalies load (capped at 20 points): anomalies count * 4
    const activeAnoms = anomalies.filter(a => !a.resolved && (selectedLocation === 'all' || a.sector.includes(selectedLocation)));
    const baseDep = 35;
    const seasonalFact = Math.max(0, Math.min(30, variation * 0.5));
    const climateFact = Math.max(0, Math.min(15, (extremeDays.length * 2.5) + (selectedLocation === 'Tolhuin' ? 5 : 2)));
    const anomalyFact = Math.max(0, Math.min(20, activeAnoms.length * 4));
    
    const vulnerabilityScore = Math.round(baseDep + seasonalFact + climateFact + anomalyFact);

    return {
      seasonalAverages,
      variation,
      dailyChartData,
      extremeDaysCount: extremeDays.length,
      vulnerabilityScore,
      avgVerano,
      avgInvierno
    };
  }, [filteredRecords, anomalies, selectedLocation]);

  // Determine Vulnerability class
  const vulnerabilityClass = (score: number) => {
    if (score <= 25) return { name: 'Bajo', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/40', fill: '#10b981' };
    if (score <= 50) return { name: 'Moderado', color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/40', fill: '#f59e0b' };
    if (score <= 75) return { name: 'Alto', color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-850/40', fill: '#ea580c' };
    return { name: 'Crítico', color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-800/40', fill: '#f43f5e' };
  };

  const vClass = stats ? vulnerabilityClass(stats.vulnerabilityScore) : null;

  // Custom tooltips
  const formatKwh = (val: number) => `${val.toLocaleString('es-AR')} kWh`;
  const formatTemp = (val: number) => `${val} °C`;

  // Heatmap data generator
  const heatmapData = useMemo(() => {
    if (filteredRecords.length === 0) return [];

    // Group hourly records into daily totals and keep track of weather
    const dailyMap: Record<string, { date: string; kwh: number; temp: number; event: string; season: string }> = {};

    filteredRecords.forEach(r => {
      if (!dailyMap[r.date]) {
        dailyMap[r.date] = {
          date: r.date,
          kwh: 0,
          temp: r.external_temperature,
          event: r.extreme_event,
          season: r.season
        };
      }
      dailyMap[r.date].kwh += r.consumption_kwh;
    });

    // Sort chronologically and group by season/month represented
    const days = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    
    // Split into 4 blocks of 30 days
    const seasons = ['Verano (Enero)', 'Otoño (Abril)', 'Invierno (Julio)', 'Primavera (Octubre)'];
    const blocks: { name: string; days: typeof days }[] = [];

    for (let i = 0; i < 4; i++) {
      blocks.push({
        name: seasons[i],
        days: days.slice(i * 30, (i + 1) * 30)
      });
    }

    return blocks;
  }, [filteredRecords]);

  // Determine heatmap cell color intensity based on load
  const getCellColor = (kwh: number, maxKwh: number) => {
    const ratio = kwh / (maxKwh || 1);
    if (ratio < 0.35) return 'bg-slate-900 text-slate-500 border-slate-950';
    if (ratio < 0.55) return 'bg-cyan-950/50 text-cyan-400 border-cyan-900/30';
    if (ratio < 0.75) return 'bg-cyan-600/30 text-cyan-200 border-cyan-500/20';
    if (ratio < 0.88) return 'bg-amber-600/30 text-amber-200 border-amber-500/20';
    return 'bg-rose-500/20 text-rose-300 border-rose-500/35 shadow-[0_0_8px_rgba(244,63,94,0.15)]';
  };

  // State for active cell hover tooltip
  const [activeCell, setActiveCell] = useState<{ date: string; kwh: number; temp: number; event: string } | null>(null);

  if (!stats) return null;

  // Max daily consumption in selected location for scaling the heatmap
  const maxDailyKwh = Math.max(...heatmapData.flatMap(b => b.days.map(d => d.kwh)), 1);

  // Vulnerability gauge SVG math
  const score = stats.vulnerabilityScore;
  const radius = 80;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half-circle
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  // Pointer angle (0 to 100 maps to -90 to 90 degrees)
  const needleRotation = (score / 100) * 180 - 90;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Estacionalidad Energética</h2>
          <p className="text-slate-400 mt-1">
            Análisis de prospectiva climática y vulnerabilidad basado en temperatura, horas de luz solar y viento.
          </p>
        </div>

        {/* Location selector */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          {[
            { id: 'all', name: 'Toda la Isla' },
            { id: 'Ushuaia', name: 'Ushuaia' },
            { id: 'Río Grande', name: 'Río Grande' },
            { id: 'Tolhuin', name: 'Tolhuin' }
          ].map(loc => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedLocation === loc.id
                  ? 'bg-cyan-600 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Winter vs Summer */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-850 bg-slate-900/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">Sensibilidad Estacional</span>
              <h4 className="text-2xl font-bold font-mono text-white mt-1">+{stats.variation.toFixed(0)}%</h4>
            </div>
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-850 text-cyan-400">
              <CloudSun className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-4 leading-relaxed font-sans">
            Consumo promedio de invierno: <strong className="text-white">{Math.round(stats.avgInvierno).toLocaleString()} kWh/día</strong> vs verano (<strong className="text-slate-300">{Math.round(stats.avgVerano).toLocaleString()} kWh/día</strong>).
          </p>
        </div>

        {/* KPI 2: Sun & Light */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-850 bg-slate-900/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">Amplitud Lumínica</span>
              <h4 className="text-2xl font-bold font-mono text-white mt-1">7h a 17h</h4>
            </div>
            <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-900/40 text-amber-400">
              <Sun className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-4 leading-relaxed font-sans">
            La variación de horas de luz solar incrementa el tiempo de encendido del alumbrado un <strong className="text-white">142%</strong> durante la época invernal.
          </p>
        </div>

        {/* KPI 3: Extreme climate */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-850 bg-slate-900/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">Alertas Extremas</span>
              <h4 className="text-2xl font-bold font-mono text-white mt-1">{stats.extremeDaysCount} Días</h4>
            </div>
            <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-900/40 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-4 leading-relaxed font-sans">
            Registros con <strong className="text-rose-400">Ola de frío polar</strong> y <strong className="text-slate-300">Tormenta de nieve</strong> inyectados en los modelos de predicción.
          </p>
        </div>

        {/* KPI 4: Vulnerability Index Speedy Gauge */}
        <div className={`glass-panel p-4 rounded-2xl border ${vClass?.bg} flex flex-col items-center justify-center relative overflow-hidden`}>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono absolute top-4">Vulnerabilidad Energética</span>
          
          <div className="w-full flex justify-center mt-6">
            <div className="relative w-44 h-24 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 180 100">
                {/* Background arc */}
                <path
                  d="M 10 90 A 80 80 0 0 1 170 90"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
                {/* Color gradient arc */}
                <path
                  d="M 10 90 A 80 80 0 0 1 170 90"
                  fill="none"
                  stroke="url(#gauge-gradient)"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                />
                
                {/* Defs for gradients */}
                <defs>
                  <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="45%" stopColor="#f59e0b" />
                    <stop offset="75%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                </defs>

                {/* Center needle pin */}
                <circle cx="90" cy="90" r="6" fill="#f8fafc" />
                {/* Needle */}
                <line
                  x1="90"
                  y1="90"
                  x2="90"
                  y2="24"
                  stroke="#f8fafc"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  style={{
                    transform: `rotate(${needleRotation}deg)`,
                    transformOrigin: '90px 90px',
                    transition: 'transform 1.2s cubic-bezier(0.19, 1, 0.22, 1)'
                  }}
                />
              </svg>
              
              {/* Score text */}
              <div className="absolute bottom-0 text-center">
                <span className="text-2xl font-black font-mono text-white leading-none">{score}</span>
                <span className={`block text-[10px] font-extrabold uppercase tracking-wider mt-0.5 ${vClass?.color}`}>
                  Riesgo {vClass?.name}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Main Charts: Temporal Evolution and Seasonal Comparator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Evolutionary Line Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-850 bg-slate-900/10 lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-cyan-400" /> Correlación Consumo vs Temperatura
          </h3>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dateFormatted" stroke="#475569" style={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} />
                <YAxis yAxisId="left" stroke="#06b6d4" style={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" style={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}
                  itemStyle={{ fontSize: 12, padding: '2px 0' }}
                  formatter={(value: unknown, name: unknown) => {
                    if (name === "Consumo") return [formatKwh(value as number), "Consumo Diario"];
                    return [formatTemp(value as number), "Temp. Exterior"];
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="Consumo" stroke="#06b6d4" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line yAxisId="right" type="monotone" dataKey="Temperatura" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Seasonal Bar Comparator */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-850 bg-slate-900/10 space-y-4">
          <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <MapPin className="h-4.5 w-4.5 text-cyan-400" /> Carga Promedio por Estación
          </h3>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.seasonalAverages} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" style={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} />
                <YAxis stroke="#475569" style={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                  formatter={(value: unknown) => [formatKwh(value as number), "Promedio Diario"]}
                />
                <Bar dataKey="Consumo" radius={[4, 4, 0, 0]}>
                  {stats.seasonalAverages.map((entry, index) => {
                    const colors: Record<string, string> = {
                      Verano: '#10b981',
                      Otoño: '#f59e0b',
                      Invierno: '#ea580c',
                      Primavera: '#06b6d4'
                    };
                    return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#06b6d4'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Heatmap Section */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-850 bg-slate-900/10 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-cyan-400" /> Mapa Térmico Diario de Consumo (Heatmap)
          </h3>
          
          {/* Heatmap Legend */}
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
            <span>Bajo</span>
            <div className="flex gap-1">
              <span className="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-950"></span>
              <span className="w-3.5 h-3.5 rounded bg-cyan-950/50 border border-cyan-900/30"></span>
              <span className="w-3.5 h-3.5 rounded bg-cyan-600/30 border border-cyan-500/20"></span>
              <span className="w-3.5 h-3.5 rounded bg-amber-600/30 border border-amber-500/20"></span>
              <span className="w-3.5 h-3.5 rounded bg-rose-500/20 border border-rose-500/35"></span>
            </div>
            <span>Crítico</span>
          </div>
        </div>

        {/* Heatmap Grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {heatmapData.map((block) => (
            <div key={block.name} className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 space-y-3">
              <h5 className="text-xs font-bold text-slate-300 font-mono tracking-wide border-b border-slate-900 pb-2 flex justify-between">
                <span>{block.name}</span>
                {block.name.includes('Invierno') && <span className="text-[10px] text-rose-400 font-bold">Ola Polar</span>}
              </h5>
              
              <div className="grid grid-cols-6 gap-2">
                {block.days.map((day, dIdx) => {
                  const hasAnomaly = day.event !== 'Ninguno';
                  const borderClass = hasAnomaly ? 'border-rose-400/40' : 'border-slate-800/45';
                  return (
                    <div
                      key={day.date}
                      onMouseEnter={() => setActiveCell(day)}
                      onMouseLeave={() => setActiveCell(null)}
                      className={`h-9 w-full rounded-lg border flex flex-col items-center justify-center text-[10px] font-mono font-extrabold cursor-pointer transition-all hover:scale-110 hover:border-white select-none ${getCellColor(day.kwh, maxDailyKwh)} ${borderClass}`}
                    >
                      {dIdx + 1}
                      {hasAnomaly && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-0.5 animate-pulse-soft"></span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Heatmap Tooltip Display */}
        <div className="h-16 flex items-center justify-center rounded-xl bg-slate-950 border border-slate-900 p-4">
          {activeCell ? (
            <div className="flex items-center gap-6 text-xs font-mono text-slate-400 animate-fade-in w-full justify-around flex-wrap">
              <span>
                Fecha: <strong className="text-white">{new Date(`${activeCell.date}T00:00:00`).toLocaleDateString('es-AR', {weekday: 'long', year:'numeric', month: 'long', day:'numeric'})}</strong>
              </span>
              <span>
                Consumo: <strong className="text-cyan-400">{formatKwh(activeCell.kwh)}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5 text-amber-500" /> Temp: <strong className="text-white">{formatTemp(activeCell.temp)}</strong>
              </span>
              {activeCell.event !== 'Ninguno' && (
                <span className="flex items-center gap-1 text-rose-400 bg-rose-950/40 border border-rose-900/40 px-2 py-0.5 rounded">
                  <AlertTriangle className="h-3 w-3 animate-bounce-slow" /> Alerta: <strong>{activeCell.event}</strong>
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
              <ChevronRight className="h-4 w-4 animate-pulse-soft" /> Pasa el cursor sobre los días del calendario para ver el detalle de clima y consumo.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
