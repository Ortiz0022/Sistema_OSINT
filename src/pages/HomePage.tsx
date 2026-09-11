import React from 'react';
import { MapPin, Layers, Sparkles } from 'lucide-react';
import { SectionContainer } from '../components/common/SectionContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { TerritorialSummary } from '../components/home/TerritorialSummary';
import { useLocation } from '../hooks/useLocation';
import './HomePage.css';

export const HomePage: React.FC = () => {
  const {
    formattedLocation,
  } = useLocation();

  return (
    <SectionContainer>
      {/* Banner Principal / Hero del Observatorio */}
      <section className="hero-banner" aria-label="Introducción al Observatorio">
        <div className="hero-banner__content">
          <div className="hero-banner__pills">
            <Badge variant="primary" icon={<Sparkles />}>
              Plataforma OSINT Costa Rica
            </Badge>
            <div className="hero-location-pill" title="Ubicación territorial activa">
              <MapPin className="hero-location-icon" />
              <span className="hero-location-text">{formattedLocation}</span>
            </div>
          </div>

          <h1 className="hero-banner__title">
            Observatorio Territorial y de Datos Públicos
          </h1>

          <p className="hero-banner__desc">
            Plataforma centralizada de inteligencia cívica y fuentes abiertas para la fiscalización, análisis geoespacial y consulta ciudadana del territorio costarricense.
          </p>
        </div>
      </section>

      {/* Resumen combinado de las cuatro fuentes para el territorio activo */}
      <section className="consolidated-section" aria-label="Resumen consolidado">
        <Card
          header={
            <div className="consolidated-header">
              <div className="consolidated-header__title-wrap">
                <Layers className="consolidated-header__icon" />
                <div>
                  <h3 className="consolidated-header__title">Resumen Territorial Integrado</h3>
                  <span className="consolidated-header__sub">
                    Este panel unifica los indicadores de contratación (SICOP), seguridad (OIJ),
                    datos públicos (MEIC) y población (TSE) para el cantón o distrito seleccionado.
                  </span>
                </div>
              </div>
              <Badge variant="outline">4 fuentes</Badge>
            </div>
          }
        >
          <TerritorialSummary />
        </Card>
      </section>
    </SectionContainer>
  );
};

export default HomePage;
