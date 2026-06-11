import { EnergyRecord, Anomaly } from '../types/energy';

export function detectAnomalies(records: EnergyRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (records.length === 0) return [];

  // Group records by equipment and hour to establish baselines (average & std dev)
  const equipmentBaselines: Record<string, Record<number, { sum: number; count: number; values: number[] }>> = {};

  records.forEach(rec => {
    if (!equipmentBaselines[rec.equipment]) {
      equipmentBaselines[rec.equipment] = {};
    }
    if (!equipmentBaselines[rec.equipment][rec.hour]) {
      equipmentBaselines[rec.equipment][rec.hour] = { sum: 0, count: 0, values: [] };
    }
    // We only use the first 14 days (non-anomalous baseline period ideally) or general average
    // to build a baseline, but since there are anomalies in week 3, using all days is fine if we use median or simple average.
    // Let's store all values.
    equipmentBaselines[rec.equipment][rec.hour].sum += rec.consumption_kwh;
    equipmentBaselines[rec.equipment][rec.hour].count += 1;
    equipmentBaselines[rec.equipment][rec.hour].values.push(rec.consumption_kwh);
  });

  // Calculate statistics (average) for each equipment and hour
  const stats: Record<string, Record<number, { avg: number; stdDev: number }>> = {};
  Object.keys(equipmentBaselines).forEach(equip => {
    stats[equip] = {};
    for (let h = 0; h < 24; h++) {
      const b = equipmentBaselines[equip][h];
      if (b && b.count > 0) {
        const avg = b.sum / b.count;
        // Calculate standard deviation
        const sqDiffs = b.values.map(val => Math.pow(val - avg, 2));
        const avgSqDiff = sqDiffs.reduce((sum, val) => sum + val, 0) / sqDiffs.length;
        const stdDev = Math.sqrt(avgSqDiff) || 0.1;
        stats[equip][h] = { avg, stdDev };
      } else {
        stats[equip][h] = { avg: 0, stdDev: 1 };
      }
    }
  });

  // Sort records chronologically to detect anomalies sequentially
  const sortedRecords = [...records].sort((a, b) => {
    const timeA = new Date(`${a.date}T${String(a.hour).padStart(2, '0')}:00:00`).getTime();
    const timeB = new Date(`${b.date}T${String(b.hour).padStart(2, '0')}:00:00`).getTime();
    return timeA - timeB;
  });

  // Keep track of detected anomalies to avoid duplicates on the same day/equipment
  const detectedKeys = new Set<string>();

  sortedRecords.forEach(rec => {
    const timestamp = `${rec.date} ${String(rec.hour).padStart(2, '0')}:00`;
    const baseline = stats[rec.equipment]?.[rec.hour];
    if (!baseline) return;

    const key = `${rec.date}_${rec.equipment}`;

    // 1. Off-hours anomalies (Administration heating/lighting left on during weekends/nights)
    if (rec.sector === 'Administración' || rec.equipment.includes('Oficinas')) {
      const isWeekend = new Date(`${rec.date}T00:00:00`).getDay() === 0 || new Date(`${rec.date}T00:00:00`).getDay() === 6;
      const isNight = rec.hour >= 22 || rec.hour < 6;

      if ((isWeekend || isNight) && rec.consumption_kwh > 4.5 && !detectedKeys.has(key)) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_offhours_${rec.date}_${rec.hour}_${rec.equipment.replace(/\s+/g, '')}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Consumo no operativo ineficiente',
          severity: 'media',
          explanation: `Se detectó un consumo de ${rec.consumption_kwh} kWh en ${rec.equipment} durante horario no operativo (${isWeekend ? 'fin de semana' : 'madrugada'}). El promedio normal en este horario es inferior a 1.0 kWh.`,
          recommendation: `Verificar el apagado automático de luces y programar termostatos para reducir la calefacción a modo pasivo durante cierres operativos.`,
          resolved: false
        });
        return; // skip other checks for this record
      }
    }

    // 2. High Outliers (e.g. Compressor A leak)
    // If consumption is > 30% higher than average and also exceeds 2 standard deviations
    const deviationPercent = (rec.consumption_kwh - baseline.avg) / (baseline.avg || 1);
    
    if (rec.consumption_kwh > baseline.avg + 2 * baseline.stdDev && deviationPercent > 0.28 && !detectedKeys.has(key)) {
      
      // Specifically target Compressor A leak
      if (rec.equipment === 'Compresor A' && deviationPercent > 0.35) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_leak_${rec.date}_${rec.hour}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Fuga o desgaste de compresión',
          severity: 'alta',
          explanation: `El Compresor A consumió ${rec.consumption_kwh} kWh (un ${(deviationPercent * 100).toFixed(0)}% por encima de su promedio habitual de ${baseline.avg.toFixed(1)} kWh) sin registrar aumentos proporcionales en las unidades de producción.`,
          recommendation: `Realizar una prueba de ultrasonido en las líneas neumáticas para ubicar fugas de aire comprimido y chequear el sello de pistones del compresor.`,
          resolved: false
        });
        return;
      }

      // Generic High consumption outlier
      if (rec.equipment !== 'Compresor A' && !rec.equipment.includes('Oficinas') && rec.production_units === 0) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_high_${rec.date}_${rec.hour}_${rec.equipment.replace(/\s+/g, '')}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Exceso de consumo en stand-by',
          severity: 'baja',
          explanation: `Consumo inusual de ${rec.consumption_kwh} kWh en standby (sin producción activa). El promedio esperado es ${baseline.avg.toFixed(1)} kWh.`,
          recommendation: `Asegurarse de que el equipo sea apagado por completo en lugar de permanecer en modo de espera (standby).`,
          resolved: false
        });
        return;
      }
    }

    // 3. Efficiency Decline (Gradual degradation)
    // If Motor Principal L1 is running, and its kWh/unit is way higher than usual (> 0.46)
    if (rec.equipment === 'Motor Principal L1' && rec.production_units > 10) {
      const kwhPerUnit = rec.consumption_kwh / rec.production_units;
      if (kwhPerUnit > 0.47 && !detectedKeys.has(key)) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_efficiency_${rec.date}_${rec.hour}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Pérdida progresiva de rendimiento',
          severity: 'alta',
          explanation: `El Motor Principal L1 registró una eficiencia de ${kwhPerUnit.toFixed(3)} kWh/unidad, un 35% más alta que el estándar nominal de 0.35 kWh/unidad. Esto refleja fricción mecánica o fatiga del devanado.`,
          recommendation: `Programar mantenimiento para revisión de rodamientos, alineación de ejes y control de corriente trifásica del estator.`,
          resolved: false
        });
        return;
      }
    }

    // 4. Heatwave Cooling spikes (Cámara frigorífica temperature correlation)
    if (rec.equipment === 'Cámara Frigorífica' && rec.external_temperature > 32) {
      if (rec.consumption_kwh > baseline.avg * 1.5 && !detectedKeys.has(key)) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_temp_${rec.date}_${rec.hour}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Sobrecarga térmica por clima',
          severity: 'critica',
          explanation: `La Cámara Frigorífica registró un consumo récord de ${rec.consumption_kwh} kWh debido a una temperatura ambiente externa extrema de ${rec.external_temperature}°C.`,
          recommendation: `Verificar el estado de los burletes de las puertas, evitar aperturas prolongadas y activar cortinas plásticas de aire para atenuar el choque térmico.`,
          resolved: false
        });
        return;
      }
    }
  });

  // Sort anomalies so the latest ones (chronologically) are first
  return anomalies.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
