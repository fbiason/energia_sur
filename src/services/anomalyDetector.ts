import { EnergyRecord, Anomaly } from '../types/energy';

export function detectAnomalies(records: EnergyRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (records.length === 0) return [];

  // Group records by equipment and hour to establish baselines
  const equipmentBaselines: Record<string, Record<number, { sum: number; count: number; values: number[] }>> = {};

  records.forEach(rec => {
    if (!equipmentBaselines[rec.equipment]) {
      equipmentBaselines[rec.equipment] = {};
    }
    if (!equipmentBaselines[rec.equipment][rec.hour]) {
      equipmentBaselines[rec.equipment][rec.hour] = { sum: 0, count: 0, values: [] };
    }
    equipmentBaselines[rec.equipment][rec.hour].sum += rec.consumption_kwh;
    equipmentBaselines[rec.equipment][rec.hour].count += 1;
    equipmentBaselines[rec.equipment][rec.hour].values.push(rec.consumption_kwh);
  });

  // Calculate statistics (average and standard deviation)
  const stats: Record<string, Record<number, { avg: number; stdDev: number }>> = {};
  Object.keys(equipmentBaselines).forEach(equip => {
    stats[equip] = {};
    for (let h = 0; h < 24; h++) {
      const b = equipmentBaselines[equip][h];
      if (b && b.count > 0) {
        const avg = b.sum / b.count;
        const sqDiffs = b.values.map(val => Math.pow(val - avg, 2));
        const avgSqDiff = sqDiffs.reduce((sum, val) => sum + val, 0) / sqDiffs.length;
        const stdDev = Math.sqrt(avgSqDiff) || 0.1;
        stats[equip][h] = { avg, stdDev };
      } else {
        stats[equip][h] = { avg: 0, stdDev: 1 };
      }
    }
  });

  // Sort records chronologically
  const sortedRecords = [...records].sort((a, b) => {
    const timeA = new Date(`${a.date}T${String(a.hour).padStart(2, '0')}:00:00`).getTime();
    const timeB = new Date(`${b.date}T${String(b.hour).padStart(2, '0')}:00:00`).getTime();
    return timeA - timeB;
  });

  const detectedKeys = new Set<string>();

  sortedRecords.forEach(rec => {
    const timestamp = `${rec.date} ${String(rec.hour).padStart(2, '0')}:00`;
    const baseline = stats[rec.equipment]?.[rec.hour];
    if (!baseline) return;

    const key = `${rec.date}_${rec.equipment}`;

    // 1. Summer Heating Anomaly: Calefacción Oficinas Ushuaia left ON during summer
    if (rec.equipment === 'Calefacción Oficinas' && rec.season === 'Verano') {
      const deviationPercent = (rec.consumption_kwh - baseline.avg) / (baseline.avg || 1);
      if (deviationPercent > 0.40 && !detectedKeys.has(key)) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_summer_heating_${rec.date}_${rec.hour}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Sobrecarga de calefacción estacional',
          severity: 'alta',
          explanation: `Se detectó un consumo inusual de ${rec.consumption_kwh} kWh en la Calefacción de Oficinas durante días de verano. Esto es un ${(deviationPercent * 100).toFixed(0)}% superior al promedio estacional de ${baseline.avg.toFixed(1)} kWh, indicando termostatos bloqueados al máximo.`,
          recommendation: `Verificar la calibración del termostato digital de las oficinas de Ushuaia y configurar el apagado forzado del circuito de calefacción eléctrica auxiliar cuando la temperatura externa supere los 8°C.`,
          resolved: false
        });
        return;
      }
    }

    // 2. Winter Icing / Leak Anomaly: Cámara Frigorífica experiencing high winter consumption
    if (rec.equipment === 'Cámara Frigorífica' && rec.season === 'Invierno') {
      const deviationPercent = (rec.consumption_kwh - baseline.avg) / (baseline.avg || 1);
      if (deviationPercent > 0.28 && !detectedKeys.has(key)) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_winter_frost_${rec.date}_${rec.hour}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Pérdida por hermeticidad / Escarcha',
          severity: 'critica',
          explanation: `La Cámara Frigorífica registró un consumo de ${rec.consumption_kwh} kWh (promedio habitual: ${baseline.avg.toFixed(1)} kWh), reflejando un aumento inusual en pleno invierno. Posible acumulación de hielo en evaporadores o fatiga de burletes.`,
          recommendation: `Programar un ciclo de desescarche (defrost) de emergencia e inspeccionar burletes y sellos de la cámara frigorífica en la sede Ushuaia.`,
          resolved: false
        });
        return;
      }
    }

    // 3. Polar Cold Wave Overload: Motor cold startup overload
    if (rec.extreme_event === 'Ola de frío polar') {
      const deviationPercent = (rec.consumption_kwh - baseline.avg) / (baseline.avg || 1);
      if (deviationPercent > 0.12 && (rec.equipment === 'Motor Principal L1' || rec.equipment === 'Motor Principal L2') && !detectedKeys.has(key)) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_coldwave_${rec.date}_${rec.hour}_${rec.equipment.replace(/\s+/g, '')}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Sobrecarga por arranque en frío polar',
          severity: 'alta',
          explanation: `El ${rec.equipment} en Río Grande registró un pico de consumo debido al esfuerzo de arranque a temperaturas extremadamente bajas (${rec.external_temperature}°C), lo que incrementa la viscosidad de los lubricantes.`,
          recommendation: `Implementar precalentadores de cárter para los motores principales de las líneas de producción y programar revisiones de viscosidad de aceite.`,
          resolved: false
        });
        return;
      }
    }

    // 4. Standby consumption in closed plant / compressors during extreme wind storms
    if ((rec.equipment === 'Compresor A' || rec.equipment === 'Compresor B') && rec.extreme_event === 'Viento extremo') {
      const deviationPercent = (rec.consumption_kwh - baseline.avg) / (baseline.avg || 1);
      if (deviationPercent > 0.25 && !detectedKeys.has(key)) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_compressor_leak_${rec.date}_${rec.hour}_${rec.equipment.replace(/\s+/g, '')}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Fuga neumática por vibraciones de tormenta',
          severity: 'baja',
          explanation: `Se detectó un consumo de stand-by inusualmente alto en el ${rec.equipment} en Río Grande durante un temporal de viento extremo. Las fuertes ráfagas y vibraciones estructurales pueden haber activado fugas en acoples rápidos expuestos.`,
          recommendation: `Inspeccionar las uniones de la línea de aire comprimido expuestas al viento exterior y sellar fugas detectadas.`,
          resolved: false
        });
        return;
      }
    }
  });

  return anomalies.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
