import { parseCSV } from '../utils/csvParser.js';

// Helper para fetch con reintentos
async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok && response.status >= 500 && i < retries) {
        // Reintentar si es 5xx
        console.warn(`Intento ${i + 1} fallido (Status ${response.status}). Reintentando...`);
        continue;
      }
      return response;
    } catch (error: any) {
      if (i < retries && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message.includes('fetch failed'))) {
        console.warn(`Intento ${i + 1} fallido (${error.message || error.code}). Reintentando...`);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Fallo después de múltiples reintentos');
}

// Cachés independientes
const cacheStats = new Map<string, { data: any, timestamp: number }>();
const cacheDetails = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

export interface StatsParams {
  year: string;
  crimeType?: string;
  provinceId?: string;
  cantonId?: string;
  districtId?: string;
}

// Mapeo inverso de TC_Delito
const delitoMap: Record<string, string> = {
  'ASALTO': '1',
  'HURTO': '2',
  'ROBO': '3',
  'TACHA DE VEHICULO': '4',
  'ROBO DE VEHICULO': '5',
  'HOMICIDIO': '6'
};

function buildPayloadParams(params: StatsParams) {
  const oijProvincia = params.provinceId || "0";
  const oijCanton = (params.provinceId && params.cantonId) 
    ? `${params.provinceId}${params.cantonId.padStart(2, '0')}` 
    : "0";
  const oijDistrito = (params.provinceId && params.cantonId && params.districtId) 
    ? `${params.provinceId}${params.cantonId.padStart(2, '0')}${params.districtId.padStart(2, '0')}` 
    : "0";

  const currentYear = new Date().getFullYear().toString();
  const startDateInt = parseInt(`${params.year}0101`, 10);
  
  let endDateInt: number;
  if (params.year === currentYear) {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    endDateInt = parseInt(`${params.year}${mm}${dd}`, 10);
  } else {
    endDateInt = parseInt(`${params.year}1231`, 10);
  }

  let tcDelito = "1,2,3,4,5,6";
  if (params.crimeType && params.crimeType !== 'all') {
    tcDelito = delitoMap[params.crimeType.toUpperCase()] || "1,2,3,4,5,6";
  }

  return { oijProvincia, oijCanton, oijDistrito, startDateInt, endDateInt, tcDelito };
}

function getUrlSearchParams(p: ReturnType<typeof buildPayloadParams>) {
  return new URLSearchParams({
    pJson: JSON.stringify({
      TN_FechaInicio: p.startDateInt,
      TN_FechaFinal: p.endDateInt,
      TC_Provincias: p.oijProvincia,
      TC_Cantones: p.oijCanton,
      TC_Distritos: p.oijDistrito,
      TC_Delito: p.tcDelito,
      TC_Victima: "1,2,3,4,5",
      TC_Modalidades: "0"
    })
  });
}

export async function getSecurityStats(params: StatsParams) {
  const cacheKey = JSON.stringify(params);
  const cached = cacheStats.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  const p = buildPayloadParams(params);
  const bodyData = getUrlSearchParams(p);
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': '*/*' };

  const reqCategorias = fetchWithRetry('https://pjenlinea3.poder-judicial.go.cr/estadisticasoij/Home/obtenerCategorias', {
    method: 'POST', headers, body: bodyData
  }).then(r => r.json());

  const reqTemporales = fetchWithRetry('https://pjenlinea3.poder-judicial.go.cr/estadisticasoij/Home/obtenerTemporales', {
    method: 'POST', headers, body: bodyData
  }).then(r => r.json());

  const [dataCategorias, dataTemporales] = await Promise.all([reqCategorias, reqTemporales]);

  const crimeCountMap = new Map<string, number>();
  let totalIncidents = 0;

  if (Array.isArray(dataCategorias)) {
    dataCategorias.forEach((cat: any) => {
      const name = cat.TC_Delito || 'DESCONOCIDO';
      const cant = parseInt(cat.TN_Cantidad || '0', 10);
      totalIncidents += cant;
      crimeCountMap.set(name, (crimeCountMap.get(name) || 0) + cant);
    });
  }

  let mostFrequentCrime = 'N/A';
  let maxCount = 0;
  const chartCrimeTypes: any[] = [];

  crimeCountMap.forEach((cant, name) => {
    chartCrimeTypes.push({ name, value: cant });
    if (cant > maxCount) {
      maxCount = cant;
      mostFrequentCrime = name;
    }
  });

  chartCrimeTypes.sort((a, b) => b.value - a.value);

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthlyCountMap = new Map<string, number>();
  monthNames.forEach(m => monthlyCountMap.set(m, 0));

  if (Array.isArray(dataTemporales)) {
    dataTemporales.forEach((temp: any) => {
      const mesIndex = parseInt(temp.TN_Mes || '0', 10) - 1;
      const cant = parseInt(temp.TN_Cantidad || '0', 10);
      if (mesIndex >= 0 && mesIndex < 12) {
        const monthKey = monthNames[mesIndex];
        monthlyCountMap.set(monthKey, (monthlyCountMap.get(monthKey) || 0) + cant);
      }
    });
  }

  const chartMonthly = monthNames.map(name => ({ name, total: monthlyCountMap.get(name) || 0 }));
  const availableCrimeTypes = Object.keys(delitoMap);

  const result = {
    summary: {
      totalIncidents,
      mostFrequentCrime,
      uniqueCrimeTypes: chartCrimeTypes.length,
    },
    chartCrimeTypes,
    chartMonthly,
    availableCrimeTypes
  };

  cacheStats.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export async function getSecurityDetails(params: StatsParams) {
  const cacheKey = JSON.stringify(params);
  const cached = cacheDetails.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  const p = buildPayloadParams(params);

  const payloadJson = JSON.stringify({
    TN_FechaInicio: p.startDateInt,
    TN_FechaFinal: p.endDateInt,
    TC_Provincias: p.oijProvincia,
    TC_Cantones: p.oijCanton,
    TC_Distritos: p.oijDistrito,
    TC_Delito: p.tcDelito,
    TC_Victima: "1,2,3,4,5",
    TC_Modalidades: "0"
  });

  const bodyData = {
    pJson: payloadJson,
    pExtension: 'csv'
  };

  const r = await fetchWithRetry('https://pjenlinea3.poder-judicial.go.cr/estadisticasoij/Home/obtenerDatosDescargas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': '*/*' },
    body: JSON.stringify(bodyData)
  });

  if (!r.ok) {
    throw new Error(`Error OIJ CSV: ${r.status}`);
  }

  const csvText = await r.text();
  const dataCsv = await parseCSV(csvText);

  const tableDataMap = new Map<string, { delito: string, subdelito: string, count: number }>();
  
  if (Array.isArray(dataCsv)) {
    dataCsv.forEach(record => {
      const delito = record.Delito || 'Desconocido';
      const subdelito = record.SubDelito || 'N/A';
      
      if (params.crimeType && params.crimeType !== 'all') {
        if (!delito.toUpperCase().includes(params.crimeType.toUpperCase())) {
          return;
        }
      }

      const tableKey = `${delito}|${subdelito}`;
      if (!tableDataMap.has(tableKey)) {
        tableDataMap.set(tableKey, { delito, subdelito, count: 0 });
      }
      tableDataMap.get(tableKey)!.count++;
    });
  }

  const tableData = Array.from(tableDataMap.values()).sort((a, b) => b.count - a.count);

  const result = {
    tableData,
    _notes: "El detalle se basa en los registros exportados por el OIJ. Los indicadores superiores utilizan los totales estadísticos oficiales."
  };

  cacheDetails.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}
