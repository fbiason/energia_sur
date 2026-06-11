import React, { useState, useMemo } from 'react';
import { EnergyRecord } from '../types/energy';
import { 
  Filter, 
  Thermometer, 
  Clock, 
  Cpu, 
  Layers 
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

interface ConsumptionAnalysisProps {
  records: EnergyRecord[];
}

export default function ConsumptionAnalysis({ records }: ConsumptionAnalysisProps) {
  // Filters State
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');

  // Available options derived from records
  const sectors = useMemo(() => ['all', ...Array.from(new Set(records.map(r => r.sector)))], [records]);
  const equipments = useMemo(() => {
    if (selectedSector === 'all') {
      return ['all', ...Array.from(new Set(records.map(r => r.equipment)))];
    }
    return ['all', ...Array.from(new Set(records.filter(r => r.sector === selectedSector).map(r => r.equipment)))];
  }, [records, selectedSector]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedEquipment('all');
  }, [selectedSector]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchSector = selectedSector === 'all' || r.sector === selectedSector;
      const matchEquip = selectedEquipment === 'all' || r.equipment === selectedEquipment;
      const matchShift = selectedShift === 'all' || r.shift === selectedShift;
      return matchSector && matchEquip && matchShift;
    });
  }, [records, selectedSector, selectedEquipment, selectedShift]);

  // Chart 1: Average hourly consumption (0 to 23 hours)
  const hourlyChartData = useMemo(() => {
    const hours: Record<number, { sum: number; count: number }> = {};
    for (let h = 0; h < 24; h++) {
      hours[h] = { sum: 0, count: 0 };
    }

    filteredRecords.forEach(r => {
      hours[r.hour].sum += r.consumption_kwh;
      hours[r.hour].count += 1;
    });

    return Object.entries(hours).map(([hourStr, data]) => ({
      hora: `${hourStr.padStart(2, '0')}:00`,
      Consumo: data.count > 0 ? parseFloat((data.sum / data.count).toFixed(2)) : 0
    }));
  }, [filteredRecords]);

  // Chart 2: Scatter plot of temperature vs consumption
  // Sample a subset if too many records to make rendering fast and clean
  const scatterChartData = useMemo(() => {
    const sampled = filteredRecords.filter((_, idx) => idx % 4 === 0); // sample 25% of data points for visualization speed
    return sampled.map(r => ({
      temperature: r.external_temperature,
      consumption: r.consumption_kwh,
      equipment: r.equipment
    }));
  }, [filteredRecords]);

  // Chart 3: Consumption breakdown by equipment
  const equipmentRankingData = useMemo(() => {
    const sumMap: Record<string, number> = {};
    filteredRecords.forEach(r => {
      sumMap[r.equipment] = (sumMap[r.equipment] || 0) + r.consumption_kwh;
    });

    return Object.entries(sumMap).map(([name, kwh]) => ({
      name,
      Consumo: parseFloat(kwh.toFixed(0))
    })).sort((a, b) => b.Consumo - a.Consumo);
  }, [filteredRecords]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Análisis de Consumo</h2>
        <p className="text-slate-400 mt-1">
          Explore los perfiles de carga y analice correlaciones climáticas con la maquinaria industrial.
        </p>
      </div>

      {/* Interactive Filters Panel */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5 pb-2">
            <Layers className="h-3.5 w-3.5 text-cyan-400" /> Sector
          </label>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-sm font-medium focus:border-cyan-500 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">Todos los Sectores</option>
            {sectors.filter(s => s !== 'all').map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5 pb-2">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" /> Máquina / Equipo
          </label>
          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-sm font-medium focus:border-cyan-500 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">Todos los Equipos</option>
            {equipments.filter(e => e !== 'all').map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5 pb-2">
            <Clock className="h-3.5 w-3.5 text-cyan-400" /> Turno Operativo
          </label>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-sm font-medium focus:border-cyan-500 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">Todos los Turnos</option>
            <option value="Mañana">Turno Mañana (06 - 14 hs)</option>
            <option value="Tarde">Turno Tarde (14 - 22 hs)</option>
            <option value="Noche">Turno Noche (22 - 06 hs)</option>
          </select>
        </div>

        <div className="flex items-center justify-center py-1">
          <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-600 animate-pulse-soft" />
            Mostrando <strong className="text-cyan-400 font-bold">{filteredRecords.length.toLocaleString()}</strong> registros horarias
          </div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Hourly profile */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="pb-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-cyan-400" /> Perfil de Carga Horario Promedio
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Consumo promedio (kWh) distribuido en las 24 horas del día.
            </p>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="hora" stroke="#64748b" tickLine={false} style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" tickLine={false} style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: 8, color: '#f3f4f6' }}
                  labelStyle={{ fontFamily: 'monospace' }}
                />
                <Line type="monotone" dataKey="Consumo" stroke="#06b6d4" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Equipment breakdown */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="pb-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-cyan-400" /> Distribución de Consumo Acumulado
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Ranking de consumo de energía total por equipo (kWh) bajo filtros seleccionados.
            </p>
          </div>

          <div className="h-80 w-full">
            {equipmentRankingData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={equipmentRankingData} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tickLine={false} style={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" tickLine={false} width={120} style={{ fontSize: 10, fontWeight: 'medium' }} />
                  <Tooltip 
                    formatter={(value) => [value !== undefined ? `${value.toLocaleString()} kWh` : '', 'Consumo']}
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: 8, color: '#f3f4f6' }}
                  />
                  <Bar dataKey="Consumo" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                    {equipmentRankingData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#06b6d4' : (index === 1 ? '#8b5cf6' : '#3b82f6')} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs font-mono">No hay datos para esta combinación de filtros</div>
            )}
          </div>
        </div>

        {/* Temperature vs consumption scatter */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="pb-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Thermometer className="h-4.5 w-4.5 text-amber-500" /> Correlación: Temperatura Exterior vs. Consumo Eléctrico
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Gráfico de dispersión. Muestra cómo la temperatura exterior influye en la potencia demandada (especialmente visible en climatización y refrigeración).
            </p>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis 
                  type="number" 
                  dataKey="temperature" 
                  name="Temperatura" 
                  unit="°C" 
                  stroke="#64748b" 
                  tickLine={false} 
                  style={{ fontSize: 10, fontFamily: 'monospace' }} 
                />
                <YAxis 
                  type="number" 
                  dataKey="consumption" 
                  name="Consumo" 
                  unit=" kWh" 
                  stroke="#64748b" 
                  tickLine={false} 
                  style={{ fontSize: 10, fontFamily: 'monospace' }} 
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: 8, color: '#f3f4f6' }}
                />
                <Scatter name="Puntos de Medición" data={scatterChartData} fill="#10b981" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
