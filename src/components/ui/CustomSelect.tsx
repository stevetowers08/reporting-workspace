/**
 * CustomSelect - Beautiful dropdown with custom styling
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: 'default' | 'gradient';
  placeholder?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  className = '',
  variant = 'default',
  placeholder = 'Select...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // Gradient variant for group header
  if (variant === 'gradient') {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="h-8 pl-2.5 pr-9 border border-white/30 rounded-lg text-xs bg-white/10 backdrop-blur-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer min-w-[180px] hover:bg-white/15 transition-colors flex items-center justify-between"
        >
          <span className="truncate">{selectedOption?.label || placeholder}</span>
          <ChevronDown className={`h-3.5 w-3.5 opacity-70 absolute right-2.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${
                  option.value === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-900'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value && <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-900 hover:border-slate-400 transition-colors shadow-sm cursor-pointer flex items-center justify-between min-w-[140px]"
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${
                option.value === value ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-700'
              }`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <Check className="h-4 w-4 text-slate-600 flex-shrink-0 ml-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
