// Mostra foto do user; se não tiver, mostra iniciais sobre fundo amarelo
export function Avatar({ url, name, email, size = 32, className = '' }) {
  const initials = getInitials(name || email);
  const sizePx = `${size}px`;
  const fontSize = `${Math.max(11, Math.floor(size * 0.4))}px`;

  if (url) {
    return (
      <img
        src={url}
        alt={name || 'Avatar'}
        className={`rounded-full object-cover ${className}`}
        style={{ width: sizePx, height: sizePx }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-fm-yellow text-fm-green-dark font-bold flex items-center justify-center ${className}`}
      style={{ width: sizePx, height: sizePx, fontSize }}
    >
      {initials}
    </div>
  );
}

function getInitials(s) {
  if (!s) return '?';
  const clean = s.trim();
  // Se for email, usa as 2 primeiras letras antes do @
  if (clean.includes('@')) {
    return clean.split('@')[0].slice(0, 2).toUpperCase();
  }
  // Se for nome, primeiras letras de 2 palavras
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}
