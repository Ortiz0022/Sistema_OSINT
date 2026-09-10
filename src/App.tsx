import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { TerritoryProvider } from './context/TerritoryContext';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { ProcurementPage } from './pages/ProcurementPage';
import { SecurityPage } from './pages/SecurityPage';
import { PublicDataPage } from './pages/PublicDataPage';
import { ElectoralPage } from './pages/ElectoralPage';
import { APP_ROUTES } from './constants/routes';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <TerritoryProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path={APP_ROUTES.PROCUREMENT} element={<ProcurementPage />} />
              <Route path={APP_ROUTES.SECURITY} element={<SecurityPage />} />
              <Route path={APP_ROUTES.PUBLIC_DATA} element={<PublicDataPage />} />
              <Route path={APP_ROUTES.ELECTORAL} element={<ElectoralPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TerritoryProvider>
    </ThemeProvider>
  );
};

export default App;
