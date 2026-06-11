import React, { useMemo } from 'react';
import { 
  Zap, 
  DollarSign, 
  Activity, 
  Flame, 
  Cpu, 
  ShieldAlert, 
  Sparkles,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { EnergyRecord, Anomaly } from '../types/energy';
import MetricCard from '../components/MetricCard';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardProps {
  records: EnergyRecord[];
  anomalies: Anomaly[];
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ records, anomalies, setActiveTab }: DashboardProps) {
  
  // Calculate All Metrics using useMemo
  const metrics = useMemo(() => {
    if (records.length === 0) return null;

    const totalKwh = records.reduce((sum, r) => sum + r.consumption_kwh, 0);
    const costBase = records[0]?.cost_per_kwh || 45.0;
    const totalCost = totalKwh * costBase;

    // Days count
    const uniqueDates = Array.from(new Set(records.map(r => r.date))).sort();
    const daysCount = uniqueDates.length;
    const avgDailyKwh = totalKwh / (daysCount || 1);

    // Peak demand (highest hourly consumption of single equipment)
    let peakHourlyKwh = 0;
    records.forEach(r => {
      if (r.consumption_kwh > peakHourlyKwh) {
        peakHourlyKwh = r.consumption_kwh;
      }
    });

    // Top Consuming Sector and Equipment
    const sectorSums: Record<string, number> = {};
    const equipmentSums: Record<string, number> = {};
    
    records.forEach(r => {
      sectorSums[r.sector] = (sectorSums[r.sector] || 0) + r.consumption_kwh;
      equipmentSums[r.equipment] = (equipmentSums[r.equipment] || 0) + r.consumption_kwh;
    });

    const topSector = Object.entries(sectorSums).sort((a, b) => b[1] - a[1])[0];
    const topEquipment = Object.entries(equipmentSums).sort((a, b) => b[1] - a[1])[0];

    // Efficiency Score (nominal target 0.35 kWh/unit, comparing with actual)
    const totalProduction = records.reduce((sum, r) => sum + r.production_units, 0);
    let efficiencyScore = 85; // Default score
    if (totalProduction > 0) {
      // Calculate active production sectors consumption
      const prodSectorsKwh = records
        .filter(r => r.sector.includes('Industria') || r.equipment.includes('Línea'))
        .reduce((sum, r) => sum + r.consumption_kwh, 0);
      
      const kwhPerUnit = prodSectorsKwh / totalProduction;
      // Normal target is ~0.35. If kwhPerUnit is 0.35, score is 100. If higher, score decreases.
      const ratio = 0.35 / kwhPerUnit;
      efficiencyScore = Math.max(20, Math.min(100, Math.round(ratio * 100)));
    }

    const activeAnomaliesCount = anomalies.filter(a => !a.resolved).length;
    const potentialSavingsCost = totalCost * 0.15; // 15% potential saving

    // Chart 1: Daily consumption over time
    const dailyDataMap: Record<string, number> = {};
    records.forEach(r => {
      dailyDataMap[r.date] = (dailyDataMap[r.date] || 0) + r.consumption_kwh;
    });
    const dailyChartData = Object.entries(dailyDataMap).map(([date, kwh]) => ({
      date: date.substring(5), // MM-DD
      Consumo: parseFloat(kwh.toFixed(1))
    })).sort((a, b) => a.date.localeCompare(b.date)).slice(-15); // Show last 15 days for clean look

    // Chart 2: Sector share
    const COLORS = ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#64748b'];
    const sectorChartData = Object.entries(sectorSums).map(([name, kwh]) => ({
      name,
      value: parseFloat(kwh.toFixed(0))
    })).sort((a, b) => b.value - a.value);

    return {
      totalKwh,
      totalCost,
      avgDailyKwh,
      peakHourlyKwh,
      topSectorName: topSector ? topSector[0] : 'N/D',
      topEquipmentName: topEquipment ? topEquipment[0] : 'N/D',
      efficiencyScore,
      activeAnomaliesCount,
      potentialSavingsCost,
      dailyChartData,
      sectorChartData,
      COLORS
    };
  }, [records, anomalies]);

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 space-y-4">
        <Activity className="h-12 w-12 text-slate-600 animate-pulse" />
        <p>No se encontraron datos cargados. Cargá un dataset en la pestaña Carga de Datos.</p>
      </div>
    );
  }

  // Format helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  const formatKwh = (val: number) => {
    return `${val.toLocaleString('es-AR', { maximumFractionDigits: 0 })} kWh`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Monitoreo General</h2>
          <p className="text-slate-400 mt-1">
            Información en tiempo real y métricas clave de consumo para el sistema eléctrico de Tierra del Fuego.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-xl font-mono">
            Últimos {records.length > 0 ? Array.from(new Set(records.map(r => r.date))).length : 0} días
          </span>
          <button 
            onClick={() => setActiveTab('assistant')}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/20 hover:shadow-cyan-500/10 hover:translate-y-[-1px] transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 fill-slate-950" /> Consultar Asistente
          </button>
        </div>
      </div>

      {/* Metric Cards Grid (4x2 / 4x1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Consumo Total Acumulado"
          value={formatKwh(metrics.totalKwh)}
          icon={Zap}
          accentColor="cyan"
          description="Medición de medidor principal"
        />
        <MetricCard
          title="Costo Energético Estimado"
          value={formatCurrency(metrics.totalCost)}
          icon={DollarSign}
          accentColor="violet"
          description="Calculado sobre tarifa vigente"
        />
        <MetricCard
          title="Consumo Promedio Diario"
          value={formatKwh(metrics.avgDailyKwh)}
          icon={Activity}
          accentColor="cyan"
          description="Carga promedio constante"
        />
        <MetricCard
          title="Pico de Consumo Horario"
          value={`${metrics.peakHourlyKwh.toFixed(1)} kWh`}
          icon={Flame}
          accentColor="rose"
          description="Demanda instantánea máxima"
        />
        <MetricCard
          title="Mayor Consumidor"
          value={metrics.topEquipmentName}
          icon={Cpu}
          accentColor="amber"
          description={`Sector: ${metrics.topSectorName}`}
        />
        <MetricCard
          title="Eficiencia Energética"
          value={`${metrics.efficiencyScore}%`}
          icon={Sparkles}
          accentColor="emerald"
          trend={{ value: '8.4%', isGood: true }}
          description="Rendimiento de sectores fueguinos"
        />
        <MetricCard
          title="Anomalías Detectadas"
          value={metrics.activeAnomaliesCount}
          icon={ShieldAlert}
          accentColor={metrics.activeAnomaliesCount > 0 ? 'rose' : 'emerald'}
          description={metrics.activeAnomaliesCount > 0 ? 'Requieren intervención' : 'Operación estable'}
        />
        <MetricCard
          title="Ahorro Potencial Estimado"
          value={formatCurrency(metrics.potentialSavingsCost)}
          icon={TrendingDown}
          accentColor="emerald"
          description="Optimización factible (15%)"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Daily load curve */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-4">
            <h4 className="text-base font-bold text-white">Curva de Consumo Diario (Últimos 15 días)</h4>
            <span className="text-xxs text-slate-500 font-mono">kWh / DÍA</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tickLine={false} tickSize={8} style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" tickLine={false} style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: 8, color: '#f3f4f6', fontFamily: 'sans-serif' }}
                  labelStyle={{ fontFamily: 'monospace', color: '#94a3b8' }}
                />
                <Area type="monotone" dataKey="Consumo" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorConsumo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Consumption by sector */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="pb-4">
            <h4 className="text-base font-bold text-white">Consumo por Sector</h4>
          </div>
          <div className="h-60 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.sectorChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {metrics.sectorChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={metrics.COLORS[index % metrics.COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [value !== undefined ? `${value.toLocaleString()} kWh` : '', 'Consumo']}
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: 8, color: '#f3f4f6' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute text-center flex flex-col items-center">
              <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">Sectores</span>
              <span className="text-lg font-bold text-white font-mono mt-0.5">{metrics.sectorChartData.length}</span>
            </div>
          </div>
          {/* Custom legends */}
          <div className="grid grid-cols-2 gap-2 text-xxs font-medium text-slate-400 pt-2 border-t border-slate-900">
            {metrics.sectorChartData.slice(0, 4).map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1.5 truncate">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: metrics.COLORS[idx % metrics.COLORS.length] }}></span>
                <span className="truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Anomalies Ticker */}
      {metrics.activeAnomaliesCount > 0 && (
        <div className="glass-panel p-4 rounded-xl border border-rose-500/20 bg-rose-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/40">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">
                Atención: Se registran {metrics.activeAnomaliesCount} ineficiencias de consumo sin resolver.
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Detectado consumo no operativo los fines de semana y desvíos de rendimiento térmico o industrial.
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setActiveTab('anomalies')}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800/50 text-rose-300 hover:text-rose-100 transition-all shrink-0"
          >
            Inspeccionar Ineficiencias
          </button>
        </div>
      )}
    </div>
  );
}
