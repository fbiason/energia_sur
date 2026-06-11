import React, { useState, useMemo } from 'react';
import { EnergyRecord } from '../types/energy';
import { 
  Calculator, 
  Leaf, 
  Trees, 
  Calendar, 
  ShieldAlert, 
  FileText, 
  Copy,
  Check,
  Zap,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
      return { kwh: 24500, cost: 65.0 };
    }
    
    // Monthly average
    const totalKwh = records.reduce((sum, r) => sum + r.consumption_kwh, 0);
    const uniqueDates = Array.from(new Set(records.map(r => r.date)));
    const monthsCount = Math.max(1, uniqueDates.length / 30);
    const monthlyAvgKwh = Math.round(totalKwh / monthsCount);
    
    const rate = records[0]?.cost_per_kwh || 65.0;

    return {
      kwh: monthlyAvgKwh,
      cost: rate
    };
  }, [records]);

  // Sliders state
  const [monthlyKwh, setMonthlyKwh] = useState<number>(defaults.kwh);
  const [baseTariff, setBaseTariff] = useState<number>(defaults.cost); // Subsidized tariff
  const [currentSubsidyPct, setCurrentSubsidyPct] = useState<number>(70); // Default 70% subsidy rate
  const [showReport, setShowReport] = useState<boolean>(false);
  const [reportCopied, setReportCopied] = useState<boolean>(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMonthlyKwh(defaults.kwh);
    setBaseTariff(defaults.cost);
  }, [defaults]);

  // Helper formatters
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  const formatKwh = (val: number) => {
    return `${Math.round(val).toLocaleString('es-AR')} kWh`;
  };

  // Calculations for all scenarios
  // Subsidized Tariff = Real Cost * (1 - Subsidy Rate)
  // Real Cost = Subsidized Tariff / (1 - Subsidy Rate)
  const realCostPerKwh = useMemo(() => {
    const rateFraction = currentSubsidyPct / 100;
    if (rateFraction >= 1) return baseTariff;
    return baseTariff / (1 - rateFraction);
  }, [baseTariff, currentSubsidyPct]);

  const scenarios = useMemo(() => {
    const baseBill = monthlyKwh * baseTariff;
    const cuts = [0, 25, 50, 75, 100]; // % quita de subsidio
    
    return cuts.map(cut => {
      // New subsidy percentage remaining
      const subsidyFraction = (currentSubsidyPct / 100) * (1 - cut / 100);
      const newTariff = realCostPerKwh * (1 - subsidyFraction);
      const monthlyBill = monthlyKwh * newTariff;
      const monthlyImpact = monthlyBill - baseBill;
      const annualImpact = monthlyImpact * 12;
      const pctIncrease = ((newTariff - baseTariff) / baseTariff) * 100;

      // Risk assessment
      let riskLevel: 'Bajo' | 'Medio' | 'Alto' | 'Crítico' = 'Bajo';
      let riskColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-900/30';
      if (cut === 100) {
        riskLevel = 'Crítico';
        riskColor = 'text-red-400 bg-red-950/40 border-red-900/30';
      } else if (cut === 75) {
        riskLevel = 'Alto';
        riskColor = 'text-orange-400 bg-orange-950/40 border-orange-900/30';
      } else if (cut === 50) {
        riskLevel = 'Medio';
        riskColor = 'text-amber-400 bg-amber-950/40 border-amber-900/30';
      }

      return {
        cut,
        newTariff: parseFloat(newTariff.toFixed(2)),
        monthlyBill: Math.round(monthlyBill),
        monthlyImpact: Math.round(monthlyImpact),
        annualImpact: Math.round(annualImpact),
        pctIncrease: parseFloat(pctIncrease.toFixed(1)),
        riskLevel,
        riskColor
      };
    });
  }, [monthlyKwh, baseTariff, realCostPerKwh, currentSubsidyPct]);

  // Chart Data: Compare Monthly Cost
  const chartDataBar = useMemo(() => {
    return scenarios.map(s => ({
      name: s.cut === 0 ? 'Actual' : `Quita ${s.cut}%`,
      'Costo Mensual': s.monthlyBill,
      'Impacto Extra': s.monthlyImpact
    }));
  }, [scenarios]);

  // Chart Data: Cumulative Annual Cost (12 months)
  const chartDataArea = useMemo(() => {
    const months = ['Mes 1', 'Mes 3', 'Mes 6', 'Mes 9', 'Mes 12'];
    const multipliers = [1, 3, 6, 9, 12];
    
    return multipliers.map((mult, idx) => {
      const point: Record<string, string | number> = { Mes: months[idx] };
      scenarios.forEach(s => {
        const key = s.cut === 0 ? 'Actual' : `Quita ${s.cut}%`;
        point[key] = Math.round(s.monthlyBill * mult);
      });
      return point;
    });
  }, [scenarios]);

  // Environmental Impact
  // Tierra del Fuego's isolated electrical grid operates mostly on natural gas thermal turbines.
  // Emission factor estimated at ~ 0.37 kg CO2 per kWh
  const environmentalImpact = useMemo(() => {
    const monthlyCo2Kg = monthlyKwh * 0.37;
    const annualCo2Kg = monthlyCo2Kg * 12;
    const annualCo2Tons = annualCo2Kg / 1000;
    
    // One mature tree absorbs ~20 kg CO2 per year
    const treesRequired = annualCo2Kg / 20;

    // Potential savings estimations (10%, 15%, 25% efficiency improvements)
    const savings = [10, 15, 25].map(pct => {
      const savedKwh = monthlyKwh * (pct / 100);
      const savedCo2Kg = savedKwh * 0.37 * 12;
      return {
        pct,
        savedKwh,
        savedCo2Tons: parseFloat((savedCo2Kg / 1000).toFixed(1)),
        savedTrees: Math.round(savedCo2Kg / 20)
      };
    });

    return {
      monthlyCo2Kg,
      annualCo2Tons,
      treesRequired,
      savings
    };
  }, [monthlyKwh]);

  // Explanatory Markdown Report Generator
  const reportContent = useMemo(() => {
    const dateStr = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });

    return `# REPORTE DE PROSPECTIVA ENERGÉTICA Y SIMULACIÓN DE ESCENARIOS
**Plataforma EnergIA SUR - Tierra del Fuego**
*Fecha de Emisión: ${dateStr}*
*Sistema Eléctrico Analizado: Aislado Provincial (Termoeléctrico Natural Gas)*

---

## 1. RESUMEN EJECUTIVO
El presente informe evalúa el impacto financiero y de sostenibilidad ambiental sobre un consumo base mensual de **${formatKwh(monthlyKwh)}** en Tierra del Fuego, ante una reestructuración de subsidios y variaciones de tarifas. 
Dado que la provincia depende en su totalidad de la generación termoeléctrica local alimentada por gas natural (DPE en Ushuaia y Cooperativa Eléctrica en Río Grande), los incrementos de tarifas representan un factor crítico de riesgo financiero y viabilidad para industrias de la Ley 19.640, comercios y reparticiones públicas.

## 2. ANÁLISIS COMPARATIVO DE ESCENARIOS
El costo de generación real se estima en **${formatCurrency(realCostPerKwh)} por kWh** (basado en un subsidio actual del ${currentSubsidyPct}% sobre la tarifa de ${formatCurrency(baseTariff)}/kWh). Ante posibles quitas de subsidios, se proyectan los siguientes impactos:

- **Escenario Actual (0% Quita):** Factura de **${formatCurrency(scenarios[0].monthlyBill)}/mes**. Riesgo: Bajo.
- **Quita del 25%:** Factura de **${formatCurrency(scenarios[1].monthlyBill)}/mes** (+${scenarios[1].pctIncrease}% de aumento). Costo extra anual: **${formatCurrency(scenarios[1].annualImpact)}**. Riesgo: Bajo.
- **Quita del 50%:** Factura de **${formatCurrency(scenarios[2].monthlyBill)}/mes** (+${scenarios[2].pctIncrease}% de aumento). Costo extra anual: **${formatCurrency(scenarios[2].annualImpact)}**. Riesgo: Medio.
- **Quita del 75%:** Factura de **${formatCurrency(scenarios[3].monthlyBill)}/mes** (+${scenarios[3].pctIncrease}% de aumento). Costo extra anual: **${formatCurrency(scenarios[3].annualImpact)}**. Riesgo: Alto.
- **Eliminación Total (100% Quita):** Factura de **${formatCurrency(scenarios[4].monthlyBill)}/mes** (+${scenarios[4].pctIncrease}% de aumento). Costo extra anual: **${formatCurrency(scenarios[4].annualImpact)}**. Riesgo: Crítico.

## 3. IMPACTO AMBIENTAL ESTIMADO
La generación en la isla produce un promedio de **0.37 kg CO2 por kWh**. 
- **Huella de Carbono Actual:** ${(environmentalImpact.annualCo2Tons).toFixed(1)} toneladas de CO2 al año.
- **Compensación Equivalente:** Se requiere la plantación de **${Math.round(environmentalImpact.treesRequired).toLocaleString('es-AR')} árboles** maduros para absorber estas emisiones anualmente.

Implementando medidas de eficiencia para reducir el consumo se proyectan los siguientes beneficios ecológicos anuales:
- **Reducción del 10%:** Ahorro de **${(environmentalImpact.savings[0].savedCo2Tons)} ton CO2** (Equivale a ${environmentalImpact.savings[0].savedTrees} árboles).
- **Reducción del 15%:** Ahorro de **${(environmentalImpact.savings[1].savedCo2Tons)} ton CO2** (Equivale a ${environmentalImpact.savings[1].savedTrees} árboles).
- **Reducción del 25%:** Ahorro de **${(environmentalImpact.savings[2].savedCo2Tons)} ton CO2** (Equivale a ${environmentalImpact.savings[2].savedTrees} árboles).

## 4. RECOMENDACIONES DE EFICIENCIA ENERGÉTICA FUEGUINA
1. **Evitar Calefacción Eléctrica de Soporte:** El consumo de radiadores eléctricos es altamente ineficiente en comparación con los sistemas a gas. Restringir su uso en dependencias públicas y comercios.
2. **Desplazamiento del Consumo Industrial:** Para los establecimientos industriales en Río Grande, coordinar con la Cooperativa Eléctrica para modular la potencia en la banda de pico provincial (18:00 a 22:00 hs) para evitar recargos tarifarios elevados.
3. **Eficiencia en Cámaras de Congelado (Pesca):** Mantener el aislamiento en portones y verificar burletes, ya que el choque de aire frío/húmedo aumenta el consumo del compresor de congelado en un 38%.
4. **Apagados Inteligentes:** Configurar relés de tiempo y sistemas de control para luces y servidores los fines de semana en administración pública.
`;
  }, [monthlyKwh, baseTariff, currentSubsidyPct, realCostPerKwh, scenarios, environmentalImpact]);

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportContent);
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 2000);
    } catch (err) {
      console.error('No se pudo copiar: ', err);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Prospectiva Tarifaria & Escenarios</h2>
          <p className="text-slate-400 mt-1">
            Simulador avanzado para anticipar el impacto financiero de la quita de subsidios eléctricos en la provincia de Tierra del Fuego.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xxs font-mono text-slate-400">
          <Zap className="h-3.5 w-3.5 text-cyan-400 fill-cyan-400" />
          SISTEMA AISLADO TDF
        </div>
      </div>

      {/* Simulator Inputs & ROI Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sliders Control Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 lg:col-span-1">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="h-5 w-5 text-cyan-400" /> Configuración de Escenario
          </h3>

          {/* Consumption Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">CONSUMO MENSUAL</span>
              <span className="text-cyan-400 font-bold">{formatKwh(monthlyKwh)}</span>
            </div>
            <input
              type="range"
              min={500}
              max={150000}
              step={500}
              value={monthlyKwh}
              onChange={(e) => setMonthlyKwh(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono">
              <span>500 kWh</span>
              <span>150k kWh</span>
            </div>
          </div>

          {/* Base Subsidized Tariff Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">TARIFA SUBSIDIADA ACTUAL</span>
              <span className="text-cyan-400 font-bold">{formatCurrency(baseTariff)} / kWh</span>
            </div>
            <input
              type="range"
              min={15}
              max={250}
              step={1}
              value={baseTariff}
              onChange={(e) => setBaseTariff(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono">
              <span>AR$ 15</span>
              <span>AR$ 250</span>
            </div>
          </div>

          {/* Current Subsidy Percentage Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">SUBSIDIO ACTUAL EN FACTURA</span>
              <span className="text-emerald-400 font-bold">{currentSubsidyPct}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={95}
              step={5}
              value={currentSubsidyPct}
              onChange={(e) => setCurrentSubsidyPct(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono">
              <span>10% (Bajo)</span>
              <span>95% (Crítico)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-900 space-y-2">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">Costo de Generación Real</span>
            <div className="flex justify-between items-baseline">
              <span className="text-base font-bold text-white font-mono">{formatCurrency(realCostPerKwh)}</span>
              <span className="text-slate-500 text-xxs font-mono">por kWh</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Calculado como el costo real sin subsidio. En Tierra del Fuego, este costo refleja la generación termoeléctrica local.
            </p>
          </div>
        </div>

        {/* Projections Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Calculation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Impact of Total Elimination */}
            <div className="glass-panel p-5 rounded-2xl border border-red-500/20 bg-red-950/5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-red-950/60 text-red-400 border border-red-800/40 shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Impacto Mensual (100% Quita)</span>
                <h4 className="text-xl font-bold font-mono text-white">+{formatCurrency(scenarios[4].monthlyImpact)}</h4>
                <p className="text-xxs text-slate-400">
                  La factura mensual pasaría a ser de <strong className="text-red-400 font-mono">{formatCurrency(scenarios[4].monthlyBill)}</strong>
                </p>
              </div>
            </div>

            {/* Annual Extra Cost */}
            <div className="glass-panel p-5 rounded-2xl border border-orange-500/20 bg-orange-950/5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-orange-950/60 text-orange-400 border border-orange-800/40 shrink-0">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Incremento Anual Proyectado</span>
                <h4 className="text-xl font-bold font-mono text-orange-400">+{formatCurrency(scenarios[4].annualImpact)}</h4>
                <p className="text-xxs text-slate-400">
                  Porcentaje de aumento tarifario total: <strong className="text-white">{scenarios[4].pctIncrease}%</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Tabla Comparativa de Escenarios</h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-mono uppercase">
                    <th className="pb-3 font-semibold">Quita de Subsidio</th>
                    <th className="pb-3 text-right font-semibold">Tarifa / kWh</th>
                    <th className="pb-3 text-right font-semibold">Factura Mensual</th>
                    <th className="pb-3 text-right font-semibold">Incremento Extra</th>
                    <th className="pb-3 text-right font-semibold">% Aumento</th>
                    <th className="pb-3 text-right font-semibold">Riesgo Financiero</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-mono">
                  {scenarios.map((s) => (
                    <tr key={s.cut} className="hover:bg-slate-900/20 text-slate-300">
                      <td className="py-3 font-sans font-bold text-slate-100">{s.cut === 0 ? 'Sin Quita (Actual)' : `Quita del ${s.cut}%`}</td>
                      <td className="py-3 text-right">{formatCurrency(s.newTariff)}</td>
                      <td className="py-3 text-right font-bold text-white">{formatCurrency(s.monthlyBill)}</td>
                      <td className="py-3 text-right text-slate-400">+{formatCurrency(s.monthlyImpact)}</td>
                      <td className="py-3 text-right text-cyan-400">+{s.pctIncrease}%</td>
                      <td className="py-3 text-right font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${s.riskColor}`}>
                          {s.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly comparison chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="pb-4">
            <h4 className="text-base font-bold text-white">Comparativa de Factura Mensual por Escenario</h4>
            <p className="text-xs text-slate-500 mt-1">Suma del costo base subsidiado más el impacto extra proyectado.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataBar} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tickLine={false} style={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tickLine={false} style={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Costo']}
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: 8, color: '#f3f4f6' }}
                />
                <Legend style={{ fontSize: 11 }} />
                <Bar dataKey="Costo Mensual" fill="#06b6d4" name="Factura Resultante" radius={[4, 4, 0, 0]} maxBarSize={45}>
                  {chartDataBar.map((entry, index) => {
                    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#f43f5e'];
                    return <Cell key={`cell-${index}`} fill={colors[index]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative area chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="pb-4">
            <h4 className="text-base font-bold text-white">Proyección de Gasto Acumulado (12 Meses)</h4>
            <p className="text-xs text-slate-500 mt-1">Evolución acumulativa del gasto eléctrico en cada escenario temporal.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataArea} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="Mes" stroke="#64748b" tickLine={false} style={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tickLine={false} style={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Gasto Acumulado']}
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: 8, color: '#f3f4f6' }}
                />
                <Legend style={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={2} fillOpacity={0.03} fill="#10b981" />
                <Area type="monotone" dataKey="Quita 50%" stroke="#f59e0b" strokeWidth={2} fillOpacity={0.03} fill="#f59e0b" />
                <Area type="monotone" dataKey="Quita 100%" stroke="#f43f5e" strokeWidth={2} fillOpacity={0.03} fill="#f43f5e" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Environmental Impact & Savings Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Environmental Footprint Card */}
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/5 space-y-6 lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Leaf className="h-4.5 w-4.5 text-emerald-400" /> Huella Ecológica (Generación TDF)
            </h4>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Tierra del Fuego opera como una isla eléctrica dependiente de la quema de gas natural local. Cada kWh consumido tiene un impacto ecológico directo.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-900 space-y-3">
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase">Huella de CO2 Anual</span>
                <h5 className="text-lg font-bold text-white mt-0.5 font-mono">
                  {environmentalImpact.annualCo2Tons.toFixed(1)} Toneladas CO2
                </h5>
              </div>
              <div className="flex items-center gap-2 text-xxs text-emerald-400 font-mono">
                <Trees className="h-4.5 w-4.5" />
                Equivale a reforestar con {Math.round(environmentalImpact.treesRequired).toLocaleString()} árboles.
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-900/60 text-xxs text-slate-500 font-mono">
            * Emisiones estimadas con un coeficiente de 0.37 kg CO2/kWh.
          </div>
        </div>

        {/* Efficiency Potentials */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5 lg:col-span-1">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Proyección de Ahorro y Compensación</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Reduciendo consumos eléctricos mediante planes de eficiencia estimamos las siguientes compensaciones ambientales anuales:
          </p>

          <div className="space-y-3 font-mono">
            {environmentalImpact.savings.map(s => (
              <div key={s.pct} className="p-3 rounded-xl bg-slate-950 border border-slate-900 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-white">Objetivo {s.pct}%</span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Evita consumo ineficiente</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-400">-{s.savedCo2Tons} t CO2</p>
                  <p className="text-[9px] text-slate-500">-{s.savedTrees} árboles req.</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Savings recommendations */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 lg:col-span-1">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-cyan-400" /> Recomendaciones Estratégicas
          </h4>
          
          <ul className="space-y-3.5 text-xs text-slate-400 leading-relaxed">
            <li className="flex gap-2 items-start">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5"></span>
              <div>
                <strong className="text-slate-200 block">Soporte Calefacción:</strong>
                Priorizar calefacción por calderas a gas. Evitar estufas y radiadores eléctricos que disparan la factura.
              </div>
            </li>
            <li className="flex gap-2 items-start">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5"></span>
              <div>
                <strong className="text-slate-200 block">Bandas Horarias (Río Grande):</strong>
                Desplazar actividades de alto consumo de la franja pico (18:00 - 22:00 hs) para mitigar penalidades.
              </div>
            </li>
            <li className="flex gap-2 items-start">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5"></span>
              <div>
                <strong className="text-slate-200 block">Cámaras Frigoríficas de Pesca:</strong>
                Instalar sensores térmicos de puerta y verificar burletes. Reducir aperturas evita sobrecargar compresores un 38%.
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Strategic Report Section */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" /> Reporte de Prospectiva Tarifaria Fueguina
            </h3>
            <p className="text-xs text-slate-400">
              Generá un análisis estratégico detallado con el impacto de escenarios de subsidio para descargar.
            </p>
          </div>
          
          <button
            onClick={() => setShowReport(!showReport)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-350 ${showReport ? 'rotate-180' : ''}`} />
            {showReport ? 'Ocultar Reporte' : 'Generar Reporte'}
          </button>
        </div>

        {showReport && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center bg-slate-950/60 p-3.5 rounded-xl border border-slate-900">
              <span className="text-[10px] font-mono text-slate-500">FORMATO: GFM MARKDOWN</span>
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xxs font-bold bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-all cursor-pointer"
              >
                {reportCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copiar Reporte
                  </>
                )}
              </button>
            </div>
            
            <div className="p-6 rounded-xl bg-slate-950 border border-slate-900 text-xs font-mono text-cyan-400 overflow-y-auto max-h-[40vh] leading-relaxed whitespace-pre-wrap scrollbar-thin">
              {reportContent}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
