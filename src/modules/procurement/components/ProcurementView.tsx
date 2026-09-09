import React from 'react';
import { Search, FileSpreadsheet, BarChart2, Filter, AlertCircle } from 'lucide-react';
import { SectionContainer } from '../../../components/common/SectionContainer';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card } from '../../../components/common/Card';
import { EmptyState } from '../../../components/common/EmptyState';
import { SourceInfo } from '../../../components/common/SourceInfo';
import { DATA_SOURCES } from '../../../constants/sources';
import { useProcurement } from '../hooks/useProcurement';
import './ProcurementView.css';

export const ProcurementView: React.FC = () => {
  const { filters, updateFilters } = useProcurement();

  return (
    <SectionContainer>
      <PageHeader
        title="Contratación Pública"
        description="Monitoreo y fiscalización de procedimientos de compra estatal, licitaciones y contratos de la administración pública costarricense."
        badgeText="Módulo en Preparación"
        badgeVariant="warning"
      />

      {/* Barra de Filtros Específicos del Módulo */}
      <Card className="module-filter-card" padding="sm">
        <div className="filter-bar">
          <div className="filter-search">
            <Search className="filter-search__icon" />
            <input
              type="text"
              placeholder="Buscar por expediente, institución o palabra clave..."
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              className="filter-search__input"
            />
          </div>

          <div className="filter-group">
            <div className="filter-field">
              <label htmlFor="procurement-type">Procedimiento:</label>
              <select
                id="procurement-type"
                value={filters.procurementType}
                onChange={(e) => updateFilters({ procurementType: e.target.value })}
                className="filter-select"
              >
                <option value="all">Todos los tipos</option>
                <option value="licitacion_mayor">Licitación Mayor</option>
                <option value="licitacion_menor">Licitación Menor</option>
                <option value="licitacion_reducida">Licitación Reducida</option>
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="procurement-year">Año fiscal:</label>
              <select
                id="procurement-year"
                value={filters.year}
                onChange={(e) => updateFilters({ year: e.target.value })}
                className="filter-select"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid de Tarjetas Placeholder de Indicadores */}
      <div className="module-grid-metrics">
        <Card
          header={
            <div className="metric-header">
              <span className="metric-title">Volumen de Contrataciones</span>
              <FileSpreadsheet className="metric-icon" />
            </div>
          }
        >
          <div className="metric-placeholder">
            <span className="metric-placeholder__badge">Módulo en preparación</span>
            <span className="metric-placeholder__sub">Sin datos disponibles todavía</span>
          </div>
        </Card>

        <Card
          header={
            <div className="metric-header">
              <span className="metric-title">Monto Total Adjudicado</span>
              <BarChart2 className="metric-icon" />
            </div>
          }
        >
          <div className="metric-placeholder">
            <span className="metric-placeholder__badge">Módulo en preparación</span>
            <span className="metric-placeholder__sub">Sin datos disponibles todavía</span>
          </div>
        </Card>

        <Card
          header={
            <div className="metric-header">
              <span className="metric-title">Distribución por Modalidad</span>
              <Filter className="metric-icon" />
            </div>
          }
        >
          <div className="metric-placeholder">
            <span className="metric-placeholder__badge">Módulo en preparación</span>
            <span className="metric-placeholder__sub">Sin datos disponibles todavía</span>
          </div>
        </Card>
      </div>

      {/* Espacio para Tabla / Gráfico Principal */}
      <div className="module-main-area">
        <Card
          header={
            <div className="area-header">
              <h3 className="area-title">Registro Detallado de Procedimientos SICOP</h3>
              <span className="area-tag">Tabla y Visor</span>
            </div>
          }
        >
          <EmptyState
            title="Sin datos de contratación disponibles"
            message="El esquema y las columnas para la integración de expedientes de SICOP se encuentran listos. La conexión a la fuente de datos se efectuará en la siguiente fase."
            icon={<AlertCircle />}
          />
        </Card>
      </div>

      {/* Información de la fuente oficial */}
      <SourceInfo
        sourceName={DATA_SOURCES.sicop.name}
        entityName={DATA_SOURCES.sicop.officialEntity}
        status={DATA_SOURCES.sicop.status}
        officialUrl={DATA_SOURCES.sicop.officialUrl}
        notes="La integración permitirá consultar contrataciones estatales asociadas a la división territorial seleccionada."
      />
    </SectionContainer>
  );
};

export default ProcurementView;
