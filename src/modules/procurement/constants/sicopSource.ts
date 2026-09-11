/**
 * Metadatos de la fuente OSINT del módulo de Contratación Pública.
 *
 * Se declaran dentro del módulo (y no en `src/constants/sources.ts`) para que
 * la integración de SICOP sea autocontenida y no genere conflictos con los
 * demás módulos del equipo.
 */

export const SICOP_SOURCE = {
  id: 'sicop-datos-abiertos',
  name: 'SICOP — Compras del Estado (datos abiertos)',
  officialEntity: 'SICOP · Sistema Integrado de Compras Públicas',
  /**
   * Fuente oficial: el módulo de datos abiertos del propio SICOP.
   *
   * Es la dirección vigente. La que aparece en el enunciado del curso
   * (`legacyModuleUrl`) fue reemplazada por esta y hoy responde error 500,
   * incluso abriendo antes una sesión en el sitio.
   */
  officialUrl: 'https://www.sicop.go.cr/app/module/pcont/public/ce-open-data',
  /** Dirección citada en el enunciado, ya fuera de servicio. */
  legacyModuleUrl: 'https://www.sicop.go.cr/moduloPcont/pcont/rp/CE_MOD_DATOSABIERTOSVIEW.jsp',
  /**
   * Canal por el que esos mismos datos de SICOP se publican como archivos
   * descargables de forma automatizable, a cargo del Ministerio de Hacienda.
   */
  distributionUrl: 'https://www.observatoriocomprapublica.go.cr/descargas-sicop/',
  distributionEntity: 'Ministerio de Hacienda · Observatorio de Compra Pública',
  /** Ruta del dataset normalizado que produce el ETL del módulo. */
  datasetUrl: 'sicop/sicop-territorial.json',
  /** Archivos del ZIP mensual que consume el ETL. */
  files: ['ProcedimientoAdjudicacion.csv', 'InstitucionesRegistradas.csv', 'Proveedores.csv'],
} as const;

/**
 * Las dos formas de asignar el dinero a un lugar del mapa.
 *
 * El texto está escrito en lenguaje llano a propósito: quien usa el módulo no
 * tiene por qué conocer el vocabulario de contratación pública.
 */
export const LENS_LABELS = {
  comprador: {
    title: 'Dónde está la institución que compra',
    short: 'Quién compra',
    description:
      'El dinero se cuenta en la provincia donde tiene su dirección la institución pública que hizo la compra. Por ejemplo, una compra del ICE cuenta en San José, porque ahí están sus oficinas centrales.',
  },
  proveedor: {
    title: 'Dónde está la empresa que vende',
    short: 'Quién vende',
    description:
      'El dinero se cuenta en la provincia donde tiene su dirección la empresa que ganó la compra. Sirve para ver a qué zonas del país les llega el egreso del Estado.',
  },
} as const;

/**
 * Glosario que se muestra en la interfaz para los términos inevitables.
 *
 * Cada entrada lleva dos versiones: `short` para el globo que aparece al pasar
 * el mouse por encima del término, y `definition` para la lista desplegada.
 */
export const GLOSSARY = [
  {
    term: 'Egreso',
    short: 'Dinero que sale de las arcas públicas.',
    definition:
      'El dinero que sale de las arcas públicas. En esta página siempre se refiere a dinero que sale para pagarle a alguien que le vendió algo al Estado.',
  },
  {
    term: 'Compra adjudicada',
    short: 'Un bien o servicio que el Estado ya decidió comprarle a alguien.',
    definition:
      'Un bien o servicio que el Estado ya decidió comprarle a una empresa específica. Un mismo concurso puede tener varias, una por cada cosa que se compra.',
  },
  {
    term: 'Dinero comprometido',
    short: 'Lo que se aprobó pagar, no lo que ya se pagó.',
    definition:
      'El dinero que el Estado se comprometió a pagar por esas compras. No es lo que ya pagó: es lo que quedó aprobado. En SICOP se le llama "monto adjudicado".',
  },
  {
    term: 'Institución que compra',
    short: 'La entidad pública que hace la compra.',
    definition:
      'La entidad pública que hace la compra: un ministerio, una municipalidad, la CCSS, el ICE, una universidad estatal, etc.',
  },
  {
    term: 'Empresa que vende',
    short: 'Quien le vende al Estado. En SICOP se le llama "proveedor".',
    definition:
      'La empresa o persona que ganó el concurso y le vende al Estado. En SICOP se le llama "proveedor".',
  },
  {
    term: 'Tipo de concurso',
    short: 'La forma en que se hizo la compra, según cuánto cuesta.',
    definition:
      'La forma en que se hizo la compra. Las grandes usan licitación mayor; las pequeñas y urgentes usan procedimientos más rápidos.',
  },
  {
    term: 'Dirección registrada',
    short: 'La dirección anotada en SICOP, no donde se usa lo comprado.',
    definition:
      'La dirección que la institución o la empresa tiene anotada en SICOP. Es donde están sus oficinas, no necesariamente donde se usa lo comprado.',
  },
] as const;
