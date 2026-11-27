import { useEffect, useState } from 'react'
import { abrirCanal, carregarConfig, carregarEstado } from './armazenamento'
import { Tela } from './components/Tela'
import { estadoInicial } from './jogo'
import type { Config, EstadoJogo } from './tipos'
import { useInativo } from './useInativo'

/** Janela para arrastar até o telão. Só exibe; quem controla é a janela principal. */
export function Telao() {
  const [estado, setEstado] = useState<EstadoJogo>(() => carregarEstado() ?? estadoInicial())
  const [config, setConfig] = useState<Config>(carregarConfig)
  const [telaCheia, setTelaCheia] = useState(false)
  const inativo = useInativo(2500)

  useEffect(() => {
    document.title = 'Telão · Gincana Peniel'
    const canal = abrirCanal((m) => {
      if (m.tipo === 'estado') {
        setEstado(m.estado)
        setConfig(m.config)
      }
    })
    canal.enviar({ tipo: 'ola' })
    const sinal = setInterval(() => canal.enviar({ tipo: 'ping' }), 2000)

    const aoMudar = () => setTelaCheia(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', aoMudar)
    return () => {
      clearInterval(sinal)
      canal.fechar()
      document.removeEventListener('fullscreenchange', aoMudar)
    }
  }, [])

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen().catch(() => {})
  }

  return (
    <div className={`modo-telao ${inativo ? 'inativo' : ''}`} onDoubleClick={alternarTelaCheia}>
      <Tela estado={estado} config={config} />
      {!telaCheia && (
        <button className="botao-tela-cheia" onClick={alternarTelaCheia}>
          ⛶ Tela cheia (ou duplo clique / F11)
        </button>
      )}
    </div>
  )
}
