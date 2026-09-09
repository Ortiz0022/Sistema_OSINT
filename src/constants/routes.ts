export interface AppRoute {
  path: string;
  name: string;
  shortName: string;
  description: string;
  moduleKey: 'procurement' | 'security' | 'publicData' | 'electoral';
  futureSource: string;
}

export const APP_ROUTES = {
  HOME: '/',
  PROCUREMENT: '/contratacion-publica',
  SECURITY: '/seguridad',
  PUBLIC_DATA: '/datos-publicos',
  ELECTORAL: '/padron-electoral',
} as const;

export const MODULE_NAV_ITEMS: AppRoute[] = [
  {
    path: APP_ROUTES.PROCUREMENT,
    name: 'Contratación Pública',
    shortName: 'Contratación',
    description: 'Monitoreo de compras estatales, licitaciones y adjudicaciones.',
    moduleKey: 'procurement',
    futureSource: 'SICOP',
  },
  {
    path: APP_ROUTES.SECURITY,
    name: 'Seguridad',
    shortName: 'Seguridad',
    description: 'Estadísticas delictivas, denuncias e indicadores de seguridad ciudadana.',
    moduleKey: 'security',
    futureSource: 'OIJ / Estadísticas Policiales',
  },
  {
    path: APP_ROUTES.PUBLIC_DATA,
    name: 'Datos Públicos',
    shortName: 'Datos Públicos',
    description: 'Conjuntos de datos gubernamentales abiertos para transparencia institucional.',
    moduleKey: 'publicData',
    futureSource: 'Portal Nacional de Datos Abiertos',
  },
  {
    path: APP_ROUTES.ELECTORAL,
    name: 'Padrón Electoral',
    shortName: 'Electoral',
    description: 'Estadísticas agregadas del padrón por territorio.',
    moduleKey: 'electoral',
    futureSource: 'Tribunal Supremo de Elecciones (TSE)',
  },
];
