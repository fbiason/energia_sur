import React, { useState, useMemo } from 'react';
import { EnergyRecord } from '../types/energy';
import { 
  Calculator, 
  DollarSign, 
  FileText, 
  Copy, 
  Check, 
  TrendingUp, 
  Sliders
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

interface SavingsSimulatorProps {
  records: EnergyRecord[];
}

export default function SavingsSimulator({ records }: SavingsSimulatorProps) {
  const [copied, setCopied] = useState<boolean>(false);

  // Calculate default monthly consumption from active records
  const defaults = useMemo(() => {
    if (records.length === 0) {
      return { kwh: 15000, cost: 65.0 };
    }
    
    // Group consumption by date to find daily totals, then extrapolate monthly
    const dailyMap: Record<string, number> = {};
    records.forEach(r => {
      dailyMap[r.date] = (dailyMap[r.date] || 0) + r.consumption_kwh;
    });

    const dailyValues = Object.values(dailyMap);
    const avgDailyKwh = dailyValues.reduce((sum, v) => sum + v, 0) / (dailyValues.length || 1);
    const monthlyKwh = Math.round(avgDailyKwh * 30);
    
    const baseCost = records[0]?.cost_per_kwh || 65.0;

    return {
      kwh: monthlyKwh,
      cost: baseCost
    };
  }, [records]);

  // Tab selector state
  // 'slider' = Control deslizante, 'manual' = Ingreso manual, 'factura' = Cargar desde factura
  const [inputMode, setInputMode] = useState<'slider' | 'manual' | 'factura'>('slider');

  // Input states for Slider Mode
  const [sliderKwh, setSliderKwh] = useState<number>(defaults.kwh);
  const [sliderTariff, setSliderTariff] = useState<number>(defaults.cost);

  // Input states for Manual Input
  const [manualKwh, setManualKwh] = useState<string>('');
  const [manualTotalBill, setManualTotalBill] = useState<string>('');
  const [manualTariff, setManualTariff] = useState<string>('');
  const [manualFixed, setManualFixed] = useState<string>('');

  // Input states for Factura
  const [facturaKwh, setFacturaKwh] = useState<string>('');
  const [facturaTotal, setFacturaTotal] = useState<string>('');
  const [facturaFixed, setFacturaFixed] = useState<string>('');

  // Trigger state update if defaults change
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    setSliderKwh(defaults.kwh);
    setSliderTariff(defaults.cost);
    
    setManualKwh(defaults.kwh.toString());
    setManualTariff(defaults.cost.toString());
    setManualFixed('3500');
    setManualTotalBill(((defaults.kwh * defaults.cost) + 3500).toString());

    setFacturaKwh(defaults.kwh.toString());
    setFacturaTotal(((defaults.kwh * defaults.cost) + 3500).toString());
    setFacturaFixed('3500');
  }, [defaults]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handlers for manual input calculations
  const handleManualKwhChange = (val: string) => {
    setManualKwh(val);
    const kwh = parseFloat(val) || 0;
    const total = parseFloat(manualTotalBill) || 0;
    const fixed = parseFloat(manualFixed) || 0;
    if (kwh > 0 && total > 0) {
      const computedTariff = (total - fixed) / kwh;
      setManualTariff(computedTariff > 0 ? computedTariff.toFixed(2) : '0');
    }
  };

  const handleManualTotalChange = (val: string) => {
    setManualTotalBill(val);
    const total = parseFloat(val) || 0;
    const kwh = parseFloat(manualKwh) || 0;
    const fixed = parseFloat(manualFixed) || 0;
    if (kwh > 0 && total > 0) {
      const computedTariff = (total - fixed) / kwh;
      setManualTariff(computedTariff > 0 ? computedTariff.toFixed(2) : '0');
    }
  };

  const handleManualTariffChange = (val: string) => {
    setManualTariff(val);
    const tariff = parseFloat(val) || 0;
    const kwh = parseFloat(manualKwh) || 0;
    const fixed = parseFloat(manualFixed) || 0;
    if (kwh > 0) {
      const computedTotal = (kwh * tariff) + fixed;
      setManualTotalBill(computedTotal.toFixed(2));
    }
  };

  const handleManualFixedChange = (val: string) => {
    setManualFixed(val);
    const fixed = parseFloat(val) || 0;
    const kwh = parseFloat(manualKwh) || 0;
    const total = parseFloat(manualTotalBill) || 0;
    if (kwh > 0 && total > 0) {
      const computedTariff = (total - fixed) / kwh;
      setManualTariff(computedTariff > 0 ? computedTariff.toFixed(2) : '0');
    }
  };

  // Factura calculations derived state
  const facturaCalculations = useMemo(() => {
    const kwh = parseFloat(facturaKwh) || 0;
    const total = parseFloat(facturaTotal) || 0;
    const fixed = parseFloat(facturaFixed) || 0;

    // Si el usuario carga únicamente consumo e importe total, fixed = 0, costo = total / kwh
    const costPerKwh = kwh > 0 ? Math.max(0, (total - fixed) / kwh) : 0;
    const pureEnergyCost = kwh * costPerKwh;

    const totalForPct = total || 1;
    const pureEnergyPct = (pureEnergyCost / totalForPct) * 100;
    const fixedChargesPct = (fixed / totalForPct) * 100;

    return {
      costPerKwh,
      pureEnergyCost,
      fixedCharges: fixed,
      pureEnergyPct,
      fixedChargesPct
    };
  }, [facturaKwh, facturaTotal, facturaFixed]);

  // Derived active state for simulator
  const activeKwh = useMemo(() => {
    if (inputMode === 'slider') return sliderKwh;
    if (inputMode === 'manual') return parseFloat(manualKwh) || 0;
    return parseFloat(facturaKwh) || 0;
  }, [inputMode, sliderKwh, manualKwh, facturaKwh]);

  const activeTariff = useMemo(() => {
    if (inputMode === 'slider') return sliderTariff;
    if (inputMode === 'manual') return parseFloat(manualTariff) || 0;
    return facturaCalculations.costPerKwh;
  }, [inputMode, sliderTariff, manualTariff, facturaCalculations.costPerKwh]);

  const activeFixedCharges = useMemo(() => {
    if (inputMode === 'slider') return 0;
    if (inputMode === 'manual') return parseFloat(manualFixed) || 0;
    return facturaCalculations.fixedCharges;
  }, [inputMode, manualFixed, facturaCalculations.fixedCharges]);

  // Define Scenarios Math
  const scenarios = useMemo(() => {
    // Escenario A: Subsidio actual + invierno promedio
    const kwhA = Math.round(activeKwh * 1.0);
    const tariffA = activeTariff; // Tarifa actual subsidiada
    const costMonthlyA = (kwhA * tariffA) + activeFixedCharges;
    const costAnnualA = costMonthlyA * 12;
    const vulnerabilityA = 22; // Bajo

    // Escenario B: Reducción del 50% del subsidio + invierno severo
    const kwhB = Math.round(activeKwh * 1.25); // +25% heating load
    const tariffB = activeTariff * 2.0; // 50% cut doubles tariff
    const costMonthlyB = (kwhB * tariffB) + activeFixedCharges;
    const costAnnualB = costMonthlyB * 12;
    const increaseB = costMonthlyA > 0 ? ((costMonthlyB - costMonthlyA) / costMonthlyA) * 100 : 0;
    const vulnerabilityB = 62; // Alto

    // Escenario C: Eliminación de subsidio + invierno extremo
    const kwhC = Math.round(activeKwh * 1.50); // +50% heating load (emergency radiadores)
    const tariffC = activeTariff * 4.0; // 100% cut quadruples tariff
    const costMonthlyC = (kwhC * tariffC) + activeFixedCharges;
    const costAnnualC = costMonthlyC * 12;
    const increaseC = costMonthlyA > 0 ? ((costMonthlyC - costMonthlyA) / costMonthlyA) * 100 : 0;
    const vulnerabilityC = 95; // Crítico

    return [
      {
        id: 'A',
        name: 'Escenario A',
        desc: 'Subsidio actual + invierno promedio',
        kwh: kwhA,
        tariff: tariffA,
        costMonthly: costMonthlyA,
        costAnnual: costAnnualA,
        increase: 0,
        vulnerability: vulnerabilityA,
        risk: 'Bajo',
        riskColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
        gaugeColor: '#10b981'
      },
      {
        id: 'B',
        name: 'Escenario B',
        desc: 'Reducción 50% subsidio + invierno severo',
        kwh: kwhB,
        tariff: tariffB,
        costMonthly: costMonthlyB,
        costAnnual: costAnnualB,
        increase: increaseB,
        vulnerability: vulnerabilityB,
        risk: 'Alto',
        riskColor: 'text-orange-400 bg-orange-950/40 border-orange-850/40',
        gaugeColor: '#ea580c'
      },
      {
        id: 'C',
        name: 'Escenario C',
        desc: 'Eliminación subsidio + invierno extremo',
        kwh: kwhC,
        tariff: tariffC,
        costMonthly: costMonthlyC,
        costAnnual: costAnnualC,
        increase: increaseC,
        vulnerability: vulnerabilityC,
        risk: 'Crítico',
        riskColor: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
        gaugeColor: '#f43f5e'
      }
    ];
  }, [activeKwh, activeTariff, activeFixedCharges]);

  const chartData = useMemo(() => {
    return scenarios.map(sc => ({
      name: sc.name,
      'Costo Mensual': Math.round(sc.costMonthly),
      'Consumo Proyectado': sc.kwh
    }));
  }, [scenarios]);

  // Helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  const formatKwh = (val: number) => {
    return `${val.toLocaleString('es-AR')} kWh`;
  };

  // Compile Executive Report Markdown
  const reportText = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
    const scA = scenarios[0];
    const scB = scenarios[1];
    const scC = scenarios[2];

    return `# REPORTE DE ESCENARIOS TARIFARIOS Y PROSPECTIVA CLIMÁTICA
**Plataforma EnergIA Sur**  
*Fecha: ${todayStr}*  
*Instalación: Tierra del Fuego / Consumo de Base: ${formatKwh(activeKwh)}*

---

## 1. INTRODUCCIÓN Y CONTEXTO
Este reporte evalúa la vulnerabilidad del consumo energético de la instalación ante dos variables combinadas: la reducción gradual de subsidios eléctricos y la severidad térmica invernal en Tierra del Fuego (sistema aislado).

---

## 2. ANÁLISIS DE ESCENARIOS

### ESCENARIO A: Línea de Base (Invierno Promedio + Subsidio Actual)
- **Consumo proyectado:** ${formatKwh(scA.kwh)}
- **Tarifa aplicada:** ${formatCurrency(scA.tariff)}/kWh
- **Costo mensual estimado:** ${formatCurrency(scA.costMonthly)}
- **Costo anual estimado:** ${formatCurrency(scA.costAnnual)}
- **Índice de Vulnerabilidad:** ${scA.vulnerability}/100 (Riesgo: ${scA.risk})

### ESCENARIO B: Riesgo Alto (Invierno Severo + 50% Quita de Subsidio)
- **Consumo proyectado:** ${formatKwh(scB.kwh)} (+25% por calefacción de soporte)
- **Tarifa aplicada:** ${formatCurrency(scB.tariff)}/kWh
- **Costo mensual estimado:** ${formatCurrency(scB.costMonthly)}
- **Costo anual estimado:** ${formatCurrency(scB.costAnnual)}
- **Incremento de costos:** +${scB.increase.toFixed(0)}%
- **Índice de Vulnerabilidad:** ${scB.vulnerability}/100 (Riesgo: ${scB.risk})

### ESCENARIO C: Riesgo Crítico (Invierno Extremo + 100% Quita de Subsidio)
- **Consumo proyectado:** ${formatKwh(scC.kwh)} (+50% por radiadores de emergencia ante frío extremo)
- **Tarifa aplicada:** ${formatCurrency(scC.tariff)}/kWh
- **Costo mensual estimado:** ${formatCurrency(scC.costMonthly)}
- **Costo anual estimado:** ${formatCurrency(scC.costAnnual)}
- **Incremento de costos:** +${scC.increase.toFixed(0)}%
- **Índice de Vulnerabilidad:** ${scC.vulnerability}/100 (Riesgo: ${scC.risk})

---

## 3. IMPACTO AMBIENTAL ESTIMADO
La generación termoeléctrica local por turbinas de gas natural en Tierra del Fuego tiene un factor de emisión de **0.37 kg CO2/kWh**.
- **Escenario A**: ${(scA.kwh * 0.37 / 1000).toFixed(2)} tCO2 mensuales (${((scA.kwh * 0.37 * 12) / 1000).toFixed(1)} tCO2 anuales).
- **Escenario C**: ${(scC.kwh * 0.37 / 1000).toFixed(2)} tCO2 mensuales (${((scC.kwh * 0.37 * 12) / 1000).toFixed(1)} tCO2 anuales).
- **Reducción Recomendada**: Implementar eficiencia pasiva de calefacción (aislación térmica) permite mitigar el consumo residencial e industrial en hasta un **20%**, reduciendo las emisiones equivalentes en **${((scC.kwh * 0.20 * 0.37 * 12) / 1000).toFixed(1)} tCO2** anuales en el escenario más severo.

---

## 4. RECOMENDACIONES ESTRATÉGICAS
1. **Transición a Sistemas de Calefacción a Gas**: Evitar el soporte de radiadores eléctricos de resistencia, ya que multiplican el consumo por 4 en días fríos.
2. **Hermeticidad Estructural (Aberturas)**: Instalar doble vidriado (DVH) y burletes para aislar ráfagas de viento y conservar el calor interno.
3. **Corte y Standby Preventivo**: Desconectar totalmente equipamientos auxiliares que queden en standby durante días de tormenta extrema.
    `;
  }, [activeKwh, scenarios]);

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar el reporte: ', err);
    }
  };

  // Mini gauge math for cards
  const renderMiniGauge = (score: number, color: string) => {
    const r = 35;
    const w = 6;
    const circ = Math.PI * r;
    const offset = circ - (score / 100) * circ;
    const rot = (score / 100) * 180 - 90;

    return (
      <div className="relative w-20 h-11 flex items-center justify-center mt-2">
        <svg className="w-full h-full" viewBox="0 0 80 45">
          <path
            d="M 5 40 A 35 35 0 0 1 75 40"
            fill="none"
            stroke="#1e293b"
            strokeWidth={w}
            strokeLinecap="round"
          />
          <path
            d="M 5 40 A 35 35 0 0 1 75 40"
            fill="none"
            stroke={color}
            strokeWidth={w}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
          <circle cx="40" cy="40" r="3.5" fill="#f8fafc" />
          <line
            x1="40"
            y1="40"
            x2="40"
            y2="10"
            stroke="#f8fafc"
            strokeWidth="1.8"
            strokeLinecap="round"
            style={{
              transform: `rotate(${rot}deg)`,
              transformOrigin: '40px 40px',
              transition: 'transform 1s'
            }}
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Simulador de Escenarios Inteligentes</h2>
          <p className="text-slate-400 mt-1">
            Combinación de variaciones tarifarias por quita de subsidios y variaciones climáticas por severidad invernal.
          </p>
        </div>
      </div>

      {/* Selector de Modo de Entrada */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex bg-slate-950/60 p-1.5 rounded-xl border border-slate-850">
          <button
            onClick={() => setInputMode('slider')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              inputMode === 'slider'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" /> Control Deslizante
          </button>
          <button
            onClick={() => setInputMode('manual')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              inputMode === 'manual'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Calculator className="h-3.5 w-3.5" /> Ingreso Manual
          </button>
          <button
            onClick={() => setInputMode('factura')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              inputMode === 'factura'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> Cargar desde Factura
          </button>
        </div>
      </div>

      {/* Simulator Inputs Controls Container */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-850 bg-slate-900/30">
        {inputMode === 'slider' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
            {/* Input 1: Baseline Monthly kWh */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-cyan-400" /> Consumo Mensual Base
                </label>
                <span className="text-sm font-bold font-mono text-white bg-slate-950 border border-slate-900 px-3 py-1 rounded-xl">
                  {formatKwh(sliderKwh)}
                </span>
              </div>
              <input
                type="range"
                min="2000"
                max="120000"
                step="500"
                value={sliderKwh}
                onChange={(e) => setSliderKwh(parseInt(e.target.value, 10))}
                className="w-full h-1.5 rounded-lg bg-slate-950 appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-600">
                <span>2.000 kWh</span>
                <span>120.000 kWh</span>
              </div>
            </div>

            {/* Input 2: Base Subsidized Tariff */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-cyan-400" /> Tarifa Subsidiada Base
                </label>
                <span className="text-sm font-bold font-mono text-white bg-slate-950 border border-slate-900 px-3 py-1 rounded-xl">
                  {formatCurrency(sliderTariff)}/kWh
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="180"
                step="1"
                value={sliderTariff}
                onChange={(e) => setSliderTariff(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg bg-slate-950 appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-600">
                <span>$10 / kWh</span>
                <span>$180 / kWh</span>
              </div>
            </div>
          </div>
        )}

        {inputMode === 'manual' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in">
            {/* Consumo */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400">
                Consumo mensual (kWh)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={manualKwh}
                  onChange={(e) => handleManualKwhChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="ej: 15000"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">kWh</span>
              </div>
            </div>

            {/* Importe total */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400">
                Importe total de factura ($)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={manualTotalBill}
                  onChange={(e) => handleManualTotalChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="ej: 980000"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">ARS</span>
              </div>
            </div>

            {/* Tarifa energética */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400">
                Tarifa energética ($/kWh)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualTariff}
                  onChange={(e) => handleManualTariffChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="ej: 65.00"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">$/kWh</span>
              </div>
            </div>

            {/* Cargos fijos */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400">
                Cargos fijos mensuales ($)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={manualFixed}
                  onChange={(e) => handleManualFixedChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="ej: 3500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">ARS</span>
              </div>
            </div>
          </div>
        )}

        {inputMode === 'factura' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
            {/* Form */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-cyan-400 font-semibold">Datos de Factura Eléctrica (Cargar desde Factura)</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Consumo */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">Consumo (kWh)</label>
                  <input
                    type="number"
                    min="0"
                    value={facturaKwh}
                    onChange={(e) => setFacturaKwh(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    placeholder="ej: 15000"
                  />
                </div>

                {/* Importe Total */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">Importe Total ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={facturaTotal}
                    onChange={(e) => setFacturaTotal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    placeholder="ej: 980000"
                  />
                </div>

                {/* Cargos Fijos */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">Cargos Fijos ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={facturaFixed}
                    onChange={(e) => setFacturaFixed(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    placeholder="ej: 3500"
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed pt-2">
                💡 Los valores calculados se aplican de forma inmediata al simulador de escenarios y proyecciones de ahorro de la parte inferior.
              </div>
            </div>

            {/* Calculated Results */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-cyan-400 font-semibold">Análisis y Distribución de Costos</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Costo por kWh calculado:</span>
                  <div className="text-base font-bold text-white font-mono">{formatCurrency(facturaCalculations.costPerKwh)}/kWh</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Costo Puro de Energía:</span>
                  <div className="text-base font-bold text-cyan-400 font-mono">{formatCurrency(facturaCalculations.pureEnergyCost)}</div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-900/60">
                <span className="text-[10px] text-slate-400 font-mono uppercase">Participación en Factura:</span>
                
                {/* ProgressBar 1: Pure Energy */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" /> Energía Pura
                    </span>
                    <span className="text-white font-bold">{facturaCalculations.pureEnergyPct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div 
                      className="h-full bg-cyan-400 transition-all duration-500"
                      style={{ width: `${facturaCalculations.pureEnergyPct}%` }}
                    />
                  </div>
                </div>

                {/* ProgressBar 2: Fixed Charges */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#ea580c' }} /> Cargos Fijos
                    </span>
                    <span className="text-white font-bold">{facturaCalculations.fixedChargesPct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div 
                      className="h-full transition-all duration-550"
                      style={{ width: `${facturaCalculations.fixedChargesPct}%`, backgroundColor: '#ea580c' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scenarios.map(sc => (
          <div 
            key={sc.id}
            className="glass-panel p-5 rounded-2xl border border-slate-850 bg-slate-900/15 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all duration-300 relative overflow-hidden"
          >
            {/* Header */}
            <div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider font-mono text-slate-500">{sc.name}</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${sc.riskColor}`}>
                  Riesgo {sc.risk}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1.5">{sc.desc}</h4>
            </div>

            {/* Calculations metrics */}
            <div className="space-y-2.5 pt-2 border-t border-slate-900">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Consumo Proyectado:</span>
                <span className="font-mono font-bold text-white">{formatKwh(sc.kwh)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Tarifa Equivalente:</span>
                <span className="font-mono font-bold text-white">{formatCurrency(sc.tariff)}/kWh</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Costo Estimado Mensual:</span>
                <span className="font-mono font-bold text-cyan-400">{formatCurrency(sc.costMonthly)}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-slate-900/60 pt-2.5">
                <span className="text-slate-400">Costo Estimado Anual:</span>
                <span className="font-mono font-bold text-white">{formatCurrency(sc.costAnnual)}</span>
              </div>
              {sc.increase > 0 && (
                <div className="flex justify-between text-xs text-rose-400 font-bold font-mono">
                  <span>Incremento sobre A:</span>
                  <span>+{sc.increase.toFixed(0)}%</span>
                </div>
              )}
            </div>

            {/* Speedometer Gauge indicator */}
            <div className="flex flex-col items-center border-t border-slate-900 pt-3">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Índice de Vulnerabilidad</span>
              {renderMiniGauge(sc.vulnerability, sc.gaugeColor)}
              <span className="text-xs font-bold text-white font-mono mt-1">{sc.vulnerability}/100</span>
            </div>

          </div>
        ))}
      </div>

      {/* Charts & Scenario Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table Comparison */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-850 bg-slate-900/10 lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Calculator className="h-4.5 w-4.5 text-cyan-400" /> Tabla Comparativa de Prospectiva
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-2">Escenario</th>
                  <th className="py-3 px-2 text-right">Consumo (kWh)</th>
                  <th className="py-3 px-2 text-right">Tarifa ($)</th>
                  <th className="py-3 px-2 text-right">Costo Mensual</th>
                  <th className="py-3 px-2 text-right">Costo Anual</th>
                  <th className="py-3 px-2 text-right">Vulnerabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-xs">
                {scenarios.map(sc => (
                  <tr key={sc.id} className="hover:bg-slate-900/20 transition-all">
                    <td className="py-3 px-2 font-bold text-white flex flex-col">
                      <span>{sc.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">{sc.desc.split(' + ')[1]}</span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-semibold text-slate-300">{formatKwh(sc.kwh)}</td>
                    <td className="py-3 px-2 text-right font-mono font-semibold text-slate-300">{formatCurrency(sc.tariff)}</td>
                    <td className="py-3 px-2 text-right font-mono font-bold text-cyan-400">{formatCurrency(sc.costMonthly)}</td>
                    <td className="py-3 px-2 text-right font-mono font-bold text-slate-300">{formatCurrency(sc.costAnnual)}</td>
                    <td className="py-3 px-2 text-right font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${sc.riskColor}`}>
                        {sc.vulnerability} ({sc.risk})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost projection chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-850 bg-slate-900/10 space-y-4">
          <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-cyan-400" /> Costo Mensual Proyectado (AR$)
          </h3>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" style={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} />
                <YAxis stroke="#475569" style={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                  formatter={(value: unknown) => [formatCurrency(value as number), "Costo Mensual"]}
                />
                <Bar dataKey="Costo Mensual" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => {
                    const colors = ['#10b981', '#ea580c', '#f43f5e'];
                    return <Cell key={`cell-${index}`} fill={colors[index] || '#06b6d4'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Executive Report Module */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-850 bg-slate-900/10 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" /> Reporte de Prospectiva Tarifaria y Escenarios
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Compila y exporta la evaluación de riesgos combinados para la toma de decisiones estratégicas.
            </p>
          </div>
          
          <button 
            onClick={handleCopyReport}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
              copied 
                ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> ¡Reporte Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiar Reporte MD
              </>
            )}
          </button>
        </div>

        {/* MD Content Preview Mockup */}
        <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-5 font-mono text-[11px] text-slate-400 max-h-56 overflow-y-auto scrollbar-thin space-y-2 whitespace-pre-wrap leading-relaxed">
          {reportText}
        </div>
      </div>

    </div>
  );
}
