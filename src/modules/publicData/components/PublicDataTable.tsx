import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '../../../components/common/Badge';
import { formatInteger } from '../services/publicDataAnalytics';
import type { PublicDataTableRow } from '../types/publicData.types';

interface PublicDataTableProps {
  rows: PublicDataTableRow[];
}

const PAGE_SIZE = 15;

const TAMANO_BADGE_VARIANT: Record<PublicDataTableRow['tamano'], 'default' | 'primary' | 'success'> = {
  Micro: 'default',
  'Pequeña': 'primary',
  Mediana: 'success',
};

/** Tabla de detalle paginada: no carga las miles de filas de una sola vez. */
export const PublicDataTable: React.FC<PublicDataTableProps> = ({ rows }) => {
  const [visible, setVisible] = useState<number>(PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <p className="chart-empty">
        No encontramos ninguna empresa con ese territorio y esa búsqueda. Probá borrando el texto del buscador.
      </p>
    );
  }

  const shown = rows.slice(0, visible);

  return (
    <div className="entity-table">
      <div className="entity-table__scroll">
        <table>
          <caption className="entity-table__caption">
            {formatInteger(rows.length)} en total, en orden alfabético
          </caption>
          <thead>
            <tr>
              <th scope="col">Empresa</th>
              <th scope="col">Tamaño</th>
              <th scope="col">Ubicación registrada</th>
              <th scope="col">Actividad económica</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="entity-table__name">{row.nombre}</span>
                  <span className="entity-table__detail">Identificación {row.identificacion}</span>
                </td>
                <td>
                  <Badge variant={TAMANO_BADGE_VARIANT[row.tamano]}>{row.tamano}</Badge>
                </td>
                <td className="entity-table__place">{row.ubicacion}</td>
                <td>{row.actividad}</td>
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

export default PublicDataTable;
