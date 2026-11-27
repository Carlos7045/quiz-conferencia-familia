import type { Config, EstadoJogo, Mensagem } from './tipos'

export const CONFIG_PADRAO: Config = {
  modoOpcoes: 'manual',
  segundosLeitura: 6,
  segundosEntreOpcoes: 3,
  aoErrar: 'mostrarCorreta',
  embaralharOpcoes: true,
  somAtivo: true,
  volume: 0.7,
}

const CHAVE_CONFIG = 'quiz-peniel:config'
const CHAVE_ESTADO = 'quiz-peniel:estado'

function ler<T>(chave: string): T | null {
  try {
    const bruto = localStorage.getItem(chave)
    return bruto ? (JSON.parse(bruto) as T) : null
  } catch {
    return null
  }
}

export const carregarConfig = (): Config => ({ ...CONFIG_PADRAO, ...ler<Partial<Config>>(CHAVE_CONFIG) })
export const salvarConfig = (c: Config) => localStorage.setItem(CHAVE_CONFIG, JSON.stringify(c))
export const carregarEstado = () => ler<EstadoJogo>(CHAVE_ESTADO)
export const salvarEstado = (e: EstadoJogo) => localStorage.setItem(CHAVE_ESTADO, JSON.stringify(e))

/** Canal entre a janela de controle e a janela do telão (mesmo navegador). */
export function abrirCanal(aoReceber: (m: Mensagem) => void) {
  const canal = new BroadcastChannel('quiz-peniel')
  canal.onmessage = (ev: MessageEvent<Mensagem>) => aoReceber(ev.data)
  return {
    enviar: (m: Mensagem) => canal.postMessage(m),
    fechar: () => canal.close(),
  }
}
