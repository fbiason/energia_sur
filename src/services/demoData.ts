import { EnergyRecord } from '../types/energy';

// Tierra del Fuego Sectors and Equipments Definitions
export const SECTORS = [
  'Industria Electrónica (Ley 19.640)',
  'Cámaras de Frío Pesqueras',
  'Comercios & Servicios',
  'Administración Pública',
  'Residencial Ushuaia',
  'Residencial Río Grande',
  'Alumbrado Público'
];

export const EQUIPMENTS: Record<string, string[]> = {
  'Industria Electrónica (Ley 19.640)': ['Línea de Ensamblaje', 'Soldadoras Especiales', 'Tablero Auxiliar Ind L1', 'Tablero Auxiliar Ind L2'],
  'Cámaras de Frío Pesqueras': ['Cámara Congeladora Grande', 'Compresores de Frío Ushuaia', 'Compresor Auxiliar Ushuaia'],
  'Comercios & Servicios': ['Climatización Comercial', 'Iluminación y Fuerza Comercial'],
  'Administración Pública': ['Calefacción Eléctrica Soporte', 'Iluminación y Servidores'],
  'Residencial Ushuaia': ['Consumo Hogares USH'],
  'Residencial Río Grande': ['Consumo Hogares RGD'],
  'Alumbrado Público': ['Luminarias LED Ushuaia', 'Luminarias LED Río Grande']
};

export function generateDemoData(): EnergyRecord[] {
  const records: EnergyRecord[] = [];
  const totalDays = 60;
  
  // Starting date 60 days ago
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - totalDays);

  // Subsidized cost base in Tierra del Fuego ~ AR$ 65 per kWh
  const costBase = 65.0; 

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

      // Tierra del Fuego climate (sinusoidal, cold average -2°C to 12°C depending on time and noise)
      let baseTemp = 4 + 4 * Math.sin(((hour - 9) * 2 * Math.PI) / 24);
      // Random variance (-2 to 2)
      baseTemp += (Math.random() * 4 - 2);

      // Injected Anomaly 4: Winter heatwave/anomaly days 35, 36, and 37 (peaks at 19°C)
      if (day >= 34 && day <= 36) {
        baseTemp += 11.0;
      }

      // Base Production Factor: lower on weekends
      const baseProduction = isWeekend ? 0 : (shift === 'Noche' ? 15 : 75);

      // We generate records for each sector and their equipments
      Object.keys(EQUIPMENTS).forEach(sector => {
        const equipments = EQUIPMENTS[sector];
        
        equipments.forEach(equipment => {
          let consumption: number;
          let production = 0;
          let status: 'Operativo' | 'Mantenimiento' | 'Inactivo' = 'Operativo';

          // Define specific logic per equipment
          switch (equipment) {
            case 'Línea de Ensamblaje':
              if (shift !== 'Noche' && !isWeekend) {
                production = Math.round(baseProduction + (Math.random() * 20 - 10));
                // Injected Anomaly 3: Gradual degradation of motor/belts efficiency
                const degradationFactor = 0.35 + (0.17 * (day / totalDays));
                consumption = production * degradationFactor;
                status = 'Operativo';
              } else {
                production = 0;
                consumption = 0.6; // Idle standby
                status = 'Inactivo';
              }
              break;

            case 'Soldadoras Especiales':
              if (shift !== 'Noche' && !isWeekend) {
                production = Math.round((baseProduction * 0.9) + (Math.random() * 15 - 7.5));
                consumption = production * 0.38; // Constant high efficiency
                status = 'Operativo';
              } else {
                production = 0;
                consumption = 0.4;
                status = 'Inactivo';
              }
              break;

            case 'Tablero Auxiliar Ind L1':
            case 'Tablero Auxiliar Ind L2':
              consumption = production > 0 ? 3.5 + Math.random() * 2 : 0.8;
              break;

            case 'Compresores de Frío Ushuaia':
              // Always active to preserve catch in port of Ushuaia
              consumption = 22.0 + (isWeekend ? 0 : 4) + Math.random() * 4;
              
              // Injected Anomaly 1: Compressor leak during week 3 (days 15 to 21)
              if (day >= 14 && day <= 20) {
                consumption = consumption * 1.38; // 38% increase
              }
              break;

            case 'Compresor Auxiliar Ushuaia':
              if (shift !== 'Noche' && !isWeekend) {
                consumption = 12.0 + Math.random() * 5;
              } else {
                consumption = 2.0 + Math.random() * 1;
              }
              break;

            case 'Cámara Congeladora Grande': {
              // Strongly temperature dependent
              const tempDiff = Math.max(0, baseTemp - (-5));
              consumption = 12.0 + (tempDiff * 0.8) + Math.random() * 3;
              break;
            }

            case 'Climatización Comercial': {
              // Heating runs more when external temperature is low
              const heatingNeed = Math.max(0, 16 - baseTemp);
              consumption = 3.0 + (heatingNeed * 0.75) + Math.random() * 2;
              break;
            }

            case 'Iluminación y Fuerza Comercial':
              if (hour >= 8 && hour < 21) {
                consumption = 8.5 + Math.random() * 2;
              } else {
                consumption = 1.5 + Math.random() * 0.5;
              }
              break;

            case 'Calefacción Eléctrica Soporte':
              // Public offices left electric radiators on during weekend nights
              if (isWeekend) {
                // Injected Anomaly 2: Heating left on during weekend nights (Saturdays and Sundays)
                if (hour >= 22 || hour < 6) {
                  consumption = 8.2; // Left on!
                } else {
                  consumption = 1.2;
                }
              } else {
                // Weekday
                if (hour >= 8 && hour < 18) {
                  consumption = 6.5 + Math.random() * 2;
                } else {
                  consumption = 0.6; // Turned off
                }
              }
              break;

            case 'Iluminación y Servidores':
              if (isWeekend) {
                // Injected Anomaly 2: Lights left on
                if (hour >= 22 || hour < 6) {
                  consumption = 1.9;
                } else {
                  consumption = 0.4;
                }
              } else {
                if (hour >= 8 && hour < 18) {
                  consumption = 2.4 + Math.random() * 0.4;
                } else {
                  consumption = 0.3;
                }
              }
              break;

            case 'Consumo Hogares USH':
            case 'Consumo Hogares RGD': {
              // Residential profiles: peak at 12:00-14:00 and 19:00-23:00.
              const tempFactor = Math.max(0, 10 - baseTemp) * 0.8;
              const timeFactor = (hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 23) ? 12 : 3;
              consumption = 10.0 + timeFactor + tempFactor + Math.random() * 4;
              break;
            }

            case 'Luminarias LED Ushuaia':
            case 'Luminarias LED Río Grande':
              // Public lighting runs at night (from 18:00 to 07:00)
              if (hour >= 18 || hour < 7) {
                consumption = 14.0 + Math.random() * 1.5;
              } else {
                consumption = 0.1;
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
