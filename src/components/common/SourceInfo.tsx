import React from 'react';
import { Database, ExternalLink, Calendar } from 'lucide-react';
import { Badge } from './Badge';
import './SourceInfo.css';

interface SourceInfoProps {
  sourceName: string;
  entityName?: string;
  queryDate?: string;
  officialUrl?: string;
  status?: 'en_preparacion' | 'activo' | 'planificado';
  notes?: string;
  className?: string;
}

export const SourceInfo: React.FC<SourceInfoProps> = ({
  sourceName,
  entityName,
  queryDate = 'Pendiente de integración',
  officialUrl,
  status = 'en_preparacion',
  notes,
  className = '',
}) => {
  const statusLabel = {
    activo: 'Fuente Conectada',
    en_preparacion: 'En Preparación',
    planificado: 'Planificada',
  }[status];

  const statusVariant = {
    activo: 'success' as const,
    en_preparacion: 'warning' as const,
    planificado: 'default' as const,
  }[status];

  return (
    <div className={`source-info ${className}`}>
      <div className="source-info__left">
        <div className="source-info__icon">
          <Database className="source-info__svg" />
        </div>
        <div className="source-info__details">
          <div className="source-info__title-row">
            <span className="source-info__source">{sourceName}</span>
            <Badge variant={statusVariant} className="source-info__badge">
              {statusLabel}
            </Badge>
          </div>
          {entityName && <span className="source-info__entity">{entityName}</span>}
          {notes && <p className="source-info__notes">{notes}</p>}
        </div>
      </div>

      <div className="source-info__right">
        <div className="source-info__date" title="Fecha de última consulta">
          <Calendar className="source-info__meta-icon" />
          <span>{queryDate}</span>
        </div>

        {officialUrl && (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="source-info__link"
            title={`Abrir portal oficial de ${sourceName}`}
          >
            <span>Portal Oficial</span>
            <ExternalLink className="source-info__link-icon" />
          </a>
        )}
      </div>
    </div>
  );
};

export default SourceInfo;
