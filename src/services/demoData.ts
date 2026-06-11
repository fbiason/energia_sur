import { EnergyRecord } from '../types/energy';

// Tierra del Fuego Sectors and Location Mapping
export const SECTORS = [
  'Residencial Ushuaia',
  'Puerto & Pesca Ushuaia',
  'Comercio & Hotelería USH',
  'Residencial Río Grande',
  'Industria Ley 19.640',
  'Comercio RGD',
  'Residencial Tolhuin',
  'Turismo & Cabañas TLH',
  'Aserraderos & Madera TLH'
];

export const EQUIPMENTS: Record<string, string[]> = {
  'Residencial Ushuaia': ['Consumo Residencial USH'],
  'Puerto & Pesca Ushuaia': ['Cámaras de Congelado Ushuaia'],
  'Comercio & Hotelería USH': ['Calefacción y Luces Hoteleras'],
  'Residencial Río Grande': ['Consumo Residencial RGD'],
  'Industria Ley 19.640': ['Líneas de Ensamblaje Industrial'],
  'Comercio RGD': ['Climatización Comercial RGD'],
  'Residencial Tolhuin': ['Consumo Residencial TLH'],
  'Turismo & Cabañas TLH': ['Calefacción Cabañas Tolhuin'],
  'Aserraderos & Madera TLH': ['Sierras y Equipamiento Forestal']
};

