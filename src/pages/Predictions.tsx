import React, { useMemo } from 'react';
import { EnergyRecord } from '../types/energy';
import { forecastNext7Days, getForecastChartData } from '../services/forecaster';
import { 
  Calendar, 
  ShieldAlert, 
  AlertTriangle, 
  TrendingUp, 
  Compass, 
  BookOpen 
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface PredictionsProps {
  records: EnergyRecord[];
}

export default function Predictions({ records }: PredictionsProps) {
  
  // Compute forecast and chart data
  const { forecast, chartData, totalPredictedKwh, totalPredictedCost, riskLevel, trendPct } = useMemo(() => {
    if (records.length === 0) {
      return { forecast: [], chartData: [], totalPredictedKwh: 0, totalPredictedCost: 0, riskLevel: 'bajo' as const, trendPct: 0 };
    }

    const forecastRes = forecastNext7Days(records);
    const chartRes = getForecastChartData(records, forecastRes);

    const totalPredKwh = forecastRes.reduce((sum, r) => sum + r.consumption_kwh, 0);
    const totalPredCost = forecastRes.reduce((sum, r) => sum + r.cost_estimated, 0);

    // Find worst risk level
    let risk: 'bajo' | 'medio' | 'alto' = 'bajo';
    if (forecastRes.some(r => r.risk_level === 'alto')) risk = 'alto';
    else if (forecastRes.some(r => r.risk_level === 'medio')) risk = 'medio';

    // Calculate growth trend between historical last week and prediction week
    const lastDateStr = Array.from(new Set(records.map(r => r.date))).sort().slice(-1)[0];
    const lastDate = new Date(`${lastDateStr}T00:00:00`);
    const last7DaysRecords = records.filter(r => {
      const diffTime = lastDate.getTime() - new Date(`${r.date}T00:00:00`).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < 7;
    });
    const last7Sum = last7DaysRecords.reduce((sum, r) => sum + r.consumption_kwh, 0);
    
    let growthTrend = 0;
    if (last7Sum > 0) {
      growthTrend = ((totalPredKwh - last7Sum) / last7Sum) * 100;
    }

    return {
      forecast: forecastRes,
      chartData: chartRes,
      totalPredictedKwh: totalPredKwh,
      totalPredictedCost: totalPredCost,
      riskLevel: risk,
      trendPct: parseFloat(growthTrend.toFixed(1))
    };
  }, [records]);

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
        <Calendar className="h-12 w-12 text-slate-600 animate-pulse" />
        <p className="mt-4">Active un set de datos para ver las predicciones.</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  const formatKwh = (val: number) => {
    return `${val.toLocaleString('es-AR', { maximumFractionDigits: 0 })} kWh`;
  };

  // Risk UI mappings
  const riskConfig = {
    alto: {
      text: 'Probabilidad Alta de Sobrecarga',
      color: 'text-rose-400 border-rose-950 bg-rose-950/20',
      icon: ShieldAlert,
      desc: 'El consumo proyectado muestra picos recurrentes superiores a la potencia contratada habitual. Se aconseja secuenciar operaciones.'
    },
    medio: {
      text: 'Desvío Moderado Proyectado',
      color: 'text-amber-400 border-amber-950 bg-amber-950/20',
      icon: AlertTriangle,
      desc: 'Incremento moderado asociado a picos térmicos o horas extra los fines de semana. Mantener vigilancia operativa.'
    },
    bajo: {
      text: 'Operación Proyectada Estable',
      color: 'text-emerald-400 border-emerald-950 bg-emerald-950/20',
      icon: Compass,
      desc: 'El consumo futuro de los próximos 7 días se sitúa dentro de la línea de base histórica. No se prevén desvíos.'
    }
  };

  const currentRisk = riskConfig[riskLevel];
  const RiskIcon = currentRisk.icon;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Predicción de Consumo (7 Días)</h2>
        <p className="text-slate-400 mt-1">
          Proyección del consumo y costo futuro aplicando modelos autorregresivos basados en historial y tendencia lineal.
        </p>
      </div>

      {/* Forecast Charts */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex justify-between items-center pb-2">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-cyan-400" /> Historial de Carga vs. Proyección Futura
          </h3>
          <span className="text-xxs text-slate-500 font-mono">kWh / DÍA</span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" tickLine={false} style={{ fontSize: 10, fontFamily: 'monospace' }} />
              <YAxis stroke="#64748b" tickLine={false} style={{ fontSize: 10, fontFamily: 'monospace' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: 8, color: '#f3f4f6' }}
                labelStyle={{ fontFamily: 'monospace' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
              
              {/* Envelope Shadow for margin of error */}
              <Area 
                name="Margen de Predicción" 
                type="monotone" 
                dataKey="upperBound" 
                stroke="none" 
                fill="#06b6d4" 
                fillOpacity={0.06} 
              />
              
              {/* Historical curve */}
              <Area 
                name="Consumo Histórico" 
                type="monotone" 
                dataKey="historical" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                fill="url(#colorHistory)" 
              />
              
              {/* Projected curve */}
              <Area 
                name="Consumo Proyectado" 
                type="monotone" 
                dataKey="predicted" 
                stroke="#06b6d4" 
                strokeWidth={2.5} 
                strokeDasharray="4 4"
                fill="url(#colorForecast)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KPI Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 flex flex-col justify-between">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Totales Proyectados (7d)</h4>
          
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-900">
              <span className="text-[10px] text-slate-500 font-mono uppercase">Energía Proyectada</span>
              <p className="text-2xl font-bold font-mono text-cyan-400 mt-1">{formatKwh(totalPredictedKwh)}</p>
              <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Tendencia: <strong className={trendPct > 0 ? 'text-rose-400' : 'text-emerald-400'}>{trendPct > 0 ? `+${trendPct}%` : `${trendPct}%`}</strong> vs semana anterior
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-900">
              <span className="text-[10px] text-slate-500 font-mono uppercase">Costo Estimado</span>
              <p className="text-2xl font-bold font-mono text-white mt-1">{formatCurrency(totalPredictedCost)}</p>
              <span className="text-[10px] text-slate-500 mt-1">Sujeto a tarifas reguladas básicas</span>
            </div>
          </div>

          <div className="text-slate-500 text-xxs leading-relaxed">
            * El modelo actual calcula predicciones mediante el peso estadístico del día de la semana y factores de tendencia lineal.
          </div>
        </div>

        {/* Risk Warning Panel */}
        <div className={`glass-panel p-6 rounded-2xl border flex flex-col justify-between ${currentRisk.color.split(' ')[0]} ${currentRisk.color.split(' ')[1]} ${currentRisk.color.split(' ')[2]}`}>
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-200">Evaluación de Riesgo</h4>
            
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850">
                <RiskIcon className="h-6 w-6" />
              </div>
              <h5 className="text-base font-extrabold text-white">{currentRisk.text}</h5>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed font-sans mt-3">
              {currentRisk.desc}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-900 text-xxs font-mono text-slate-400">
            Nivel: {riskLevel.toUpperCase()}  
            <br />Desviación Máxima Proyectada: +{(trendPct * 0.9).toFixed(1)}%
          </div>
        </div>

        {/* Preventative Recommendations */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <BookOpen className="h-4.5 w-4.5 text-cyan-400" /> Plan Preventivo (Próximos 7 días)
          </h4>
          
          <div className="space-y-3 pt-2">
            {forecast.slice(0, 3).map((day) => (
              <div key={day.date} className="p-3 rounded-xl bg-slate-900/50 border border-slate-900 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-mono">{day.date} ({new Date(`${day.date}T00:00:00`).toLocaleDateString('es-AR', {weekday:'short'})})</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    day.risk_level === 'alto' 
                      ? 'bg-rose-950/60 text-rose-400 border border-rose-900/40' 
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}>
                    Riesgo {day.risk_level}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {day.recommendations[0]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
