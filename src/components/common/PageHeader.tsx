import React, { type ReactNode } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';
import { Badge } from './Badge';
import './PageHeader.css';

interface PageHeaderProps {
  title: string;
  description: string;
  badgeText?: string;
  badgeVariant?: 'primary' | 'success' | 'warning' | 'default';
  actions?: ReactNode;
  showLocationBreadcrumb?: boolean;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badgeText,
  badgeVariant = 'primary',
  actions,
  showLocationBreadcrumb = true,
  className = '',
}) => {
  const { selectedProvince, selectedCanton, selectedDistrict, formattedLocation } = useLocation();

  return (
    <header className={`page-header ${className}`}>
      <div className="page-header__content">
        <div className="page-header__top">
          {badgeText && (
            <Badge variant={badgeVariant} className="page-header__badge">
              {badgeText}
            </Badge>
          )}

          {showLocationBreadcrumb && (
            <div className="page-header__location" title="Ubicación territorial activa">
              <MapPin className="page-header__location-icon" />
              <div className="page-header__crumbs">
                {selectedProvince ? (
                  <>
                    <span className="crumb crumb--active">{selectedProvince.name}</span>
                    {selectedCanton && (
                      <>
                        <ArrowRight className="crumb__sep" />
                        <span className="crumb crumb--active">{selectedCanton.name}</span>
                      </>
                    )}
                    {selectedDistrict && (
                      <>
                        <ArrowRight className="crumb__sep" />
                        <span className="crumb crumb--active">{selectedDistrict.name}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="crumb crumb--all">{formattedLocation}</span>
                )}
              </div>
            </div>
          )}
        </div>

        <h1 className="page-header__title">{title}</h1>
        <p className="page-header__desc">{description}</p>
      </div>

      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
};

export default PageHeader;
