// Logo FINMED em SVG (recriado a partir do PNG do branding kit)
// Versão "white" para fundos escuros, "dark" para fundos claros
export function Logo({ variant = 'white', className = '' }) {
  const color = variant === 'white' ? '#ffffff' : '#1e2b13';
  return (
    <svg
      viewBox="0 0 200 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill={color}
      aria-label="FINMED"
    >
      {/* Símbolo: 3 barras horizontais + ponto + 3 barras verticais */}
      <rect x="0" y="0"  width="14" height="3" />
      <rect x="0" y="7"  width="14" height="3" />
      <rect x="0" y="14" width="10" height="3" />
      <circle cx="12.5" cy="15.5" r="1.5" />
      <rect x="16" y="0" width="3" height="17" />
      <rect x="20" y="0" width="3" height="17" />
      <rect x="24" y="0" width="3" height="17" />
      {/* Wordmark: F I N M E D */}
      <text x="34" y="15" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="16" letterSpacing="0.5">
        FINMED
      </text>
    </svg>
  );
}
