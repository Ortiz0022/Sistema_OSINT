import * as fs from 'fs';
import * as path from 'path';
import unzipper from 'unzipper';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TerritoryData {
  province: string;
  canton: string;
  district: string;
}

interface AggregateData {
  province: string;
  canton: string;
  district: string;
  registeredVoters: number;
}

async function processElectoralRoll() {
  const zipPath = process.argv[2];
  
  if (!zipPath) {
    console.error('Error: Debe proporcionar la ruta al archivo ZIP del TSE.');
    console.error('Uso: npm run etl:tse -- <ruta-del-zip>');
    process.exit(1);
  }

  if (!fs.existsSync(zipPath)) {
    console.error(`Error: No se encontró el archivo en la ruta: ${zipPath}`);
    process.exit(1);
  }

  console.log(`Abriendo archivo ZIP: ${zipPath}`);
  
  const directory = await unzipper.Open.file(zipPath);
  
  // 1. Leer distelec.txt para mapear CODELEC
  const distelecEntry = directory.files.find(f => f.path.toLowerCase() === 'distelec.txt');
  if (!distelecEntry) {
    console.error('Error: No se encontró distelec.txt en el archivo ZIP.');
    process.exit(1);
  }

  console.log('Procesando distelec.txt para construir mapa territorial...');
  const distelecBuffer = await distelecEntry.buffer();
  const distelecContent = distelecBuffer.toString('utf-8');
  
  const territoryMap = new Map<string, TerritoryData>();
  
  const distelecLines = distelecContent.split('\n');
  for (const line of distelecLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // CODELEC,PROVINCIA,CANTON,DISTRITO
    const parts = trimmed.split(',');
    if (parts.length >= 4) {
      const codelec = parts[0].trim();
      territoryMap.set(codelec, {
        province: parts[1].trim(),
        canton: parts[2].trim(),
        district: parts[3].trim()
      });
    }
  }

  console.log(`Se mapearon ${territoryMap.size} distritos electorales.`);

  // 2. Procesar el archivo del padrón principal
  const mainFileEntry = directory.files.find(f => 
    f.path.toLowerCase() !== 'distelec.txt' && 
    f.path.toLowerCase() !== 'leame.txt' &&
    f.path.toLowerCase().endsWith('.txt')
  );

  if (!mainFileEntry) {
    console.error('Error: No se encontró el archivo principal del padrón en el ZIP.');
    process.exit(1);
  }

  console.log(`Procesando archivo principal del padrón: ${mainFileEntry.path}`);
  
  // Estructura de agregación: CODELEC -> conteo
  // Ya que cada CODELEC representa un territorio único.
  const aggregates = new Map<string, number>();
  let recordsProcessed = 0;

  const rl = readline.createInterface({
    input: mainFileEntry.stream(),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // El archivo principal es separado por comas
    // CEDULA,CODELEC,RELLENO,FECHACADUC,JUNTA,NOMBRE,1.APELLIDO,2.APELLIDO
    const parts = trimmed.split(',');
    
    if (parts.length >= 2) {
      const codelec = parts[1].trim();
      
      // SOLO usamos CODELEC. Todos los datos personales son ignorados y NUNCA se guardan
      // (parts[0], parts[3], parts[5], parts[6], parts[7])
      
      aggregates.set(codelec, (aggregates.get(codelec) || 0) + 1);
      recordsProcessed++;
    }
  }

  console.log(`\nArchivo procesado completamente. Total registros: ${recordsProcessed}`);
  
  // 3. Generar JSON final
  console.log('Generando archivo de salida...');
  
  // Combinar conteos de código electoral (que pueden ser varios distritos electorales en un mismo distrito geográfico)
  // Agrupar por Provincia + Cantón + Distrito
  const finalAggregates = new Map<string, AggregateData>();
  
  for (const [codelec, voters] of aggregates.entries()) {
    const territory = territoryMap.get(codelec);
    if (!territory) {
      console.warn(`Advertencia: CODELEC ${codelec} no encontrado en distelec.txt (Total electores afectados: ${voters})`);
      continue;
    }
    
    const key = `${territory.province}|${territory.canton}|${territory.district}`;
    
    if (finalAggregates.has(key)) {
      const existing = finalAggregates.get(key)!;
      existing.registeredVoters += voters;
    } else {
      finalAggregates.set(key, {
        province: territory.province,
        canton: territory.canton,
        district: territory.district,
        registeredVoters: voters
      });
    }
  }

  // Calcular porcentajes por cantón
  const cantonTotals = new Map<string, number>();
  for (const item of finalAggregates.values()) {
    const cantonKey = `${item.province}|${item.canton}`;
    cantonTotals.set(cantonKey, (cantonTotals.get(cantonKey) || 0) + item.registeredVoters);
  }

  const territoriesData = Array.from(finalAggregates.values()).map(item => {
    const cantonKey = `${item.province}|${item.canton}`;
    const cantonTotal = cantonTotals.get(cantonKey) || 1; // Evitar division por 0
    const cantonPercentage = Number(((item.registeredVoters / cantonTotal) * 100).toFixed(2));
    
    return {
      ...item,
      cantonPercentage
    };
  });

  const outputJson = {
    metadata: {
      source: "Tribunal Supremo de Elecciones de Costa Rica",
      dataset: "Padrón Nacional Electoral",
      sourceFile: path.basename(zipPath),
      processedAt: new Date().toISOString(),
      recordsProcessed,
      aggregationLevel: "territorial",
      containsPersonalData: false
    },
    territories: territoriesData
  };
  
  // Validación estricta final: Buscar cualquier propiedad con datos personales en la estructura
  const jsonString = JSON.stringify(outputJson);
  if (
    jsonString.toLowerCase().includes('cedula') ||
    jsonString.toLowerCase().includes('nombre') || 
    jsonString.toLowerCase().includes('apellido')
  ) {
    console.error('CRÍTICO: El JSON generado contiene palabras clave relacionadas a datos personales.');
    console.error('El script ha sido abortado por motivos de privacidad.');
    process.exit(1);
  }

  // Guardar en public/data/
  const publicDataDir = path.join(process.cwd(), 'public', 'data');
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }

  const outputPath = path.join(publicDataDir, 'tse-electoral-aggregates.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputJson, null, 2), 'utf-8');
  
  console.log(`\nProceso completado con éxito!`);
  console.log(`Archivo guardado en: ${outputPath}`);
  console.log(`Distritos geográficos procesados: ${territoriesData.length}`);
}

processElectoralRoll().catch(err => {
  console.error('Error fatal durante el procesamiento:', err);
  process.exit(1);
});
