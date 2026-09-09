import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import './ErrorState.css';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'No fue posible cargar la información',
  message,
  onRetry,
  retryLabel = 'Intentar de nuevo',
  className = '',
}) => {
  return (
    <div className={`error-state ${className}`} role="alert">
      <div className="error-state__icon-wrap">
        <AlertTriangle className="error-state__icon" />
      </div>
      <h4 className="error-state__title">{title}</h4>
      <p className="error-state__message">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="error-state__btn">
          <RefreshCw className="error-state__btn-icon" />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;
