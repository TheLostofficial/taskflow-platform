import React from 'react';
import { Spinner as BootstrapSpinner } from 'react-bootstrap';

const Spinner = ({ size = 'md', variant = 'primary', className = '' }) => {
  const spinnerSize = {
    sm: 'spinner-border-sm',
    md: '',
    lg: 'spinner-border-lg'
  }[size];

  return (
    <div className={`d-flex justify-content-center align-items-center ${className}`}>
      <BootstrapSpinner 
        animation="border" 
        variant={variant} 
        className={spinnerSize}
        role="status"
      >
        <span className="visually-hidden">Загрузка...</span>
      </BootstrapSpinner>
    </div>
  );
};

export default Spinner;