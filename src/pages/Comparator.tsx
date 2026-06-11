import React, { useMemo } from 'react';
import { EnergyRecord, EfficiencyMetrics, ShiftMetrics } from '../types/energy';
import { BarChart3, Zap, ShieldCheck, HelpCircle, Layers, Clock, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface ComparatorProps {
  records: EnergyRecord[];
}

export default function Comparator({ records }: ComparatorProps) {
  
  // Calculate Benchmarks using useMemo
  const benchmarks = useMemo(() => {
    if (records.length === 0) return null;

    const costBase = records[0]?.cost_per_kwh || 45.0;

    // 1. Sector efficiency (kWh per production unit)
    const sectorStats: Record<string, { kwh: number; units: number }> = {};
    records.forEach(r => {
      if (!sectorStats[r.sector]) {
        sectorStats[r.sector] = { kwh: 0, units: 0 };
      }
      sectorStats[r.sector].kwh += r.consumption_kwh;
      sectorStats[r.sector].units += r.production_units;
    });

    const sectorMetrics: EfficiencyMetrics[] = Object.entries(sectorStats).map(([name, val]) => {
      const kwh_per_unit = val.units > 0 ? (val.kwh / val.units) : 0;
      const total_cost = val.kwh * costBase;
      const cost_per_unit = val.units > 0 ? (total_cost / val.units) : 0;
      
      // Calculate efficiency score: arbitrary scaling relative to standard target
      // Target for production sector is 0.35 kWh/unit. Target for camera is temp dependent.
      // We score them out of 100. If no production units, we set score based on idle load.
      let efficiency_score: number;
      if (val.units > 0) {
        const ratio = 0.35 / kwh_per_unit;
        efficiency_score = Math.max(30, Math.min(100, Math.round(ratio * 100)));
      } else {
        // Services sectors: lighting, heating. Lower load = better score
        efficiency_score = val.kwh > 5000 ? 65 : 90;
      }

      return {
        name,
        kwh_per_unit: parseFloat(kwh_per_unit.toFixed(3)),
        cost_per_unit: parseFloat(cost_per_unit.toFixed(2)),
        total_kwh: parseFloat(val.kwh.toFixed(0)),
        total_units: val.units,
        total_cost: parseFloat(total_cost.toFixed(0)),
        efficiency_score
      };
    });

    // 2. Equipment Rankings
    const equipmentStats: Record<string, { kwh: number; sector: string }> = {};
    records.forEach(r => {
      if (!equipmentStats[r.equipment]) {
        equipmentStats[r.equipment] = { kwh: 0, sector: r.sector };
      }
      equipmentStats[r.equipment].kwh += r.consumption_kwh;
    });

    const equipmentRanking = Object.entries(equipmentStats).map(([name, val]) => ({
      name,
      sector: val.sector,
      kwh: parseFloat(val.kwh.toFixed(0)),
      cost: parseFloat((val.kwh * costBase).toFixed(0))
    })).sort((a, b) => b.kwh - a.kwh);

    // 3. Shift Metrics
    const shiftStats: Record<'Mañana' | 'Tarde' | 'Noche', { kwh: number; units: number; hours: number }> = {
      'Mañana': { kwh: 0, units: 0, hours: 0 },
      'Tarde': { kwh: 0, units: 0, hours: 0 },
      'Noche': { kwh: 0, units: 0, hours: 0 }
    };

    records.forEach(r => {
      if (shiftStats[r.shift]) {
        shiftStats[r.shift].kwh += r.consumption_kwh;
        shiftStats[r.shift].units += r.production_units;
        shiftStats[r.shift].hours += 1;
      }
    });

    const shiftMetrics: ShiftMetrics[] = (Object.keys(shiftStats) as Array<'Mañana' | 'Tarde' | 'Noche'>).map(shift => {
      const val = shiftStats[shift];
      const kwh_per_unit = val.units > 0 ? (val.kwh / val.units) : 0;
      return {
        shift,
        total_kwh: parseFloat(val.kwh.toFixed(0)),
        total_units: val.units,
        kwh_per_unit: parseFloat(kwh_per_unit.toFixed(3)),
        total_cost: parseFloat((val.kwh * costBase).toFixed(0)),
        hours_measured: val.hours
      };
    });

    return {
      sectors: sectorMetrics,
      equipments: equipmentRanking,
      shifts: shiftMetrics
    };
  }, [records]);

  if (!benchmarks) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
        <BarChart3 className="h-12 w-12 text-slate-600 animate-pulse" />
        <p className="mt-4">Se requieren datos cargados para efectuar comparaciones.</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  const formatKwh = (val: number) => {
    return `${val.toLocaleString('es-AR', { maximumFractionDigits: 0 })} kWh`;
  };

  // Find most and least efficient sectors
  const productionSectors = benchmarks.sectors.filter(s => s.total_units > 0);
  const mostEfficientSector = [...productionSectors].sort((a, b) => a.kwh_per_unit - b.kwh_per_unit)[0];
  const leastEfficientSector = [...productionSectors].sort((a, b) => b.kwh_per_unit - a.kwh_per_unit)[0];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Comparador de Eficiencia</h2>
        <p className="text-slate-400 mt-1">
          Auditoría comparativa y rankings de rendimiento por sectores, maquinarias industriales y turnos.
        </p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Most efficient */}
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/40">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-mono uppercase">Sector Líder en Eficiencia</span>
            <h5 className="text-base font-bold text-white mt-1">{mostEfficientSector ? mostEfficientSector.name : 'N/D'}</h5>
            <p className="text-xs text-emerald-400 font-mono mt-1">
              {mostEfficientSector ? `${mostEfficientSector.kwh_per_unit.toFixed(3)} kWh por unidad` : ''}
            </p>
          </div>
        </div>

        {/* Least efficient */}
        <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 bg-rose-950/10 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/40">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-mono uppercase">Mayor Oportunidad de Mejora</span>
            <h5 className="text-base font-bold text-white mt-1">{leastEfficientSector ? leastEfficientSector.name : 'N/D'}</h5>
            <p className="text-xs text-rose-400 font-mono mt-1">
              {leastEfficientSector ? `${leastEfficientSector.kwh_per_unit.toFixed(3)} kWh por unidad` : ''}
            </p>
          </div>
        </div>

        {/* Cost distribution note */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-slate-950 text-cyan-400 border border-slate-800">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-mono uppercase">Potencial de Ahorro Neto</span>
            <h5 className="text-base font-bold text-white mt-1">Auditoría Operativa</h5>
            <p className="text-xs text-slate-400 mt-1">
              Equilibrar el consumo nocturno reduce la potencia facturada en un 12%.
            </p>
          </div>
        </div>
      </div>

      {/* Main Benchmarks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Sector Table */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" /> Comparativo por Sectores
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 font-mono uppercase">
                  <th className="pb-3 font-semibold">Sector</th>
                  <th className="pb-3 text-right font-semibold">Consumo Total</th>
                  <th className="pb-3 text-right font-semibold">Rendimiento (kWh/u)</th>
                  <th className="pb-3 text-right font-semibold">Costo/Unidad</th>
                  <th className="pb-3 text-right font-semibold">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {benchmarks.sectors.map((s) => (
                  <tr key={s.name} className="hover:bg-slate-900/20 text-slate-300 font-medium">
                    <td className="py-3.5 font-sans font-bold text-slate-100">{s.name}</td>
                    <td className="py-3.5 text-right font-mono">{formatKwh(s.total_kwh)}</td>
                    <td className="py-3.5 text-right font-mono text-cyan-400">
                      {s.total_units > 0 ? `${s.kwh_per_unit.toFixed(3)}` : 'N/D'}
                    </td>
                    <td className="py-3.5 text-right font-mono">
                      {s.total_units > 0 ? formatCurrency(s.cost_per_unit) : 'N/D'}
                    </td>
                    <td className="py-3.5 text-right">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                        s.efficiency_score >= 85 
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40' 
                          : s.efficiency_score >= 70 
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-900/40' 
                            : 'bg-rose-950/60 text-rose-400 border border-rose-900/40'
                      }`}>
                        {s.efficiency_score}/100
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shift efficiency chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-400" /> Rendimiento Técnico por Turno
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Comparativo de kWh necesarios para producir una unidad por turno de trabajo.
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={benchmarks.shifts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="shift" stroke="#64748b" tickLine={false} style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" tickLine={false} style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip 
                  formatter={(value) => [`${value} kWh/unidad`, 'Consumo Unitario']}
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: 8, color: '#f3f4f6' }}
                />
                <Bar dataKey="kwh_per_unit" fill="#06b6d4" name="Consumo Unitario" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-900 grid grid-cols-3 gap-2 text-center text-[10px] font-mono text-slate-400 mt-4">
            {benchmarks.shifts.map(s => (
              <div key={s.shift} className="space-y-1">
                <span className="text-slate-500 uppercase">{s.shift}</span>
                <p className="font-bold text-white">{s.kwh_per_unit.toFixed(3)} kWh/u</p>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment Rankings */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-400" /> Top de Maquinarias con Mayor Consumo
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benchmarks.equipments.slice(0, 6).map((eq, index) => (
              <div key={eq.name} className="p-4 rounded-xl bg-slate-950 border border-slate-900 flex justify-between items-center hover:border-slate-800 transition-all">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500">{index + 1}.</span>
                    <span className="text-sm font-bold text-slate-100">{eq.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Sector: {eq.sector}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold font-mono text-cyan-400">{formatKwh(eq.kwh)}</p>
                  <p className="text-[10px] font-mono text-slate-500">{formatCurrency(eq.cost)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
