import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { EQUIPES, buscarPergunta, restanteMs } from '../jogo'
import type { Config, Cronometro, EstadoJogo, Pergunta } from '../tipos'
import { Chama, IGREJA, Logo } from './Logo'

export const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F']

interface Props {
  estado: EstadoJogo
  config: Config
  /** Quando informado, as opções viram clicáveis (modo tela única). */
  onEscolher?: (posicao: number) => void
}

/** Tela exibida para o público. Usa unidades de container, então funciona em qualquer tamanho. */
export function Tela({ estado, config, onEscolher }: Props) {
  const emPergunta = estado.fase === 'pergunta'
  const equipe = EQUIPES[estado.equipe]
  const estilo = { '--cor-equipe': equipe.cor, '--texto-equipe': equipe.texto } as CSSProperties
  return (
    <div className={`tela ${emPergunta ? 'com-equipe' : ''}`} style={estilo}>
      <Fundo />
      {emPergunta && (
        <header className="tela-topo">
          <div className="tela-marca">
            <Chama />
            <Logo compacto />
          </div>
          <div className="tela-topo-direita">
            <span className="tela-equipe" key={`${estado.contador}-${estado.equipe}`}>
              Equipe {equipe.nome}
            </span>
            <span className="tela-contagem">
              Rodada {estado.rodada} · Pergunta {estado.contador}
            </span>
          </div>
        </header>
      )}
      <main className="tela-corpo">
        <Conteudo estado={estado} config={config} onEscolher={onEscolher} />
      </main>
    </div>
  )
}

/** Fundo pêssego com manchas terracota e recortes texturizados, como no cartaz. */
function Fundo() {
  return (
    <div className="tela-fundo" aria-hidden="true">
      <div className="fundo-marca-dagua">FAMÍLIA</div>
      <div className="fundo-mancha m1" />
      <div className="fundo-mancha m2" />
      <div className="fundo-mancha m3" />
      <div className="fundo-recorte r1" />
      <div className="fundo-recorte r2" />
      <div className="fundo-pontos" />
    </div>
  )
}

function Aviso({ chamada, children }: { chamada: string; children?: ReactNode }) {
  return (
    <div className="tela-aviso">
      <Chama className="aviso-chama" />
      <div className="aviso-chamada">{chamada}</div>
      <Logo className="aviso-logo" />
      {children}
      <div className="aviso-igreja">{IGREJA}</div>
    </div>
  )
}

function Conteudo({ estado, config, onEscolher }: Props) {
  if (estado.fase === 'inicio') {
    return (
      <Aviso chamada="Gincana Bíblica">
        <div className="aviso-faixa">{estado.rodada > 1 ? `Rodada ${estado.rodada}` : 'Perguntas e Respostas'}</div>
      </Aviso>
    )
  }
  if (estado.fase === 'fimRodada') {
    const n = estado.adiadas.length
    return (
      <Aviso chamada={`Fim da rodada ${estado.rodada}`}>
        <div className="aviso-faixa">
          {n} {n === 1 ? 'pergunta volta' : 'perguntas voltam'} na próxima rodada
        </div>
      </Aviso>
    )
  }
  if (estado.fase === 'fim') {
    return (
      <Aviso chamada="Fim das perguntas!">
        <div className="aviso-faixa">Obrigado a todos pela participação</div>
      </Aviso>
    )
  }

  const pergunta = buscarPergunta(estado.atual)
  if (!pergunta) return null
  return (
    <PerguntaNaTela
      key={estado.contador}
      pergunta={pergunta}
      estado={estado}
      config={config}
      onEscolher={onEscolher}
    />
  )
}

