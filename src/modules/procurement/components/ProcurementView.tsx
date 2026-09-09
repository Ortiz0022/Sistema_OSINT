import React from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  Building2,
  Database,
  HelpCircle,
  Info,
  Layers,
  Search,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { SectionContainer } from '../../../components/common/SectionContainer';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { SourceInfo } from '../../../components/common/SourceInfo';
import { GLOSSARY, LENS_LABELS, SICOP_SOURCE } from '../constants/sicopSource';
import { useProcurement } from '../hooks/useProcurement';
import {
  formatCrc,
  formatCrcCompact,
  formatInteger,
  formatMonth,
  formatPercent,
} from '../services/procurementAnalytics';
import { ProcurementRanking } from './ProcurementRanking';
import { ProcurementTrend } from './ProcurementTrend';
import { ProcurementFlows } from './ProcurementFlows';
import { ProcurementEntityTable } from './ProcurementEntityTable';
import { Select, type SelectOption } from './ui/Select';
import type { ProcurementLens, ProcurementSort } from '../types/procurement.types';
import './ProcurementView.css';

const LENSES: ProcurementLens[] = ['comprador', 'proveedor'];

const SORT_OPTIONS: readonly SelectOption<ProcurementSort>[] = [
  { value: 'monto', label: 'Dinero, de mayor a menor', hint: 'Primero quien más dinero movió' },
  { value: 'lineas', label: 'Cantidad de compras', hint: 'Primero quien hizo más compras' },
];

