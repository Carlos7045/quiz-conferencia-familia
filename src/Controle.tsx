import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  abrirCanal,
  carregarConfig,
  carregarEstado,
  salvarConfig,
  salvarEstado,
} from './armazenamento'
import { Configuracoes } from './components/Configuracoes'
import { Chama, Logo, NOME_EVENTO } from './components/Logo'
import { Contagem, LETRAS, Tela } from './components/Tela'
import {
  EQUIPES,
  PERGUNTAS,
  acertou,
  alternarPausaCronometro,
  buscarPergunta,
  congelar,
  escolherEquipe,
  esgotarTempo,
  estadoInicial,
  marcar,
  mostrarPergunta,
  podeSortear,
  proximaRodada,
  pular,
  respondida,
  revelarCorreta,
  revelarOpcao,
  sortear,
} from './jogo'
import {
  carregarArquivos,
  configurarSom,
  iniciarFundoOpcoes,
  iniciarSuspense,
  pararFundoOpcoes,
  pararMusica,
  pararSons,
  pararSuspense,
  tocar,
  tocarMusica,
  type NomeSom,
  type StatusMusica,
} from './sons'
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
  const [statusMusica, setStatusMusica] = useState<StatusMusica>('parada')

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
  /** Troca o estado sem entrar no histórico do "Desfazer" (ex.: pausar o tempo). */
  const atualizar = useCallback((novo: EstadoJogo) => {
    if (novo === estadoRef.current) return
    estadoRef.current = novo
    setEstado(novo)
  }, [])

  const aplicar = useCallback((novo: EstadoJogo, som?: NomeSom) => {
    const atual = estadoRef.current
    if (novo === atual) return
    // No histórico o cronômetro fica pausado com o tempo que faltava,
    // assim "Desfazer" não faz o tempo esgotar de novo na hora.
    historico.current = [...historico.current.slice(-29), { ...atual, cronometro: congelar(atual.cronometro) }]
    setPodeDesfazer(true)
    estadoRef.current = novo
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
      aplicar(novo, novo.fase === 'pergunta' ? 'pergunta' : undefined)
    },
    proximaOpcao() {
      aplicar(revelarOpcao(estadoRef.current, configRef.current), 'opcao')
    },
    marcar(posicao: number) {
      const novo = marcar(estadoRef.current, posicao, configRef.current)
      if (novo !== estadoRef.current) aplicar(novo, acertou(novo) ? 'acerto' : 'erro')
    },
    esgotarTempo() {
      aplicar(esgotarTempo(estadoRef.current, configRef.current), 'tempo')
    },
    pausarTempo() {
      atualizar(alternarPausaCronometro(estadoRef.current))
    },
    escolherEquipe(indice: number) {
      aplicar(escolherEquipe(estadoRef.current, indice))
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
    if (!confirm('Reiniciar o jogo? Todas as perguntas voltam e o placar é zerado.')) return
    pararSons()
    const novo = estadoInicial()
    estadoRef.current = novo
    setEstado(novo)
    historico.current = []
    setPodeDesfazer(false)
  }

  // ---------- música de abertura (antes de começar as perguntas) ----------
  const deveTocarMusica = config.somAtivo && estado.fase === 'inicio' && estado.rodada === 1 && estado.contador === 0
  useEffect(() => {
    if (!deveTocarMusica) {
      pararMusica()
      setStatusMusica('parada')
      return
    }
    let ativo = true
    const tentar = () =>
      void tocarMusica().then((s) => {
        if (!ativo) return
        setStatusMusica(s)
        if (s === 'tocando') remover()
      })
    // O navegador só libera o som depois do primeiro clique ou tecla na página.
    const remover = () => {
      window.removeEventListener('pointerdown', tentar)
      window.removeEventListener('keydown', tentar)
    }
    window.addEventListener('pointerdown', tentar)
    window.addEventListener('keydown', tentar)
    tentar()
    return () => {
      ativo = false
      remover()
    }
  }, [deveTocarMusica])

  // ---------- fundo musical enquanto as opções aparecem ----------
  // Começa na 1ª opção e para quando a contagem começa (aí entra o suspense) ou quando respondem.
  const fundoOpcoes =
    config.somAtivo &&
    estado.fase === 'pergunta' &&
    !estado.vinheta &&
    estado.resultado === null &&
    estado.opcoesVisiveis > 0 &&
    estado.cronometro === null
  useEffect(() => {
    if (!fundoOpcoes) return
    iniciarFundoOpcoes()
    return () => pararFundoOpcoes()
  }, [fundoOpcoes, estado.contador])

  // ---------- vinheta: a pergunta aparece depois de alguns segundos ----------
  useEffect(() => {
    if (!estado.vinheta) return
    const t = setTimeout(() => atualizar(mostrarPergunta(estadoRef.current)), config.segundosVinheta * 1000)
    return () => clearTimeout(t)
  }, [estado.vinheta, estado.contador, config.segundosVinheta, atualizar])

  // ---------- modo automático ----------
  useEffect(() => {
    if (config.modoOpcoes !== 'automatico' || pausado) return
    if (estado.fase !== 'pergunta' || estado.vinheta || estado.resultado !== null) return
    if (estado.opcoesVisiveis >= estado.ordem.length) return
    const segundos = estado.opcoesVisiveis === 0 ? config.segundosLeitura : config.segundosEntreOpcoes
    const t = setTimeout(acoes.proximaOpcao, segundos * 1000)
    return () => clearTimeout(t)
  }, [estado, config, pausado, acoes])

  // ---------- contagem regressiva ----------
  const fimCronometro = estado.resultado === null ? (estado.cronometro?.fim ?? null) : null
  useEffect(() => {
    if (fimCronometro == null) return
    const t = setTimeout(acoes.esgotarTempo, Math.max(0, fimCronometro - Date.now()))
    iniciarSuspense(fimCronometro - Date.now())
    return () => {
      clearTimeout(t)
      pararSuspense()
    }
  }, [fimCronometro, acoes])

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
  const pausar = useCallback(() => {
    const e = estadoRef.current
    if (e.cronometro && e.resultado === null) acoes.pausarTempo()
    else setPausado((p) => !p)
  }, [acoes])

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
      else if (k === 'p') pausar()
      else if (k === 'backspace' || (ev.ctrlKey && k === 'z')) desfazer()
      else if (k === 'escape' && telaUnica) sairTelaUnica()
      else return
      ev.preventDefault()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [acoes, desfazer, pausar, sairTelaUnica, telaUnica, abrirConfig])

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
      onPausar={pausar}
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
        <div className="painel-marca" title={NOME_EVENTO}>
          <Chama />
          <Logo compacto />
          <span className="painel-marca-texto">Controle da gincana</span>
        </div>
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
          {statusMusica === 'bloqueada' && (
            <div className="aviso-musica">
              🔇 O navegador bloqueou a música de abertura até o primeiro clique.
              <button className="primario" onClick={() => void tocarMusica().then(setStatusMusica)}>
                ▶ Tocar música
              </button>
            </div>
          )}
          <VisaoOperador estado={estado} pontos={config.pontosPorPergunta} onMarcar={acoes.marcar} />
          {botoes}
        </section>

        <aside className="painel-lateral">
          <Placar estado={estado} onEscolher={acoes.escolherEquipe} />
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

