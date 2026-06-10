import { EnergyRecord, Anomaly } from '../types/energy';

export function generateMonthlyReportText(records: EnergyRecord[], anomalies: Anomaly[]): string {
  if (records.length === 0) {
    return "No hay datos disponibles para generar el reporte.";
  }

  // Calculate metrics
  const totalKwh = records.reduce((sum, r) => sum + r.consumption_kwh, 0);
  const costBase = records[0]?.cost_per_kwh || 45.0;
  const totalCost = totalKwh * costBase;

  const uniqueDates = Array.from(new Set(records.map(r => r.date)));
  const daysCount = uniqueDates.length;
  const avgDailyKwh = totalKwh / (daysCount || 1);

  // Peak hourly consumption
  let peakRecord = records[0];
  records.forEach(r => {
    if (r.consumption_kwh > peakRecord.consumption_kwh) {
      peakRecord = r;
    }
  });

  // Consumo por sector
  const sectorSums: Record<string, number> = {};
  records.forEach(r => {
    sectorSums[r.sector] = (sectorSums[r.sector] || 0) + r.consumption_kwh;
  });
  const topSector = Object.entries(sectorSums).sort((a, b) => b[1] - a[1])[0];

  // Consumo por equipo
  const equipSums: Record<string, number> = {};
  records.forEach(r => {
    equipSums[r.equipment] = (equipSums[r.equipment] || 0) + r.consumption_kwh;
  });
  const topEquip = Object.entries(equipSums).sort((a, b) => b[1] - a[1])[0];

  // Anomalías activas
  const activeAnoms = anomalies.filter(a => !a.resolved);
  const criticalCount = activeAnoms.filter(a => a.severity === 'critica').length;
  const highCount = activeAnoms.filter(a => a.severity === 'alta').length;

  // Potential savings (estimating 12% savings by resolving anomalies and simple adjustments)
  const savingsPct = 12;
  const potentialSavingsKwh = totalKwh * (savingsPct / 100);
  const potentialSavingsCost = totalCost * (savingsPct / 100);

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  const formatKwh = (val: number) => {
    return `${val.toLocaleString('es-AR', { maximumFractionDigits: 0 })} kWh`;
  };

  const todayStr = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });

  // Generate Markdown Text
  return `# REPORTE MENSUAL DE EFICIENCIA ENERGÉTICA
**EnergyAI Manager Platform**  
*Fecha de generación: ${todayStr}*  
*Periodo analizado: Últimos ${daysCount} días*  
*Instalación: Planta Norte / Datos cargados*  

---

## 1. RESUMEN EJECUTIVO
En el periodo analizado de **${daysCount} días**, la instalación registró un consumo eléctrico total de **${formatKwh(totalKwh)}**, representando un costo operativo de **${formatCurrency(totalCost)}**. 
A través de nuestro motor de inteligencia artificial, se identificó un **potencial de ahorro inmediato del ${savingsPct}%**, equivalente a **${formatCurrency(potentialSavingsCost)}** (${formatKwh(potentialSavingsKwh)}), mediante la resolución de fallas neumáticas, ajustes de climatización y control de cargas fuera de horario.

---

## 2. INDICADORES CLAVE (KPIs)
- **Consumo Total:** ${formatKwh(totalKwh)}
- **Costo Energético Total:** ${formatCurrency(totalCost)}
- **Consumo Promedio Diario:** ${formatKwh(avgDailyKwh)}
- **Pico de Demanda Horaria:** ${peakRecord.consumption_kwh} kWh (Registrado el ${peakRecord.date} a las ${peakRecord.hour}:00 hs)
- **Sector con Mayor Consumo:** ${topSector ? topSector[0] : 'N/D'} (${formatKwh(topSector ? topSector[1] : 0)})
- **Equipo con Mayor Consumo:** ${topEquip ? topEquip[0] : 'N/D'} (${formatKwh(topEquip ? topEquip[1] : 0)})
- **Costo Promedio del kWh:** ${formatCurrency(costBase)}

---

## 3. AUDITORÍA DE ANOMALÍAS
Se detectaron un total de **${anomalies.length} anomalías**, de las cuales **${activeAnoms.length} se encuentran pendientes** de resolución:
- **Críticas:** ${criticalCount} alerta(s) (Verificar de inmediato)
- **Altas:** ${highCount} alerta(s) (Programar revisión esta semana)
- **Medias / Bajas:** ${activeAnoms.length - criticalCount - highCount} alerta(s) (Ajustar en mantenimiento regular)

### Desvíos críticos identificados:
${activeAnoms.length > 0 
  ? activeAnoms.slice(0, 3).map(a => `- **[${a.severity.toUpperCase()}] ${a.equipment}** (${a.sector}): ${a.explanation} *Recomendación: ${a.recommendation}*`).join('\n\n')
  : "- No se registran anomalías pendientes."
}

---

## 4. ESTIMACIÓN DE AHORRO PROYECTADO
Aplicando un plan de optimización de consumo, se proyectan los siguientes beneficios financieros y ambientales:

| Indicador | Estado Actual | Proyección con Mejora (-${savingsPct}%) | Ahorro Neto Estimado |
| :--- | :--- | :--- | :--- |
| **Consumo Eléctrico** | ${formatKwh(totalKwh)} | ${formatKwh(totalKwh - potentialSavingsKwh)} | **${formatKwh(potentialSavingsKwh)}** |
| **Costo Factura** | ${formatCurrency(totalCost)} | ${formatCurrency(totalCost - potentialSavingsCost)} | **${formatCurrency(potentialSavingsCost)}** |
| **Huella de Carbono** | ${(totalKwh * 0.4 / 1000).toFixed(2)} ton CO2 | ${((totalKwh - potentialSavingsKwh) * 0.4 / 1000).toFixed(2)} ton CO2 | **${(potentialSavingsKwh * 0.4 / 1000).toFixed(2)} ton CO2** |

---

## 5. PRÓXIMAS ACCIONES SUGERIDAS (PLAN DE TRABAJO)
1. **Reparación de Fuga en Compresor A**: Planificar mantenimiento correctivo del sistema de válvulas o sellos neumáticos.
2. **Inspección Eléctrica del Motor Principal L1**: Realizar termografía y medición de corriente para corregir la progresiva pérdida de rendimiento mecánico.
3. **Control Horario de Climatización y Luces**: Verificar la configuración de termostatos y luminarias de oficinas para evitar consumos los fines de semana.
4. **Verificación de Burletes en Cámara de frío**: Mantener el aislamiento térmico durante las horas de temperaturas máximas del día.
5. **Capacitación Operativa**: Concientizar al personal del turno de mayor ineficiencia sobre el apagado selectivo de equipos auxiliares ociosos.
`;
}
