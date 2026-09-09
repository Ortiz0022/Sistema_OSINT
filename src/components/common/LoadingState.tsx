import React from 'react';
import { Loader2 } from 'lucide-react';
import './LoadingState.css';

interface LoadingStateProps {
  message?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  type?: 'spinner' | 'skeleton';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Cargando información...',
  description,
  size = 'md',
  type = 'spinner',
  className = '',
}) => {
  if (type === 'skeleton') {
    return (
      <div className={`loading-skeleton ${className}`}>
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-body" />
        <div className="skeleton-line skeleton-body" />
        <div className="skeleton-line skeleton-short" />
      </div>
    );
  }

  return (
    <div className={`loading-state loading-state--${size} ${className}`} role="status">
      <Loader2 className="loading-state__spinner" />
      <span className="loading-state__title">{message}</span>
      {description && <p className="loading-state__desc">{description}</p>}
    </div>
  );
};

export default LoadingState;