const estiloEquipe = (i: number) =>
  ({ '--cor-equipe': EQUIPES[i].cor, '--texto-equipe': EQUIPES[i].texto }) as CSSProperties

/** Placar das equipes: só aparece para o operador, nunca no telão. */
function Placar({ estado, onEscolher }: { estado: EstadoJogo; onEscolher: (i: number) => void }) {
  const respondendo = estado.fase === 'pergunta' && estado.resultado === null ? estado.equipe : null
  const lider = Math.max(...estado.placar)
  return (
    <div className="placar">
      <div className="placar-titulo">
        <strong>Placar</strong>
        <span>só aparece aqui no controle · clique numa equipe para mudar a vez</span>
      </div>
      <div className="placar-equipes">
        {EQUIPES.map((eq, i) => {
          const marca =
            respondendo === i ? 'respondendo' : estado.proximaEquipe === i && respondendo === null ? 'próxima' : null
          return (
            <button
              key={eq.nome}
              className={`placar-equipe ${marca ? 'da-vez' : ''}`}
              style={estiloEquipe(i)}
              onClick={() => onEscolher(i)}
              title={respondendo !== null ? 'Passar esta pergunta para esta equipe' : 'Esta equipe recebe a próxima pergunta'}
            >
              <span className="placar-nome">
                {eq.nome}
                {lider > 0 && estado.placar[i] === lider && ' 🏆'}
              </span>
              <span className="placar-pontos">{estado.placar[i]}</span>
              <span className="placar-marca">{marca ?? ' '}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function VisaoOperador({
  estado,
  pontos,
  onMarcar,
}: {
  estado: EstadoJogo
  pontos: number
  onMarcar: (p: number) => void
}) {
  const pergunta = buscarPergunta(estado.atual)
  if (estado.fase !== 'pergunta' || !pergunta) {
    const proxima = `A próxima pergunta vai para a equipe ${EQUIPES[estado.proximaEquipe].nome}.`
    const mensagens: Record<string, string> = {
      inicio: `Clique em "Próxima pergunta" (ou Enter) para sortear. ${proxima}`,
      fimRodada: `Fim da rodada ${estado.rodada}. ${estado.adiadas.length} pergunta(s) voltam na próxima rodada. ${proxima}`,
      fim: 'Todas as perguntas foram respondidas. Use "Reiniciar jogo" nas configurações para começar de novo.',
    }
    return <div className="operador-vazio">{mensagens[estado.fase]}</div>
  }

  const encerrada = estado.resultado !== null
  const dica = {
    acerto: `Acertou! +${pontos} pontos para a equipe ${EQUIPES[estado.equipe].nome}.`,
    erro: 'Errou. Nenhum ponto.',
    tempo: 'Tempo esgotado. Nenhum ponto.',
  }
  return (
    <div className="operador">
      <div className="operador-cabecalho">
        <span className="operador-equipe" style={estiloEquipe(estado.equipe)}>
          Equipe {EQUIPES[estado.equipe].nome}
        </span>
        <span className="operador-info">
          Pergunta nº {pergunta.id} do PDF · {pergunta.referencia}
        </span>
        {estado.cronometro && !encerrada && <Contagem cronometro={estado.cronometro} compacta />}
      </div>
      <h2>{pergunta.pergunta}</h2>
      <p className={`operador-dica ${estado.resultado ?? ''}`}>
        {encerrada ? dica[estado.resultado!] : 'Clique na opção que a equipe respondeu (ou tecle A–D / 1–4).'}
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
                disabled={!visivel || encerrada}
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
  const encerrada = respondida(estado)
  const faltamOpcoes = emPergunta && !estado.vinheta && !encerrada && estado.opcoesVisiveis < estado.ordem.length
  const contando = emPergunta && !encerrada && estado.cronometro
  const textoProxima =
    estado.fase === 'fimRodada'
      ? `▶ Começar rodada ${estado.rodada + 1}`
      : `▶ Próxima pergunta (${EQUIPES[estado.proximaEquipe].nome})`

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
      {contando && (
        <button onClick={onPausar}>
          {estado.cronometro!.fim == null ? '▶ Retomar tempo' : '⏸ Pausar tempo'} <kbd>P</kbd>
        </button>
      )}
      {automatico && faltamOpcoes && (
        <button onClick={onPausar}>
          {pausado ? '▶ Retomar automático' : '⏸ Pausar automático'} <kbd>P</kbd>
        </button>
      )}
      {encerrada && !estado.mostrarCorreta && (
        <button onClick={acoes.revelarCorreta} title="Mostra a resposta certa e tira a pergunta da próxima rodada">
          Mostrar resposta certa <kbd>R</kbd>
        </button>
      )}
      {emPergunta && !encerrada && (
        <button onClick={acoes.pular} title="Devolve a pergunta para o fim da fila; a mesma equipe recebe outra">
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
  return (
    <div className="resumo">
      <div>
        <strong>{estado.rodada}</strong>
        <span>rodada</span>
      </div>
      <div>
        <strong>{estado.fila.length}</strong>
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
        <li><kbd>Enter</kbd> ou <kbd>N</kbd> próxima pergunta (vai para a próxima equipe)</li>
        <li><kbd>Espaço</kbd> ou <kbd>→</kbd> próxima opção</li>
        <li><kbd>A</kbd>–<kbd>D</kbd> ou <kbd>1</kbd>–<kbd>4</kbd> marcar a resposta</li>
        <li><kbd>P</kbd> pausar/retomar o tempo (ou o modo automático)</li>
        <li><kbd>R</kbd> mostrar resposta certa (quando ficou para a próxima rodada)</li>
        <li><kbd>Backspace</kbd> ou <kbd>Ctrl+Z</kbd> desfazer (desfaz pontos também)</li>
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

