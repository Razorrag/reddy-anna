import React from 'react';
import { cn } from '../../lib/utils';

// Base input component with validation
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
  helperText?: string;
  variant?: 'default' | 'filled' | 'outlined';
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  required, 
  icon, 
  helperText,
  variant = 'default',
  className, 
  ...props 
}) => {
  const baseClasses = "w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 transition-colors duration-200";
  
  const variantClasses = {
    default: "bg-gray-700/50 border border-gray-600 focus:ring-gold",
    filled: "bg-gray-600/50 border-0 focus:ring-gold focus:bg-gray-600/70",
    outlined: "bg-transparent border-2 border-gray-600 focus:ring-gold focus:border-gold"
  };
  
  const errorClasses = error 
    ? "border-red-500 focus:ring-red-500" 
    : "";
  
  const iconPadding = icon ? "pl-10" : "pl-4";
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={cn(
            baseClasses,
            variantClasses[variant],
            errorClasses,
            iconPadding,
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
          <span className="text-xs">⚠</span>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

// Select component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  helperText?: string;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  label, 
  error, 
  required, 
  options, 
  helperText,
  placeholder = "Select an option...",
  className, 
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        className={cn(
          "w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 transition-colors duration-200 bg-gray-700/50 border border-gray-600 focus:ring-gold",
          error && "focus:ring-red-500 border-red-600",
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
          <span className="text-xs">⚠</span>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

// Textarea component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}

export const Textarea: React.FC<TextareaProps> = ({ 
  label, 
  error, 
  required, 
  helperText,
  resize = 'vertical',
  className, 
  ...props 
}) => {
  const resizeClasses = {
    none: 'resize-none',
    both: 'resize',
    horizontal: 'resize-x',
    vertical: 'resize-y'
  };
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        className={cn(
          "w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 transition-colors duration-200 bg-gray-700/50 border border-gray-600 focus:ring-gold",
          resizeClasses[resize],
          error && "focus:ring-red-500 border-red-600",
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
          <span className="text-xs">⚠</span>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

// Checkbox component
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ 
  label, 
  error, 
  required, 
  helperText,
  className, 
  ...props 
}) => {
  return (
    <div className="w-full">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className={cn(
            "mt-1 w-4 h-4 text-gold bg-gray-700 border-gray-600 rounded focus:ring-gold focus:ring-2",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {label && (
          <label className="text-sm font-medium text-gray-300">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
          <span className="text-xs">⚠</span>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

// Radio group component
interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  label?: string;
  error?: string;
  required?: boolean;
  options: RadioOption[];
  value?: string;
  onChange: (value: string) => void;
  name: string;
  helperText?: string;
  direction?: 'vertical' | 'horizontal';
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ 
  label, 
  error, 
  required, 
  options,
  value,
  onChange,
  name,
  helperText,
  direction = 'vertical',
}) => {
  const directionClasses = direction === 'horizontal' ? 'flex-row gap-4' : 'flex-col gap-2';
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className={cn("flex", directionClasses)}>
        {options.map(option => (
          <div key={option.value} className="flex items-center gap-2">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={option.disabled}
              className="w-4 h-4 text-gold bg-gray-700 border-gray-600 focus:ring-gold focus:ring-2"
            />
            <label className="text-sm font-medium text-gray-300">
              {option.label}
            </label>
          </div>
        ))}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
          <span className="text-xs">⚠</span>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

// Form field wrapper for consistent spacing
interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ children, className }) => {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  );
};

// Form section for grouping related fields
interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({ 
  title, 
  description, 
  children, 
  className 
}) => {
  return (
    <div className={cn("mb-6", className)}>
      {title && (
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-gray-400 mb-4">{description}</p>
      )}
      {children}
    </div>
  );
};

// Form actions container
interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

export const FormActions: React.FC<FormActionsProps> = ({ 
  children, 
  className, 
  align = 'right' 
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  };
  
  return (
    <div className={cn("flex gap-3 mt-6", alignClasses[align], className)}>
      {children}
    </div>
  );
};

// Form validation utilities
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
  message?: string;
}

export const validateField = (value: string, rules: ValidationRule[]): string | null => {
  for (const rule of rules) {
    if (rule.required && !value.trim()) {
      return rule.message || 'This field is required';
    }
    
    if (rule.minLength && value.length < rule.minLength) {
      return rule.message || `Minimum length is ${rule.minLength} characters`;
    }
    
    if (rule.maxLength && value.length > rule.maxLength) {
      return rule.message || `Maximum length is ${rule.maxLength} characters`;
    }
    
    if (rule.pattern && !rule.pattern.test(value)) {
      return rule.message || 'Invalid format';
    }
    
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) return customError;
    }
  }
  
  return null;
};

// Common validation rules
export const validationRules = {
  required: { required: true, message: 'This field is required' },
  email: { 
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
    message: 'Please enter a valid email address' 
  },
  mobile: { 
    pattern: /^[6-9]\d{9}$/, 
    message: 'Please enter a valid 10-digit mobile number' 
  },
  minLength: (min: number) => ({ 
    minLength: min, 
    message: `Minimum length is ${min} characters` 
  }),
  maxLength: (max: number) => ({ 
    maxLength: max, 
    message: `Maximum length is ${max} characters` 
  })
};
