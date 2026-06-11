import React, { useState, useMemo } from 'react';
import { EnergyRecord } from '../types/energy';
import { Calculator, Leaf, Trees, DollarSign, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Cell
} from 'recharts';

interface SavingsSimulatorProps {
  records: EnergyRecord[];
}

export default function SavingsSimulator({ records }: SavingsSimulatorProps) {
  
  // Calculate defaults from active dataset
  const defaults = useMemo(() => {
    if (records.length === 0) {
      return { kwh: 12500, cost: 45.0 };
    }
    
    // Monthly average
    const totalKwh = records.reduce((sum, r) => sum + r.consumption_kwh, 0);
    const uniqueDates = Array.from(new Set(records.map(r => r.date)));
    const monthsCount = Math.max(1, uniqueDates.length / 30);
    const monthlyAvgKwh = Math.round(totalKwh / monthsCount);
    
    const rate = records[0]?.cost_per_kwh || 45.0;

    return {
      kwh: monthlyAvgKwh,
      cost: rate
    };
  }, [records]);

  // Sliders state
  const [monthlyKwh, setMonthlyKwh] = useState<number>(defaults.kwh);
  const [ratePerKwh, setRatePerKwh] = useState<number>(defaults.cost);
  const [reductionPct, setReductionPct] = useState<number>(12); // Default 12%
  const [monthsCount, setMonthsCount] = useState<number>(12); // Default 12 months

  // Recalculate if active dataset changes
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    setMonthlyKwh(defaults.kwh);
    setRatePerKwh(defaults.cost);
  }, [defaults]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Calculations
  const calc = useMemo(() => {
    const currentBill = monthlyKwh * ratePerKwh;
    
    const monthlySavedKwh = monthlyKwh * (reductionPct / 100);
    const monthlySavedCost = currentBill * (reductionPct / 100);

    const projectedBill = currentBill - monthlySavedCost;

    const accumulatedSavedKwh = monthlySavedKwh * monthsCount;
    const accumulatedSavedCost = monthlySavedCost * monthsCount;

    const annualSavedKwh = monthlySavedKwh * 12;
    const annualSavedCost = monthlySavedCost * 12;

    // Environmental Impact
    // Argentine grid emissions factor ~ 0.4 kg CO2 per kWh
    const co2SavedKg = accumulatedSavedKwh * 0.4;
    // One mature tree absorbs ~20 kg CO2 per year
    const equivalentTrees = co2SavedKg / 20;

    // Before/After Chart Data
    const beforeAfterData = [
      { name: 'Factura Actual', Costo: Math.round(currentBill) },
      { name: 'Factura Optimizada', Costo: Math.round(projectedBill) }
    ];

    // Cumulative savings chart data
    const cumulativeChartData = [];
    let runningSum = 0;
    for (let m = 1; m <= monthsCount; m++) {
      runningSum += monthlySavedCost;
      cumulativeChartData.push({
        Mes: `Mes ${m}`,
        Ahorro: Math.round(runningSum)
      });
    }

    return {
      currentBill,
      projectedBill,
      monthlySavedKwh,
      monthlySavedCost,
      accumulatedSavedKwh,
      accumulatedSavedCost,
      annualSavedKwh,
      annualSavedCost,
      co2SavedKg,
      equivalentTrees,
      beforeAfterData,
      cumulativeChartData
    };
  }, [monthlyKwh, ratePerKwh, reductionPct, monthsCount]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  const formatKwh = (val: number) => {
    return `${Math.round(val).toLocaleString('es-AR')} kWh`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Simulador de Ahorro</h2>
        <p className="text-slate-400 mt-1">
          Ajuste los parámetros para proyectar el retorno de inversión y el impacto ecológico de las medidas de eficiencia.
        </p>
      </div>

      {/* Simulator Inputs & ROI Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sliders Control Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 lg:col-span-1">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="h-5 w-5 text-cyan-400" /> Parámetros del Proyecto
          </h3>

          {/* Consumption Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">CONSUMO MENSUAL</span>
              <span className="text-cyan-400 font-bold">{formatKwh(monthlyKwh)}</span>
            </div>
            <input
              type="range"
              min={1000}
              max={150000}
              step={500}
              value={monthlyKwh}
              onChange={(e) => setMonthlyKwh(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono">
              <span>1k kWh</span>
              <span>150k kWh</span>
            </div>
          </div>

          {/* Tariff Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">TARIFA POR kWh</span>
              <span className="text-cyan-400 font-bold">{formatCurrency(ratePerKwh)}</span>
            </div>
            <input
              type="range"
              min={10}
              max={150}
              step={1}
              value={ratePerKwh}
              onChange={(e) => setRatePerKwh(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono">
              <span>AR$ 10</span>
              <span>AR$ 150</span>
            </div>
          </div>

          {/* Target reduction % Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">OBJETIVO DE REDUCCIÓN</span>
              <span className="text-emerald-400 font-bold">{reductionPct}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={reductionPct}
              onChange={(e) => setReductionPct(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono">
              <span>1% (Básico)</span>
              <span>50% (Teórico)</span>
            </div>
          </div>

          {/* Period months Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">PLAZO DE EVALUACIÓN</span>
              <span className="text-violet-400 font-bold">{monthsCount} Meses</span>
            </div>
            <input
              type="range"
              min={1}
              max={24}
              step={1}
              value={monthsCount}
              onChange={(e) => setMonthsCount(parseInt(e.target.value, 10))}
              className="w-full accent-violet-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono">
              <span>1 Mes</span>
              <span>2 Años</span>
            </div>
          </div>
        </div>

        {/* Projections & Carbon footprint */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Calculation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Economic Saving */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-start gap-4">
              <div className="p-3.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Ahorro Mensual Estimado</span>
                <h4 className="text-2xl font-bold font-mono text-white">{formatCurrency(calc.monthlySavedCost)}</h4>
                <p className="text-xxs text-slate-400">
                  Equivalente a <strong className="text-slate-200">{formatKwh(calc.monthlySavedKwh)}</strong> no consumidos
                </p>
              </div>
            </div>

            {/* Accumulated saving */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-start gap-4">
              <div className="p-3.5 rounded-xl bg-violet-950 text-violet-400 border border-violet-800/40">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Acumulado a {monthsCount} meses</span>
                <h4 className="text-2xl font-bold font-mono text-cyan-400">{formatCurrency(calc.accumulatedSavedCost)}</h4>
                <p className="text-xxs text-slate-400">
                  Total de energía evitada: <strong className="text-slate-200 font-mono">{formatKwh(calc.accumulatedSavedKwh)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Environmental Equivalents */}
          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/5 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/40 shrink-0">
                <Leaf className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase">Huella de CO2 Evitada</span>
                <h5 className="text-lg font-bold text-white mt-0.5 font-mono">
                  {(calc.co2SavedKg / 1000).toFixed(2)} toneladas
                </h5>
                <p className="text-xxs text-slate-400 mt-0.5">Emisiones de gases de efecto invernadero reducidas.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/40 shrink-0">
                <Trees className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase">Equivalente de Reforestación</span>
                <h5 className="text-lg font-bold text-white mt-0.5 font-mono">
                  {Math.round(calc.equivalentTrees).toLocaleString()} Árboles
                </h5>
                <p className="text-xxs text-slate-400 mt-0.5">Árboles maduros absorbiendo carbono durante un año completo.</p>
              </div>
            </div>
          </div>

          {/* Savings Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            
            {/* Before / After */}
            <div className="md:col-span-2 glass-panel p-4 rounded-xl border border-slate-900 flex flex-col justify-between">
              <span className="text-xxs text-slate-500 font-mono uppercase block pb-3">Comparativo de Facturación</span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calc.beforeAfterData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tickLine={false} style={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" tickLine={false} style={{ fontSize: 9 }} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Costo']} />
                    <Bar dataKey="Costo" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={35}>
                      <Cell fill="#f43f5e" />
                      <Cell fill="#10b981" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cumulative Line */}
            <div className="md:col-span-3 glass-panel p-4 rounded-xl border border-slate-900 flex flex-col justify-between">
              <span className="text-xxs text-slate-500 font-mono uppercase block pb-3">Evolución de Ahorro Acumulado</span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calc.cumulativeChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorSimulator" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="Mes" stroke="#64748b" tickLine={false} style={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" tickLine={false} style={{ fontSize: 9 }} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Ahorro Acumulado']} />
                    <Area type="monotone" dataKey="Ahorro" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSimulator)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
