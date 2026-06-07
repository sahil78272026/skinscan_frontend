import { InputHTMLAttributes } from "react";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
}

export function Checkbox({ label, className = "", ...props }: CheckboxProps) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer ${className}`}>
      <input 
        type="checkbox" 
        className="mt-1 w-5 h-5 rounded border-gray-300 text-terracotta-600 focus:ring-terracotta-500" 
        {...props} 
      />
      <span className="text-sm text-gray-700 leading-tight select-none">
        {label}
      </span>
    </label>
  );
}
