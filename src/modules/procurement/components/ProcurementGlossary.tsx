import React, { useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronDown } from 'lucide-react';
import { GLOSSARY } from '../constants/sicopSource';

/**
 * Glosario plegable de la página de compras públicas.
 *
 * Cerrado muestra solo los términos, y al pasar el mouse (o al enfocar con el
 * teclado) aparece la definición corta. Abierto muestra las definiciones
 * completas.
 *
 * El globo se monta con un portal en `document.body` porque las tarjetas del
 * observatorio usan `overflow: hidden` y lo recortarían.
 */

const TOOLTIP_GAP = 8;
const TOOLTIP_WIDTH = 260;

interface TooltipState {
  term: string;
  short: string;
  left: number;
  top?: number;
  bottom?: number;
}

export const ProcurementGlossary: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const listId = useId();
  const tooltipId = `${useId()}-tip`;

  const showTooltip = useCallback(
    (event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>, term: string, short: string) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const left = Math.min(
        Math.max(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, 8),
        Math.max(window.innerWidth - TOOLTIP_WIDTH - 8, 8)
      );
      // Si no cabe debajo, se ancla por arriba del término.
      const fitsBelow = window.innerHeight - rect.bottom > 110;
      setTooltip(
        fitsBelow
          ? { term, short, left, top: rect.bottom + TOOLTIP_GAP }
          : { term, short, left, bottom: window.innerHeight - rect.top + TOOLTIP_GAP }
      );
    },
    []
  );

  const hideTooltip = useCallback(() => setTooltip(null), []);

  // Al cerrar el glosario o al hacer scroll, el globo dejaría de apuntar al
  // término correcto, así que se esconde.
  useEffect(() => {
    if (!tooltip) return;
    window.addEventListener('scroll', hideTooltip, true);
    return () => window.removeEventListener('scroll', hideTooltip, true);
  }, [tooltip, hideTooltip]);

  return (
    <div className="glossary-block">
      <button
        type="button"
        className="glossary-toggle"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => {
          setIsOpen((open) => !open);
          hideTooltip();
        }}
      >
        <span className="glossary-toggle__icon" aria-hidden="true">
          <BookOpen />
        </span>
        <span className="glossary-toggle__text">
          <span className="glossary-toggle__title">¿Qué significa cada palabra?</span>
          <span className="glossary-toggle__hint">
            {isOpen
              ? 'Tocá para cerrar'
              : `${GLOSSARY.length} términos · pasá el mouse por uno para ver qué significa`}
          </span>
        </span>
        <ChevronDown
          className={`glossary-toggle__chevron${isOpen ? ' glossary-toggle__chevron--open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <dl className="glossary" id={listId}>
          {GLOSSARY.map((entry) => (
            <div key={entry.term} className="glossary__item">
              <dt>{entry.term}</dt>
              <dd>{entry.definition}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <ul className="glossary-chips" id={listId} role="list">
          {GLOSSARY.map((entry) => (
            <li key={entry.term}>
              <span
                className="glossary-chip"
                tabIndex={0}
                aria-describedby={tooltip?.term === entry.term ? tooltipId : undefined}
                onMouseEnter={(event) => showTooltip(event, entry.term, entry.short)}
                onMouseLeave={hideTooltip}
                onFocus={(event) => showTooltip(event, entry.term, entry.short)}
                onBlur={hideTooltip}
              >
                {entry.term}
              </span>
            </li>
          ))}
        </ul>
      )}

      {tooltip &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className="glossary-tip"
            style={{
              left: tooltip.left,
              top: tooltip.top,
              bottom: tooltip.bottom,
              width: TOOLTIP_WIDTH,
            }}
          >
            <strong>{tooltip.term}</strong>
            <span>{tooltip.short}</span>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ProcurementGlossary;
