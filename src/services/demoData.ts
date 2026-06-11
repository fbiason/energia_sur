import { EnergyRecord } from '../types/energy';

// Tierra del Fuego Sectors and Location Mapping (Industrial Plant context)
export const SECTORS = [
  'Línea de Producción 1',
  'Línea de Producción 2',
  'Cámara de frío',
  'Compresores',
  'Iluminación',
  'Calefacción',
  'Administración'
];

export const EQUIPMENTS: Record<string, string[]> = {
  'Línea de Producción 1': ['Motor Principal L1', 'Tablero Auxiliar L1'],
  'Línea de Producción 2': ['Motor Principal L2', 'Tablero Auxiliar L2'],
  'Cámara de frío': ['Cámara Frigorífica'],
  'Compresores': ['Compresor A', 'Compresor B'],
  'Iluminación': ['Iluminación Planta', 'Iluminación Oficinas'],
  'Calefacción': ['Sistema de Calefacción', 'Calefacción Oficinas'],
  'Administración': ['Sistemas de Cómputo']
};

export const SECTOR_LOCATION: Record<string, 'Ushuaia' | 'Río Grande' | 'Tolhuin'> = {
  'Línea de Producción 1': 'Río Grande',
  'Línea de Producción 2': 'Río Grande',
  'Cámara de frío': 'Ushuaia',
  'Compresores': 'Río Grande',
  'Iluminación': 'Tolhuin',
  'Calefacción': 'Ushuaia',
  'Administración': 'Tolhuin'
};

