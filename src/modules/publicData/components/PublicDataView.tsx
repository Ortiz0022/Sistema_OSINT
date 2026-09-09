import React from 'react';
import { AlertTriangle, Briefcase, Database, HelpCircle, Layers, PieChart, Search } from 'lucide-react';
import { SectionContainer } from '../../../components/common/SectionContainer';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { SourceInfo } from '../../../components/common/SourceInfo';
import { GLOSSARY, MEIC_PYMES_SOURCE, SIZE_FILTER_LABELS } from '../constants/meicSource';
import { usePublicData } from '../hooks/usePublicData';
import { formatInteger } from '../services/publicDataAnalytics';
import { PublicDataRanking } from './PublicDataRanking';
import { PublicDataSizeChart } from './PublicDataSizeChart';
import { PublicDataTable } from './PublicDataTable';
import type { PublicDataSizeFilter } from '../types/publicData.types';
import './PublicDataView.css';

const SIZE_FILTERS: PublicDataSizeFilter[] = ['todas', 'Micro', 'Pequeña', 'Mediana'];

/** Advertencias del dataset que sí vale la pena mostrar en pantalla, resumidas a lo esencial. */
const KEY_WARNING_HINTS = ['fotografía del padrón', 'nombre de distrito que no coincide', 'clasifica el MEIC'];

