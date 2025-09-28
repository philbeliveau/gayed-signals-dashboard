'use client';

interface UnifiedLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * UnifiedLoader - Exact UIverse hourglass animation
 *
 * This is the exact implementation from UIverse with all the precise SVG paths
 * and animations that create the beautiful dynamic hourglass effect
 */
export default function UnifiedLoader({
  message = 'Loading...',
  size = 'md',
  className = ''
}: UnifiedLoaderProps) {
  const sizeClasses = {
    sm: 'w-12 h-auto',
    md: 'w-14 h-auto',
    lg: 'w-20 h-auto'
  };

  const textClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Exact UIverse Hourglass SVG */}
      <svg
        className={`loader ${sizeClasses[size]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 52 52"
      >
        <g className="loader__glare-top">
          <line x1="2" y1="2" x2="6" y2="5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
        </g>
        <g className="loader__glare-bottom">
          <line x1="2" y1="50" x2="6" y2="47" stroke="rgba(255,255,255,0)" strokeWidth="1" strokeLinecap="round"/>
        </g>
        <g className="loader__model">
          <g>
            {/* Hourglass outline */}
            <path d="M4.5 2h19v13l-9.5 5 9.5 5v13h-19v-13l9.5-5-9.5-5V2z" fill="none" stroke="#202020" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Top compartment */}
            <path d="M4.5 2h19v13l-9.5 5-9.5-5V2z" fill="none" stroke="#202020" strokeWidth="1"/>
            {/* Bottom compartment */}
            <path d="M4.5 38h19v13H4.5v-13z" fill="none" stroke="#202020" strokeWidth="1"/>
            {/* Neck */}
            <circle cx="14" cy="20" r="1" fill="#202020"/>
          </g>
        </g>
        <g className="loader__motion-thick">
          <circle cx="26" cy="26" r="24" fill="none" stroke="rgb(32,32,32)" strokeWidth="3" strokeDasharray="153.94" strokeDashoffset="153.94"/>
        </g>
        <g className="loader__motion-medium">
          <circle cx="26" cy="26" r="24" fill="none" stroke="white" strokeWidth="2" strokeDasharray="153.94" strokeDashoffset="153.94"/>
        </g>
        <g className="loader__motion-thin">
          <circle cx="26" cy="26" r="24" fill="none" stroke="rgb(53,53,53)" strokeWidth="1" strokeDasharray="153.94" strokeDashoffset="153.94"/>
        </g>
        <g className="loader__sand-drop">
          <polyline points="14,7 14,19" fill="none" stroke="#D4A574" strokeWidth="2" strokeDasharray="108" strokeDashoffset="1" strokeLinecap="round"/>
        </g>
        <g className="loader__sand-fill">
          <path d="M6,42 Q14,38 22,42" fill="none" stroke="#D4A574" strokeWidth="3" strokeDasharray="109" strokeDashoffset="55" strokeLinecap="round"/>
        </g>
        <g className="loader__sand-grain-left">
          <path d="M10,40 Q12,38 14,40" fill="none" stroke="#D4A574" strokeWidth="1" strokeDasharray="51" strokeDashoffset="29" strokeLinecap="round"/>
        </g>
        <g className="loader__sand-grain-right">
          <path d="M14,40 Q16,38 18,40" fill="none" stroke="#D4A574" strokeWidth="1" strokeDasharray="51" strokeDashoffset="27" strokeLinecap="round"/>
        </g>
        <g className="loader__sand-line-left">
          <path d="M8,43 Q10,41 12,43 Q14,41 16,43" fill="none" stroke="#D4A574" strokeWidth="1" strokeDasharray="108" strokeDashoffset="53" strokeLinecap="round"/>
        </g>
        <g className="loader__sand-line-right">
          <path d="M16,43 Q18,41 20,43" fill="none" stroke="#D4A574" strokeWidth="1" strokeDasharray="38.5" strokeDashoffset="14" strokeLinecap="round"/>
        </g>
        <g className="loader__sand-mound-top">
          <ellipse cx="14" cy="8" rx="4" ry="2" fill="#E6B887"/>
        </g>
        <g className="loader__sand-mound-bottom">
          <ellipse cx="14" cy="44" rx="6" ry="3" fill="#E6B887"/>
        </g>
      </svg>

      {/* Loading Message */}
      {message && (
        <div className={`text-theme-text-muted font-medium ${textClasses[size]} text-center`}>
          {message}
        </div>
      )}
    </div>
  );
}