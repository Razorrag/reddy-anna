import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button: React.FC<ButtonProps> = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className,
  disabled,
  ...props
}, ref) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-gold text-black hover:bg-yellow-400 focus:ring-gold shadow-md hover:shadow-lg",
    secondary: "bg-white text-black hover:bg-gray-100 focus:ring-gray-300 border border-gray-300",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-md",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-md",
    warning: "bg-yellow-500 text-black hover:bg-yellow-600 focus:ring-yellow-400 shadow-md",
    info: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-md",
    ghost: "bg-transparent text-gold hover:bg-gold/10 focus:ring-gold border border-gold/30",
    outline: "bg-transparent text-gold hover:bg-gold/10 focus:ring-gold border border-gold"
  };
  
  const sizeClasses = {
    sm: "text-sm px-3 py-1.5 rounded-md",
    md: "text-base px-4 py-2 rounded-lg",
    lg: "text-lg px-6 py-3 rounded-lg",
    xl: "text-xl px-8 py-4 rounded-xl"
  };
  
  const widthClass = fullWidth ? "w-full" : "";
  
  const renderIcon = () => {
    if (!icon && !loading) return null;
    
    if (loading) {
      return (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    
    return icon;
  };
  
  const iconElement = renderIcon();
  const shouldShowIconLeft = iconElement && iconPosition === 'left';
  const shouldShowIconRight = iconElement && iconPosition === 'right';
  
  return (
    <button
      ref={ref}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        widthClass,
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {shouldShowIconLeft && (
        <span className="mr-2">
          {iconElement}
        </span>
      )}
      
      <span className={loading ? 'opacity-70' : ''}>
        {children}
      </span>
      
      {shouldShowIconRight && (
        <span className="ml-2">
          {iconElement}
        </span>
      )}
    </button>
  );
});

Button.displayName = "Button";

// Pre-configured button variants for common use cases
export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
);

export const SuccessButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="success" {...props} />
);

export const DangerButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="danger" {...props} />
);

export const WarningButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="warning" {...props} />
);

export const InfoButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="info" {...props} />
);

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="ghost" {...props} />
);

export const OutlineButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="outline" {...props} />
);

// Button group for related buttons
export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg';
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ 
  children, 
  className, 
  spacing = 'md' 
}) => {
  const spacingClasses = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-4'
  };
  
  return (
    <div className={cn("flex items-center", spacingClasses[spacing], className)}>
      {children}
    </div>
  );
};

export { Button };
export default Button;
