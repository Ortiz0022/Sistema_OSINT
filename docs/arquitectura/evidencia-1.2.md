# Evidencia de arquitectura 1.2
Fecha de revisión: 7 de noviembre de 2026 (Costa Rica).
Método: lectura estática. No se ejecutaron ETL, pruebas ni llamadas externas. No acredita controles en producción.
No se pudo verificar el SHA de Git por una restricción de acceso. Los hashes SHA-256 siguientes identifican los archivos leídos.

## server/index.ts
SHA-256: 5b99cd847c00cd2316a7331feadff6e704567de3f1e89402a595f859f1234265
```
8: app.use(cors());
9: app.use(express.json());
12: app.use('/api/security', oijRouter);
```

## server/routes/oij.ts
SHA-256: 8c503188a4be605105e0364c51f51e3f62e1fca7a6cb4298ffccefeacc169d1c
```
6: oijRouter.get('/stats', async (req, res) => {
20:     console.error('Error en /api/security/stats:', error);
25: oijRouter.get('/details', async (req, res) => {
39:     console.error('Error en /api/security/details:', error);
```

## server/services/oijService.ts
SHA-256: 019a63cdc72b20d9a85ca622bd327671d6d7aebdcba0be1c0c6d5b6c1ec507bd
```
4: async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
7:       const response = await fetch(url, options);
26: const cacheStats = new Map<string, { data: any, timestamp: number }>();
27: const cacheDetails = new Map<string, { data: any, timestamp: number }>();
28: const CACHE_TTL = 30 * 60 * 1000; // 30 minutos
95:   const cached = cacheStats.get(cacheKey);
97:   if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
105:   const reqCategorias = fetchWithRetry('https://pjenlinea3.poder-judicial.go.cr/estadisticasoij/Home/obtenerCategorias', {
109:   const reqTemporales = fetchWithRetry('https://pjenlinea3.poder-judicial.go.cr/estadisticasoij/Home/obtenerTemporales', {
170:   cacheStats.set(cacheKey, { data: result, timestamp: Date.now() });
176:   const cached = cacheDetails.get(cacheKey);
178:   if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
200:   const r = await fetchWithRetry('https://pjenlinea3.poder-judicial.go.cr/estadisticasoij/Home/obtenerDatosDescargas', {
241:   cacheDetails.set(cacheKey, { data: result, timestamp: Date.now() });
```

## vite.config.ts
SHA-256: e082b03e126ca61aad028fa5e0dfa087f15e3d834d647a10691ec75e9fa3e90b
```
4: // https://vite.dev/config/
10:         target: 'http://localhost:3001',
```

## src/services/locationService.ts
SHA-256: dd9966f056c6469ae290b075ef77f006484ff285e219e1f7f69ee3c6a89916b1
```
3: const BASE_URL = 'https://ubicaciones.paginasweb.cr';
46:     const response = await fetch(url, {
```

## src/modules/security/services/securityService.ts
SHA-256: 6042326ebd25e57ac22244edfae039b7f553c41ab0b359432221851f149fb684
```
18:     const response = await fetch(`/api/security/stats?${params.toString()}`, { signal });
41:     const response = await fetch(`/api/security/details?${params.toString()}`, { signal });
```

## scripts/process-tse-electoral-roll.ts
SHA-256: 9bf6b6e8df8dab0c67354fd985e056f0c19627be499aecfa8e1beff4b6b69a56
```
181:   const privacyRegex = /"(cedula|nombre|apellido|nombres|apellidos|fechacaduc)"\s*:/i;
183:   if (privacyRegex.test(jsonString)) {
195:   const outputPath = path.join(publicDataDir, 'tse-electoral-aggregates.json');
196:   fs.writeFileSync(outputPath, JSON.stringify(outputJson, null, 2), 'utf-8');
199:   console.log(`Archivo guardado en: ${outputPath}`);
```

## src/modules/publicData/etl/fetchMeicPymes.mjs
SHA-256: beba02d210724bec07cbfb29bc2e9b50312487aa4e8c4281e64a116d27648f26
```
4:  * Abiertos de Costa Rica (CKAN, https://datosabiertos.gob.go.cr).
28: import { mkdir, readFile, writeFile } from 'node:fs/promises';
34: const CKAN_BASE = 'https://datosabiertos.gob.go.cr';
56:   const response = await fetch(url, { headers: { Accept: 'application/json' } });
86:   const response = await fetch(url);
251:       referenciaTerritorial: 'https://ubicaciones.paginasweb.cr/ (DTA oficial)',
279:   const outputPath = resolve(projectRoot, args.salida);
280:   await mkdir(dirname(outputPath), { recursive: true });
282:   await writeFile(outputPath, serialized + '\n', 'utf8');
```

## src/modules/procurement/etl/fetchSicop.mjs
SHA-256: 7ab9ea2d0df1055ef41dc99c09a06719f2b0ef0be5dba22583f5a996e54cc525
```
26: import { mkdir, writeFile } from 'node:fs/promises';
42:   'https://dlsaobservatorioprod.blob.core.windows.net/fs-synapse-observatorio-produccion';
44: const PORTAL_DESCARGAS = 'https://www.observatoriocomprapublica.go.cr/descargas-sicop/';
45: const SICOP_OPEN_DATA = 'https://www.sicop.go.cr/app/module/pcont/public/ce-open-data';
83:   const response = await fetchWithRetry(url, { label: 'listado del contenedor SICOP' });
404:       referenciaTerritorial: 'https://ubicaciones.paginasweb.cr/ (DTA oficial)',
441:   const outputPath = resolve(projectRoot, args.salida);
442:   await mkdir(dirname(outputPath), { recursive: true });
444:   await writeFile(outputPath, serialized + '\n', 'utf8');
```