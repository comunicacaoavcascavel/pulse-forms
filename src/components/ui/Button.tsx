import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'gradient';
}

export const Button = ({ children, className = '', variant = 'primary', ...props }: ButtonProps) => {
  const baseStyles = "w-full py-3 px-4 rounded-xl font-medium transition-all focus:outline-none";
  
  const variants = {
    primary: "text-black bg-primary hover:bg-primary-hover hover:shadow-glow shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
    gradient: "text-white bg-gradient-to-b from-primary/20 to-transparent border border-primary/30 hover:border-primary/60 hover:from-primary/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]",
    outline: "text-gray-300 bg-transparent border border-border hover:border-gray-500 hover:text-white"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
