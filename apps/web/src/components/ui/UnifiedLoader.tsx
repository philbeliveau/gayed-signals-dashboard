'use client';

interface UnifiedLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string;
}

/**
 * UnifiedLoader - Minimalist spinner animation
 * Clean 12-bar rotating loader for all loading states
 */
export default function UnifiedLoader({
  size = 'xl',
  className = ''
}: UnifiedLoaderProps) {
  const sizeScale = {
    sm: 0.5,    // 27px
    md: 0.75,   // 40px
    lg: 1,      // 54px
    xl: 1.5,    // 81px
    xxl: 2      // 108px
  };

  const scale = sizeScale[size];

  return (
    <div
      className={`loader ${className}`}
      style={{ transform: `scale(${scale})` }}
    >
      <div className="bar1"></div>
      <div className="bar2"></div>
      <div className="bar3"></div>
      <div className="bar4"></div>
      <div className="bar5"></div>
      <div className="bar6"></div>
      <div className="bar7"></div>
      <div className="bar8"></div>
      <div className="bar9"></div>
      <div className="bar10"></div>
      <div className="bar11"></div>
      <div className="bar12"></div>
    </div>
  );
}
