import React, { useMemo, useState } from 'react';
import { Users, MapPin, TrendingUp, AlertCircle, Calendar, HelpCircle } from 'lucide-react';
import { useElectoralData } from '../hooks/useElectoralData';
import { useTerritoryContext } from '../../../context/TerritoryContext';
import { ElectoralDistrictsChart } from './ElectoralDistrictsChart';
import { ElectoralCantonChart } from './ElectoralCantonChart';
import { ElectoralDistrictsTable } from './ElectoralDistrictsTable';
import { SourceInfo } from '../../../components/common/SourceInfo';

export const ElectoralOverview: React.FC = () => {
  const { data, loading, error } = useElectoralData();
  const { selection } = useTerritoryContext();
  const { province: selectedProvince, canton: selectedCanton, district: selectedDistrict } = selection;

  const [expandedChart, setExpandedChart] = useState<'none' | 'districts' | 'cantons'>('none');

  // Helper to normalize strings for comparison (remove accents)
  const normalize = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  // Filter data based on selected territory
  const filteredData = useMemo(() => {
    if (!data || !selectedProvince || !selectedCanton) return [];

    return data.territories.filter(
      (t) =>
        normalize(t.province) === normalize(selectedProvince.name) &&
        normalize(t.canton) === normalize(selectedCanton.name)
    );
  }, [data, selectedProvince, selectedCanton]);

  // --- CALCULO NACIONAL / PROVINCIAL ---
  const isConsulado = selectedProvince ? normalize(selectedProvince.name) === 'CONSULADO' : false;

  const provinceData = useMemo(() => {
    if (!data || !selectedProvince) return [];
    return data.territories.filter(t => normalize(t.province) === normalize(selectedProvince.name));
  }, [data, selectedProvince]);

  const cantonsInProvince = useMemo(() => {
    if (!provinceData.length) return [];
    const cantonMap = new Map<string, number>();
    provinceData.forEach(t => {
      const current = cantonMap.get(t.canton) || 0;
      cantonMap.set(t.canton, current + t.registeredVoters);
    });
    return Array.from(cantonMap.entries())
      .map(([name, voters]) => ({ name, voters }))
      .sort((a, b) => b.voters - a.voters);
  }, [provinceData]);

  const totalProvinceVoters = cantonsInProvince.reduce((acc, c) => acc + c.voters, 0);

  if (loading) {
    return (
      <div className="electoral-loader">
        <div className="electoral-spinner"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="electoral-error">
        <AlertCircle size={24} />
        <p>Error al cargar los datos del padrón electoral.</p>
      </div>
    );
  }

  // Si no hay cantón seleccionado, pedirle al usuario que seleccione uno
  if (!selectedProvince || !selectedCanton) {
    return (
      <div className="electoral-empty-state">
        <MapPin className="electoral-empty-icon" />
        <h3 className="electoral-empty-title">
          Seleccione un territorio
        </h3>
        <p className="electoral-empty-text">
          Por favor seleccione una provincia y un cantón en el selector superior para ver los datos electorales.
        </p>
      </div>
    );
  }

  // Si no hay datos procesados para el territorio seleccionado
  if (filteredData.length === 0) {
    return (
      <div className="electoral-empty-state">
        <AlertCircle className="electoral-empty-icon" />
        <h3 className="electoral-empty-title">
          Actualmente no hay datos procesados para este territorio.
        </h3>
        <p className="electoral-empty-text">
          Los resultados mostrados son estadísticas agregadas extraídas de los archivos oficiales.
          Si no ve datos aquí, es probable que no se haya procesado el archivo ZIP correspondiente a esta región.
        </p>
      </div>
    );
  }

  // Calculate aggregates for the Canton
  const totalVoters = filteredData.reduce((acc, curr) => acc + curr.registeredVoters, 0);
  const districtCount = filteredData.length;

  // District with max voters
  const maxDistrict = [...filteredData].sort((a, b) => b.registeredVoters - a.registeredVoters)[0];

  // Selected district info (if any)
  const selectedDistrictData = selectedDistrict
    ? filteredData.find(d => normalize(d.district) === normalize(selectedDistrict.name))
    : null;

  let cantonRank = 0;
  let cantonShare = 0;

  if (selectedCanton && cantonsInProvince.length > 0) {
    const selectedNormalized = normalize(selectedCanton.name);
    const index = cantonsInProvince.findIndex(c => normalize(c.name) === selectedNormalized);
    if (index !== -1) {
      cantonRank = index + 1;
      cantonShare = (cantonsInProvince[index].voters / totalProvinceVoters) * 100;
    }
  }

  // --- CALCULO CANTONAL (NUEVOS INDICADORES) ---
  const sortedDistricts = [...filteredData].sort((a, b) => b.registeredVoters - a.registeredVoters);
  const minDistrict = sortedDistricts[sortedDistricts.length - 1];

  const avgDistrictVoters = districtCount > 0 ? totalVoters / districtCount : 0;

  const top3Districts = sortedDistricts.slice(0, 3);
  const top3Voters = top3Districts.reduce((acc, d) => acc + d.registeredVoters, 0);
  const top3Share = totalVoters > 0 ? (top3Voters / totalVoters) * 100 : 0;

  // --- TEXTO: Lectura del territorio ---
  let narrativa = '';
  if (!isConsulado && selectedProvince && selectedCanton && totalVoters > 0) {
    narrativa = `${selectedCanton.name} representa el ${cantonShare.toFixed(1)}% del padrón electoral de ${selectedProvince.name} y ocupa la posición ${cantonRank} entre los ${cantonsInProvince.length} cantones de la provincia por cantidad de electores registrados. `;
    if (districtCount >= 3) {
      narrativa += `Además, los tres distritos electorales con mayor padrón concentran el ${top3Share.toFixed(1)}% de los electores registrados del cantón.`;
    }
  }

  return (
    <div className="electoral-container">

      {/* Explicación de entrada, normalizado */}
      <div className="intro">
        <HelpCircle className="intro__icon" />
        <div>
          <p className="intro__title">¿Qué estoy viendo?</p>
          <p className="intro__text">
            El Tribunal Supremo de Elecciones publica el padrón nacional completo; acá está cruzado con tu territorio.
            Usá el selector de arriba para cambiar de provincia o cantón — <strong>todo en la página se actualiza solo</strong>.
          </p>
        </div>
      </div>

      {/* 1. Resumen Principal (Las 4 Cards Actuales) */}
      <div className="electoral-summary-grid">
        {/* Card 1: Total Electores */}
        <div className="electoral-card">
          <div className="electoral-card-header">
            <Users className="electoral-card-icon blue" />
            <span>Electores registrados</span>
          </div>
          <p className="electoral-card-value">
            {totalVoters.toLocaleString('es-CR')}
          </p>
          <div className="electoral-tooltip">
            Cantidad de personas inscritas en el Padrón Nacional Electoral para el territorio mostrado.
          </div>
        </div>

        {/* Card 2: Distritos Electorales */}
        <div className="electoral-card">
          <div className="electoral-card-header">
            <MapPin className="electoral-card-icon emerald" />
            <span>Distritos Electorales</span>
          </div>
          <p className="electoral-card-value">
            {districtCount}
          </p>
          <div className="electoral-tooltip">
            Cantidad de distritos electorales habilitados en este cantón.
          </div>
        </div>

        {/* Card 3: Distrito con mayor padrón */}
        <div className="electoral-card">
          <div className="electoral-card-header">
            <TrendingUp className="electoral-card-icon amber" />
            <span>Mayor Padrón</span>
          </div>
          <p className="electoral-card-value truncate" title={maxDistrict.district}>
            {maxDistrict.district}
          </p>
          <p className="electoral-card-subtitle">
            {maxDistrict.cantonPercentage}% del cantón
          </p>
          <div className="electoral-tooltip">
            Distrito electoral con la mayor cantidad de personas inscritas para votar dentro del cantón.
          </div>
        </div>

        {/* Card 4: Distrito Seleccionado */}
        {selectedDistrictData ? (
          <div className="electoral-card selected">
            <div className="electoral-card-header">
              <MapPin className="electoral-card-icon" />
              <span className="truncate" title={selectedDistrictData.district}>{selectedDistrictData.district}</span>
            </div>
            <p className="electoral-card-value">
              {selectedDistrictData.registeredVoters.toLocaleString('es-CR')}
            </p>
            <p className="electoral-card-subtitle">
              {selectedDistrictData.cantonPercentage}% del cantón
            </p>
            <div className="electoral-tooltip">
              Indica qué proporción del padrón total del cantón corresponde a este distrito electoral.
            </div>
          </div>
        ) : (
          <div className="electoral-empty-state" style={{ minHeight: 'auto', padding: '1.5rem' }}>
            <p className="electoral-empty-text" style={{ fontSize: '0.75rem' }}>
              Seleccione un distrito para ver su detalle específico
            </p>
          </div>
        )}
      </div>

      {/* 2. Lectura del territorio (Sólo para provincias nacionales) */}
      {!isConsulado && narrativa && (
        <div className="electoral-section">
          <h3 className="electoral-section-title mb-2">Lectura del Territorio</h3>
          <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed">
            {narrativa}
          </p>
        </div>
      )}

      {/* 3. Análisis del Cantón */}
      <div className="electoral-section">
        <h3 className="electoral-section-title mb-4">Análisis del Cantón</h3>
        <div className="electoral-analysis-grid">
          {!isConsulado && (
            <>
              <div className="electoral-analysis-item">
                <p className="electoral-analysis-label">Participación Provincial</p>
                <p className="electoral-analysis-value">{cantonShare.toFixed(2)}%</p>
                <p className="electoral-analysis-desc">Porcentaje del padrón electoral de la provincia que corresponde al cantón seleccionado.</p>
              </div>
              <div className="electoral-analysis-item">
                <p className="electoral-analysis-label">Posición Provincial</p>
                <p className="electoral-analysis-value">#{cantonRank} de {cantonsInProvince.length}</p>
                <p className="electoral-analysis-desc">Lugar que ocupa el cantón frente a los demás cantones de la provincia según su cantidad de electores registrados.</p>
              </div>
            </>
          )}

          <div className="electoral-analysis-item">
            <p className="electoral-analysis-label">Promedio por Distrito Electoral</p>
            <p className="electoral-analysis-value">{Math.round(avgDistrictVoters).toLocaleString('es-CR')} electores</p>
            <p className="electoral-analysis-desc">Cantidad promedio de electores registrados entre los distritos electorales del cantón.</p>
          </div>

          <div className="electoral-analysis-item">
            <p className="electoral-analysis-label">Concentración Top 3</p>
            <p className="electoral-analysis-value">{top3Share.toFixed(2)}%</p>
            <p className="electoral-analysis-desc">Porcentaje del padrón del cantón que se concentra en sus tres distritos electorales con mayor cantidad de electores.</p>
          </div>

          <div className="electoral-analysis-item">
            <p className="electoral-analysis-label">Distrito con Menor Padrón</p>
            <p className="electoral-analysis-value truncate" title={minDistrict?.district}>{minDistrict?.district}</p>
            <p className="electoral-analysis-desc">Tiene la menor cantidad de electores registrados ({minDistrict?.registeredVoters.toLocaleString('es-CR')}) dentro del cantón.</p>
          </div>
        </div>
      </div>

      {/* 4 y 5. Gráficos y Tabla */}
      <div className={`electoral-content-grid ${expandedChart !== 'none' ? 'expanded' : ''}`}>
        <div className={`electoral-chart-container ${expandedChart === 'districts' ? 'col-span-full' : ''}`}>
          <ElectoralDistrictsChart
            data={filteredData}
            isExpanded={expandedChart === 'districts'}
            onToggleExpand={(val) => setExpandedChart(val ? 'districts' : 'none')}
          />
        </div>
        {!isConsulado && (
          <div className={`electoral-chart-container ${expandedChart === 'cantons' ? 'col-span-full' : ''}`}>
            <ElectoralCantonChart
              data={cantonsInProvince}
              isExpanded={expandedChart === 'cantons'}
              onToggleExpand={(val) => setExpandedChart(val ? 'cantons' : 'none')}
            />
          </div>
        )}
      </div>

      <div className="mt-6">
        <ElectoralDistrictsTable data={filteredData} />
      </div>

      {/* Metadata Section */}
      <SourceInfo
        sourceName="Padrón Nacional Electoral — Tribunal Supremo de Elecciones (datos abiertos)"
        entityName="Tribunal Supremo de Elecciones (TSE) · Archivos Oficiales"
        status="activo"
        officialUrl="https://www.tse.go.cr/descarga_padron.html"
        queryDate={new Date(data.metadata.processedAt).toLocaleDateString('es-CR')}
        notes={`Estadísticas agregadas. Procesado mediante ETL local (${data.metadata.recordsProcessed.toLocaleString('es-CR')} registros). El sistema no almacena ni expone datos personales del padrón.`}
      />

    </div>
  );
};
