import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  abrirCanal,
  carregarConfig,
  carregarEstado,
  salvarConfig,
  salvarEstado,
} from './armazenamento'
import { Configuracoes } from './components/Configuracoes'
import { LETRAS, Tela } from './components/Tela'
import {
  PERGUNTAS,
  acertou,
  buscarPergunta,
  estadoInicial,
  marcar,
  podeSortear,
  proximaRodada,
  pular,
  respondida,
  revelarCorreta,
  revelarOpcao,
  sortear,
} from './jogo'
import { carregarArquivos, configurarSom, pararSons, tocar, type NomeSom } from './sons'
import type { EstadoJogo } from './tipos'
import { useInativo } from './useInativo'

type Canal = ReturnType<typeof abrirCanal>

export function Controle() {
  const [config, setConfig] = useState(carregarConfig)
  const [estado, setEstado] = useState<EstadoJogo>(() => carregarEstado() ?? estadoInicial())
  const historico = useRef<EstadoJogo[]>([])
  const [podeDesfazer, setPodeDesfazer] = useState(false)
  const [telaUnica, setTelaUnica] = useState(false)
  const [abrirConfig, setAbrirConfig] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [telaoConectado, setTelaoConectado] = useState(false)

  const estadoRef = useRef(estado)
  const configRef = useRef(config)
  const canalRef = useRef<Canal | null>(null)
  configRef.current = config

  // ---------- sincronização com a janela do telão ----------
  useEffect(() => {
    let ultimoSinal = 0
    const canal = abrirCanal((m) => {
      if (m.tipo === 'ola' || m.tipo === 'ping') {
        ultimoSinal = Date.now()
        setTelaoConectado(true)
      }
      if (m.tipo === 'ola') canal.enviar({ tipo: 'estado', estado: estadoRef.current, config: configRef.current })
    })
    canalRef.current = canal
    const verificar = setInterval(() => setTelaoConectado(Date.now() - ultimoSinal < 5000), 2000)
    return () => {
      clearInterval(verificar)
      canal.fechar()
    }
  }, [])

  useEffect(() => {
    salvarEstado(estado)
    canalRef.current?.enviar({ tipo: 'estado', estado, config })
  }, [estado, config])

  useEffect(() => {
    salvarConfig(config)
    configurarSom({ ativo: config.somAtivo, volume: config.volume })
  }, [config])

  useEffect(() => carregarArquivos(), [])

  // ---------- ações ----------
  const aplicar = useCallback((novo: EstadoJogo, som?: NomeSom) => {
    const atual = estadoRef.current
    if (novo === atual) return
    estadoRef.current = novo
    historico.current = [...historico.current.slice(-29), atual]
    setPodeDesfazer(true)
    setEstado(novo)
    if (som) tocar(som)
  }, [])

  const acoes = useRef({
    proximaPergunta() {
      const e = estadoRef.current
      const cfg = configRef.current
      if (e.fase === 'fim') return
      if (e.fase !== 'fimRodada' && !podeSortear(e)) return
      const base = e.fase === 'fimRodada' ? proximaRodada(e) : e
      const novo = sortear(base, cfg)
      aplicar(novo, novo.fase === 'pergunta' ? 'abertura' : undefined)
    },
    proximaOpcao() {
      aplicar(revelarOpcao(estadoRef.current), 'opcao')
    },
    marcar(posicao: number) {
      const novo = marcar(estadoRef.current, posicao, configRef.current)
      if (novo !== estadoRef.current) aplicar(novo, acertou(novo) ? 'acerto' : 'erro')
    },
    revelarCorreta() {
      aplicar(revelarCorreta(estadoRef.current))
    },
    pular() {
      pararSons()
      aplicar(pular(estadoRef.current))
    },
  }).current

  const desfazer = useCallback(() => {
    const anterior = historico.current.pop()
    if (!anterior) return
    pararSons()
    estadoRef.current = anterior
    setEstado(anterior)
    setPodeDesfazer(historico.current.length > 0)
  }, [])

  const reiniciar = () => {
    if (!confirm('Reiniciar o jogo? Todas as perguntas voltam a ficar disponíveis.')) return
    pararSons()
    const novo = estadoInicial()
    estadoRef.current = novo
    setEstado(novo)
    historico.current = []
    setPodeDesfazer(false)
  }

  // ---------- modo automático ----------
  useEffect(() => {
    if (config.modoOpcoes !== 'automatico' || pausado) return
    if (estado.fase !== 'pergunta' || estado.escolhida !== null) return
    if (estado.opcoesVisiveis >= estado.ordem.length) return
    const segundos = estado.opcoesVisiveis === 0 ? config.segundosLeitura : config.segundosEntreOpcoes
    const t = setTimeout(acoes.proximaOpcao, segundos * 1000)
    return () => clearTimeout(t)
  }, [estado, config, pausado, acoes])

  // ---------- tela única (sem telão estendido) ----------
  const entrarTelaUnica = () => {
    setTelaUnica(true)
    void document.documentElement.requestFullscreen?.().catch(() => {})
  }
  const sairTelaUnica = useCallback(() => {
    setTelaUnica(false)
    if (document.fullscreenElement) void document.exitFullscreen()
  }, [])
  useEffect(() => {
    const aoMudar = () => !document.fullscreenElement && setTelaUnica(false)
    document.addEventListener('fullscreenchange', aoMudar)
    return () => document.removeEventListener('fullscreenchange', aoMudar)
  }, [])

  // ---------- atalhos de teclado ----------
  useEffect(() => {
    const aoTeclar = (ev: KeyboardEvent) => {
      const alvo = ev.target as HTMLElement
      if (abrirConfig || alvo.closest('input, select, textarea')) return
      const k = ev.key.toLowerCase()
      const posicao = ['1', '2', '3', '4'].indexOf(k) >= 0 ? Number(k) - 1 : ['a', 'b', 'c', 'd'].indexOf(k)
      if (k === 'enter' || k === 'n') acoes.proximaPergunta()
      else if (k === ' ' || k === 'arrowright') acoes.proximaOpcao()
      else if (posicao >= 0) acoes.marcar(posicao)
      else if (k === 'r') acoes.revelarCorreta()
      else if (k === 'p') setPausado((p) => !p)
      else if (k === 'backspace' || (ev.ctrlKey && k === 'z')) desfazer()
      else if (k === 'escape' && telaUnica) sairTelaUnica()
      else return
      ev.preventDefault()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [acoes, desfazer, sairTelaUnica, telaUnica, abrirConfig])

  const abrirTelao = () => {
    window.open(`${location.pathname}#/telao`, 'telao-peniel', 'popup,width=1280,height=720')
  }

  const botoes = (
    <BotoesAcao
      estado={estado}
      automatico={config.modoOpcoes === 'automatico'}
      pausado={pausado}
      podeDesfazer={podeDesfazer}
      acoes={acoes}
      onPausar={() => setPausado((p) => !p)}
      onDesfazer={desfazer}
    />
  )

  const configuracoes = abrirConfig && (
    <Configuracoes
      config={config}
      onMudar={setConfig}
      onFechar={() => setAbrirConfig(false)}
      onReiniciar={reiniciar}
    />
  )

  if (telaUnica) {
    return (
      <TelaUnica onSair={sairTelaUnica} barra={botoes}>
        <Tela estado={estado} config={config} onEscolher={acoes.marcar} />
      </TelaUnica>
    )
  }

  return (
    <div className="painel">
      <header className="painel-topo">
        <h1>📖 Gincana Peniel · Controle</h1>
        <div className="painel-topo-acoes">
          <span className={`status ${telaoConectado ? 'ligado' : ''}`}>
            {telaoConectado ? '● Telão conectado' : '○ Telão não aberto'}
          </span>
          <button onClick={abrirTelao}>🖥️ Abrir telão</button>
          <button onClick={entrarTelaUnica} title="Use quando o telão estiver espelhado (mesma tela)">
            ⛶ Tela única
          </button>
          <button onClick={() => setAbrirConfig(true)}>⚙️ Configurações</button>
        </div>
      </header>

      <div className="painel-corpo">
        <section className="painel-operador">
          <VisaoOperador estado={estado} onMarcar={acoes.marcar} />
          {botoes}
        </section>

        <aside className="painel-lateral">
          <div className="preview">
            <Tela estado={estado} config={config} />
          </div>
          <Resumo estado={estado} />
          <Atalhos />
        </aside>
      </div>
      {configuracoes}
    </div>
  )
}

// ---------- subcomponentes ----------

function VisaoOperador({ estado, onMarcar }: { estado: EstadoJogo; onMarcar: (p: number) => void }) {
  const pergunta = buscarPergunta(estado.atual)
  if (estado.fase !== 'pergunta' || !pergunta) {
    const mensagens: Record<string, string> = {
      inicio: 'Clique em "Próxima pergunta" (ou Enter) para sortear.',
      fimRodada: `Fim da rodada ${estado.rodada}. ${estado.adiadas.length} pergunta(s) voltam na próxima rodada.`,
      fim: 'Todas as perguntas foram respondidas. Use "Reiniciar jogo" nas configurações para começar de novo.',
    }
    return <div className="operador-vazio">{mensagens[estado.fase]}</div>
  }

  const marcada = estado.escolhida !== null
  return (
    <div className="operador">
      <div className="operador-info">
        Pergunta nº {pergunta.id} do PDF · {pergunta.referencia}
      </div>
      <h2>{pergunta.pergunta}</h2>
      <p className="operador-dica">
        {marcada ? 'Resposta marcada.' : 'Clique na opção que a pessoa respondeu (ou tecle A–D / 1–4).'}
      </p>
      <ol className="operador-opcoes">
        {estado.ordem.map((indice, posicao) => {
          const visivel = posicao < estado.opcoesVisiveis
          const correta = indice === pergunta.correta
          const escolhida = indice === estado.escolhida
          return (
            <li key={indice}>
              <button
                className={[
                  'operador-opcao',
                  visivel ? '' : 'nao-revelada',
                  correta ? 'correta' : '',
                  escolhida ? (correta ? 'marcada-certa' : 'marcada-errada') : '',
                ].join(' ')}
                disabled={!visivel || marcada}
                onClick={() => onMarcar(posicao)}
              >
                <span className="opcao-letra">{LETRAS[posicao]}</span>
                <span className="opcao-texto">{pergunta.opcoes[indice]}</span>
                {correta && <span className="selo">certa</span>}
                {!visivel && <span className="selo cinza">ainda oculta</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

interface BotoesProps {
  estado: EstadoJogo
  automatico: boolean
  pausado: boolean
  podeDesfazer: boolean
  acoes: {
    proximaPergunta: () => void
    proximaOpcao: () => void
    revelarCorreta: () => void
    pular: () => void
  }
  onPausar: () => void
  onDesfazer: () => void
}

function BotoesAcao({ estado, automatico, pausado, podeDesfazer, acoes, onPausar, onDesfazer }: BotoesProps) {
  const emPergunta = estado.fase === 'pergunta'
  const marcada = respondida(estado)
  const faltamOpcoes = emPergunta && !marcada && estado.opcoesVisiveis < estado.ordem.length
  const textoProxima =
    estado.fase === 'fimRodada' ? `▶ Começar rodada ${estado.rodada + 1}` : '▶ Próxima pergunta'

  return (
    <div className="acoes">
      <button className="primario" disabled={!faltamOpcoes} onClick={acoes.proximaOpcao}>
        Próxima opção <kbd>Espaço</kbd>
      </button>
      <button
        className="primario"
        disabled={estado.fase === 'fim' || (estado.fase !== 'fimRodada' && !podeSortear(estado))}
        onClick={acoes.proximaPergunta}
      >
        {textoProxima} <kbd>Enter</kbd>
      </button>
      {automatico && emPergunta && !marcada && (
        <button onClick={onPausar}>
          {pausado ? '▶ Retomar automático' : '⏸ Pausar automático'} <kbd>P</kbd>
        </button>
      )}
      {marcada && !estado.mostrarCorreta && (
        <button onClick={acoes.revelarCorreta} title="Mostra a resposta certa e tira a pergunta da próxima rodada">
          Mostrar resposta certa <kbd>R</kbd>
        </button>
      )}
      {emPergunta && !marcada && (
        <button onClick={acoes.pular} title="Devolve a pergunta para o fim da fila">
          ⤼ Pular pergunta
        </button>
      )}
      <button disabled={!podeDesfazer} onClick={onDesfazer}>
        ↶ Desfazer <kbd>Backspace</kbd>
      </button>
    </div>
  )
}

function Resumo({ estado }: { estado: EstadoJogo }) {
  const restantes = estado.fila.length
  return (
    <div className="resumo">
      <div>
        <strong>{estado.rodada}</strong>
        <span>rodada</span>
      </div>
      <div>
        <strong>{restantes}</strong>
        <span>restantes na rodada</span>
      </div>
      <div>
        <strong>{estado.adiadas.length}</strong>
        <span>para próxima rodada</span>
      </div>
      <div>
        <strong>{PERGUNTAS.length}</strong>
        <span>total</span>
      </div>
    </div>
  )
}

function Atalhos() {
  return (
    <details className="atalhos">
      <summary>Atalhos de teclado</summary>
      <ul>
        <li><kbd>Enter</kbd> ou <kbd>N</kbd> próxima pergunta</li>
        <li><kbd>Espaço</kbd> ou <kbd>→</kbd> próxima opção</li>
        <li><kbd>A</kbd>–<kbd>D</kbd> ou <kbd>1</kbd>–<kbd>4</kbd> marcar a resposta</li>
        <li><kbd>R</kbd> mostrar resposta certa (quando ficou para a próxima rodada)</li>
        <li><kbd>P</kbd> pausar/retomar o modo automático</li>
        <li><kbd>Backspace</kbd> ou <kbd>Ctrl+Z</kbd> desfazer</li>
        <li><kbd>Esc</kbd> sair da tela única</li>
      </ul>
    </details>
  )
}

function TelaUnica({ children, barra, onSair }: { children: ReactNode; barra: ReactNode; onSair: () => void }) {
  const inativo = useInativo(2500)
  return (
    <div className={`modo-unico ${inativo ? 'inativo' : ''}`}>
      {children}
      <div className="barra-flutuante">
        {barra}
        <button onClick={onSair}>✕ Sair</button>
      </div>
    </div>
  )
}
