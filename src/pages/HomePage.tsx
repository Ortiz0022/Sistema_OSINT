import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  ShieldAlert,
  Database,
  Compass,
  ArrowRight,
  MapPin,
  Layers,
  Sparkles,
} from 'lucide-react';
import { SectionContainer } from '../components/common/SectionContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useLocation } from '../hooks/useLocation';
import { APP_ROUTES } from '../constants/routes';
import './HomePage.css';

export const HomePage: React.FC = () => {
  const {
    selectedProvince,
    selectedCanton,
    selectedDistrict,
    formattedLocation,
  } = useLocation();

  const moduleCards = [
    {
      id: 'procurement',
      title: 'Contratación Pública',
      source: 'SICOP',
      path: APP_ROUTES.PROCUREMENT,
      icon: <FileText className="module-card__icon" />,
      description: 'Fiscalización y seguimiento de licitaciones, compras y adjudicaciones del Estado.',
      statusText: 'Módulo en preparación',
      tagColor: 'primary' as const,
    },
    {
      id: 'security',
      title: 'Seguridad y Estadísticas Policiales',
      source: 'OIJ / Poder Judicial',
      path: APP_ROUTES.SECURITY,
      icon: <ShieldAlert className="module-card__icon" />,
      description: 'Análisis de datos de incidencias, delitos y tendencias de seguridad ciudadana.',
      statusText: 'Módulo en preparación',
      tagColor: 'primary' as const,
    },
    {
      id: 'publicData',
      title: 'Datos Públicos',
      source: 'Portal Nacional de Datos Abiertos',
      path: APP_ROUTES.PUBLIC_DATA,
      icon: <Database className="module-card__icon" />,
      description: 'Conjuntos de datos abiertos gubernamentales para transparencia e investigación cívica.',
      statusText: 'Módulo en preparación',
      tagColor: 'primary' as const,
    },
    {
      id: 'places',
      title: 'Servicios y Lugares',
      source: 'OpenStreetMap / Overpass',
      path: APP_ROUTES.PLACES,
      icon: <Compass className="module-card__icon" />,
      description: 'Exploración comunitaria de equipamiento territorial, salud, educación y emergencias.',
      statusText: 'Módulo en preparación',
      tagColor: 'primary' as const,
    },
  ];

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

          <div className="hero-territory-status">
            <span className="hero-territory-status__label">Foco Territorial Activo:</span>
            <div className="hero-territory-tags">
              <span className="territory-chip">
                <strong>Provincia:</strong> {selectedProvince ? selectedProvince.name : 'Todas'}
              </span>
              <span className="territory-chip">
                <strong>Cantón:</strong> {selectedCanton ? selectedCanton.name : 'Todos'}
              </span>
              <span className="territory-chip">
                <strong>Distrito:</strong> {selectedDistrict ? selectedDistrict.name : 'Todos'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Grid de 4 Tarjetas Principales de Acceso a Módulos */}
      <section className="modules-section" aria-label="Módulos del Observatorio">
        <div className="section-title-row">
          <div>
            <h2 className="section-heading">Dimensiones de Consulta Territorial</h2>
            <p className="section-subheading">
              Acceso a las cuatro áreas analíticas del observatorio estructuradas para el trabajo modular.
            </p>
          </div>
          <Badge variant="default">4 Módulos Conectables</Badge>
        </div>

        <div className="modules-grid">
          {moduleCards.map((card) => (
            <Link key={card.id} to={card.path} className="module-card-link">
              <Card variant="interactive" className="module-card" padding="lg">
                <div className="module-card__top">
                  <div className="module-card__icon-box">
                    {card.icon}
                  </div>
                  <Badge variant="warning">{card.statusText}</Badge>
                </div>

                <div className="module-card__body">
                  <h3 className="module-card__title">{card.title}</h3>
                  <span className="module-card__source">Fuente oficial: {card.source}</span>
                  <p className="module-card__desc">{card.description}</p>
                </div>

                <div className="module-card__footer">
                  <span className="module-card__action-text">Ingresar al módulo</span>
                  <ArrowRight className="module-card__arrow" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Espacio preparado para Futuro Resumen Combinado Multi-fuente */}
      <section className="consolidated-section" aria-label="Resumen consolidado">
        <Card
          header={
            <div className="consolidated-header">
              <div className="consolidated-header__title-wrap">
                <Layers className="consolidated-header__icon" />
                <div>
                  <h3 className="consolidated-header__title">Resumen Territorial Integrado</h3>
                  <span className="consolidated-header__sub">
                    Vista consolidada OSINT • Cruzamiento de fuentes públicas
                  </span>
                </div>
              </div>
              <Badge variant="outline">Espacio para Síntesis Multi-Fuente</Badge>
            </div>
          }
        >
          <EmptyState
            title="Sin datos disponibles todavía"
            message="Este panel unificará de manera transversal los indicadores de contratación (SICOP), seguridad (OIJ), datasets abiertos y equipamiento territorial para el cantón o distrito seleccionado."
          />
        </Card>
      </section>
    </SectionContainer>
  );
};

export default HomePage;