function PerguntaNaTela({ pergunta, estado, onEscolher }: Props & { pergunta: Pergunta }) {
  const encerrada = estado.resultado !== null
  const ref = useAjustarTexto(`${encerrada}-${estado.mostrarCorreta}`)
  const certo = estado.resultado === 'acerto'

  return (
    <div className="tela-pergunta" ref={ref}>
      <h2 className="pergunta-texto">{pergunta.pergunta}</h2>

      <ol className="opcoes">
        {estado.ordem.map((indice, posicao) => {
          const visivel = posicao < estado.opcoesVisiveis
          const eCorreta = indice === pergunta.correta
          const eEscolhida = indice === estado.escolhida
          let estadoOpcao = ''
          if (encerrada) {
            if (eEscolhida) estadoOpcao = certo ? 'certa' : 'errada'
            else if (eCorreta && estado.mostrarCorreta) estadoOpcao = 'certa revelada'
            else estadoOpcao = 'apagada'
          }
          const clicavel = !!onEscolher && visivel && !encerrada
          return (
            <li
              key={indice}
              className={`opcao ${visivel ? 'visivel' : 'oculta'} ${estadoOpcao} ${clicavel ? 'clicavel' : ''}`}
              onClick={clicavel ? () => onEscolher(posicao) : undefined}
            >
              <span className="opcao-letra">{LETRAS[posicao]}</span>
              <span className="opcao-texto">{pergunta.opcoes[indice]}</span>
              <span className="opcao-icone">
                {estadoOpcao.startsWith('certa') ? '✔' : estadoOpcao === 'errada' ? '✖' : ''}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="tela-rodape">
        {!encerrada && estado.cronometro && <Contagem cronometro={estado.cronometro} />}
        {encerrada && <Resultado estado={estado} pergunta={pergunta} />}
      </div>
    </div>
  )
}

function Resultado({ estado, pergunta }: { estado: EstadoJogo; pergunta: Pergunta }) {
  const certo = estado.resultado === 'acerto'
  const tempo = estado.resultado === 'tempo'
  if (estado.mostrarCorreta) {
    const titulo = certo ? 'Resposta certa!' : tempo ? '⏰ Tempo esgotado!' : 'Resposta correta'
    return (
      <div className={`referencia ${certo ? 'ok' : 'nok'}`}>
        <span className="referencia-titulo">{titulo}</span>
        <span className="referencia-texto">📜 {pergunta.referencia}</span>
      </div>
    )
  }
  return (
    <div className="referencia nok">
      <span className="referencia-titulo">{tempo ? '⏰ Tempo esgotado!' : 'Resposta errada'}</span>
      <span className="referencia-texto">Esta pergunta volta na próxima rodada</span>
    </div>
  )
}

/** Contagem regressiva com anel de progresso. Fica vermelha nos últimos 10 segundos. */
export function Contagem({ cronometro, compacta = false }: { cronometro: Cronometro; compacta?: boolean }) {
  const rodando = cronometro.fim != null
  const agora = useAgora(rodando)
  const ms = restanteMs(cronometro, agora)
  const segundos = Math.ceil(ms / 1000)
  const fracao = cronometro.totalMs > 0 ? ms / cronometro.totalMs : 0
  const urgente = segundos <= 10
  return (
    <div className={`contagem ${urgente ? 'urgente' : ''} ${rodando ? '' : 'pausada'} ${compacta ? 'compacta' : ''}`}>
      <div className="contagem-relogio">
        <svg className="contagem-anel" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="15.5" className="contagem-trilho" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            className="contagem-progresso"
            pathLength={100}
            strokeDasharray={`${fracao * 100} 100`}
          />
        </svg>
        <span className="contagem-numero" key={urgente ? segundos : 'n'}>
          {segundos}
        </span>
      </div>
      {!compacta && <span className="contagem-rotulo">{rodando ? 'segundos para responder' : 'tempo pausado'}</span>}
    </div>
  )
}

/** Re-renderiza a cada 100 ms enquanto `ativo` for verdadeiro. */
function useAgora(ativo: boolean) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    if (!ativo) return
    setAgora(Date.now())
    const t = setInterval(() => setAgora(Date.now()), 100)
    return () => clearInterval(t)
  }, [ativo])
  return agora
}

/**
 * Diminui a fonte (variável CSS --escala) até a pergunta, as 4 opções e o espaço
 * da referência caberem na tela. Recalcula quando a tela muda de tamanho.
 * Como as opções ocultas já ocupam espaço, o tamanho fica fixo durante a pergunta.
 */
function useAjustarTexto(chave: string) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ajustar = () => {
      let escala = 1
      el.style.setProperty('--escala', '1')
      while (escala > 0.4 && el.scrollHeight > el.clientHeight + 1) {
        escala -= 0.04
        el.style.setProperty('--escala', escala.toFixed(2))
      }
    }
    ajustar()
    void document.fonts.ready.then(ajustar) // as fontes mudam a largura do texto
    const observador = new ResizeObserver(ajustar)
    observador.observe(el.parentElement!)
    return () => observador.disconnect()
  }, [chave])
  return ref
}