export const ProcurementView: React.FC = () => {
  const { dataset, analysis, filters, updateFilters, isLoading, error, errorHint, reload } =
    useProcurement();

  const lens = LENS_LABELS[filters.lens];
  const esComprador = filters.lens === 'comprador';

  return (
    <SectionContainer>
      <PageHeader
        title="Compras del Estado"
        description="Cuánto dinero egresa el Estado costarricense cuando compra bienes y servicios, en qué parte del país ocurre ese egreso y a qué zonas les llega. Todo sale de SICOP, el sistema oficial donde queda registrada cada compra pública."
        badgeText={dataset ? 'Datos cargados' : 'Cargando datos'}
        badgeVariant={dataset ? 'success' : 'warning'}
      />

      {isLoading && !dataset && (
        <Card>
          <LoadingState
            message="Cargando las compras del Estado..."
            description="Estamos leyendo el archivo de datos que se armó con la información oficial de SICOP."
          />
        </Card>
      )}

      {error && !dataset && (
        <Card>
          <ErrorState
            title="No se pudieron cargar los datos de SICOP"
            message={errorHint ? `${error} ${errorHint}` : error}
            onRetry={reload}
            retryLabel="Intentar de nuevo"
          />
        </Card>
      )}

      {dataset && analysis && (
        <>
          {/* Explicación de entrada: qué es esta pantalla y cómo se recorre */}
          <div className="intro">
            <HelpCircle className="intro__icon" />
            <div>
              <p className="intro__title">¿Qué estoy viendo?</p>
              <p className="intro__text">
                Cuando una institución pública compra algo —desde papel de oficina hasta un
                puente— queda registrado en SICOP: qué compró, a qué empresa y por cuánto dinero.
                Aquí juntamos {formatInteger(dataset.meta.conteos.lineasUsadas)} de esas compras de
                los últimos {dataset.meta.periodos.length} meses y las ubicamos en el mapa del país.
              </p>
              <p className="intro__text">
                Así se puede ver <strong>cuánto egresa cada provincia</strong> y{' '}
                <strong>a qué zonas del país llega ese dinero</strong>. Para cambiar de territorio,
                usá el selector de provincia y cantón que está arriba de la página. Al final hay un
                glosario con el significado de cada palabra.
              </p>
            </div>
          </div>

          {/* Controles */}
          <Card className="module-filter-card" padding="sm">
            <div className="filter-bar">
              <div className="filter-control filter-control--lens">
                <span className="filter-control__label" id="procurement-lens-label">
                  Contar el dinero según:
                </span>
                <div
                  className="lens-switch__group"
                  role="group"
                  aria-labelledby="procurement-lens-label"
                >
                  {LENSES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`lens-switch__btn${filters.lens === option ? ' lens-switch__btn--active' : ''}`}
                      aria-pressed={filters.lens === option}
                      onClick={() => updateFilters({ lens: option })}
                    >
                      {option === 'comprador' ? (
                        <Building2 className="lens-switch__icon" />
                      ) : (
                        <Truck className="lens-switch__icon" />
                      )}
                      {LENS_LABELS[option].title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-control filter-control--search">
                <label className="filter-control__label" htmlFor="procurement-search">
                  Buscar en la lista del final:
                </label>
                <div className="filter-search">
                  <Search className="filter-search__icon" />
                  <input
                    id="procurement-search"
                    type="text"
                    placeholder={
                      esComprador
                        ? 'Nombre o cédula de una institución...'
                        : 'Nombre o cédula de una empresa...'
                    }
                    value={filters.searchQuery}
                    onChange={(event) => updateFilters({ searchQuery: event.target.value })}
                    className="filter-search__input"
                  />
                </div>
              </div>

              <div className="filter-control filter-control--sort">
                <span className="filter-control__label" id="procurement-sort-label">
                  Ordenar la lista por:
                </span>
                <Select
                  value={filters.sortBy}
                  options={SORT_OPTIONS}
                  onChange={(sortBy) => updateFilters({ sortBy })}
                  labelledBy="procurement-sort-label"
                />
              </div>
            </div>

            <p className="filter-note">
              <Info className="filter-note__icon" />
              <span>
                <strong>Estás viendo: {lens.title.toLowerCase()}.</strong> {lens.description} El
                buscador y el orden solo afectan la lista grande del final de la página.
              </span>
            </p>
          </Card>

          {/* Territorio y período */}
          <div className="scope-bar">
            <Badge variant="primary">{analysis.scope.label}</Badge>
            <span className="scope-bar__hint">
              Compras aprobadas entre {formatMonth(dataset.meta.ventana.desde)} y{' '}
              {formatMonth(dataset.meta.ventana.hasta)}
            </span>
          </div>

          {analysis.scope.degradedNotice && (
            <div className="notice notice--warning" role="status">
              <AlertTriangle className="notice__icon" />
              <span>{analysis.scope.degradedNotice}</span>
            </div>
          )}

          {/* Números principales */}
          <p className="section-help">
            Estos números resumen el territorio que tenés seleccionado. Cambian solos cuando elegís
            otra provincia o cantón arriba.
          </p>
          <div className="module-grid-metrics">
            {analysis.indicators.map((indicator) => (
              <Card key={indicator.key} padding="md">
                <div className="metric">
                  <span className="metric__label">{indicator.label}</span>
                  <span className="metric__value">{indicator.value}</span>
                  <span className="metric__helper">{indicator.helper}</span>
                </div>
              </Card>
            ))}
          </div>

          <div className="module-columns">
            <Card
              header={
                <div className="area-header">
                  <h3 className="area-title">
                    {analysis.scope.level === 'canton' || analysis.scope.level === 'distrito'
                      ? '¿Qué cantón de esta provincia mueve más dinero?'
                      : '¿Qué provincia mueve más dinero?'}
                  </h3>
                  <span className="area-tag">
                    <Layers className="area-tag__icon" /> Según {lens.short.toLowerCase()}
                  </span>
                </div>
              }
            >
              <p className="card-help">
                Cada barra es un territorio. Entre más larga la barra, más dinero movió ese lugar. La
                barra <strong>verde</strong> es el territorio que tenés seleccionado arriba. Poné el
                mouse encima de una barra para ver los números exactos.
              </p>
              <ProcurementRanking
                items={analysis.ranking}
                entityLabel={esComprador ? 'instituciones' : 'empresas'}
              />
            </Card>

            <Card
              header={
                <div className="area-header">
                  <h3 className="area-title">{analysis.flowsTitle}</h3>
                  <span className="area-tag">
                    <ArrowLeftRight className="area-tag__icon" /> De dónde sale y a dónde llega
                  </span>
                </div>
              }
            >
              <p className="card-help">
                El dinero que egresa una provincia no siempre se queda ahí: la empresa que gana la
                compra puede estar en otra parte del país. Cada barra muestra a qué provincia le
                llegó. Las <strong>verdes</strong> son el dinero que se quedó en la misma provincia.
              </p>
              <ProcurementFlows
                flows={analysis.flows}
                showLocalLegend={analysis.scope.provinciaId !== null}
              />
              {analysis.retencionLocal !== null && analysis.retencionProvincia && (
                <p className="card-note">
                  De cada 100 colones de egreso de las instituciones de{' '}
                  {analysis.retencionProvincia}, {Math.round(analysis.retencionLocal)} terminan en
                  empresas de {analysis.retencionProvincia}. Este dato es de toda la provincia, no
                  del cantón, y solo dice dónde están registradas las empresas: no significa que una
                  compra sea mejor o peor por eso.
                </p>
              )}
            </Card>
          </div>

          <div className="module-main-area">
            <Card
              header={
                <div className="area-header">
                  <h3 className="area-title">¿Cómo cambió el egreso mes a mes?</h3>
                  <span className="area-tag">
                    <TrendingUp className="area-tag__icon" /> Pasá el mouse por el gráfico
                  </span>
                </div>
              }
            >
              <p className="card-help">
                Cada punto de la línea es un mes. La línea sube cuando en ese mes se aprobaron
                compras por más dinero. Un pico muy alto casi siempre es <em>una sola</em> compra
                enorme, no muchas compras juntas.
              </p>
              <ProcurementTrend points={analysis.trend} emptyPeriods={dataset.meta.periodosSinDatos} />
              {(analysis.trendIsPartial || dataset.meta.periodosSinDatos.length > 0) && (
                <p className="card-note">
                  {analysis.trendIsPartial && (
                    <>
                      El gráfico solo muestra los meses completos. Dejamos por fuera{' '}
                      {formatInteger(dataset.meta.conteos.lineasFueraDeVentana)} compras más viejas
                      que el período analizado, porque harían ver meses incompletos como si hubieran
                      sido flojos.{' '}
                    </>
                  )}
                  {dataset.meta.periodosSinDatos.length > 0 && (
                    <>
                      Ojo con{' '}
                      {dataset.meta.periodosSinDatos
                        .map((periodo) => formatMonth(`${periodo.slice(0, 4)}-${periodo.slice(4)}`))
                        .join(' y ')}
                      : SICOP publicó esos archivos vacíos y sus compras aparecieron después, en los
                      archivos de meses siguientes. Van marcados con un círculo en el gráfico.
                    </>
                  )}
                </p>
              )}
            </Card>
          </div>

          <div className="module-columns">
            <Card
              header={
                <div className="area-header">
                  <h3 className="area-title">¿Con qué tipo de concurso se compró?</h3>
                  <span className="area-tag">Reparto del egreso</span>
                </div>
              }
            >
              <p className="card-help">
                El Estado no puede comprar como quiera: según cuánto va a costar, la ley lo obliga a
                seguir un procedimiento distinto. Las compras grandes van por licitación, que es más
                lenta pero tiene más controles; las pequeñas y urgentes usan procedimientos más
                rápidos. Acá se ve cómo se reparte el egreso entre esos tipos.
              </p>
              {analysis.types.length === 0 ? (
                <p className="chart-empty">No hay compras registradas en este territorio.</p>
              ) : (
                <ul className="types" role="list">
                  {analysis.types.map((type) => (
                    <li key={type.tipo} className="types__row">
                      <div className="types__head">
                        <span className="types__label">{type.tipo}</span>
                        <span className="types__value">{formatCrcCompact(type.monto)}</span>
                      </div>
                      <div className="types__track">
                        <div className="types__bar" style={{ width: `${Math.max(type.share, 1)}%` }} />
                      </div>
                      <span className="types__meta">
                        {formatPercent(type.share)} del dinero · {formatInteger(type.lineas)} compras
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              header={
                <div className="area-header">
                  <h3 className="area-title">¿De dónde salen estos datos?</h3>
                  <span className="area-tag">
                    <Database className="area-tag__icon" /> Fuente y fecha
                  </span>
                </div>
              }
            >
              <p className="card-help">
                Ningún número de esta página es inventado ni estimado: todos salen de datos públicos
                oficiales. Acá queda escrito de dónde se bajaron y cuándo, para que cualquier
                persona pueda ir a comprobarlo por su cuenta.
              </p>
              <dl className="provenance">
                <div>
                  <dt>Sistema de origen</dt>
                  <dd>
                    {dataset.meta.sistemaOrigen}. Es el sistema donde por ley quedan registradas
                    todas las compras del Estado.{' '}
                    <a href={SICOP_SOURCE.officialUrl} target="_blank" rel="noopener noreferrer">
                      Módulo de datos abiertos de SICOP
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Quién publica los archivos que descargamos</dt>
                  <dd>
                    {dataset.meta.entidad}. Republica los mismos datos de SICOP como archivos
                    abiertos que sí se pueden descargar de forma automática.{' '}
                    <a href={SICOP_SOURCE.distributionUrl} target="_blank" rel="noopener noreferrer">
                      Página de descargas
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Cada cuánto se actualizan</dt>
                  <dd>{dataset.meta.actualizacion}</dd>
                </div>
                <div>
                  <dt>Cómo los obtuvimos</dt>
                  <dd>
                    Un programa del proyecto descarga solo los archivos oficiales mes a mes, los
                    ordena y los ubica en provincias y cantones usando la lista territorial oficial
                    de Costa Rica.
                  </dd>
                </div>
                <div>
                  <dt>Archivo de origen</dt>
                  <dd className="provenance__mono">{dataset.meta.urlDatos}</dd>
                </div>
                <div>
                  <dt>Fecha en que se descargaron</dt>
                  <dd>{new Date(dataset.meta.generadoEn).toLocaleString('es-CR')}</dd>
                </div>
                <div>
                  <dt>Cuánto se procesó</dt>
                  <dd>
                    {formatInteger(dataset.meta.conteos.lineasUsadas)} compras, por un total de{' '}
                    {formatCrc(dataset.meta.montoTotalCrc)}
                  </dd>
                </div>
              </dl>

              <p className="provenance__intro">Cosas que hay que tener claras al leer estos números:</p>
              <ul className="provenance__warnings">
                {dataset.meta.advertencias.map((advertencia) => (
                  <li key={advertencia}>{advertencia}</li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="module-main-area">
            <Card
              header={
                <div className="area-header">
                  <h3 className="area-title">{analysis.entitiesTitle}</h3>
                  <span className="area-tag">{formatInteger(analysis.entities.length)} en la lista</span>
                </div>
              }
            >
              <p className="card-help">
                {esComprador
                  ? 'Lista de las instituciones públicas del territorio seleccionado, de la que más dinero movió a la que menos. Al lado de cada una aparece su dirección registrada y cuántas compras hizo.'
                  : 'Lista de las empresas que le vendieron al Estado, de la que más dinero recibió a la que menos. Al lado de cada una aparece dónde está registrada y cuántas compras ganó.'}{' '}
                Para encontrar una en particular, escribí su nombre en el buscador de arriba.
              </p>
              <ProcurementEntityTable
                rows={analysis.entities}
                entityHeader={esComprador ? 'Institución que compra' : 'Empresa que vende'}
              />
            </Card>
          </div>

          {/* Glosario */}
          <div className="module-main-area">
            <Card
              header={
                <div className="area-header">
                  <h3 className="area-title">¿Qué significa cada palabra?</h3>
                  <span className="area-tag">
                    <BookOpen className="area-tag__icon" /> Glosario
                  </span>
                </div>
              }
            >
              <p className="card-help">
                Palabras que aparecen en esta página y que nadie tiene por qué saberse de memoria.
              </p>
              <dl className="glossary">
                {GLOSSARY.map((entry) => (
                  <div key={entry.term} className="glossary__item">
                    <dt>{entry.term}</dt>
                    <dd>{entry.definition}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>

          <SourceInfo
            sourceName={SICOP_SOURCE.name}
            entityName={`${SICOP_SOURCE.officialEntity} · archivos publicados por ${SICOP_SOURCE.distributionEntity}`}
            status="activo"
            officialUrl={SICOP_SOURCE.officialUrl}
            queryDate={new Date(dataset.meta.generadoEn).toLocaleDateString('es-CR')}
            notes={`Compras del Estado aprobadas entre ${formatMonth(
              dataset.meta.ventana.desde
            )} y ${formatMonth(
              dataset.meta.ventana.hasta
            )}, ubicadas por provincia y cantón con la división territorial oficial de Costa Rica.`}
          />
        </>
      )}
    </SectionContainer>
  );
};

export default ProcurementView;
