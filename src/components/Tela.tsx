import { useLayoutEffect, useRef } from 'react'
import { acertou, buscarPergunta } from '../jogo'
import type { Config, EstadoJogo, Pergunta } from '../tipos'

export const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F']
const TITULO = 'Gincana Peniel'
const SUBTITULO = 'Perguntas Bíblicas'

interface Props {
  estado: EstadoJogo
  config: Config
  /** Quando informado, as opções viram clicáveis (modo tela única). */
  onEscolher?: (posicao: number) => void
}

/** Tela exibida para o público. Usa unidades de container, então funciona em qualquer tamanho. */
export function Tela({ estado, config, onEscolher }: Props) {
  return (
    <div className="tela">
      <div className="tela-fundo" />
      <header className="tela-topo">
        <span className="tela-marca">📖 {TITULO}</span>
        {estado.fase === 'pergunta' && (
          <span className="tela-contagem">
            Rodada {estado.rodada} · Pergunta {estado.contador}
          </span>
        )}
      </header>
      <main className="tela-corpo">
        <Conteudo estado={estado} config={config} onEscolher={onEscolher} />
      </main>
    </div>
  )
}

function Conteudo({ estado, config, onEscolher }: Props) {
  if (estado.fase === 'inicio') {
    return (
      <div className="tela-aviso">
        <div className="aviso-icone">📖</div>
        <h1>{TITULO}</h1>
        <p>{estado.rodada > 1 ? `Rodada ${estado.rodada}` : SUBTITULO}</p>
      </div>
    )
  }
  if (estado.fase === 'fimRodada') {
    return (
      <div className="tela-aviso">
        <div className="aviso-icone">⏳</div>
        <h1>Fim da rodada {estado.rodada}</h1>
        <p>
          {estado.adiadas.length} {estado.adiadas.length === 1 ? 'pergunta volta' : 'perguntas voltam'} na
          próxima rodada
        </p>
      </div>
    )
  }
  if (estado.fase === 'fim') {
    return (
      <div className="tela-aviso">
        <div className="aviso-icone">🏆</div>
        <h1>Fim das perguntas!</h1>
        <p>Obrigado a todos pela participação</p>
      </div>
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
              <span className="opcao-icone">{estadoOpcao.startsWith('certa') ? '✔' : estadoOpcao === 'errada' ? '✖' : ''}</span>
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
    const observador = new ResizeObserver(ajustar)
    observador.observe(el.parentElement!)
    return () => observador.disconnect()
  }, [chave])
  return ref
}
