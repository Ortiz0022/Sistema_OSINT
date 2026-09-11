import React from 'react';
import { SectionContainer } from '../components/common/SectionContainer';
import { PageHeader } from '../components/common/PageHeader';
import { ElectoralOverview } from '../modules/electoral';

export const ElectoralPage: React.FC = () => {
  return (
    <SectionContainer>
      <PageHeader
        title="Padrón Electoral Territorial"
        description="Estadísticas agregadas del padrón electoral distribuidas por territorio."
        badgeText="Datos cargados"
        badgeVariant="success"
      />

      <ElectoralOverview />
    </SectionContainer>
  );
};
