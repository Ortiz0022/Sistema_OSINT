import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatCrc, formatInteger } from '../services/procurementAnalytics';
import type { EntityRow } from '../types/procurement.types';

interface ProcurementEntityTableProps {
  rows: EntityRow[];
  /** Encabezado de la primera columna según la lente activa. */
  entityHeader: string;
}

const PAGE_SIZE = 15;

/**
 * Tabla de detalle (instituciones compradoras o proveedores adjudicados).
 *
 * Cumple además la función de "vista de tabla" de los gráficos: todos los
 * montos que se dibujan arriba están aquí escritos con el número exacto.
 */
export const ProcurementEntityTable: React.FC<ProcurementEntityTableProps> = ({ rows, entityHeader }) => {
  const [visible, setVisible] = useState<number>(PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <p className="chart-empty">
        No encontramos nada con ese territorio y esa búsqueda. Probá borrando el texto del buscador.
      </p>
    );
  }

  const shown = rows.slice(0, visible);

  return (
    <div className="entity-table">
      <div className="entity-table__scroll">
        <table>
          <caption className="entity-table__caption">
            {formatInteger(rows.length)} en total, del que mueve más dinero al que mueve menos
          </caption>
          <thead>
            <tr>
              <th scope="col">{entityHeader}</th>
              <th scope="col">Dirección registrada</th>
              <th scope="col" className="entity-table__num">
                Dinero comprometido
              </th>
              <th scope="col" className="entity-table__num">
                Compras
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="entity-table__name">{row.nombre}</span>
                  <span className="entity-table__detail">{row.detalle}</span>
                </td>
                <td className="entity-table__place">{row.ubicacion}</td>
                <td className="entity-table__num entity-table__amount">{formatCrc(row.monto)}</td>
                <td className="entity-table__num">{formatInteger(row.lineas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible < rows.length && (
        <button
          type="button"
          className="entity-table__more"
          onClick={() => setVisible((current) => current + PAGE_SIZE)}
        >
          <ChevronDown className="entity-table__more-icon" />
          Ver {Math.min(PAGE_SIZE, rows.length - visible)} más (faltan {formatInteger(rows.length - visible)})
        </button>
      )}
    </div>
  );
};

export default ProcurementEntityTable;
