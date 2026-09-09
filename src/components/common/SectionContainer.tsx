import React, { type ReactNode } from 'react';
import './SectionContainer.css';

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'normal' | 'wide' | 'narrow';
}

export const SectionContainer: React.FC<SectionContainerProps> = ({
  children,
  className = '',
  size = 'normal',
}) => {
  return (
    <div className={`section-container section-container--${size} ${className}`}>
      {children}
    </div>
  );
};

export default SectionContainer;
