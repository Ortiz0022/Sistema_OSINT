# Módulo 1 — Compras del Estado (fuente OSINT: SICOP)

> **Integrante responsable:** Katheryn Méndez

Este módulo muestra cuánto dinero egresa el Estado costarricense cuando compra
bienes y servicios, en qué parte del país ocurre ese egreso y a qué zonas les
llega.

---

## 1. ¿Qué problema resuelve?

Cada vez que una institución pública compra algo —desde papel hasta un puente—
queda registrado en SICOP, el sistema oficial de compras públicas. SICOP publica
esa información abierta, pero la publica en archivos crudos mes a mes y **sin
ninguna forma de saber en qué parte del país está cada cosa**.

La ubicación existe, pero está escondida: viene como un texto suelto
(`"San Antonio, Nicoya, Guanacaste"`) dentro de archivos aparte, que hay que
cruzar a mano con el archivo de las compras. Tal como los publica SICOP, es
imposible responder algo tan simple como *"¿cuánto se compró en Limón y a
empresas de qué provincia le llegó ese dinero?"*.

Este módulo hace ese cruce y deja el resultado **filtrable con el mismo selector
de provincia, cantón y distrito que usa todo el observatorio**. Así las compras
públicas quedan comparables, territorio por territorio, con los datos de los
otros módulos del equipo (seguridad, datos abiertos y servicios).

---

## 2. La fuente

| | |
|---|---|
| **Fuente** | SICOP — Datos abiertos de contratación pública |
| **Sistema de origen** | SICOP · Sistema Integrado de Compras Públicas |
| **Módulo de datos abiertos de SICOP** | https://www.sicop.go.cr/app/module/pcont/public/ce-open-data |
| **Quién publica los archivos descargables** | Ministerio de Hacienda · Observatorio de Compra Pública |
| **Página de descargas** | https://www.observatoriocomprapublica.go.cr/descargas-sicop/ |
| **Archivo que se descarga** | `https://dlsaobservatorioprod.blob.core.windows.net/fs-synapse-observatorio-produccion/Zip/{AAAAMM}.zip` |
| **Formato** | Un ZIP por mes, con 25 archivos CSV adentro (UTF-8, separados por `;`) |
| **Actualización** | Diaria: el archivo del mes en curso se regenera todos los días a las 8:00 a. m. |
| **Qué tan atrás llega** | 190 meses publicados, desde diciembre de 2010 |
| **¿Pide usuario o clave?** | No. Es público y se puede listar y descargar sin credenciales |

### ¿Por qué no se usa la URL que aparece en el enunciado?

El enunciado cita como referencia oficial:

```
https://www.sicop.go.cr/moduloPcont/pcont/rp/CE_MOD_DATOSABIERTOSVIEW.jsp
```

Esa dirección **ya no funciona**. SICOP la reemplazó por el módulo nuevo
(`/app/module/pcont/public/ce-open-data`). Comprobado el 8 de setiembre de 2026:

| Prueba | Resultado |
|---|---|
| Petición simple a la URL del enunciado | `HTTP 403` |
| Con navegador simulado (User-Agent real) | `HTTP 500` — página de error del propio SICOP |
| Abriendo antes sesión en sicop.go.cr y con Referer | `HTTP 500` — el mismo error |
| Módulo nuevo `/app/module/pcont/public/ce-open-data` | `HTTP 200` |

Y el módulo nuevo, aunque funciona, **tampoco se puede consumir desde software**:

- Responde `access-control-allow-origin: https://www.sicop.go.cr`, o sea que solo
  acepta peticiones hechas desde su propio sitio.
- Su código envía todas las peticiones con `withCredentials: true`, es decir que
  la API depende de una sesión de usuario.
- Es un generador de reportes bajo demanda: hay que entrar, elegir un reporte y un
  rango de fechas, y esperar a que arme el archivo. No hay una dirección fija que
  un programa pueda pedir.

