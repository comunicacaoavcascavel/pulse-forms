import Image from 'next/image';

type ZalenLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  subtitle?: string;
  className?: string;
};

const logoSizes = {
  sm: 'w-8 h-8 rounded-xl',
  md: 'w-10 h-10 rounded-2xl',
  lg: 'w-14 h-14 rounded-2xl',
};

export function ZalenLogo({
  size = 'md',
  showText = true,
  subtitle,
  className = '',
}: ZalenLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`zalen-logo-tile shrink-0 overflow-hidden flex items-center justify-center ${logoSizes[size]}`}>
        <Image
          src="/brand/zalen-icon.svg"
          alt="Zalen"
          width={56}
          height={56}
          unoptimized
          className="h-full w-full object-cover"
        />
      </div>

      {showText && (
        <div className="min-w-0">
          <p className="zalen-title-gradient text-xl font-bold leading-tight tracking-normal">
            Forms Zalen
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.28em] text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
