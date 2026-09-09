import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Compass,
  FileText,
  ShieldAlert,
  Database,
  Home,
  Menu,
  X,
  Activity,
} from 'lucide-react';
import { APP_ROUTES, MODULE_NAV_ITEMS } from '../../constants/routes';
import { ThemeToggle } from './ThemeToggle';
import { TerritorialSelector } from '../common/TerritorialSelector';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getModuleIcon = (moduleKey: string) => {
    switch (moduleKey) {
      case 'procurement':
        return <FileText className="nav-item__icon" />;
      case 'security':
        return <ShieldAlert className="nav-item__icon" />;
      case 'publicData':
        return <Database className="nav-item__icon" />;
      case 'places':
        return <Compass className="nav-item__icon" />;
      default:
        return <Activity className="nav-item__icon" />;
    }
  };

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <header className="site-header">
      {/* Barra principal superior */}
      <div className="navbar">
        <div className="navbar__container">
          {/* Marca / Logotipo */}
          <Link to={APP_ROUTES.HOME} className="navbar__brand" onClick={closeMobile}>
            <div className="brand-logo">
              <div className="brand-logo__flag-strip">
                <span className="flag-dot flag-dot--blue" />
                <span className="flag-dot flag-dot--white" />
                <span className="flag-dot flag-dot--red" />
              </div>
              <Compass className="brand-logo__icon" />
            </div>
            <div className="brand-text">
              <span className="brand-text__title">Observatorio Territorial</span>
              <span className="brand-text__subtitle">Datos Públicos • Costa Rica</span>
            </div>
          </Link>

          {/* Enlaces de Navegación Principal (Desktop) */}
          <nav className="navbar__nav" aria-label="Navegación principal">
            <NavLink
              to={APP_ROUTES.HOME}
              end
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item--active' : ''}`
              }
            >
              <Home className="nav-item__icon" />
              <span>Inicio</span>
            </NavLink>

            {MODULE_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item--active' : ''}`
                }
              >
                {getModuleIcon(item.moduleKey)}
                <span>{item.shortName}</span>
              </NavLink>
            ))}
          </nav>

          {/* Acciones de Cabecera (Tema y Menú Móvil) */}
          <div className="navbar__actions">
            <ThemeToggle />

            <button
              type="button"
              className="navbar__mobile-toggle"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-barra: Selector Territorial Global Integrado */}
      <div className="territorial-bar">
        <div className="territorial-bar__container">
          <TerritorialSelector compact />
        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {mobileMenuOpen && (
        <div className="mobile-menu" role="dialog" aria-modal="true">
          <nav className="mobile-menu__nav">
            <NavLink
              to={APP_ROUTES.HOME}
              end
              className={({ isActive }) =>
                `mobile-nav-item ${isActive ? 'mobile-nav-item--active' : ''}`
              }
              onClick={closeMobile}
            >
              <Home className="nav-item__icon" />
              <span>Inicio</span>
            </NavLink>

            {MODULE_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `mobile-nav-item ${isActive ? 'mobile-nav-item--active' : ''}`
                }
                onClick={closeMobile}
              >
                {getModuleIcon(item.moduleKey)}
                <div className="mobile-nav-item__info">
                  <span className="mobile-nav-item__title">{item.name}</span>
                  <span className="mobile-nav-item__source">Fuente: {item.futureSource}</span>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
