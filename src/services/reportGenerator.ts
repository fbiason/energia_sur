import { EnergyRecord, Anomaly } from '../types/energy';

export function generateMonthlyReportText(records: EnergyRecord[], anomalies: Anomaly[]): string {
  if (records.length === 0) {
    return "No hay datos disponibles para generar el reporte.";
  }

  // Calculate overall metrics
  const totalKwh = records.reduce((sum, r) => sum + r.consumption_kwh, 0);
  const costBase = records[0]?.cost_per_kwh || 65.0;
  const totalCost = totalKwh * costBase;

  const uniqueDates = Array.from(new Set(records.map(r => r.date)));
  const daysCount = uniqueDates.length;

  // Group consumption by Season
  const seasonKwh: Record<string, number> = { Verano: 0, Otoño: 0, Invierno: 0, Primavera: 0 };
  const seasonCount: Record<string, number> = { Verano: 0, Otoño: 0, Invierno: 0, Primavera: 0 };

  records.forEach(r => {
    seasonKwh[r.season] += r.consumption_kwh;
    seasonCount[r.season] += 1;
  });

  const avgVerano = seasonCount['Verano'] > 0 ? (seasonKwh['Verano'] / (seasonCount['Verano'] / 24)) : 0;
  const avgInvierno = seasonCount['Invierno'] > 0 ? (seasonKwh['Invierno'] / (seasonCount['Invierno'] / 24)) : 0;
  const winterIncreasePct = avgVerano > 0 ? ((avgInvierno - avgVerano) / avgVerano) * 100 : 0;

  // Group by Location
  const locationKwh: Record<string, number> = { Ushuaia: 0, 'Río Grande': 0, Tolhuin: 0 };
  records.forEach(rec => {
    locationKwh[rec.location] += rec.consumption_kwh;
  });

  // Group by Sector
  const sectorSums: Record<string, number> = {};
  records.forEach(r => {
    sectorSums[r.sector] = (sectorSums[r.sector] || 0) + r.consumption_kwh;
  });
  const topSector = Object.entries(sectorSums).sort((a, b) => b[1] - a[1])[0];

  // Anomalies
  const activeAnoms = anomalies.filter(a => !a.resolved);
  const criticalCount = activeAnoms.filter(a => a.severity === 'critica').length;
  const highCount = activeAnoms.filter(a => a.severity === 'alta').length;

  const savingsPct = 15; // 15% optimization potential
  const potentialSavingsKwh = totalKwh * (savingsPct / 100);
  const potentialSavingsCost = totalCost * (savingsPct / 100);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  const formatKwh = (val: number) => {
    return `${val.toLocaleString('es-AR', { maximumFractionDigits: 0 })} kWh`;
  };

  const todayStr = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });

  // Tierra del Fuego grid emissions factor: 0.37 kg CO2 / kWh (Isolated Natural Gas Thermal Generation)
  const co2Factor = 0.37;

  return `# REPORTE MENSUAL DE PROSPECTIVA Y RESILIENCIA ENERGÉTICA
**Plataforma EnergIA Sur**  
*Fecha de generación: ${todayStr}*  
*Periodo analizado: Ciclo Estacional Completo (${daysCount} días)*  
*Área de cobertura: Sistema Eléctrico Aislado (Ushuaia, Río Grande y Tolhuin)*  

---

## 1. RESUMEN DE PROSPECTIVA CLIMÁTICA
En Tierra del Fuego, las variaciones climáticas ejercen una presión crítica sobre el sistema eléctrico aislado. 
- Durante el periodo analizado, el consumo total acumulado fue de **${formatKwh(totalKwh)}**, representando un costo de facturación de **${formatCurrency(totalCost)}**.
- **Impacto de la Estacionalidad**: El consumo diario promedio en **Invierno** aumentó un **${winterIncreasePct.toFixed(1)}%** respecto a la línea de base de **Verano**, impulsado por temperaturas bajo cero, tormentas de nieve y días extremadamente cortos (promedio de 7 horas de luz solar), lo que forzó la activación prolongada de calefacción eléctrica auxiliar y reflectores de iluminación.

---

## 2. DESGLOSE GEOGRÁFICO Y SECTORIAL
- **Distribución de Carga por Municipio**:
  - **Río Grande**: ${formatKwh(locationKwh['Río Grande'])} (Predominancia industrial Ley 19.640)
  - **Ushuaia**: ${formatKwh(locationKwh['Ushuaia'])} (Consumo hotelero y puerto pesquero)
  - **Tolhuin**: ${formatKwh(locationKwh['Tolhuin'])} (Cabañas turísticas y aserraderos)
- **Sector Crítico**: El sector de mayor demanda energética en la provincia fue **${topSector ? topSector[0] : 'N/D'}**, con un total de **${formatKwh(topSector ? topSector[1] : 0)}** consumidos.

---

## 3. AUDITORÍA DE RIESGOS E INEFICIENCIAS
Se identificaron **${anomalies.length} anomalías climáticas y operativas**, con **${activeAnoms.length} pendientes** de intervención:
- **Alertas Críticas:** ${criticalCount} (Acción inmediata requerida para evitar penalidades y sobrecargas)
- **Alertas Altas:** ${highCount} (Programar resolución durante la semana en curso)
- **Riesgos Climáticos Extremos**: Durante las olas de frío polar, la activación de calefactores eléctricos de resistencia multiplicó la susceptibilidad de la red, elevando el riesgo financiero.

---

## 4. ESTIMACIÓN DE MITIGACIÓN Y HUELLA DE CARBONO
Tierra del Fuego depende en un 100% de la turbogeneración termoeléctrica local basada en gas natural, lo que resulta en un factor de emisión local de **0.37 kg CO2/kWh**.

| Métrica | Consumo Histórico | Proyección con Optimización (-${savingsPct}%) | Ahorro / Reducción Neta |
| :--- | :--- | :--- | :--- |
| **Energía Eléctrica** | ${formatKwh(totalKwh)} | ${formatKwh(totalKwh - potentialSavingsKwh)} | **${formatKwh(potentialSavingsKwh)}** |
| **Costo Operativo** | ${formatCurrency(totalCost)} | ${formatCurrency(totalCost - potentialSavingsCost)} | **${formatCurrency(potentialSavingsCost)}** |
| **Huella de Carbono** | ${(totalKwh * co2Factor / 1000).toFixed(2)} tCO2 | ${((totalKwh - potentialSavingsKwh) * co2Factor / 1000).toFixed(2)} tCO2 | **${(potentialSavingsKwh * co2Factor / 1000).toFixed(2)} tCO2** |

---

## 5. PLAN DE TRABAJO SUGERIDO (RESILIENCIA PRODUCTIVA)
1. **Calibración de Termostatos Hoteleros e Industriales**: Ajustar umbrales a 17°C para evitar la activación innecesaria de calefacción eléctrica de apoyo en primavera y verano.
2. **Desescarche Programado en Cámaras**: Realizar mantenimiento periódico de evaporadores pesqueros en Ushuaia ante la formación acelerada de hielo invernal.
3. **Control Horario de Luminarias**: Ajustar los horarios de apagado de alumbrado de manera automatizada en base a las horas reales de luz solar mensuales (7 hs en invierno, 17 hs en verano).
4. **Resguardo de Cabañas y Aberturas**: Mejorar la aislación térmica en las instalaciones turísticas de Tolhuin para limitar las fugas por ráfagas de viento fuertes.
5. **Apagado Inteligente en Aserraderos**: Ejecutar cortes preventivos de línea ante temporales intensos para resguardar equipamientos y evitar consumos improductivos.
`;
}
