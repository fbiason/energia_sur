import { EnergyRecord } from '../types/energy';

// Sectors and Equipments Definitions
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
  'Iluminación': ['Iluminación Planta'],
  'Calefacción': ['Sistema de Calefacción'],
  'Administración': ['Calefacción Oficinas', 'Iluminación Oficinas']
};

export function generateDemoData(): EnergyRecord[] {
  const records: EnergyRecord[] = [];
  const totalDays = 60;
  
  // Starting date 60 days ago
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - totalDays);

  const costBase = 45.0; // AR$ per kWh

  for (let day = 0; day < totalDays; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);
    const dateStr = currentDate.toISOString().split('T')[0];
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

    for (let hour = 0; hour < 24; hour++) {
      // Determine shift
      let shift: 'Mañana' | 'Tarde' | 'Noche';
      if (hour >= 6 && hour < 14) {
        shift = 'Mañana';
      } else if (hour >= 14 && hour < 22) {
        shift = 'Tarde';
      } else {
        shift = 'Noche';
      }

      // Base Temperature: Sinusoidal, peak at 15:00, min at 05:00
      // Normal temperature fluctuates between 12°C and 22°C depending on hour and seasonal noise
      let baseTemp = 15 + 6 * Math.sin(((hour - 9) * 2 * Math.PI) / 24);
      // Add a slight random noise (-1.5 to 1.5)
      baseTemp += (Math.random() * 3 - 1.5);

      // Injected Anomaly 4: Heatwave on days 35, 36, and 37
      if (day >= 34 && day <= 36) {
        baseTemp += 14.0; // Pushes max temperature to ~36°C
      }

      // Base Production Factor: lower on weekends
      const baseProduction = isWeekend ? 0 : (shift === 'Noche' ? 20 : 80);

      // We generate records for each sector and their equipments
      Object.keys(EQUIPMENTS).forEach(sector => {
        const equipments = EQUIPMENTS[sector];
        
        equipments.forEach(equipment => {
          let consumption: number;
          let production = 0;
          let status: 'Operativo' | 'Mantenimiento' | 'Inactivo' = 'Operativo';

          // Define specific logic per equipment
          switch (equipment) {
            case 'Motor Principal L1':
              if (shift !== 'Noche' && !isWeekend) {
                production = Math.round(baseProduction + (Math.random() * 20 - 10));
                // Injected Anomaly 3: Gradual degradation of Motor L1 efficiency
                // Days 0-60: efficiency starts at 0.35 kWh/unit and ends at 0.52 kWh/unit
                const degradationFactor = 0.35 + (0.17 * (day / totalDays));
                consumption = production * degradationFactor;
                status = 'Operativo';
              } else {
                production = 0;
                consumption = 0.5; // Idle standby
                status = 'Inactivo';
              }
              break;

            case 'Motor Principal L2':
              if (shift !== 'Noche' && !isWeekend) {
                // Works normal
                production = Math.round((baseProduction * 0.9) + (Math.random() * 15 - 7.5));
                consumption = production * 0.36; // Constant high efficiency
                status = 'Operativo';
              } else {
                production = 0;
                consumption = 0.4;
                status = 'Inactivo';
              }
              break;

            case 'Tablero Auxiliar L1':
            case 'Tablero Auxiliar L2':
              consumption = production > 0 ? 3.5 + Math.random() * 2 : 0.8;
              break;

            case 'Compresor A':
              // Compresor A is always on, maintaining system pressure
              consumption = 18.0 + (isWeekend ? 0 : 5) + Math.random() * 4;
              
              // Injected Anomaly 1: Compressor A leak during week 3 (days 15 to 21)
              if (day >= 14 && day <= 20) {
                consumption = consumption * 1.38; // 38% increase
              }
              break;

            case 'Compresor B':
              // Compresor B kicks in only during peak shifts when production is active
              if (shift !== 'Noche' && !isWeekend) {
                consumption = 12.0 + Math.random() * 5;
              } else {
                consumption = 2.0 + Math.random() * 1;
              }
              break;

            case 'Cámara Frigorífica': {
              // Heavily temperature dependent
              const tempDiff = Math.max(0, baseTemp - 5);
              consumption = 10.0 + (tempDiff * 0.9) + Math.random() * 3;
              break;
            }

            case 'Sistema de Calefacción': {
              // Heating runs more when external temperature is low
              const heatingNeed = Math.max(0, 18 - baseTemp);
              consumption = 2.0 + (heatingNeed * 0.8) + Math.random() * 2;
              break;
            }

            case 'Iluminación Planta':
              // Higher at night
              if (hour >= 18 || hour < 6) {
                consumption = 6.5 + Math.random() * 1;
              } else {
                consumption = 2.0 + Math.random() * 0.5;
              }
              break;

            case 'Calefacción Oficinas':
              if (isWeekend) {
                // Injected Anomaly 2: Heating left on during weekend nights
                // Saturdays (day 5, 12, etc.) and Sundays (day 6, 13, etc.)
                if (hour >= 22 || hour < 6) {
                  consumption = 7.5; // Left on!
                } else {
                  consumption = 1.0;
                }
              } else {
                // Weekday
                if (hour >= 8 && hour < 18) {
                  consumption = 6.0 + Math.random() * 2;
                } else {
                  consumption = 0.5; // Turned off
                }
              }
              break;

            case 'Iluminación Oficinas':
              if (isWeekend) {
                // Injected Anomaly 2: Lighting left on during weekend nights
                if (hour >= 22 || hour < 6) {
                  consumption = 1.8; // Left on!
                } else {
                  consumption = 0.1;
                }
              } else {
                // Weekday
                if (hour >= 8 && hour < 18) {
                  consumption = 2.2 + Math.random() * 0.4;
                } else {
                  consumption = 0.2;
                }
              }
              break;

            default:
              consumption = 1.0;
          }

          records.push({
            date: dateStr,
            hour,
            sector,
            equipment,
            consumption_kwh: parseFloat(consumption.toFixed(2)),
            production_units: production,
            external_temperature: parseFloat(baseTemp.toFixed(1)),
            shift,
            cost_per_kwh: costBase,
            status
          });
        });
      });
    }
  }

  return records;
}
