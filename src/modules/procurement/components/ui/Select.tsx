import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import './Select.css';

/**
 * Selector desplegable con la apariencia y el comportamiento del componente
 * `Select` de shadcn/ui, implementado sin dependencias.
 *
 * shadcn/ui se compone de Radix UI + Tailwind, y este proyecto no usa ninguno
 * de los dos: instalarlos obligaría a tocar `package.json`, la configuración de
 * build y los estilos globales, fuera del módulo de contratación. Por eso se
 * replica aquí el mismo patrón (disparador tipo botón, panel flotante, opción
 * marcada con un check, navegación por teclado) sobre los tokens de diseño del
 * observatorio.
 *
 * El panel se monta con un portal en `document.body` a propósito: las tarjetas
 * del observatorio usan `overflow: hidden`, así que un panel renderizado dentro
 * de la tarjeta quedaría recortado.
 */

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** Texto secundario opcional, debajo de la etiqueta. */
  hint?: string;
}

interface SelectProps<T extends string> {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  /** Id del elemento que rotula el selector (para lectores de pantalla). */
  labelledBy?: string;
  ariaLabel?: string;
  className?: string;
}

const PANEL_GAP = 6;
const MIN_PANEL_WIDTH = 220;

interface PanelPosition {
  /** Se usa `top` cuando el panel abre hacia abajo y `bottom` cuando abre hacia arriba. */
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  placement: 'bottom' | 'top';
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  labelledBy,
  ariaLabel,
  className = '',
}: SelectProps<T>): React.ReactElement {
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const optionId = (index: number): string => `${reactId}-option-${index}`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState<boolean>(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);

  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0
  );
  const [activeIndex, setActiveIndex] = useState<number>(selectedIndex);

  const selected = options[selectedIndex];

  /** Calcula dónde dibujar el panel; si no cabe abajo, lo pone arriba. */
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, MIN_PANEL_WIDTH);
    const estimatedHeight = Math.min(options.length * 40 + 8, 320);
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement: 'bottom' | 'top' =
      spaceBelow < estimatedHeight + PANEL_GAP && rect.top > estimatedHeight ? 'top' : 'bottom';

    // Se mantiene dentro de la ventana aunque el disparador esté pegado al borde.
    const left = Math.min(Math.max(rect.left, 8), Math.max(window.innerWidth - width - 8, 8));

    // Al abrir hacia arriba se ancla por `bottom`: así el panel queda pegado al
    // disparador aunque su alto real sea menor que el estimado.
    setPosition(
      placement === 'bottom'
        ? { top: rect.bottom + PANEL_GAP, left, width, placement }
        : { bottom: window.innerHeight - rect.top + PANEL_GAP, left, width, placement }
    );
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const reposition = (): void => updatePosition();
    window.addEventListener('resize', reposition);
    // `true` para capturar el scroll de cualquier contenedor, no solo el de la ventana.
    window.addEventListener('scroll', reposition, true);

    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open, position]);

  const openPanel = (startIndex: number): void => {
    setActiveIndex(startIndex);
    setOpen(true);
  };

  const closePanel = (returnFocus: boolean): void => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const commit = (index: number): void => {
    const option = options[index];
    if (option) onChange(option.value);
    closePanel(true);
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPanel(selectedIndex);
    }
  };

  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        commit(activeIndex);
        break;
      case 'Escape':
        event.preventDefault();
        closePanel(true);
        break;
      case 'Tab':
        closePanel(false);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        className={`ui-select__trigger${open ? ' ui-select__trigger--open' : ''} ${className}`}
        onClick={() => (open ? closePanel(false) : openPanel(selectedIndex))}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="ui-select__value">{selected?.label ?? ''}</span>
        <ChevronDown className="ui-select__chevron" aria-hidden="true" />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={labelledBy}
            aria-activedescendant={optionId(activeIndex)}
            data-placement={position.placement}
            className="ui-select__panel"
            style={{
              top: position.top,
              bottom: position.bottom,
              left: position.left,
              minWidth: position.width,
            }}
            onKeyDown={onPanelKeyDown}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <div
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  className={`ui-select__option${index === activeIndex ? ' ui-select__option--active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(index)}
                >
                  <span className="ui-select__check" aria-hidden="true">
                    {isSelected && <Check className="ui-select__check-icon" />}
                  </span>
                  <span className="ui-select__option-text">
                    <span className="ui-select__option-label">{option.label}</span>
                    {option.hint && <span className="ui-select__option-hint">{option.hint}</span>}
                  </span>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

export default Select;
