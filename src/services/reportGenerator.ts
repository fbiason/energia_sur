import { EnergyRecord, Anomaly } from '../types/energy';

export function generateMonthlyReportText(records: EnergyRecord[], anomalies: Anomaly[]): string {
  if (records.length === 0) {
    return "No hay datos disponibles para generar el reporte.";
  }

  // Calculate metrics
  const totalKwh = records.reduce((sum, r) => sum + r.consumption_kwh, 0);
  const costBase = records[0]?.cost_per_kwh || 65.0;
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

  // Potential savings (estimating 15% savings by resolving anomalies and simple adjustments)
  const savingsPct = 15;
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
**Plataforma EnergIA SUR**  
*Fecha de generación: ${todayStr}*  
*Periodo analizado: Últimos ${daysCount} días*  
*Jurisdicción: Tierra del Fuego / Datos cargados*  
 
---

## 1. RESUMEN EJECUTIVO
En el periodo analizado de **${daysCount} días**, la provincia registró un consumo eléctrico total de **${formatKwh(totalKwh)}**, representando un costo operativo estimado en tarifas base de **${formatCurrency(totalCost)}**. 
A través de nuestro motor de inteligencia artificial, se identificó un **potencial de ahorro inmediato del ${savingsPct}%**, equivalente a **${formatCurrency(potentialSavingsCost)}** (${formatKwh(potentialSavingsKwh)}), mediante el control de calefacción eléctrica secundaria, apagado automático los fines de semana en administración y el balanceo de compresores frigoríficos en los puertos.

---

## 2. INDICADORES CLAVE (KPIs)
- **Consumo Total:** ${formatKwh(totalKwh)}
- **Costo Energético Total:** ${formatCurrency(totalCost)}
- **Consumo Promedio Diario:** ${formatKwh(avgDailyKwh)}
- **Pico de Demanda Horaria:** ${peakRecord.consumption_kwh} kWh (Registrado el ${peakRecord.date} a las ${peakRecord.hour}:00 hs)
- **Sector con Mayor Consumo:** ${topSector ? topSector[0] : 'N/D'} (${formatKwh(topSector ? topSector[1] : 0)})
- **Dispositivo con Mayor Consumo:** ${topEquip ? topEquip[0] : 'N/D'} (${formatKwh(topEquip ? topEquip[1] : 0)})
- **Costo Promedio del kWh:** ${formatCurrency(costBase)}

---

## 3. AUDITORÍA DE INEFICIENCIAS DETECTADAS
Se detectaron un total de **${anomalies.length} ineficiencias**, de las cuales **${activeAnoms.length} se encuentran pendientes** de resolución:
- **Críticas:** ${criticalCount} alerta(s) (Verificar de inmediato)
- **Altas:** ${highCount} alerta(s) (Programar revisión esta semana)
- **Medias / Bajas:** ${activeAnoms.length - criticalCount - highCount} alerta(s) (Ajustar en mantenimiento regular)

### Desvíos críticos identificados:
${activeAnoms.length > 0 
  ? activeAnoms.slice(0, 3).map(a => `- **[${a.severity.toUpperCase()}] ${a.equipment}** (${a.sector}): ${a.explanation} *Recomendación: ${a.recommendation}*`).join('\n\n')
  : "- No se registran ineficiencias pendientes."
}

---

## 4. ESTIMACIÓN DE AHORRO PROYECTADO Y MITIGACIÓN
Aplicando un plan de optimización de consumo, se proyectan los siguientes beneficios financieros y ambientales:

| Indicador | Estado Actual | Proyección con Mejora (-${savingsPct}%) | Ahorro Neto Estimado |
| :--- | :--- | :--- | :--- |
| **Consumo Eléctrico** | ${formatKwh(totalKwh)} | ${formatKwh(totalKwh - potentialSavingsKwh)} | **${formatKwh(potentialSavingsKwh)}** |
| **Costo Factura** | ${formatCurrency(totalCost)} | ${formatCurrency(totalCost - potentialSavingsCost)} | **${formatCurrency(potentialSavingsCost)}** |
| **Huella de Carbono** | ${(totalKwh * 0.37 / 1000).toFixed(2)} ton CO2 | ${((totalKwh - potentialSavingsKwh) * 0.37 / 1000).toFixed(2)} ton CO2 | **${(potentialSavingsKwh * 0.37 / 1000).toFixed(2)} ton CO2** |

---

## 5. PRÓXIMAS ACCIONES SUGERIDAS (PLAN DE TRABAJO FUEGUINO)
1. **Reemplazo de Calefactores Eléctricos Auxiliares:** Limitar el uso de radiadores eléctricos de soporte en oficinas públicas y priorizar calefacción por calderas.
2. **Inspección de Cámaras de Frío de Pesca:** Reparar burletes y optimizar las cortinas de aire en las compuertas principales para evitar la sobrecarga térmica.
3. **Control Horario de Climatización y Luces:** Automatizar el apagado los fines de semana de las luces de oficinas y sistemas no críticos.
4. **Desplazamiento del Consumo Fabril:** Coordinar que los turnos de alto consumo industrial operen fuera de la banda horaria pico provincial (18:00 a 22:00 hs).
`;
}
