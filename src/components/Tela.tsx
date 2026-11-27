import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { acertou, buscarPergunta } from '../jogo'
import type { Config, EstadoJogo, Pergunta } from '../tipos'
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
  return (
    <div className="tela">
      <Fundo />
      {emPergunta && (
        <header className="tela-topo">
          <div className="tela-marca">
            <Chama />
            <Logo compacto />
          </div>
          <span className="tela-contagem">
            Rodada {estado.rodada} · Pergunta {estado.contador}
          </span>
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

function PerguntaNaTela({ pergunta, estado, config, onEscolher }: Props & { pergunta: Pergunta }) {
  const marcada = estado.escolhida !== null
  const ref = useAjustarTexto(`${marcada}-${estado.mostrarCorreta}`)
  const certo = acertou(estado)

  return (
    <div className="tela-pergunta" ref={ref}>
      <h2 className="pergunta-texto">{pergunta.pergunta}</h2>

      <ol className="opcoes">
        {estado.ordem.map((indice, posicao) => {
          const visivel = posicao < estado.opcoesVisiveis
          const eCorreta = indice === pergunta.correta
          const eEscolhida = indice === estado.escolhida
          let estadoOpcao = ''
          if (marcada) {
            if (eEscolhida) estadoOpcao = certo ? 'certa' : 'errada'
            else if (eCorreta && estado.mostrarCorreta) estadoOpcao = 'certa revelada'
            else estadoOpcao = 'apagada'
          }
          const clicavel = !!onEscolher && visivel && !marcada
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
        {marcada && estado.mostrarCorreta && (
          <div className={`referencia ${certo ? 'ok' : 'nok'}`}>
            <span className="referencia-titulo">{certo ? 'Resposta certa!' : 'Resposta correta'}</span>
            <span className="referencia-texto">📜 {pergunta.referencia}</span>
          </div>
        )}
        {marcada && !estado.mostrarCorreta && config.aoErrar === 'proximaRodada' && (
          <div className="referencia nok">
            <span className="referencia-titulo">Resposta errada</span>
            <span className="referencia-texto">Esta pergunta volta na próxima rodada</span>
          </div>
        )}
      </div>
    </div>
  )
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
