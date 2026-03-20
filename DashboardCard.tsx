
import React from 'react';

interface DashboardCardProps {
  numberText?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'outline' | 'accent-blue' | 'accent-yellow' | 'accent-green' | 'dark' | 'cream';
}

const DashboardCard: React.FC<DashboardCardProps> = ({ 
  numberText, 
  title, 
  subtitle, 
  children, 
  className = "",
  variant = 'outline'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'accent-blue': return 'bg-brand-blue border-black text-black';
      case 'accent-yellow': return 'bg-brand-yellow border-black text-black';
      case 'accent-green': return 'bg-brand-green border-black text-black';
      case 'dark': return 'bg-brand-dark border-black text-white';
      case 'cream': return 'bg-brand-cream border-black text-black';
      default: return 'bg-white border-black text-black';
    }
  };

  return (
    <div className={`p-2.5 rounded-none border-t-[3px] transition-all flex flex-col ${getVariantStyles()} ${className}`}>
      <div className="flex items-start gap-2 mb-1.5">
        {numberText && (
          <div className={`flex-shrink-0 w-4.5 h-4.5 flex items-center justify-center text-[9px] font-extrabold tracking-tighter border border-current`}>
            {numberText}
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <h3 className={`font-serif leading-none tracking-tight truncate ${variant === 'cream' ? 'text-xl pt-0.5' : 'text-[15px] pt-0.5'}`}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-[7px] font-extrabold uppercase tracking-widest mt-0.5 opacity-60">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className={`flex-grow ${variant === 'dark' ? 'text-white/95' : 'text-black/95'}`}>
        {children}
      </div>
    </div>
  );
};

export default DashboardCard;