export const PublicDataView: React.FC = () => {
  const { dataset, analysis, filters, updateFilters, isLoading, error, errorHint, reload } = usePublicData();

  const highlightedWarnings = dataset
    ? dataset.meta.advertencias.filter((warning) => KEY_WARNING_HINTS.some((hint) => warning.includes(hint)))
    : [];

  return (
    <SectionContainer>
      <PageHeader
        title="Datos Públicos y Transparencia"
        description="Empresas Pyme activas del MEIC, por provincia, cantón y distrito."
        badgeText={dataset ? 'Datos cargados' : 'Cargando datos'}
        badgeVariant={dataset ? 'success' : 'warning'}
      />

      {isLoading && !dataset && (
        <Card>
          <LoadingState
            message="Cargando el padrón de Pymes..."
            description="Estamos leyendo el archivo de datos que se armó con la información oficial del MEIC."
          />
        </Card>
      )}

      {error && !dataset && (
        <Card>
          <ErrorState
            title="No se pudieron cargar los datos de Pymes"
            message={errorHint ? `${error} ${errorHint}` : error}
            onRetry={reload}
            retryLabel="Intentar de nuevo"
          />
        </Card>
      )}

      {dataset && analysis && (
        <>
          {/* Explicación de entrada, recortada a lo esencial */}
          <div className="intro">
            <HelpCircle className="intro__icon" />
            <div>
              <p className="intro__title">¿Qué estoy viendo?</p>
              <p className="intro__text">
                El MEIC publica cada mes las Pymes con condición activa; acá están cruzadas con tu
                territorio. Usá el selector de arriba para cambiar de provincia o cantón —{' '}
                <strong>todo en la página se actualiza solo</strong>.
              </p>
            </div>
          </div>

          {/* Territorio */}
          <div className="scope-bar">
            <Badge variant="primary">{analysis.scope.label}</Badge>
            <span className="scope-bar__hint">Padrón de {dataset.meta.periodoDatos}</span>
          </div>

          {analysis.scope.degradedNotice && (
            <div className="notice notice--warning" role="status">
              <AlertTriangle className="notice__icon" />
              <span>{analysis.scope.degradedNotice}</span>
            </div>
          )}

          {/* Panel principal: la dona es la pieza central, con los KPIs al lado */}
          <div className="module-main-area">
            <Card
              header={
                <div className="area-header">
                  <h3 className="area-title">Empresas por tamaño</h3>
                  <span className="area-tag">
                    <PieChart className="area-tag__icon" /> {analysis.scope.label}
                  </span>
                </div>
              }
            >
              <div className="hero-panel">
                <PublicDataSizeChart breakdown={analysis.tamanoBreakdown} />
                <div className="hero-stats">
                  {analysis.indicators.map((indicator) => (
                    <div key={indicator.key} className="hero-stats__row">
                      <span className="metric__label">{indicator.label}</span>
                      <span className="metric__value">{indicator.value}</span>
                      <span className="metric__helper">{indicator.helper}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Ranking territorial (columna ancha) y sectores (columna angosta) */}
          <div className="module-columns module-columns--asym">
            <Card
              header={
                <div className="area-header">
                  <h3 className="area-title">{analysis.rankingTitle}</h3>
                  <span className="area-tag">
                    <Layers className="area-tag__icon" /> Cantidad de empresas
                  </span>
                </div>
              }
            >
              <PublicDataRanking items={analysis.ranking} />
            </Card>

            <Card
              header={
                <div className="area-header">
                  <h3 className="area-title">Sectores (CIIU)</h3>
                  <span className="area-tag">
                    <Briefcase className="area-tag__icon" />
                  </span>
                </div>
              }
            >
              {analysis.sectores.length === 0 ? (
                <p className="chart-empty">Sin empresas en este territorio.</p>
              ) : (
                <ul className="types" role="list">
                  {analysis.sectores.slice(0, 6).map((sector) => (
                    <li key={sector.codigo || sector.descripcion} className="types__row">
                      <div className="types__head">
                        <span className="types__label">{sector.descripcion}</span>
                        <span className="types__value">{formatInteger(sector.total)}</span>
                      </div>
                      <div className="types__track">
                        <div className="types__bar" style={{ width: `${Math.max(sector.share, 1)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Tabla, con sus controles justo al lado (afectan solo esta lista) */}
          <div className="module-main-area">
            <Card
              header={
                <div className="area-header">
                  <h3 className="area-title">Empresas del territorio seleccionado</h3>
                  <span className="area-tag">{formatInteger(analysis.table.length)} en la lista</span>
                </div>
              }
            >
              <div className="filter-bar">
                <div className="filter-control filter-control--size">
                  <span className="filter-control__label" id="publicdata-size-label">
                    Tamaño:
                  </span>
                  <div className="lens-switch__group" role="group" aria-labelledby="publicdata-size-label">
                    {SIZE_FILTERS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`lens-switch__btn${filters.sizeFilter === option ? ' lens-switch__btn--active' : ''}`}
                        aria-pressed={filters.sizeFilter === option}
                        onClick={() => updateFilters({ sizeFilter: option })}
                      >
                        {SIZE_FILTER_LABELS[option]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filter-control filter-control--search">
                  <label className="filter-control__label" htmlFor="publicdata-search">
                    Buscar:
                  </label>
                  <div className="filter-search">
                    <Search className="filter-search__icon" />
                    <input
                      id="publicdata-search"
                      type="text"
                      placeholder="Nombre o identificación..."
                      value={filters.searchQuery}
                      onChange={(event) => updateFilters({ searchQuery: event.target.value })}
                      className="filter-search__input"
                    />
                  </div>
                </div>

                <div className="filter-control filter-control--sort">
                  <label className="filter-control__label" htmlFor="publicdata-sort">
                    Ordenar por:
                  </label>
                  <select
                    id="publicdata-sort"
                    className="filter-select"
                    value={filters.sortBy}
                    onChange={(event) => updateFilters({ sortBy: event.target.value as 'nombre' | 'tamano' })}
                  >
                    <option value="nombre">Nombre (A-Z)</option>
                    <option value="tamano">Tamaño (Mediana primero)</option>
                  </select>
                </div>
              </div>

              <PublicDataTable rows={analysis.table} />
            </Card>
          </div>

          {/* Procedencia + glosario, combinados en una sola tarjeta */}
          <div className="module-main-area">
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
              <dl className="provenance">
                <div>
                  <dt>Quién publica el dato</dt>
                  <dd>
                    {dataset.meta.entidad}.{' '}
                    <a href={MEIC_PYMES_SOURCE.datasetPageUrl} target="_blank" rel="noopener noreferrer">
                      Ficha del dataset
                    </a>{' '}
                    ·{' '}
                    <a href={dataset.meta.portalOficial} target="_blank" rel="noopener noreferrer">
                      Portal oficial
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Formato y licencia</dt>
                  <dd>
                    {dataset.meta.formato} · {dataset.meta.licencia}
                  </dd>
                </div>
                <div>
                  <dt>Período de los datos</dt>
                  <dd>
                    {dataset.meta.periodoDatos}. El MEIC lo subió al portal hasta el{' '}
                    {new Date(dataset.meta.publicadoEnPortal).toLocaleDateString('es-CR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    .
                  </dd>
                </div>
                <div>
                  <dt>Fecha en que se consultó</dt>
                  <dd>{new Date(dataset.meta.generadoEn).toLocaleString('es-CR')}</dd>
                </div>
                <div>
                  <dt>Cuánto se procesó</dt>
                  <dd>{formatInteger(dataset.meta.conteos.empresasUsadas)} empresas activas</dd>
                </div>
              </dl>

              {highlightedWarnings.length > 0 && (
                <>
                  <p className="provenance__intro">Antes de leer los números:</p>
                  <ul className="provenance__warnings">
                    {highlightedWarnings.map((advertencia) => (
                      <li key={advertencia}>{advertencia}</li>
                    ))}
                  </ul>
                </>
              )}

              <p className="provenance__intro">Glosario</p>
              <ul className="glossary-inline">
                {GLOSSARY.map((entry) => (
                  <li key={entry.term}>
                    <strong>{entry.term}:</strong> {entry.definition}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <SourceInfo
            sourceName={MEIC_PYMES_SOURCE.name}
            entityName={`${dataset.meta.entidad} · Portal Nacional de Datos Abiertos de Costa Rica`}
            status="activo"
            officialUrl={MEIC_PYMES_SOURCE.officialUrl}
            queryDate={new Date(dataset.meta.generadoEn).toLocaleDateString('es-CR')}
            notes="Padrón de empresas Pyme activas, publicado por el MEIC y ubicado por provincia, cantón y distrito con la división territorial oficial de Costa Rica."
          />
        </>
      )}
    </SectionContainer>
  );
};

export default PublicDataView;
