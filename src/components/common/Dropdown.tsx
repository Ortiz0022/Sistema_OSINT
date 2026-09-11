import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Loader2, Search } from 'lucide-react';
import './Dropdown.css';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  ariaLabel?: string;
  enableSearchThreshold?: number;
}

export const Dropdown: React.FC<DropdownProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  disabled = false,
  isLoading = false,
  className = '',
  ariaLabel,
  enableSearchThreshold = 10,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const generatedId = useId();
  const dropdownId = id || generatedId;

  // Encontrar etiqueta del valor seleccionado
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;
  const isPlaceholder = !selectedOption;

  // Filtrado de opciones
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showSearch = options.length > enableSearchThreshold;

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Enfocar buscador al abrir
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  const toggleDropdown = () => {
    if (disabled || isLoading) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (!next) {
        setSearchQuery('');
        setFocusedIndex(-1);
      }
      return next;
    });
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || isLoading) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter' && isOpen && focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
      e.preventDefault();
      const opt = filteredOptions[focusedIndex];
      if (opt && !opt.disabled) {
        handleSelect(opt.value);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`custom-dropdown ${isOpen ? 'custom-dropdown--open' : ''} ${
        disabled ? 'custom-dropdown--disabled' : ''
      } ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        id={dropdownId}
        className="custom-dropdown__trigger"
        onClick={toggleDropdown}
        disabled={disabled || isLoading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
      >
        <span
          className={`custom-dropdown__value ${
            isPlaceholder ? 'custom-dropdown__value--placeholder' : ''
          }`}
        >
          {displayLabel}
        </span>
        {isLoading ? (
          <Loader2 className="custom-dropdown__spinner" />
        ) : (
          <ChevronDown className="custom-dropdown__chevron" />
        )}
      </button>

      {isOpen && (
        <div className="custom-dropdown__menu" role="presentation">
          {showSearch && (
            <div className="custom-dropdown__search-wrap">
              <Search className="custom-dropdown__search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                className="custom-dropdown__search-input"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <ul
            ref={listRef}
            className="custom-dropdown__list"
            role="listbox"
            aria-labelledby={dropdownId}
          >
            {filteredOptions.length === 0 ? (
              <li className="custom-dropdown__empty">Sin resultados</li>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isFocused = index === focusedIndex;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    className={`custom-dropdown__item ${
                      isSelected ? 'custom-dropdown__item--selected' : ''
                    } ${isFocused ? 'custom-dropdown__item--focused' : ''}`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="custom-dropdown__check" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
