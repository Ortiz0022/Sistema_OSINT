import React from 'react';
import { formatCrc, formatCrcCompact, formatInteger, formatPercent } from '../services/procurementAnalytics';
import type { FlowItem } from '../types/procurement.types';

interface ProcurementFlowsProps {
  flows: FlowItem[];
  /** `true` cuando hay una provincia elegida y tiene sentido separar local de fuera. */
  showLocalLegend: boolean;
}

/**
 * Destino territorial del dinero adjudicado.
 *
 * Dos categorías de identidad (queda en la provincia / sale a otra), por lo que
 * lleva leyenda y además etiqueta cada fila con su nombre y monto: la identidad
 * nunca depende solo del color.
 */
export const ProcurementFlows: React.FC<ProcurementFlowsProps> = ({ flows, showLocalLegend }) => {
  if (flows.length === 0) {
    return <p className="chart-empty">No hay compras registradas en este territorio.</p>;
  }

  const max = flows.reduce((peak, flow) => Math.max(peak, flow.monto), 0);

  return (
    <div className="flows">
      {showLocalLegend && (
        <div className="flows__legend">
          <span className="flows__legend-item">
            <span className="flows__swatch flows__swatch--local" aria-hidden="true" />
            Va a empresas de la misma provincia
          </span>
          <span className="flows__legend-item">
            <span className="flows__swatch flows__swatch--out" aria-hidden="true" />
            Va a empresas de otro lugar
          </span>
        </div>
      )}

      <ul className="flows__list" role="list">
        {flows.map((flow) => (
          <li key={`${flow.destinoId ?? 'nd'}-${flow.destino}`} className="flows__row">
            <div className="flows__head">
              <span className="flows__label">{flow.destino}</span>
              <span className="flows__value" title={formatCrc(flow.monto)}>
                {formatCrcCompact(flow.monto)}
              </span>
            </div>
            <div className="flows__track">
              <div
                className={`flows__bar${flow.esLocal ? ' flows__bar--local' : ''}`}
                style={{ width: `${max > 0 ? Math.max((flow.monto / max) * 100, 1.5) : 0}%` }}
              />
            </div>
            <span className="flows__meta">
              {formatPercent(flow.share)} del dinero · {formatInteger(flow.lineas)} compras
              {flow.esLocal && ' · se queda en la provincia'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProcurementFlows;
