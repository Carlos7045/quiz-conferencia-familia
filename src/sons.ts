/**
 * Sons do quiz.
 *
 * Por padrão os sons são gerados pelo navegador (Web Audio), sem arquivos.
 * Para usar seus próprios sons, coloque arquivos mp3 em `public/sons/` com
 * estes nomes: abertura.mp3, opcao.mp3, acerto.mp3, erro.mp3.
 * Se o arquivo existir, ele é usado no lugar do som gerado.
 */
export type NomeSom = 'abertura' | 'opcao' | 'acerto' | 'erro'

const NOMES: NomeSom[] = ['abertura', 'opcao', 'acerto', 'erro']

let ctx: AudioContext | null = null
let volume = 0.7
let ativo = true
const arquivos = new Map<NomeSom, HTMLAudioElement>()

/** Som "principal" em andamento (abertura, acerto, erro), para poder interromper. */
let principal: { parar: () => void } | null = null

function contexto() {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Procura os mp3 personalizados. Os que não existirem usam o som gerado. */
export function carregarArquivos() {
  for (const nome of NOMES) {
    const audio = new Audio(`/sons/${nome}.mp3`)
    audio.preload = 'auto'
    audio.addEventListener('canplaythrough', () => arquivos.set(nome, audio), { once: true })
    audio.load()
  }
}

export function configurarSom(opcoes: { ativo: boolean; volume: number }) {
  ativo = opcoes.ativo
  volume = opcoes.volume
}

export function pararSons() {
  principal?.parar()
  principal = null
}

export function tocar(nome: NomeSom) {
  if (!ativo || volume <= 0) return
  // O "plim" da opção toca por cima da música; os demais sons interrompem o anterior.
  if (nome !== 'opcao') pararSons()

  const arquivo = arquivos.get(nome)
  let controle: { parar: () => void }
  if (arquivo) {
    const audio = arquivo.cloneNode(true) as HTMLAudioElement
    audio.volume = volume
    void audio.play().catch(() => {})
    controle = { parar: () => audio.pause() }
  } else {
    const ac = contexto()
    const saida = ac.createGain()
    saida.gain.value = volume
    saida.connect(ac.destination)
    sintetizar[nome](ac, saida)
    controle = { parar: () => saida.disconnect() }
  }
  if (nome !== 'opcao') principal = controle
}

// ---------- sons gerados ----------

function nota(
  ac: AudioContext,
  saida: AudioNode,
  freq: number,
  inicio: number,
  duracao: number,
  tipo: OscillatorType = 'triangle',
  ganho = 0.3,
) {
  const t = ac.currentTime + inicio
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = tipo
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(ganho, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duracao)
  osc.connect(g).connect(saida)
  osc.start(t)
  osc.stop(t + duracao + 0.05)
}

const sintetizar: Record<NomeSom, (ac: AudioContext, saida: AudioNode) => void> = {
  // Vinheta curta e ascendente, estilo programa de perguntas
  abertura(ac, saida) {
    const melodia: [number, number, number][] = [
      [392.0, 0.0, 0.18], // Sol
      [523.25, 0.18, 0.18], // Dó
      [659.25, 0.36, 0.18], // Mi
      [783.99, 0.54, 0.35], // Sol
      [659.25, 0.92, 0.15], // Mi
      [783.99, 1.08, 0.9], // Sol
    ]
    for (const [f, ini, dur] of melodia) {
      nota(ac, saida, f, ini, dur, 'square', 0.1)
      nota(ac, saida, f / 2, ini, dur, 'triangle', 0.2)
    }
    for (const f of [523.25, 659.25, 783.99, 1046.5]) nota(ac, saida, f, 1.08, 1.4, 'triangle', 0.1)
  },

  // "Plim" curto quando cada opção aparece
  opcao(ac, saida) {
    nota(ac, saida, 880, 0, 0.12, 'sine', 0.35)
    nota(ac, saida, 1318.5, 0.06, 0.25, 'sine', 0.25)
  },

  // Arpejo maior alegre
  acerto(ac, saida) {
    const notas = [523.25, 659.25, 783.99, 1046.5]
    notas.forEach((f, i) => nota(ac, saida, f, i * 0.1, 0.5, 'triangle', 0.3))
    for (const f of notas) nota(ac, saida, f, 0.45, 1.2, 'sine', 0.12)
  },

  // Buzina grave descendente
  erro(ac, saida) {
    const t = ac.currentTime
    for (const [f, ini, dur] of [
      [311, 0, 0.3],
      [233, 0.32, 0.6],
    ] as const) {
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(f, t + ini)
      osc.frequency.linearRampToValueAtTime(f * 0.94, t + ini + dur)
      g.gain.setValueAtTime(0.0001, t + ini)
      g.gain.exponentialRampToValueAtTime(0.18, t + ini + 0.02)
      g.gain.setValueAtTime(0.18, t + ini + dur - 0.05)
      g.gain.exponentialRampToValueAtTime(0.0001, t + ini + dur)
      osc.connect(g).connect(saida)
      osc.start(t + ini)
      osc.stop(t + ini + dur + 0.05)
    }
  },
}
