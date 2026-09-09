import React from 'react';
import { ShieldAlert, TrendingUp, Map, Calendar, EyeOff } from 'lucide-react';
import { SectionContainer } from '../../../components/common/SectionContainer';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card } from '../../../components/common/Card';
import { EmptyState } from '../../../components/common/EmptyState';
import { SourceInfo } from '../../../components/common/SourceInfo';
import { DATA_SOURCES } from '../../../constants/sources';
import { useSecurity } from '../hooks/useSecurity';
import './SecurityView.css';

export const SecurityView: React.FC = () => {
  const { filters, updateFilters } = useSecurity();

  return (
    <SectionContainer>
      <PageHeader
        title="Seguridad y Estadísticas Policiales"
        description="Seguimiento de incidencias delictivas, denuncias y patrones de seguridad territorial en Costa Rica."
        badgeText="Módulo en Preparación"
        badgeVariant="warning"
      />

      {/* Filtros específicos de Seguridad */}
      <Card className="security-filters" padding="sm">
        <div className="filter-bar">
          <div className="filter-field">
            <label htmlFor="crime-type">Categoría delictiva:</label>
            <select
              id="crime-type"
              value={filters.crimeType}
              onChange={(e) => updateFilters({ crimeType: e.target.value })}
              className="filter-select"
            >
              <option value="all">Todas las categorías</option>
              <option value="asalto">Asalto</option>
              <option value="hurto">Hurto</option>
              <option value="robo_vehiculo">Robo de Vehículo</option>
              <option value="homicidio">Homicidio</option>
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="security-timerange">Periodo de análisis:</label>
            <select
              id="security-timerange"
              value={filters.timeRange}
              onChange={(e) => updateFilters({ timeRange: e.target.value })}
              className="filter-select"
            >
              <option value="last_quarter">Último trimestre</option>
              <option value="current_year">Año en curso</option>
              <option value="annual_comparison">Comparativo interanual</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Indicadores Placeholder */}
      <div className="module-grid-metrics">
        <Card
          header={
            <div className="metric-header">
              <span className="metric-title">Índice Delictivo General</span>
              <ShieldAlert className="metric-icon" />
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
              <span className="metric-title">Tendencia Temporal</span>
              <TrendingUp className="metric-icon" />
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
              <span className="metric-title">Frecuencia por Franja Horaria</span>
              <Calendar className="metric-icon" />
            </div>
          }
        >
          <div className="metric-placeholder">
            <span className="metric-placeholder__badge">Módulo en preparación</span>
            <span className="metric-placeholder__sub">Sin datos disponibles todavía</span>
          </div>
        </Card>
      </div>

      {/* Área preparada para Mapa de Incidencia y Gráfico */}
      <div className="security-dual-grid">
        <Card
          header={
            <div className="area-header">
              <h3 className="area-title">Visor Geoespacial de Incidencia</h3>
              <span className="area-tag">Espacio para Mapa</span>
            </div>
          }
        >
          <div className="map-placeholder-box">
            <Map className="map-placeholder-icon" />
            <span className="map-placeholder-title">Módulo en preparación</span>
            <p className="map-placeholder-desc">
              Espacio configurado para renderizar capas geoespaciales de denuncias policiales según el cantón y distrito seleccionado.
            </p>
          </div>
        </Card>

        <Card
          header={
            <div className="area-header">
              <h3 className="area-title">Distribución por Tipología Delictiva</h3>
              <span className="area-tag">Espacio para Gráficos</span>
            </div>
          }
        >
          <EmptyState
            title="Sin datos policiales disponibles"
            message="El esquema para graficación de incidentes policiales se encuentra preparado para la conexión con el OIJ."
            icon={<EyeOff />}
          />
        </Card>
      </div>

      {/* Información de la fuente oficial */}
      <SourceInfo
        sourceName={DATA_SOURCES.oij.name}
        entityName={DATA_SOURCES.oij.officialEntity}
        status={DATA_SOURCES.oij.status}
        officialUrl={DATA_SOURCES.oij.officialUrl}
        notes="Fuente especializada en estadísticas del Organismo de Investigación Judicial y el Poder Judicial de Costa Rica."
      />
    </SectionContainer>
  );
};

export default SecurityView;
