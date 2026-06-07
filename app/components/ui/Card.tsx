export function Card({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-peach-200 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