export const SECTOR_LOCATION: Record<string, 'Ushuaia' | 'Río Grande' | 'Tolhuin'> = {
  'Residencial Ushuaia': 'Ushuaia',
  'Puerto & Pesca Ushuaia': 'Ushuaia',
  'Comercio & Hotelería USH': 'Ushuaia',
  'Residencial Río Grande': 'Río Grande',
  'Industria Ley 19.640': 'Río Grande',
  'Comercio RGD': 'Río Grande',
  'Residencial Tolhuin': 'Tolhuin',
  'Turismo & Cabañas TLH': 'Tolhuin',
  'Aserraderos & Madera TLH': 'Tolhuin'
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
      // E.g., for 17 hours light, dark is hour < 4 or hour >= 21
      // For 7 hours light, dark is hour < 9 or hour >= 16
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
            case 'Consumo Residencial USH': {
              const baseLoad = 8.5; // kW base
              const tempDiff = Math.max(0, 10 - hourlyTemp);
              // Radiadores eléctricos de soporte se encienden en frío
              const heatingLoad = tempDiff * 1.4 + (extremeEvent === 'Ola de frío polar' ? 7.0 : 0);
              // Luces encendidas en horas de oscuridad
              const lightingLoad = isDark ? 2.8 : 0.4;
              consumption = baseLoad + heatingLoad + lightingLoad + Math.random() * 2.0;
              break;
            }

            case 'Cámaras de Congelado Ushuaia': {
              // Menor consumo en invierno por frío externo. Mayor consumo en verano.
              const targetTemp = -20;
              const delta = hourlyTemp - targetTemp;
              consumption = 18.0 + delta * 0.45 + (extremeEvent === 'Tormenta de nieve' ? 3.0 : 0) + Math.random() * 2.0;
              break;
            }

            case 'Calefacción y Luces Hoteleras': {
              // Dependiente de turismo (Alto en Verano e Invierno, bajo en Otoño/Primavera)
              let seasonMultiplier = 0.8;
              if (season === 'Verano') seasonMultiplier = 1.35;
              if (season === 'Invierno') seasonMultiplier = 1.6;

              const tempDiff = Math.max(0, 18 - hourlyTemp);
              const heatingLoad = tempDiff * 1.5 + (extremeEvent === 'Ola de frío polar' ? 9.0 : 0);
              const lightingLoad = isDark ? 3.5 : 0.6;
              consumption = (6.0 + heatingLoad + lightingLoad) * seasonMultiplier + Math.random() * 2.0;
              break;
            }

            case 'Consumo Residencial RGD': {
              const baseLoad = 9.0;
              const tempDiff = Math.max(0, 10 - hourlyTemp);
              const heatingLoad = tempDiff * 1.5 + (extremeEvent === 'Ola de frío polar' ? 8.5 : 0);
              const lightingLoad = isDark ? 3.0 : 0.5;
              consumption = baseLoad + heatingLoad + lightingLoad + Math.random() * 2.0;
              break;
            }

            case 'Líneas de Ensamblaje Industrial': {
              // Gran consumo constante en turnos productivos, sin fines de semana.
              const isWorkingTime = !isWeekend && (shift !== 'Noche');
              if (isWorkingTime) {
                production = Math.round(60 + Math.random() * 40);
                // Pérdida de eficiencia en invierno debido a bajas temperaturas de arranque de motores
                const tempLossMultiplier = hourlyTemp < 0 ? 1.15 : 1.0;
                consumption = production * 0.42 * tempLossMultiplier + 5.0;
              } else {
                production = 0;
                // Standby consum
                consumption = 3.5 + (extremeEvent === 'Ola de frío polar' ? 3.0 : 0);
                status = 'Inactivo';
              }
              break;
            }

            case 'Climatización Comercial RGD': {
              const isOpen = hour >= 8 && hour < 21;
              if (isOpen) {
                const tempDiff = Math.max(0, 17 - hourlyTemp);
                consumption = 8.0 + tempDiff * 1.1 + (extremeEvent === 'Viento extremo' ? 4.0 : 0);
              } else {
                consumption = 2.0 + (extremeEvent === 'Ola de frío polar' ? 2.5 : 0);
                status = 'Inactivo';
              }
              break;
            }

            case 'Consumo Residencial TLH': {
              const baseLoad = 5.0;
              const tempDiff = Math.max(0, 9 - hourlyTemp);
              const heatingLoad = tempDiff * 1.3 + (extremeEvent === 'Ola de frío polar' ? 5.5 : 0);
              const lightingLoad = isDark ? 1.8 : 0.3;
              consumption = baseLoad + heatingLoad + lightingLoad + Math.random() * 1.5;
              break;
            }

            case 'Calefacción Cabañas Tolhuin': {
              // Estacionalidad de turismo muy marcada
              let seasonMultiplier = 0.6;
              if (season === 'Verano') seasonMultiplier = 1.4;
              if (season === 'Invierno') seasonMultiplier = 1.7;

              const tempDiff = Math.max(0, 18 - hourlyTemp);
              consumption = (4.0 + tempDiff * 1.7 + (extremeEvent === 'Ola de frío polar' ? 6.0 : 0)) * seasonMultiplier + Math.random() * 1.5;
              break;
            }

            case 'Sierras y Equipamiento Forestal': {
              // Actividad diurna, muy reducida en invierno por congelación de rollizos
              const isWorkingHours = !isWeekend && (hour >= 8 && hour < 17);
              if (isWorkingHours) {
                if (season === 'Invierno') {
                  // Reducido al 20%
                  consumption = 4.0 + Math.random() * 2.0;
                  production = 5;
                } else {
                  consumption = 20.0 + Math.random() * 6.0;
                  production = 25;
                }
              } else {
                consumption = 0.5;
                status = 'Inactivo';
              }
              break;
            }

            default:
              consumption = 1.0;
          }

          // Anomalías inyectadas específicas de la estacionalidad
          // Anomalía 1: Calefacción hotelera Ushuaia trabada encendida al máximo durante el verano (días 15 a 17)
          if (equipment === 'Calefacción y Luces Hoteleras' && day >= 15 && day <= 17) {
            consumption = consumption * 1.6;
          }

          // Anomalía 2: Fuga térmica en cámaras frigoríficas pesqueras Ushuaia en el pico del invierno por acumulación de hielo (días 75 a 78)
          if (equipment === 'Cámaras de Congelado Ushuaia' && day >= 75 && day <= 78) {
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