Intentar sortear eso significaría simular una sesión del sitio, que es
exactamente lo que el enunciado prohíbe ("sin evadir autenticación, CAPTCHA,
permisos ni controles de seguridad").

**Por eso se usa el Observatorio de Compra Pública, que no es un tercero:** es una
plataforma del **Ministerio de Hacienda** que republica los datos de SICOP como
archivos abiertos pensados para descarga automática. Lo dice el propio sitio, en
*Acerca del Observatorio*:

> "El equipo interdisciplinario ejecutor de este proyecto en Costa Rica optó por
> utilizar datos del Sistema Integrado de Compras Públicas (SICOP) a partir del
> año 2010."

> "El Observatorio de Compra Pública es de libre acceso para toda la población
> costarricense; no requiere ningún tipo de autenticación o creación de usuario.
> Esta plataforma permite obtener datos históricos, abiertos, consumibles y
> reutilizables."

Y la propia página de descargas **documenta la descarga por software**, con
exactamente el patrón de URL que usa este ETL:

> "En caso de querer descargar los archivos mediante programas, es posible
> hacerlo mediante URLs en las que se modifique la fecha del archivo de la forma:
> `https://dlsaobservatorioprod.blob.core.windows.net/fs-synapse-observatorio-produccion/Zip/yyyymm.zip`"

Es decir que el mecanismo de consumo no es un atajo ni una inferencia: es el que
la fuente publica para ese fin.

En resumen: **la fuente es SICOP**; el Observatorio es el canal por el que SICOP
llega en un formato que un programa puede consumir. Las dos direcciones se citan
en la pantalla del módulo, en el panel "¿De dónde salen estos datos?".

Para ubicar cada compra en el mapa se usa la misma lista territorial oficial que
ya consume el selector global del observatorio: `https://ubicaciones.paginasweb.cr/`

### De los 25 archivos del ZIP, se usan 3

| Archivo | Qué aporta |
|---|---|
| `ProcedimientoAdjudicacion.csv` | Las compras: monto en colones, fecha, tipo de concurso, quién compró y quién vendió |
| `InstitucionesRegistradas.csv` | La lista de instituciones públicas con su dirección registrada |
| `Proveedores.csv` | La lista de empresas proveedoras con su dirección registrada y su tamaño |

---

## 3. Cómo se consume la fuente

**SICOP no se puede consultar directamente desde el navegador.** Ni el módulo de
datos abiertos de SICOP ni el contenedor del Observatorio permiten que una página
web les pida datos: el navegador bloquea la petición por seguridad (CORS). Se
comprobó pidiéndole permiso al servidor y respondió que no:

```
HTTP/1.1 403 CORS not enabled or no matching rule found for this request.
<Error><Code>CorsPreflightFailure</Code>...
```

Por eso el consumo se hace con un **programa que se ejecuta aparte, bajo demanda**
(el bloque *Worker* de la arquitectura sugerida en el enunciado). Ese programa
descarga los datos oficiales, los ordena y deja un archivo listo que la página web
sí puede leer. **No hace falta montar ni mantener un servidor**: el proyecto sigue
siendo una web estática.

```
SICOP (ZIP mensuales)  →  programa de descarga en Node
                       →  public/sicop/sicop-territorial.json
                       →  la web filtra, calcula y grafica en el navegador
```

### Paso 1 — Descarga (solo los pedazos que hacen falta)

Cada ZIP mensual pesa unos 48 MB, pero el módulo solo necesita 3 de sus 25
archivos. En vez de bajar el ZIP entero, el programa lee primero el *índice* del
ZIP (que dice en qué posición exacta está cada archivo adentro) y luego pide al
servidor **solo esos pedazos**, usando peticiones HTTP con rango de bytes.

**Resultado medido en la corrida de 24 meses: se descargaron 13,9 MB en lugar de
1 017 MB — un 98,6 % menos.** Está implementado sin librerías externas en
[`etl/sicopZip.mjs`](./etl/sicopZip.mjs).

### Paso 2 — Ordenar y ubicar en el mapa

1. Leer los CSV, que vienen separados por `;`, con comillas, con saltos de línea
   dentro de los textos y con un espacio raro (U+00A0) usado entre palabras.
2. Quitar compras repetidas.
3. **Traducir la dirección de SICOP a la división territorial oficial**, que no
   coincide (ver *Problemas que aparecieron*, más abajo).
4. Dejar ya sumado lo que la web necesita: totales por provincia, por cantón y
   por distrito, evolución mes a mes, de qué provincia sale el dinero y a cuál
   llega, tipos de concurso, instituciones y empresas.

### Paso 3 — Guardar el resultado

`public/sicop/sicop-territorial.json` (unos 218 KB), que incluye un bloque de
**procedencia**: de dónde salieron los datos, qué archivos se usaron, en qué
fecha se descargaron, cuántos registros se procesaron y qué advertencias hay que
tener en cuenta al leerlos.

---

## 4. Qué se ve en la pantalla

Toda la pantalla está escrita para que la entienda cualquier persona, sin
formación en contratación pública ni en informática: **cada tarjeta lleva arriba
una explicación corta de qué muestra y cómo leerla**, los montos van escritos
completos ("₡414,3 mil millones" y no "₡414,3 mil M"), y al final hay un glosario
con las palabras que no se pueden evitar, incluida "egreso".

- **Dos formas de contar el dinero.** La misma compra se puede contar en la
  provincia de la *institución que compra* o en la de la *empresa que vende*.
  Son dos preguntas distintas y el módulo no las mezcla.
- **Números calculados por el observatorio** (SICOP no los publica): qué parte
  del total del país representa el territorio, cuánto cuesta en promedio cada
  compra, y **cuánto dinero se queda en la provincia** (qué parte del egreso de
  sus instituciones va a empresas de esa misma provincia).
- **Comparación entre provincias**, o entre cantones cuando hay un cantón elegido
  en el selector global.
- **A dónde va el dinero**: de qué provincia sale y a cuál llega.
- **Evolución mes a mes** del egreso, con detalle al pasar el mouse.
- **Tipos de concurso** con los que se compró.
- **Buscador y tabla** de instituciones y empresas, con su dirección registrada.
- **Panel de procedencia** con la fecha de descarga y las advertencias.
- **Glosario** dentro de la misma página, para los términos que no se pueden
  evitar.

Todo reacciona al selector territorial global (`useLocation`).

---

## 5. Cómo ejecutarlo

El repositorio ya trae el archivo de datos generado, así que la aplicación
funciona con `npm run dev` sin pasos extra. Para volver a generarlo desde la
fuente oficial:

```bash
# Descarga y ordena los últimos 24 meses (lo que hace por defecto)
node src/modules/procurement/etl/fetchSicop.mjs

# Otros períodos
node src/modules/procurement/etl/fetchSicop.mjs --meses=36
node src/modules/procurement/etl/fetchSicop.mjs --desde=202401 --hasta=202412

# Revisar que el archivo generado esté bien
node src/modules/procurement/etl/verifyDataset.mjs
```

Necesita Node 18 o superior.

### Variables de entorno

**Este módulo no tiene ningún secreto.** SICOP y el Observatorio de Compra
Pública publican los archivos de forma abierta: no hay token, ni usuario, ni
contraseña, ni llave de API. Por eso la URL de la fuente **no va en un `.env`**:

- No es un secreto, y esconderla no protegería nada.
- El enunciado exige lo contrario: *"Debe indicarse claramente de dónde provienen
  los datos"* y *"Lista de fuentes OSINT utilizadas y enlace oficial de cada
  una"*. La URL se muestra en la interfaz, en este README y dentro del propio
  archivo de datos.
- Metida en un `.env` (que está en `.gitignore`), el proyecto dejaría de
  funcionar al clonarlo sin un paso de configuración extra e innecesario.

El requisito del enunciado sobre variables de entorno apunta a fuentes que sí
piden credenciales, como el **web service del BCCR**, que exige un token de
suscripción.

Dicho eso, las URL base sí son *configuración* (podrían cambiar de host), así que
se pueden sobrescribir sin editar código. Todas son **opcionales** y traen el
valor público oficial por defecto:

| Variable | Para qué sirve | Valor por defecto |
|---|---|---|
| `SICOP_CONTAINER_URL` | Contenedor de los ZIP mensuales, por si Hacienda cambia de host o se usa un espejo | El contenedor público del Observatorio |
| `DTA_BASE_URL` | API de la División Territorial usada para ubicar cada compra | `https://ubicaciones.paginasweb.cr` |
| `SICOP_MESES` | Cuántos meses descargar | `24` |
| `SICOP_DESDE` / `SICOP_HASTA` | Rango exacto en formato `AAAAMM` | sin definir |

Los argumentos de la línea de comandos (`--meses`, `--desde`, `--hasta`) tienen
prioridad sobre las variables de entorno. Para usar un archivo `.env`:

```bash
node --env-file=.env src/modules/procurement/etl/fetchSicop.mjs
```

La aplicación web no usa ninguna variable de entorno: lee su archivo de datos
desde la ruta pública del sitio.

Bajar 24 meses tarda unos 2 minutos y va mostrando el avance mes a mes.

---

## 6. Archivos del módulo

```text
src/modules/procurement/
├── etl/                          # El programa que descarga y ordena los datos
│   ├── fetchSicop.mjs            # Programa principal
│   ├── sicopZip.mjs              # Lee solo los pedazos necesarios del ZIP remoto
│   ├── csv.mjs                   # Lee los CSV separados por ';'
│   ├── territory.mjs             # Traduce las direcciones de SICOP al mapa oficial
│   ├── http.mjs                  # Descargas con reintentos cuando la fuente falla
│   └── verifyDataset.mjs         # Revisa que el archivo generado esté correcto
├── constants/sicopSource.ts      # Datos de la fuente y glosario
├── types/procurement.types.ts
├── services/
│   ├── procurementService.ts     # Carga el archivo: espera, reintenta, guarda en caché
│   └── procurementAnalytics.ts   # Filtros, sumas y cálculos (funciones puras)
├── hooks/useProcurement.ts
└── components/
    ├── ProcurementView.tsx       # La pantalla
    ├── ProcurementRanking.tsx    # Barras comparando territorios
    ├── ProcurementTrend.tsx      # Gráfico de meses
    ├── ProcurementFlows.tsx      # De dónde sale el dinero y a dónde llega
    ├── ProcurementEntityTable.tsx
    └── ProcurementView.css
```

Lo que produce el programa: `public/sicop/sicop-territorial.json`.

---

## 7. Qué pasa cuando algo falla

| Si pasa esto... | La aplicación hace esto |
|---|---|
| El archivo de datos no se ha generado | Avisa y dice exactamente qué comando correr |
| Se cae la conexión al cargar | Reintenta sola y ofrece un botón "Intentar de nuevo" |
| El archivo está dañado o es de otra versión | Lo detecta antes de dibujar nada y muestra el error |
| El cantón elegido no tiene datos en SICOP | Muestra los datos de toda la provincia y lo avisa |
| El distrito elegido no tiene datos | Muestra los datos del cantón y lo avisa |
| La fuente falla mientras se descarga | Reintenta hasta 6 veces, esperando cada vez un poco más |

Durante las pruebas el servidor de SICOP falló por tiempo de espera en más o
menos 1 de cada 4 corridas. Sin los reintentos, una descarga de 24 meses se caía
a mitad de camino y había que empezar de cero.

---

## 8. Problemas que aparecieron y cómo se resolvieron

**El navegador no puede pedirle datos a SICOP.** Se resolvió con el programa de
descarga en lugar de un servidor propio, así el proyecto sigue siendo estático y
se puede publicar como una web común.

**Bajar 24 meses completos son casi 1 GB.** Leyendo solo los pedazos necesarios
del ZIP bajó a 13,9 MB.

**Las direcciones de SICOP no coinciden con la división territorial oficial.**
Hubo que armar una tabla de equivalencias:
- La lista oficial llama `Central` al primer cantón de 6 provincias; SICOP usa el
  nombre de la ciudad (`San José`, `Cartago`, `Limón`…).
- SICOP conserva nombres viejos: `Aguirre` (hoy Quepos), `Valverde Vega` (hoy
  Sarchí), `Alfaro Ruiz` (hoy Zarcero), `León Cortés` (hoy León Cortés Castro).
- `Monteverde` y `Puerto Jiménez` son cantones nuevos que todavía no están en la
  lista oficial que usamos. Se dejan con el nombre de SICOP y sin código, en vez
  de meterlos a la fuerza en otro cantón y falsear el dato.

Con esas equivalencias el cruce queda completo: **el 100 % de las compras logra
ubicar a su institución** y los 82 cantones del país quedan representados.

**Las columnas cambian de orden entre un mes y otro.** Los archivos de enero de
2025 y enero de 2026 traen las mismas columnas en distinto orden. Por eso el
lector busca cada columna por su nombre y nunca por su posición.

**Dos meses vienen vacíos desde la fuente.** SICOP publicó los archivos de enero
de 2025 y enero de 2026 con solo el encabezado (455 bytes). Esas compras sí
existen: aparecieron en los archivos de meses posteriores. El módulo lo detecta,
lo guarda en `meta.periodosSinDatos` y lo marca en el gráfico, en vez de mostrar
dos meses en cero como si no se hubiera comprado nada.

**Hay compras más viejas que el período analizado.** Una compra puede quedar en
firme antes del mes en que SICOP la publica, así que arrastra meses anteriores
incompletos. Esos meses se marcan y se dejan fuera del gráfico, para no mostrar
una caída que nunca ocurrió; igual siguen contando en los totales.

---

## 9. Terminología

Se usa **egreso** (y no "gasto") en toda la interfaz, por ser el término que
emplea la hacienda pública costarricense para el dinero que sale de las arcas del
Estado. Como no es una palabra de uso diario, aparece definida en el glosario de
la propia pantalla: *"el dinero que sale de las arcas públicas; aquí siempre se
refiere a dinero que sale para pagarle a alguien que le vendió algo al Estado"*.

---

## 10. Uso responsable

- Solo se usan datos públicos. No se evade ningún usuario, contraseña, CAPTCHA
  ni límite de uso, y no se usa ninguna credencial.
- El módulo trabaja con **instituciones y empresas**, no con datos de personas.
- El lugar que se muestra es la **dirección registrada** de la institución o de
  la empresa, **no el lugar donde se usa lo comprado**. La pantalla lo dice de
  forma explícita.
- Los montos son **dinero comprometido en compras aprobadas**, no dinero ya pagado.
- El dato de "cuánto dinero se queda en la provincia" se presenta solo como una
  medida de concentración. No dice que una compra sea buena o mala: que dos cosas
  ocurran juntas no significa que una cause la otra.
- SICOP avisa que sus datos abiertos son una copia con hasta un día de atraso
  respecto a su sistema principal. Ese aviso se muestra dentro de la pantalla.

---

## 11. Accesibilidad de los gráficos

Los colores salen de la paleta institucional del observatorio y se validaron para
daltonismo y contraste, en modo claro y en modo oscuro:

| Para qué se usa | Modo claro | Modo oscuro |
|---|---|---|
| Barras y línea principal | `--cr-blue-600` `#2563eb` | `#3b82f6` |
| Territorio elegido / dinero que se queda | `--cr-forest-600` `#059669` | `#047857` |

Los dos colores se distinguen con holgura entre sí (ΔE ≥ 23) tanto en visión
normal como en los dos tipos más comunes de daltonismo, y ambos tienen contraste
suficiente contra el fondo en los dos modos. Además **cada barra y cada punto
llevan su etiqueta y su número escritos**, así que nunca hay que depender del
color para entender el gráfico, y la tabla de detalle sirve como versión escrita
de todo lo que se grafica.
