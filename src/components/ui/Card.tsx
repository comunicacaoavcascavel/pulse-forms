import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export const Card = ({ children, className = '', glow = false, ...props }: CardProps) => {
  return (
    <div
      className={`glass-card rounded-2xl p-6 transition-all duration-300 ${
        glow ? 'card-glow hover:border-primary/30 hover:shadow-glow' : 'opacity-80 hover:opacity-100'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
