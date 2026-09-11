import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Database, FileText, ShieldAlert, Users } from 'lucide-react';
import { Card } from '../common/Card';
import { APP_ROUTES } from '../../constants/routes';
import { useLocation } from '../../hooks/useLocation';
import { useProcurement } from '../../modules/procurement/hooks/useProcurement';
import { formatCrcCompact } from '../../modules/procurement/services/procurementAnalytics';
import { useSecuritySummary } from '../../modules/security/hooks/useSecuritySummary';
import { usePublicData } from '../../modules/publicData/hooks/usePublicData';
import { useElectoralSummary } from '../../modules/electoral/hooks/useElectoralSummary';
import './TerritorialSummary.css';

/**
 * Resumen Territorial Integrado.
 *
 * Muestra el indicador principal de las cuatro fuentes OSINT del observatorio
 * para el territorio activo del selector global. Cada tarjeta consume el hook
 * del módulo correspondiente, de modo que aquí no se recalcula nada: si una
 * fuente cambia su lógica, esta vista la hereda.
 *
 * Cada tarjeta gestiona su propio estado de carga y de error. Que el OIJ no
 * responda no debe dejar en blanco a las otras tres.
 */

const INTEGER = new Intl.NumberFormat('es-CR');

interface SummaryCard {
  id: string;
  source: string;
  label: string;
  icon: React.ReactNode;
  /** Valor ya formateado, o `null` mientras no haya dato. */
  value: string | null;
  context: string;
  to: string;
  isLoading: boolean;
  error: string | null;
}

export const TerritorialSummary: React.FC = () => {
  const { formattedLocation, selectedProvince } = useLocation();

  const procurement = useProcurement();
  const security = useSecuritySummary();
  const publicData = usePublicData();
  const electoral = useElectoralSummary();

  const cards: SummaryCard[] = [
    {
      id: 'sicop',
      source: 'Contratación · SICOP',
      label: 'Dinero comprometido',
      icon: <FileText />,
      value: procurement.analysis ? formatCrcCompact(procurement.analysis.totalMonto) : null,
      context: 'En compras públicas adjudicadas',
      to: APP_ROUTES.PROCUREMENT,
      isLoading: procurement.isLoading,
      error: procurement.error,
    },
    {
      id: 'oij',
      source: 'Seguridad · OIJ',
      label: 'Incidencias registradas',
      icon: <ShieldAlert />,
      value:
        security.totalIncidents !== null ? INTEGER.format(security.totalIncidents) : null,
      context: security.mostFrequentCrime
        ? `Año ${security.year} · más frecuente: ${security.mostFrequentCrime.toLowerCase()}`
        : `Denuncias del año ${security.year}`,
      to: APP_ROUTES.SECURITY,
      isLoading: security.isLoading,
      error: security.error,
    },
    {
      id: 'meic',
      source: 'Datos Públicos · MEIC',
      label: 'Pymes activas',
      icon: <Database />,
      value: publicData.analysis ? INTEGER.format(publicData.analysis.totalEmpresas) : null,
      context: 'Empresas registradas en el territorio',
      to: APP_ROUTES.PUBLIC_DATA,
      isLoading: publicData.isLoading,
      error: publicData.error,
    },
    {
      id: 'tse',
      source: 'Electoral · TSE',
      label: 'Personas empadronadas',
      icon: <Users />,
      value:
        electoral.registeredVoters !== null ? INTEGER.format(electoral.registeredVoters) : null,
      context: `Padrón electoral · ${INTEGER.format(electoral.districtCount)} distritos`,
      to: APP_ROUTES.ELECTORAL,
      isLoading: electoral.isLoading,
      error: electoral.error,
    },
  ];

  return (
    <div className="territorial-summary">
      <p className="territorial-summary__scope">
        Mostrando <strong>{selectedProvince ? formattedLocation : 'todo Costa Rica'}</strong>. Las
        cuatro tarjetas cambian juntas al mover el selector territorial de arriba.
      </p>

      <div className="territorial-summary__grid">
        {cards.map((card) => (
          <Card key={card.id} className="summary-card" padding="md">
            <div className="summary-card__head">
              <span className="summary-card__icon" aria-hidden="true">
                {card.icon}
              </span>
              <span className="summary-card__source">{card.source}</span>
            </div>

            <span className="summary-card__label">{card.label}</span>

            {card.error ? (
              <div className="summary-card__error" role="status">
                <AlertTriangle className="summary-card__error-icon" />
                <span>{card.error}</span>
              </div>
            ) : card.isLoading || card.value === null ? (
              <span className="summary-card__skeleton" role="status" aria-label="Cargando dato" />
            ) : (
              <>
                <span className="summary-card__value">{card.value}</span>
                <span className="summary-card__context">{card.context}</span>
              </>
            )}

            <Link to={card.to} className="summary-card__link">
              Ver más
              <ArrowRight className="summary-card__link-icon" />
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TerritorialSummary;
