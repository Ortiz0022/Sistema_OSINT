import React from 'react';
import { ShieldAlert, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { SectionContainer } from '../../../components/common/SectionContainer';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card } from '../../../components/common/Card';
import { EmptyState } from '../../../components/common/EmptyState';
import { SourceInfo } from '../../../components/common/SourceInfo';
import { DATA_SOURCES } from '../../../constants/sources';
import { useSecurity } from '../hooks/useSecurity';
import { useLocation } from '../../../hooks/useLocation';
import './SecurityView.css';

export const SecurityView: React.FC = () => {
  const { 
    filters, updateFilters, 
    stats, isLoading, error,
    details, isLoadingDetails, detailsError
  } = useSecurity();
  const { formattedLocation } = useLocation();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const currentDate = new Date().toLocaleDateString('es-CR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <SectionContainer>
      <PageHeader
        title="Seguridad y Estadísticas Policiales"
        description={`Seguimiento de incidencias delictivas territoriales en Costa Rica.`}
        badgeText="Módulo OIJ"
        badgeVariant="success"
      />

      <div className="security-active-location">
        <strong>Territorio Activo:</strong> {formattedLocation}
      </div>

      {/* Filtros específicos de Seguridad */}
      <Card className="security-filters" padding="sm">
        <div className="filter-bar">
          <div className="filter-field">
            <label htmlFor="security-year">Año:</label>
            <select
              id="security-year"
              value={filters.year}
              onChange={(e) => updateFilters({ year: e.target.value })}
              className="filter-select"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="crime-type">Tipo de delito:</label>
            <select
              id="crime-type"
              value={filters.crimeType}
              onChange={(e) => updateFilters({ crimeType: e.target.value })}
              className="filter-select"
            >
              <option value="all">Todos los delitos</option>
              {stats?.availableCrimeTypes?.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {error ? (
        <Card>
          <EmptyState
            title="Error al cargar estadísticas"
            message={error}
            icon={<AlertCircle className="error-icon" />}
          />
        </Card>
      ) : isLoading ? (
        <Card>
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Consultando base de datos del OIJ...</p>
          </div>
        </Card>
      ) : !stats || stats.summary.totalIncidents === 0 ? (
        <Card>
          <EmptyState
            title="Sin datos policiales registrados"
            message="No se encontraron incidencias para los filtros y territorio seleccionados."
            icon={<ShieldAlert />}
          />
        </Card>
      ) : (
        <>
          {/* Métricas Principales */}
          <div className="module-grid-metrics">
            <Card
              header={
                <div className="metric-header">
                  <span className="metric-title">Total de Hechos</span>
                  <ShieldAlert className="metric-icon" />
                </div>
              }
            >
              <div className="metric-value">{stats.summary.totalIncidents.toLocaleString()}</div>
            </Card>

            <Card
              header={
                <div className="metric-header">
                  <span className="metric-title">Delito Frecuente</span>
                  <TrendingUp className="metric-icon" />
                </div>
              }
            >
              <div className="metric-value metric-value--text">{stats.summary.mostFrequentCrime}</div>
            </Card>

            <Card
              header={
                <div className="metric-header">
                  <span className="metric-title">Tipos de Delito</span>
                  <Calendar className="metric-icon" />
                </div>
              }
            >
              <div className="metric-value">{stats.summary.uniqueCrimeTypes}</div>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="security-charts-grid">
            <Card header={<h3 className="area-title">Delitos por Tipo</h3>}>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.chartCrimeTypes} layout="vertical" margin={{ left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card header={<h3 className="area-title">Evolución Mensual</h3>}>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.chartMonthly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Tabla de Datos (Separada de las stats principales) */}
          <Card header={<h3 className="area-title">Detalle de Incidencias</h3>}>
            {detailsError ? (
               <div className="text-center py-4 text-red-500">
                 <p>{detailsError}</p>
                 <p className="text-sm opacity-80 mt-1">Inténtelo de nuevo más tarde o pruebe con otro filtro.</p>
               </div>
            ) : isLoadingDetails ? (
              <div className="loading-state py-8">
                <div className="spinner"></div>
                <p>Procesando registros de detalle...</p>
              </div>
            ) : details && details.tableData.length > 0 ? (
              <>
                <div className="table-responsive">
                  <table className="security-table">
                    <thead>
                      <tr>
                        <th>Delito</th>
                        <th>Subdelito</th>
                        <th className="text-right">Registros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.tableData.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.delito}</td>
                          <td>{row.subdelito}</td>
                          <td className="text-right">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {details._notes && (
                  <p className="text-xs text-gray-500 mt-3 italic" style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {details._notes}
                  </p>
                )}
              </>
            ) : (
               <p className="text-center py-4 text-gray-500">No hay detalles disponibles para este filtro.</p>
            )}
          </Card>
        </>
      )}

      {/* Información de la fuente oficial */}
      <SourceInfo
        sourceName={DATA_SOURCES.oij.name}
        entityName={DATA_SOURCES.oij.officialEntity}
        status={DATA_SOURCES.oij.status}
        officialUrl={DATA_SOURCES.oij.officialUrl}
        notes={`Consulta realizada el: ${currentDate}. Fuente: Estadísticas del Organismo de Investigación Judicial y el Poder Judicial de Costa Rica.`}
      />
    </SectionContainer>
  );
};

export default SecurityView;
