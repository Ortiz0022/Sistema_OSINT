import React from 'react';
import { Compass, MapPin, Building2, Shield, Search, HelpCircle } from 'lucide-react';
import { SectionContainer } from '../../../components/common/SectionContainer';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card } from '../../../components/common/Card';
import { EmptyState } from '../../../components/common/EmptyState';
import { SourceInfo } from '../../../components/common/SourceInfo';
import { DATA_SOURCES } from '../../../constants/sources';
import { usePlaces } from '../hooks/usePlaces';
import './PlacesView.css';

export const PlacesView: React.FC = () => {
  const { filters, updateFilters } = usePlaces();

  return (
    <SectionContainer>
      <PageHeader
        title="Servicios y Lugares del Territorio"
        description="Exploración de infraestructura comunitaria, equipamiento cívico, centros de salud y servicios esenciales en Costa Rica."
      />

      {/* Filtros específicos de Servicios y Lugares */}
      <Card className="places-filters" padding="sm">
        <div className="filter-bar">
          <div className="filter-search">
            <Search className="filter-search__icon" />
            <input
              type="text"
              placeholder="Buscar servicio, hospital, escuela o punto cívico..."
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              className="filter-search__input"
            />
          </div>

          <div className="filter-field">
            <label htmlFor="places-cat">Categoría de servicio:</label>
            <select
              id="places-cat"
              value={filters.category}
              onChange={(e) => updateFilters({ category: e.target.value })}
              className="filter-select"
            >
              <option value="all">Todas las infraestructuras</option>
              <option value="salud">Salud (Ebais, Clínicas, Hospitales)</option>
              <option value="educacion">Educación (Escuelas, Colegios)</option>
              <option value="seguridad">Seguridad (Delegaciones, Bomberos)</option>
              <option value="gobierno">Edificios Municipales y Estatales</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Grid de Tarjetas Placeholder */}
      <div className="module-grid-metrics">
        <Card
          header={
            <div className="metric-header">
              <span className="metric-title">Equipamiento Comunitario</span>
              <Building2 className="metric-icon" />
            </div>
          }
        >
          <div className="metric-placeholder">
            <span className="metric-placeholder__badge">Próximamente</span>
            <span className="metric-placeholder__sub">Sin datos disponibles todavía</span>
          </div>
        </Card>

        <Card
          header={
            <div className="metric-header">
              <span className="metric-title">Servicios de Emergencia</span>
              <Shield className="metric-icon" />
            </div>
          }
        >
          <div className="metric-placeholder">
            <span className="metric-placeholder__badge">Próximamente</span>
            <span className="metric-placeholder__sub">Sin datos disponibles todavía</span>
          </div>
        </Card>

        <Card
          header={
            <div className="metric-header">
              <span className="metric-title">Puntos de Interés Territorial</span>
              <MapPin className="metric-icon" />
            </div>
          }
        >
          <div className="metric-placeholder">
            <span className="metric-placeholder__badge">Próximamente</span>
            <span className="metric-placeholder__sub">Sin datos disponibles todavía</span>
          </div>
        </Card>
      </div>

      {/* Visor Cartográfico y Listado Placeholder */}
      <div className="places-layout-area">
        <Card
          header={
            <div className="area-header">
              <h3 className="area-title">Visor de Cartografía Abierta</h3>
              <span className="area-tag">Espacio para Mapa OpenStreetMap</span>
            </div>
          }
        >
          <div className="places-map-box">
            <Compass className="places-map-icon" />
            <h4 className="places-map-title">Servicios y Lugares</h4>
            <p className="places-map-desc">
              Espacio preparado para montar el mapa interactivo sobre la división territorial seleccionada sin geocodificaciones previas.
            </p>
          </div>
        </Card>

        <Card
          header={
            <div className="area-header">
              <h3 className="area-title">Directorio de Servicios Identificados</h3>
              <span className="area-tag">Listado Nominal</span>
            </div>
          }
        >
          <EmptyState
            title="Sin datos disponibles todavía"
            message="Los puntos de equipamiento territorial se desplegarán aquí con su nombre, categoría y ubicación nominal cuando se conecte el servicio OpenStreetMap / Overpass."
            icon={<HelpCircle />}
          />
        </Card>
      </div>

      {/* Información de la fuente oficial */}
      <SourceInfo
        sourceName={DATA_SOURCES.osm.name}
        entityName={DATA_SOURCES.osm.officialEntity}
        status={DATA_SOURCES.osm.status}
        officialUrl={DATA_SOURCES.osm.officialUrl}
        notes="Base de datos geoespacial abierta bajo licencia Open Database License (ODbL)."
      />
    </SectionContainer>
  );
};

export default PlacesView;
