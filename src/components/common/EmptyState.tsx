import React, { type ReactNode } from 'react';
import { Layers } from 'lucide-react';
import './EmptyState.css';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Sin datos disponibles todavía',
  message = 'Este componente se encuentra configurado a la espera de la integración de su respectiva fuente pública.',
  icon,
  action,
  className = '',
}) => {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state__icon-wrap">
        {icon ? icon : <Layers className="empty-state__icon" />}
      </div>
      <h4 className="empty-state__title">{title}</h4>
      <p className="empty-state__message">{message}</p>
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
};

export default EmptyState;
