/**
 * Sons do quiz.
 *
 * Por padrão os sons são gerados pelo navegador (Web Audio), sem arquivos.
 * Para usar seus próprios sons, coloque arquivos mp3 em `public/sons/` com
 * estes nomes: abertura.mp3, opcao.mp3, acerto.mp3, erro.mp3, tempo.mp3 e suspense.mp3
 * (o suspense toca em repetição durante a contagem regressiva).
 * Se o arquivo existir, ele é usado no lugar do som gerado.
 */
export type NomeSom = 'abertura' | 'opcao' | 'acerto' | 'erro' | 'tempo'

const NOMES: (NomeSom | 'suspense')[] = ['abertura', 'opcao', 'acerto', 'erro', 'tempo', 'suspense']

let ctx: AudioContext | null = null
let volume = 0.7
let ativo = true
const arquivos = new Map<NomeSom | 'suspense', HTMLAudioElement>()

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
  pararSuspense()
}

// ---------- suspense da contagem regressiva ----------

let suspense: { parar: () => void } | null = null

/** Toca o suspense pelos segundos que faltam (com bipes mais agudos nos 5 últimos). */
export function iniciarSuspense(restanteMs: number) {
  pararSuspense()
  if (!ativo || volume <= 0 || restanteMs <= 0) return
  const arquivo = arquivos.get('suspense')
  if (arquivo) {
    const audio = arquivo.cloneNode(true) as HTMLAudioElement
    audio.loop = true
    audio.volume = volume
    void audio.play().catch(() => {})
    suspense = { parar: () => audio.pause() }
    return
  }
  const ac = contexto()
  const saida = ac.createGain()
  saida.gain.value = volume
  saida.connect(ac.destination)
  const pararDrone = droneSuspense(ac, saida, restanteMs / 1000)
  // tique-taque alinhado com a virada de cada segundo do relógio na tela
  const primeiro = (restanteMs % 1000) / 1000
  const total = Math.ceil(restanteMs / 1000)
  for (let i = 0; i < total; i++) {
    const t = primeiro + i
    const faltam = total - 1 - i
    if (faltam < 5) nota(ac, saida, 1046.5, t, 0.16, 'square', 0.12)
    else nota(ac, saida, i % 2 ? 900 : 1200, t, 0.05, 'square', 0.07)
    if (i % 2 === 0) batida(ac, saida, t)
  }
  suspense = {
    parar: () => {
      pararDrone()
      saida.disconnect()
    },
  }
}

export function pararSuspense() {
  suspense?.parar()
  suspense = null
}

/** Zumbido grave e contínuo que sobe devagar, para dar tensão. */
function droneSuspense(ac: AudioContext, saida: AudioNode, segundos: number) {
  const t = ac.currentTime
  const filtro = ac.createBiquadFilter()
  filtro.type = 'lowpass'
  filtro.frequency.setValueAtTime(220, t)
  filtro.frequency.linearRampToValueAtTime(520, t + segundos)
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.09, t + 1.5)
  filtro.connect(g).connect(saida)
  const oscs = [55, 55.6, 82.4].map((f) => {
    const o = ac.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(f, t)
    o.frequency.linearRampToValueAtTime(f * 1.12, t + segundos)
    o.connect(filtro)
    o.start(t)
    o.stop(t + segundos + 0.1)
    return o
  })
  return () => oscs.forEach((o) => o.stop())
}

/** Batida grave tipo coração. */
function batida(ac: AudioContext, saida: AudioNode, inicio: number) {
  const t = ac.currentTime + inicio
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(90, t)
  o.frequency.exponentialRampToValueAtTime(45, t + 0.18)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.45, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
  o.connect(g).connect(saida)
  o.start(t)
  o.stop(t + 0.25)
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

  // Três bipes e um tom longo: acabou o tempo
  tempo(ac, saida) {
    for (const ini of [0, 0.18, 0.36]) nota(ac, saida, 1318.5, ini, 0.12, 'square', 0.12)
    nota(ac, saida, 392, 0.6, 1.1, 'square', 0.14)
    nota(ac, saida, 196, 0.6, 1.1, 'triangle', 0.25)
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
