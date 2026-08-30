import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  className = '',
  ...props
}) => {
  const variantClass = variant === 'icon' ? 'btn-icon' : `btn btn-${variant}`;
  const sizeClass = size !== 'medium' ? `btn-${size}` : '';

  return (
    <button
      className={`${variantClass} ${sizeClass} ${loading ? 'loading' : ''} ${className}`.trim()}
      disabled={loading || props.disabled}
      {...props}
    >
      {children}
    </button>
  );
};
