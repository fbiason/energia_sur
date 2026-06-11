import { EnergyRecord } from '../types/energy';

export interface CSVParseResult {
  success: boolean;
  records: EnergyRecord[];
  error?: string;
}

export function parseEnergyCSV(csvText: string): CSVParseResult {
  try {
    const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) {
      return { success: false, records: [], error: 'El archivo está vacío o no contiene filas de datos.' };
    }

    // Detect separator: comma or semicolon
    const headerLine = lines[0];
    let separator = ',';
    if (headerLine.includes(';')) {
      separator = ';';
    }

    // Split headers and remove surrounding quotes
    const headers = headerLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));

    // Required headers validation
    const requiredHeaders = ['date', 'hour', 'sector', 'equipment', 'consumption_kwh'];
    const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));
    
    if (missingHeaders.length > 0) {
      return {
        success: false,
        records: [],
        error: `Faltan las siguientes columnas obligatorias: ${missingHeaders.join(', ')}. Las columnas permitidas son date, hour, sector, equipment, consumption_kwh, production_units, external_temperature, shift, cost_per_kwh.`
      };
    }

    const records: EnergyRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Split preserving values inside quotes
      const line = lines[i];
      const values = line.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
      
      if (values.length < requiredHeaders.length) {
        continue; // skip malformed lines
      }

      const rowMap: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          rowMap[header] = values[index];
        }
      });

      // Parse and validate types
      const hour = parseInt(rowMap.hour, 10);
      const consumption = parseFloat(rowMap.consumption_kwh);
      const production = rowMap.production_units ? parseInt(rowMap.production_units, 10) : 0;
      const temperature = rowMap.external_temperature ? parseFloat(rowMap.external_temperature) : 15.0;
      const costKwh = rowMap.cost_per_kwh ? parseFloat(rowMap.cost_per_kwh) : 45.0;

      if (isNaN(hour) || hour < 0 || hour > 23) {
        return { success: false, records: [], error: `Fila ${i + 1}: El campo 'hour' debe ser un número entero entre 0 y 23. Valor: ${rowMap.hour}` };
      }
      if (isNaN(consumption) || consumption < 0) {
        return { success: false, records: [], error: `Fila ${i + 1}: El campo 'consumption_kwh' debe ser un número positivo. Valor: ${rowMap.consumption_kwh}` };
      }

      // Determine shift if missing
      let shift: 'Mañana' | 'Tarde' | 'Noche';
      if (rowMap.shift) {
        const s = rowMap.shift.toLowerCase();
        if (s.includes('mañ') || s.includes('man') || s.includes('morn')) shift = 'Mañana';
        else if (s.includes('tard') || s.includes('aft')) shift = 'Tarde';
        else shift = 'Noche';
      } else {
        if (hour >= 6 && hour < 14) shift = 'Mañana';
        else if (hour >= 14 && hour < 22) shift = 'Tarde';
        else shift = 'Noche';
      }

      // Infer season, location, and climate defaults
      const month = parseInt(rowMap.date.split('-')[1], 10) || 6;
      let season: 'Verano' | 'Otoño' | 'Invierno' | 'Primavera' = 'Invierno';
      if ([12, 1, 2].includes(month)) season = 'Verano';
      else if ([3, 4, 5].includes(month)) season = 'Otoño';
      else if ([6, 7, 8].includes(month)) season = 'Invierno';
      else if ([9, 10, 11].includes(month)) season = 'Primavera';

      const secLower = (rowMap.sector || '').toLowerCase();
      let location: 'Ushuaia' | 'Río Grande' | 'Tolhuin' = 'Ushuaia';
      if (secLower.includes('tolhuin') || secLower.includes('tlh')) location = 'Tolhuin';
      else if (secLower.includes('grande') || secLower.includes('rgd')) location = 'Río Grande';

      const tempVal = isNaN(temperature) ? 10.0 : parseFloat(temperature.toFixed(1));
      const lightHours = season === 'Verano' ? 17 : season === 'Invierno' ? 7 : season === 'Primavera' ? 14 : 10;

      records.push({
        date: rowMap.date, // format YYYY-MM-DD
        hour,
        sector: rowMap.sector || 'General',
        location,
        equipment: rowMap.equipment || 'Tablero General',
        consumption_kwh: parseFloat(consumption.toFixed(2)),
        production_units: isNaN(production) ? 0 : production,
        external_temperature: tempVal,
        shift,
        cost_per_kwh: isNaN(costKwh) ? 65.0 : parseFloat(costKwh.toFixed(2)),
        status: 'Operativo',
        season,
        temp_min: tempVal - 3,
        temp_max: tempVal + 3,
        wind_speed_kmh: 25,
        light_hours: lightHours,
        extreme_event: 'Ninguno'
      });
    }

    return { success: true, records };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, records: [], error: `Error en lectura del archivo: ${errorMsg}` };
  }
}
