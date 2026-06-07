import { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = "primary", 
  isLoading, 
  className = "", 
  disabled, 
  ...props 
}: ButtonProps) {
  const base = "w-full py-3 px-6 rounded-full font-bold transition-all flex justify-center items-center gap-2 active:scale-95";
  
  const variants = {
    primary: "bg-terracotta-600 text-white hover:bg-terracotta-700 disabled:bg-terracotta-400 disabled:cursor-not-allowed",
    secondary: "bg-gold-500 text-white hover:bg-gold-600 disabled:bg-gold-400 disabled:cursor-not-allowed",
    outline: "border-2 border-terracotta-600 text-terracotta-600 hover:bg-terracotta-50 disabled:border-terracotta-300 disabled:text-terracotta-300 disabled:cursor-not-allowed"
  };

  return (
    <button 
      className={`${base} ${variants[variant]} ${className}`} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" size={20} />}
      {children}
    </button>
  );
}
