# Guía para trabajar en Sistema OSINT

## Documentos que debes consultar

Antes de modificar un flujo crítico, lee:

- `README.md`: estructura del proyecto, instalación y comandos. Los comandos de calidad están en la sección 5.3.
- `docs/requisitos/flujos-criticos.md`: requisitos de FLU-01, FLU-02 y FLU-03, criterios de aceptación y decisiones D-01 a D-09.
- `docs/arquitectura/Informe_1.2_Arquitectura_y_Acceso.docx`: arquitectura, permisos, datos protegidos, amenazas AM-01 a AM-03 y medidas definidas o propuestas.
- `docs/arquitectura/mapa-arquitectura-1.2.png`: componentes, servicios externos y límites de confianza.
- El código y las pruebas relacionados con el flujo que vas a modificar.

Comprueba que estas referencias estén disponibles en la rama de trabajo. Si no puedes leer un archivo o falta información, indícalo; no supongas su contenido. Distingue comportamiento observado, propuestas, aceptación de una sola integrante y reglas ratificadas por el equipo. Consulta el estado de aprobación del informe 1.2; no conviertas propuestas como el plazo de borrado de 48 horas en reglas aprobadas. Si los documentos discrepan, señala la diferencia antes de cambiar la parte afectada.

## Ubicación del código

- `src/`: interfaz React, módulos y servicios del navegador.
- `server/routes/oij.ts`: endpoints de estadísticas y detalle.
- `server/services/oijService.ts`: consultas al OIJ y caché.
- `server/utils/csvParser.ts` y `server/utils/csvParser.test.ts`: procesamiento del CSV y pruebas base.
- `scripts/process-tse-electoral-roll.ts`: ETL del TSE.
- `src/modules/publicData/etl/`: ETL de MEIC.
- `src/modules/procurement/etl/`: ETL de SICOP.
- `public/`: datasets y archivos descargables por cualquier visitante.
- `.github/workflows/ci.yml`: comprobaciones de integración continua.

## Permisos, amenazas y medidas

Consulta la tabla de acceso y las reglas del informe 1.2 antes de cambiar consultas, procesamiento o publicación de datos. No agregues sesiones, roles ni permisos nuevos sin una decisión registrada. CORS no sustituye autorización; filtrar en la pantalla no restringe el acceso al JSON completo.

Revisa las amenazas relacionadas con la tarea:

- AM-01: consumo excesivo de API y caché. Consulta las medidas de validación, límites, concurrencia y tiempos de espera.
- AM-02: publicación de datos personales. Consulta la política de datos antes de generar o modificar archivos públicos.
- AM-03: interpretación de contenido GeoJSON como HTML. Trata nombres externos como texto y comprueba el comportamiento con datos sintéticos.

No incorpores originales del padrón, datos personales reales, credenciales o secretos en código, pruebas, logs ni commits. Usa datos sintéticos y evita peticiones a proveedores reales en las pruebas unitarias. No ejecutes ETL ni regeneres datasets como efecto secundario de otra tarea.

No presentes una medida propuesta como implementada o verificada. Si la tarea depende de una decisión pendiente —por ejemplo, el rango de años del OIJ, los topes de archivos ETL o la autorización de datos personales—, explica la duda y solicita la decisión antes de implementar esa parte. Puedes continuar el trabajo independiente de ella.

## Convenciones

Respeta TypeScript, módulos ES, organización por módulo y estilos existentes. Ubica las pruebas `*.test.ts` junto al código según la configuración de Vitest.

Conserva los identificadores FLU, CA, D y AM para relacionar cambios, requisitos y riesgos. Actualiza la documentación afectada si cambia el comportamiento, la arquitectura, los datos o los permisos. No cambies criterios ni expectativas de pruebas solo para que coincidan con el código.

## Comandos

Consulta `README.md`, sección 5.3, para el procedimiento completo. `package.json` define los comandos y `.nvmrc` la versión de Node; respeta también `engines.node`.

- Instala dependencias con `npm ci`, conservando `package-lock.json`.
- Antes de finalizar una tarea con cambios, ejecuta `npm run check`: lint, pruebas y compilación; la compilación incluye la verificación de tipos.
- Para diagnosticar fallos, usa `npm run lint`, `npm run typecheck`, `npm run test` o `npm run build`.

No aumentes el umbral de advertencias de lint ni desactives comprobaciones para ocultar fallos. Informa qué comandos ejecutaste, sus resultados y las limitaciones. Una comprobación no ejecutada no cuenta como aprobada.
