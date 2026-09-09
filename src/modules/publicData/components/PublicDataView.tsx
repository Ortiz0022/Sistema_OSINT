import React from 'react';
import { Database, FileText } from 'lucide-react';
import { SectionContainer } from '../../../components/common/SectionContainer';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { EmptyState } from '../../../components/common/EmptyState';
import { SourceInfo } from '../../../components/common/SourceInfo';
import { DATA_SOURCES } from '../../../constants/sources';
import { usePublicData } from '../hooks/usePublicData';
import './PublicDataView.css';

export const PublicDataView: React.FC = () => {
  const { activeDataset, filters, updateFilters } = usePublicData();

  return (
    <SectionContainer>
      <PageHeader
        title="Datos Públicos y Transparencia"
        description="Integración de conjuntos de datos gubernamentales abiertos para la rendición de cuentas y análisis cívico."
        badgeText="Módulo en Preparación"
        badgeVariant="warning"
      />

      {/* Tarjeta de Especificación del Dataset en preparación */}
      <Card
        className="dataset-target-card"
        header={
          <div className="dataset-target-header">
            <div className="dataset-target-title-wrap">
              <Database className="dataset-target-icon" />
              <div>
                <h3 className="dataset-target-title">Integración de Dataset del Portal Nacional</h3>
                <span className="dataset-target-sub">Fuente: datosabiertos.go.cr</span>
              </div>
            </div>
            <Badge variant="warning">Preparado para Conexión</Badge>
          </div>
        }
      >
        <div className="dataset-target-content">
          <p className="dataset-target-description">
            Este módulo se encuentra estructurado para recibir e interpretar un conjunto de datos público específico (por ejemplo: presupuesto institucional, nóminas públicas o indicadores sectoriales).
          </p>

          <div className="dataset-meta-grid">
            <div className="dataset-meta-item">
              <span className="dataset-meta-label">Estado de la Conexión</span>
              <span className="dataset-meta-val">
                <span className="status-dot status-dot--pending" />
                Módulo en preparación
              </span>
            </div>
            <div className="dataset-meta-item">
              <span className="dataset-meta-label">Formato Esperado</span>
              <span className="dataset-meta-val">{activeDataset.format} / API CKAN</span>
            </div>
            <div className="dataset-meta-item">
              <span className="dataset-meta-label">Criterio de Vinculación</span>
              <span className="dataset-meta-val">Código Territorial (DTA)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Área preparada para Filtros de Dataset */}
      <Card className="publicdata-filters" padding="sm">
        <div className="filter-bar">
          <div className="filter-field">
            <label htmlFor="publicdata-cat">Categoría temática:</label>
            <select
              id="publicdata-cat"
              value={filters.category}
              onChange={(e) => updateFilters({ category: e.target.value })}
              className="filter-select"
            >
              <option value="institucional">Institucional y Gobierno</option>
              <option value="finanzas">Finanzas y Presupuesto</option>
              <option value="ambiente">Ambiente y Recursos Naturales</option>
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="publicdata-search">Filtro interno:</label>
            <input
              id="publicdata-search"
              type="text"
              placeholder="Filtrar atributos del dataset..."
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              className="filter-search__input filter-search__input--inline"
            />
          </div>
        </div>
      </Card>

      {/* Espacio para Visualización y Tabla de Datos */}
      <div className="publicdata-viewer-area">
        <Card
          header={
            <div className="area-header">
              <h3 className="area-title">Previsualización de Registros del Dataset</h3>
              <span className="area-tag">Tabla y Estructura</span>
            </div>
          }
        >
          <EmptyState
            title="Sin datos disponibles todavía"
            message="Una vez asignado el identificador del recurso desde datosabiertos.go.cr, las filas y columnas se tabularán de forma automática con soporte de ordenamiento y filtrado."
            icon={<FileText />}
          />
        </Card>
      </div>

      {/* Información de la fuente oficial */}
      <SourceInfo
        sourceName={DATA_SOURCES.datosAbiertos.name}
        entityName={DATA_SOURCES.datosAbiertos.officialEntity}
        status={DATA_SOURCES.datosAbiertos.status}
        officialUrl={DATA_SOURCES.datosAbiertos.officialUrl}
        notes="Catálogo unificado del Gobierno de la República de Costa Rica según la Estrategia Nacional de Datos Abiertos."
      />
    </SectionContainer>
  );
};

export default PublicDataView;
