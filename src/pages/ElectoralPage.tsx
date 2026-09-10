import React from 'react';
import { ElectoralOverview } from '../modules/electoral';

export const ElectoralPage: React.FC = () => {
  return (
    <div className="electoral-container animate-fade-in">
      <div className="electoral-header">
        <h1>Padrón Electoral Territorial</h1>
        <p>
          Estadísticas agregadas del padrón electoral distribuidas por territorio.
        </p>
      </div>

      <ElectoralOverview />
    </div>
  );
};
