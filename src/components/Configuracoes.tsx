import {
  iniciarFundoOpcoes,
  iniciarSuspense,
  pararFundoOpcoes,
  pararMusica,
  pararSuspense,
  tocar,
  tocarMusica,
  type NomeSom,
} from '../sons'
import type { Config } from '../tipos'

interface Props {
  config: Config
  onMudar: (c: Config) => void
  onFechar: () => void
  onReiniciar: () => void
}

const SONS: [NomeSom, string][] = [
  ['pergunta', 'Próxima pergunta'],
  ['opcao', 'Opção'],
  ['acerto', 'Acerto'],
  ['erro', 'Erro'],
  ['tempo', 'Tempo esgotado'],
]

export function Configuracoes({ config, onMudar, onFechar, onReiniciar }: Props) {
  const mudar = <K extends keyof Config>(chave: K, valor: Config[K]) => onMudar({ ...config, [chave]: valor })
  const auto = config.modoOpcoes === 'automatico'

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>⚙️ Configurações</h2>
          <button onClick={onFechar}>✕</button>
        </header>

        <fieldset>
          <legend>Vinheta da pergunta</legend>
          <label>
            Ao clicar em "Próxima pergunta", tocar a vinheta e mostrar a pergunta depois de
            <span className="numero-segundos">
              <input
                type="number"
                min={0}
                max={30}
                value={config.segundosVinheta}
                onChange={(e) =>
                  mudar('segundosVinheta', Math.min(30, Math.max(0, Math.round(Number(e.target.value)) || 0)))
                }
              />
              s
            </span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Como as opções aparecem</legend>
          <label>
            <input type="radio" checked={!auto} onChange={() => mudar('modoOpcoes', 'manual')} />
            Manual: clico em "Próxima opção"
          </label>
          <label>
            <input type="radio" checked={auto} onChange={() => mudar('modoOpcoes', 'automatico')} />
            Automático: uma opção a cada alguns segundos
          </label>
          {auto && (
            <div className="linha-numeros">
              <label>
                Tempo para ler a pergunta
                <NumeroSegundos valor={config.segundosLeitura} onMudar={(v) => mudar('segundosLeitura', v)} />
              </label>
              <label>
                Tempo entre as opções
                <NumeroSegundos valor={config.segundosEntreOpcoes} onMudar={(v) => mudar('segundosEntreOpcoes', v)} />
              </label>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Equipes e tempo</legend>
          <label>
            Pontos por pergunta certa
            <span className="numero-segundos">
              <input
                type="number"
                min={1}
                max={1000}
                value={config.pontosPorPergunta}
                onChange={(e) =>
                  mudar('pontosPorPergunta', Math.min(1000, Math.max(1, Math.round(Number(e.target.value)) || 1)))
                }
              />
              pontos
            </span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.cronometroAtivo}
              onChange={(e) => mudar('cronometroAtivo', e.target.checked)}
            />
            Contagem regressiva depois da última opção, com som de suspense
          </label>
          {config.cronometroAtivo && (
            <div className="linha-numeros">
              <label>
                Tempo para responder
                <NumeroSegundos
                  valor={config.segundosResposta}
                  max={300}
                  onMudar={(v) => mudar('segundosResposta', v)}
                />
              </label>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Quando a equipe errar ou o tempo acabar</legend>
          <label>
            <input
              type="radio"
              checked={config.aoErrar === 'mostrarCorreta'}
              onChange={() => mudar('aoErrar', 'mostrarCorreta')}
            />
            Mostrar a resposta certa e a referência bíblica
          </label>
          <label>
            <input
              type="radio"
              checked={config.aoErrar === 'proximaRodada'}
              onChange={() => mudar('aoErrar', 'proximaRodada')}
            />
            Não mostrar a resposta: a pergunta volta numa próxima rodada
          </label>
        </fieldset>

        <fieldset>
          <legend>Perguntas</legend>
          <label>
            <input
              type="checkbox"
              checked={config.embaralharOpcoes}
              onChange={(e) => mudar('embaralharOpcoes', e.target.checked)}
            />
            Embaralhar a ordem das opções (vale a partir da próxima pergunta)
          </label>
        </fieldset>

        <fieldset>
          <legend>Sons</legend>
          <label>
            <input type="checkbox" checked={config.somAtivo} onChange={(e) => mudar('somAtivo', e.target.checked)} />
            Sons ativados
          </label>
          <label className="linha-volume">
            Volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.volume}
              onChange={(e) => mudar('volume', Number(e.target.value))}
            />
            <span>{Math.round(config.volume * 100)}%</span>
          </label>
          <div className="testar-sons">
            Testar:
            {SONS.map(([nome, rotulo]) => (
              <button key={nome} onClick={() => tocar(nome)} disabled={!config.somAtivo}>
                🔊 {rotulo}
              </button>
            ))}
            <button onClick={() => iniciarSuspense(5000)} disabled={!config.somAtivo}>
              🔊 Suspense
            </button>
            <button onClick={() => void tocarMusica()} disabled={!config.somAtivo}>
              🔊 Música de abertura
            </button>
            <button onClick={iniciarFundoOpcoes} disabled={!config.somAtivo}>
              🔊 Fundo das opções
            </button>
            <button
              onClick={() => {
                pararSuspense()
                pararMusica(200)
                pararFundoOpcoes(200)
              }}
            >
              ⏹ Parar
            </button>
          </div>
        </fieldset>

        <footer>
          <button className="perigo" onClick={onReiniciar}>
            ↺ Reiniciar jogo (perguntas voltam e placar zera)
          </button>
          <button className="primario" onClick={onFechar}>
            Pronto
          </button>
        </footer>
      </div>
    </div>
  )
}

function NumeroSegundos({ valor, max = 60, onMudar }: { valor: number; max?: number; onMudar: (v: number) => void }) {
  return (
    <span className="numero-segundos">
      <input
        type="number"
        min={1}
        max={max}
        value={valor}
        onChange={(e) => onMudar(Math.min(max, Math.max(1, Math.round(Number(e.target.value)) || 1)))}
      />
      s
    </span>
  )
}
