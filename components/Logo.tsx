import React from 'react';

const Logo: React.FC = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Estimator Pro Plus Logo"
    >
      <defs>
        <linearGradient id="e-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dd4bf" /> {/* teal-400 */}
          <stop offset="100%" stopColor="#14b8a6" /> {/* teal-600 */}
        </linearGradient>
      </defs>
      
      {/* Stylized 'E' part */}
      <path
        className="logo-cube-face"
        d="M16 5H4V19"
        stroke="url(#e-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ animationDelay: '0s' }}
      />
      <path
        className="logo-cube-face"
        d="M4 12H12"
        stroke="url(#e-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ animationDelay: '0.2s' }}
      />

      {/* Checkmark part integrated into the design */}
      <path
        className="logo-cube-face"
        d="M8 19L10 21L16 15"
        stroke="#5eead4" /* teal-300 */
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ animationDelay: '0.4s' }}
      />
      
      {/* Plus symbol */}
      <g className="animate-fade-in" transform="translate(16, 4)" style={{ animationDelay: '1s' }}>
        <path
          d="M3 0V6"
          stroke="#0d9488" /* teal-700 */
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M0 3H6"
          stroke="#0d9488" /* teal-700 */
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export default Logo;
