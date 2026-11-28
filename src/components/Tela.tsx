import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { EQUIPES, buscarPergunta, classificacao, restanteMs } from '../jogo'
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
  const emPergunta = estado.fase === 'pergunta' && !estado.vinheta
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
      {estado.placarNoTelao && <PlacarTelao estado={estado} />}
    </div>
  )
}

/** Placar em tela cheia, por cima de tudo, com as equipes em ordem de pontos. */
function PlacarTelao({ estado }: { estado: EstadoJogo }) {
  const linhas = classificacao(estado.placar)
  const maximo = Math.max(1, ...estado.placar)
  const final = estado.fase === 'fim'
  return (
    <div className="placar-telao">
      <Fundo />
      <div className="placar-telao-conteudo">
        <div className="placar-telao-topo">
          <Chama className="placar-telao-chama" />
          <div>
            <div className="placar-telao-titulo">{final ? 'Placar final' : 'Placar'}</div>
            <div className="placar-telao-sub">
              {final ? 'Gincana Bíblica' : `Rodada ${estado.rodada} · ${estado.contador} ${estado.contador === 1 ? 'pergunta' : 'perguntas'}`}
            </div>
          </div>
        </div>
        <ol className="placar-telao-lista">
          {linhas.map(({ indice, pontos, posicao }, i) => {
            const eq = EQUIPES[indice]
            const lider = posicao === 1 && pontos > 0
            return (
              <li
                key={eq.nome}
                className={`placar-telao-linha ${lider ? 'lider' : ''}`}
                style={{ '--cor-equipe': eq.cor, '--texto-equipe': eq.texto, '--atraso': `${0.15 + i * 0.12}s`, '--largura': `${Math.max(4, (pontos / maximo) * 100)}%` } as CSSProperties}
              >
                <span className="placar-telao-posicao">{posicao}º</span>
                <span className="placar-telao-nome">{eq.nome}</span>
                <span className="placar-telao-barra">
                  <span />
                </span>
                <span className="placar-telao-pontos">
                  {lider && '🏆 '}
                  {pontos}
                </span>
              </li>
            )
          })}
        </ol>
        <Logo className="placar-telao-logo" />
      </div>
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

  if (estado.vinheta) {
    const equipe = EQUIPES[estado.equipe]
    return (
      <div className="tela-chamada" key={estado.contador}>
        <Chama className="chamada-chama" />
        <div className="chamada-numero">
          Rodada {estado.rodada} · Pergunta {estado.contador}
        </div>
        <div className="chamada-equipe">
          <span>Equipe</span> {equipe.nome}
        </div>
        <div className="chamada-dica">Preparem-se!</div>
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

function PerguntaNaTela({ pergunta, estado, onEscolher }: Props & { pergunta: Pergunta }) {
  const encerrada = estado.resultado !== null
  const ref = useAjustarTexto(`${encerrada}-${estado.mostrarCorreta}`)
  const certo = estado.resultado === 'acerto'
  const faixa = useFaixaSobreApagada(encerrada)

  return (
    <>
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

    </div>
    {!encerrada && estado.cronometro && <Contagem cronometro={estado.cronometro} flutuante />}
    {encerrada && (
      <div className="resultado-flutuante" ref={faixa}>
        <Resultado estado={estado} pergunta={pergunta} />
      </div>
    )}
    </>
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

/**
 * Contagem regressiva com anel de progresso. Fica vermelha nos últimos 10 segundos.
 * `flutuante`: círculo grande e meio transparente por cima das opções (telão).
 * `compacta`: só o número com o anel (painel do operador).
 */
export function Contagem({
  cronometro,
  compacta = false,
  flutuante = false,
}: {
  cronometro: Cronometro
  compacta?: boolean
  flutuante?: boolean
}) {
  const rodando = cronometro.fim != null
  const agora = useAgora(rodando)
  const ms = restanteMs(cronometro, agora)
  const segundos = Math.ceil(ms / 1000)
  const fracao = cronometro.totalMs > 0 ? ms / cronometro.totalMs : 0
  const urgente = segundos <= 10
  if (flutuante) {
    return (
      <div className={`contagem-flutuante ${urgente ? 'urgente' : ''} ${rodando ? '' : 'pausada'}`}>
        <svg className="contagem-anel" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="16" className="contagem-trilho" />
          <circle
            cx="18"
            cy="18"
            r="16"
            className="contagem-progresso"
            pathLength={100}
            strokeDasharray={`${fracao * 100} 100`}
          />
        </svg>
        <span className="contagem-flutuante-numero" key={urgente ? segundos : 'n'}>
          {segundos}
        </span>
        <span className="contagem-flutuante-rotulo">{rodando ? 'segundos' : 'pausado'}</span>
      </div>
    )
  }
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

/**
 * Põe a faixa da referência centralizada sobre a opção apagada mais de baixo
 * (sempre sobram pelo menos duas), para nunca cobrir a pergunta, a certa ou a marcada.
 */
function useFaixaSobreApagada(ativo: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const faixa = ref.current
    if (!ativo || !faixa) return
    const posicionar = () => {
      const apagadas = faixa.parentElement?.querySelectorAll<HTMLElement>('.opcao.apagada')
      const alvo = apagadas?.[apagadas.length - 1]
      if (!alvo) return
      faixa.style.top = `${alvo.offsetTop + alvo.offsetHeight / 2}px`
    }
    posicionar()
    const observador = new ResizeObserver(posicionar)
    observador.observe(faixa.parentElement!)
    void document.fonts.ready.then(posicionar)
    return () => observador.disconnect()
  }, [ativo])
  return ref
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
 * Diminui as letras até a pergunta, as 4 opções e o espaço da referência caberem na tela.
 * Pergunta e opções têm escalas separadas (--escala-pergunta / --escala-opcao): diminui
 * primeiro quem está ocupando mais espaço, assim um texto longo não encolhe o resto.
 * Recalcula quando a tela muda de tamanho. Como as opções ocultas já ocupam espaço,
 * o tamanho fica fixo durante a pergunta.
 */
function useAjustarTexto(chave: string) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const MIN = 0.4
    const PASSO = 0.03
    const ajustar = () => {
      const pergunta = el.querySelector<HTMLElement>('.pergunta-texto')
      const opcoes = el.querySelector<HTMLElement>('.opcoes')
      if (!pergunta || !opcoes) return
      let ep = 1
      let eo = 1
      const aplicar = () => {
        el.style.setProperty('--escala-pergunta', ep.toFixed(2))
        el.style.setProperty('--escala-opcao', eo.toFixed(2))
      }
      aplicar()
      while (el.scrollHeight > el.clientHeight + 1 && (ep > MIN || eo > MIN)) {
        // A pergunta pode ocupar até ~30% da altura usada; acima disso, ela diminui primeiro.
        const hp = pergunta.offsetHeight
        const ho = opcoes.offsetHeight
        const perguntaGrande = hp / (hp + ho) > 0.3
        if ((perguntaGrande && ep > MIN) || eo <= MIN) ep = Math.max(MIN, ep - PASSO)
        else eo = Math.max(MIN, eo - PASSO)
        aplicar()
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