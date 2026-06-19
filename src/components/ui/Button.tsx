import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'gradient';
}

export const Button = ({ children, className = '', variant = 'primary', ...props }: ButtonProps) => {
  const baseStyles = "w-full py-3 px-4 rounded-xl font-medium transition-all focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "text-white bg-gradient-to-r from-primary to-primary-hover border border-primary/40 hover:shadow-glow shadow-[inset_0_1px_1px_rgba(255,255,255,0.24)]",
    gradient: "text-white bg-gradient-to-r from-primary/55 via-primary to-primary-hover border border-primary/40 hover:border-primary/70 hover:shadow-glow shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)]",
    outline: "text-slate-300 bg-white/[0.025] border border-border hover:border-primary/50 hover:text-white hover:bg-primary/10"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
