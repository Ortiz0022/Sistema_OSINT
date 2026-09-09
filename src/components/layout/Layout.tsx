import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Compass, ShieldCheck } from 'lucide-react';
import './Layout.css';

export const Layout: React.FC = () => {
  return (
    <div className="site-layout">
      {/* Cabecera unificada con navegación y selector territorial */}
      <Navbar />

      {/* Contenido principal de la página */}
      <main className="site-main" id="main-content">
        <Outlet />
      </main>

      {/* Pie de página institucional */}
      <footer className="site-footer">
        <div className="site-footer__container">
          <div className="site-footer__left">
            <div className="site-footer__brand">
              <Compass className="site-footer__icon" />
              <span className="site-footer__name">
                Observatorio Territorial y de Datos Públicos de Costa Rica
              </span>
            </div>
            <p className="site-footer__text">
              Plataforma para la consulta, integración y análisis de información pública y fuentes OSINT del territorio costarricense.
            </p>
          </div>

          <div className="site-footer__right">
            <div className="site-footer__pill">
              <ShieldCheck className="site-footer__pill-icon" />
              <span>Base Frontend Modular • Versión 1.0</span>
            </div>
            <span className="site-footer__disclaimer">
              Datos obtenidos de fuentes oficiales costarricenses y catálogos públicos abiertos.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