export function generateDemoData(): EnergyRecord[] {
  const records: EnergyRecord[] = [];
  const totalDays = 120; // 30 days per season: Verano (0-29), Otoño (30-59), Invierno (60-89), Primavera (90-119)
  
  // Starting date (120 days ago)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - totalDays);

  const costBase = 65.0; // Tarifa base subsidiada en AR$/kWh

  for (let day = 0; day < totalDays; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);
    const dateStr = currentDate.toISOString().split('T')[0];
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

    // Determine Season, Light hours, Base Climate
    let season: 'Verano' | 'Otoño' | 'Invierno' | 'Primavera';
    let baseTemp: number;
    let tempMin: number;
    let tempMax: number;
    let windSpeed: number;
    let lightHours: number;
    let extremeEvent: 'Ninguno' | 'Ola de frío polar' | 'Tormenta de nieve' | 'Viento extremo' = 'Ninguno';

    if (day >= 0 && day < 30) {
      season = 'Verano';
      baseTemp = 10 + (Math.random() * 4 - 2); // 8°C to 12°C
      tempMin = Math.round(baseTemp - (4 + Math.random() * 2));
      tempMax = Math.round(baseTemp + (5 + Math.random() * 2));
      windSpeed = Math.round(25 + Math.random() * 20); // Windy Fueguino summer
      lightHours = 17;

      // Extreme event: severe summer wind gusts
      if (day === 12) {
        extremeEvent = 'Viento extremo';
        windSpeed = 95;
      }
    } else if (day >= 30 && day < 60) {
      season = 'Otoño';
      baseTemp = 4.5 + (Math.random() * 3 - 1.5); // 3°C to 6°C
      tempMin = Math.round(baseTemp - (3 + Math.random() * 2));
      tempMax = Math.round(baseTemp + (4 + Math.random() * 2));
      windSpeed = Math.round(20 + Math.random() * 15);
      lightHours = 10;
    } else if (day >= 60 && day < 90) {
      season = 'Invierno';
      baseTemp = -0.5 + (Math.random() * 3 - 1.5); // -2°C to 1°C
      tempMin = Math.round(baseTemp - (5 + Math.random() * 2));
      tempMax = Math.round(baseTemp + (3 + Math.random() * 2));
      windSpeed = Math.round(15 + Math.random() * 15);
      lightHours = 7; // Ushuaia short winter days

      // Winter extreme events
      if (day >= 70 && day <= 72) {
        extremeEvent = 'Ola de frío polar';
        baseTemp = -11.5 + (Math.random() * 2 - 1); // -12.5°C to -10.5°C
        tempMin = -16;
        tempMax = -7;
        windSpeed = 25;
      } else if (day === 81) {
        extremeEvent = 'Tormenta de nieve';
        baseTemp = -4.0;
        tempMin = -8;
        tempMax = -1;
        windSpeed = 65;
      }
    } else {
      season = 'Primavera';
      baseTemp = 5.5 + (Math.random() * 4 - 2); // 3.5°C to 7.5°C
      tempMin = Math.round(baseTemp - (4 + Math.random() * 2));
      tempMax = Math.round(baseTemp + (5 + Math.random() * 2));
      windSpeed = Math.round(28 + Math.random() * 22);
      lightHours = 14;
    }

    for (let hour = 0; hour < 24; hour++) {
      // Shift calculation
      let shift: 'Mañana' | 'Tarde' | 'Noche';
      if (hour >= 6 && hour < 14) {
        shift = 'Mañana';
      } else if (hour >= 14 && hour < 22) {
        shift = 'Tarde';
      } else {
        shift = 'Noche';
      }

      // Calculate hourly temperature fluctuation (peak at 15:00, coldest at 05:00)
      const hourFactor = Math.sin(((hour - 9) * 2 * Math.PI) / 24);
      const hourlyTemp = parseFloat((baseTemp + ((tempMax - tempMin) / 2) * hourFactor + (Math.random() * 1.0 - 0.5)).toFixed(1));
      
      // Determine if it is dark currently
      const halfLight = lightHours / 2;
      const isDark = Math.abs(hour - 12.5) > halfLight;

      Object.keys(EQUIPMENTS).forEach(sector => {
        const location = SECTOR_LOCATION[sector];
        const equipments = EQUIPMENTS[sector];

        equipments.forEach(equipment => {
          let consumption: number;
          let production = 0;
          let status: 'Operativo' | 'Mantenimiento' | 'Inactivo' = 'Operativo';

          switch (equipment) {
            case 'Motor Principal L1':
            case 'Motor Principal L2': {
              const isWorkingTime = !isWeekend && (shift !== 'Noche');
              if (isWorkingTime) {
                production = Math.round(60 + Math.random() * 40);
                const tempLossMultiplier = hourlyTemp < 0 ? 1.15 : 1.0;
                consumption = production * 0.42 * tempLossMultiplier + 5.0;
              } else {
                production = 0;
                consumption = 3.5 + (extremeEvent === 'Ola de frío polar' ? 3.0 : 0);
                status = 'Inactivo';
              }
              break;
            }

            case 'Tablero Auxiliar L1':
            case 'Tablero Auxiliar L2': {
              const isWorkingTime = !isWeekend && (shift !== 'Noche');
              consumption = isWorkingTime ? (4.0 + Math.random() * 1.5) : (1.5 + Math.random() * 0.5);
              break;
            }

            case 'Cámara Frigorífica': {
              const targetTemp = -20;
              const delta = hourlyTemp - targetTemp;
              consumption = 18.0 + delta * 0.45 + (extremeEvent === 'Tormenta de nieve' ? 3.0 : 0) + Math.random() * 2.0;
              break;
            }

            case 'Compresor A': {
              const isWorkingTime = !isWeekend && (shift !== 'Noche');
              consumption = isWorkingTime 
                ? (25.0 + Math.random() * 8.0) 
                : (5.0 + (extremeEvent === 'Viento extremo' ? 4.0 : 0) + Math.random() * 1.5);
              if (!isWorkingTime) status = 'Inactivo';
              break;
            }

            case 'Compresor B': {
              const isWorkingTime = !isWeekend && (shift !== 'Noche');
              consumption = isWorkingTime 
                ? (12.0 + Math.random() * 4.0) 
                : (2.0 + Math.random() * 1.0);
              if (!isWorkingTime) status = 'Inactivo';
              break;
            }

            case 'Iluminación Planta': {
              consumption = isDark ? (15.0 + Math.random() * 3.0) : (2.0 + Math.random() * 0.5);
              break;
            }

            case 'Iluminación Oficinas': {
              const isOpen = hour >= 8 && hour < 20;
              consumption = (isOpen && isDark) 
                ? (6.0 + Math.random() * 1.5) 
                : (0.5 + Math.random() * 0.2);
              break;
            }

            case 'Sistema de Calefacción': {
              const tempDiff = Math.max(0, 18 - hourlyTemp);
              const heatingLoad = tempDiff * 2.2 + (extremeEvent === 'Ola de frío polar' ? 12.0 : 0);
              consumption = 8.0 + heatingLoad + Math.random() * 3.0;
              break;
            }

            case 'Calefacción Oficinas': {
              const isOpen = hour >= 8 && hour < 20;
              const tempDiff = Math.max(0, 20 - hourlyTemp);
              const heatingLoad = tempDiff * 1.2 + (extremeEvent === 'Ola de frío polar' ? 6.0 : 0);
              consumption = isOpen 
                ? (4.0 + heatingLoad + Math.random() * 1.5) 
                : (2.0 + (tempDiff * 0.5) + Math.random() * 0.8);
              break;
            }

            case 'Sistemas de Cómputo': {
              const isOpen = hour >= 8 && hour < 20;
              consumption = isOpen 
                ? (8.0 + Math.random() * 2.0) 
                : (2.5 + Math.random() * 0.5);
              break;
            }

            default:
              consumption = 1.0;
          }

          // Anomalías inyectadas específicas de la estacionalidad
          // Anomalía 1: Calefacción de oficinas Ushuaia trabada encendida al máximo durante el verano (días 15 a 17)
          if (equipment === 'Calefacción Oficinas' && day >= 15 && day <= 17) {
            consumption = consumption * 1.6;
          }

          // Anomalía 2: Fuga térmica en cámara frigorífica Ushuaia en el pico del invierno por acumulación de hielo (días 75 a 78)
          if (equipment === 'Cámara Frigorífica' && day >= 75 && day <= 78) {
            consumption = consumption * 1.35;
          }

          records.push({
            date: dateStr,
            hour,
            sector,
            location,
            equipment,
            consumption_kwh: parseFloat(consumption.toFixed(2)),
            production_units: production,
            external_temperature: hourlyTemp,
            shift,
            cost_per_kwh: costBase,
            status,
            season,
            temp_min: tempMin,
            temp_max: tempMax,
            wind_speed_kmh: windSpeed,
            light_hours: lightHours,
            extreme_event: extremeEvent
          });
        });
      });
    }
  }

  return records;
}
