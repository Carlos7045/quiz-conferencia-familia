import { useEffect, useState } from 'react'

/** Fica `true` quando o mouse fica parado por `ms` milissegundos (para esconder cursor e botões). */
export function useInativo(ms: number) {
  const [inativo, setInativo] = useState(false)
  useEffect(() => {
    let t = setTimeout(() => setInativo(true), ms)
    const aoMexer = () => {
      setInativo(false)
      clearTimeout(t)
      t = setTimeout(() => setInativo(true), ms)
    }
    window.addEventListener('mousemove', aoMexer)
    window.addEventListener('mousedown', aoMexer)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousemove', aoMexer)
      window.removeEventListener('mousedown', aoMexer)
    }
  }, [ms])
  return inativo
}
