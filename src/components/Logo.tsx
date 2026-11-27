import { useId } from 'react'

export const NOME_EVENTO = '2ª Conferência da Família'
export const IGREJA = 'Assembleia de Deus · Peniel'

/** Chama do cartaz, em vetor (fica nítida em qualquer tamanho). */
export function Chama({ className = '' }: { className?: string }) {
  const id = useId()
  return (
    <svg className={`chama ${className}`} viewBox="0 0 100 120" aria-hidden="true">
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="10" y1="40" x2="95" y2="60">
          <stop offset="0" stopColor="#ff3d12" />
          <stop offset="0.5" stopColor="#ff8a12" />
          <stop offset="1" stopColor="#ffc81e" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`}>
        {/* corpo da chama, com a chama interna vazada embaixo */}
        <path d="M44 117 C27 114 12 101 11 83 C10 66 17 53 29 39 C26 52 29 62 38 67 C35 47 43 31 55 19 C61 13 65 8 67 2 C63 18 65 30 73 40 C78 46 82 52 82 60 C86 56 88 50 88 43 C97 59 97 83 89 98 C83 108 75 114 66 117 C72 100 69 81 57 63 C51 80 43 97 44 117 Z" />
        {/* labareda pequena do lado direito */}
        <path d="M71 9 C80 17 85 28 81 41 C79 33 75 28 70 23 C69 18 69 13 71 9 Z" />
      </g>
    </svg>
  )
}

/** Logo "II Conferência da Família" no estilo do cartaz. Tamanho controlado por font-size. */
export function Logo({
  comChama = false,
  compacto = false,
  className = '',
}: {
  comChama?: boolean
  compacto?: boolean
  className?: string
}) {
  return (
    <div className={`logo ${compacto ? 'compacto' : ''} ${className}`} role="img" aria-label={NOME_EVENTO}>
      {comChama && <Chama className="logo-chama" />}
      <div className="logo-titulo">
        <span className="logo-ii">II</span>CONFERÊNCIA
      </div>
      <div className="logo-script">Da Família</div>
    </div>
  )
}
