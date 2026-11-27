import todas from './data/perguntas.json'
import type { Config, Cronometro, EstadoJogo, Pergunta } from './tipos'

export const PERGUNTAS = todas as Pergunta[]
const porId = new Map(PERGUNTAS.map((p) => [p.id, p]))

export const EQUIPES = [
  { nome: 'Verde', cor: '#2a9d5c', texto: '#fff' },
  { nome: 'Amarela', cor: '#f2b705', texto: '#3e3129' },
  { nome: 'Azul', cor: '#2f6fd6', texto: '#fff' },
  { nome: 'Vermelha', cor: '#d23a2f', texto: '#fff' },
]

export function buscarPergunta(id: number | null): Pergunta | null {
  return id == null ? null : (porId.get(id) ?? null)
}

export function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

export function estadoInicial(): EstadoJogo {
  return {
    fase: 'inicio',
    rodada: 1,
    fila: embaralhar(PERGUNTAS.map((p) => p.id)),
    adiadas: [],
    contador: 0,
    atual: null,
    ordem: [],
    opcoesVisiveis: 0,
    escolhida: null,
    resultado: null,
    mostrarCorreta: false,
    equipe: 0,
    proximaEquipe: 0,
    placar: EQUIPES.map(() => 0),
    cronometro: null,
  }
}

/** Completa estados salvos por versões antigas (sem equipes/cronômetro). */
export function normalizarEstado(e: Partial<EstadoJogo>): EstadoJogo {
  const base = estadoInicial()
  const estado = { ...base, ...e }
  if (e.resultado === undefined) {
    const p = buscarPergunta(estado.atual)
    estado.resultado = estado.escolhida == null ? null : estado.escolhida === p?.correta ? 'acerto' : 'erro'
  }
  return { ...estado, cronometro: congelar(estado.cronometro) }
}

// ---------- consultas ----------

/** A pergunta atual já terminou (marcou resposta ou acabou o tempo)? */
export const respondida = (e: EstadoJogo) => e.fase === 'pergunta' && e.resultado !== null

/** Pode sortear a próxima pergunta agora? */
export const podeSortear = (e: EstadoJogo) => e.fase === 'inicio' || respondida(e)

export const acertou = (e: EstadoJogo) => e.resultado === 'acerto'

/** Equipe destacada agora: a que está respondendo, ou a próxima entre perguntas. */
export const equipeDaVez = (e: EstadoJogo) => (e.fase === 'pergunta' ? e.equipe : e.proximaEquipe)

export const cronometroRodando = (c: Cronometro | null) => c != null && c.fim != null

export function restanteMs(c: Cronometro, agora = Date.now()) {
  return Math.max(0, c.fim == null ? c.restanteMs : c.fim - agora)
}

/** Converte um cronômetro rodando em pausado, guardando o tempo que falta. */
export function congelar(c: Cronometro | null | undefined, agora = Date.now()): Cronometro | null {
  if (!c) return null
  if (c.fim == null) return c
  return { ...c, fim: null, restanteMs: Math.max(1000, c.fim - agora) }
}

// ---------- ações ----------

export function sortear(e: EstadoJogo, config: Config): EstadoJogo {
  if (e.fila.length === 0) {
    return e.adiadas.length > 0
      ? { ...e, fase: 'fimRodada', atual: null, cronometro: null }
      : { ...e, fase: 'fim', atual: null, cronometro: null }
  }
  const [id, ...resto] = e.fila
  const pergunta = buscarPergunta(id)!
  const indices = pergunta.opcoes.map((_, i) => i)
  return {
    ...e,
    fase: 'pergunta',
    fila: resto,
    contador: e.contador + 1,
    atual: id,
    ordem: config.embaralharOpcoes ? embaralhar(indices) : indices,
    opcoesVisiveis: 0,
    escolhida: null,
    resultado: null,
    mostrarCorreta: false,
    equipe: e.proximaEquipe,
    proximaEquipe: (e.proximaEquipe + 1) % EQUIPES.length,
    cronometro: null,
  }
}

export function proximaRodada(e: EstadoJogo): EstadoJogo {
  return { ...e, fase: 'inicio', rodada: e.rodada + 1, fila: embaralhar(e.adiadas), adiadas: [], atual: null }
}

export function revelarOpcao(e: EstadoJogo, config: Config, agora = Date.now()): EstadoJogo {
  if (e.fase !== 'pergunta' || e.resultado !== null || e.opcoesVisiveis >= e.ordem.length) return e
  const opcoesVisiveis = e.opcoesVisiveis + 1
  const ultima = opcoesVisiveis === e.ordem.length
  const totalMs = config.segundosResposta * 1000
  return {
    ...e,
    opcoesVisiveis,
    cronometro: ultima && config.cronometroAtivo ? { fim: agora + totalMs, restanteMs: totalMs, totalMs } : null,
  }
}

function encerrar(e: EstadoJogo, resultado: 'acerto' | 'erro' | 'tempo', config: Config): EstadoJogo {
  const adiar = resultado !== 'acerto' && config.aoErrar === 'proximaRodada'
  const placar = [...e.placar]
  if (resultado === 'acerto') placar[e.equipe] += config.pontosPorPergunta
  return {
    ...e,
    resultado,
    opcoesVisiveis: e.ordem.length,
    mostrarCorreta: !adiar,
    adiadas: adiar && e.atual != null ? [...e.adiadas, e.atual] : e.adiadas,
    placar,
    cronometro: e.cronometro ? { ...e.cronometro, fim: null, restanteMs: restanteMs(e.cronometro) } : null,
  }
}

/** Marca a opção que está na posição `posicao` da tela (0 = A). */
export function marcar(e: EstadoJogo, posicao: number, config: Config): EstadoJogo {
  if (e.fase !== 'pergunta' || e.resultado !== null || posicao >= e.opcoesVisiveis) return e
  const pergunta = buscarPergunta(e.atual)!
  const escolhida = e.ordem[posicao]
  const novo = encerrar(e, escolhida === pergunta.correta ? 'acerto' : 'erro', config)
  return { ...novo, escolhida }
}

/** O tempo para responder acabou. */
export function esgotarTempo(e: EstadoJogo, config: Config): EstadoJogo {
  if (e.fase !== 'pergunta' || e.resultado !== null || !e.cronometro) return e
  return { ...encerrar(e, 'tempo', config), cronometro: { ...e.cronometro, fim: null, restanteMs: 0 } }
}

export function alternarPausaCronometro(e: EstadoJogo, agora = Date.now()): EstadoJogo {
  const c = e.cronometro
  if (e.fase !== 'pergunta' || e.resultado !== null || !c) return e
  return {
    ...e,
    cronometro: c.fim == null ? { ...c, fim: agora + c.restanteMs } : congelar(c, agora),
  }
}

/** Revela a resposta certa de uma pergunta que foi adiada (decisão do operador). */
export function revelarCorreta(e: EstadoJogo): EstadoJogo {
  if (!respondida(e) || e.mostrarCorreta) return e
  return { ...e, mostrarCorreta: true, adiadas: e.adiadas.filter((id) => id !== e.atual) }
}

/** Devolve a pergunta atual para o fim da fila, sem resposta. A mesma equipe recebe a próxima. */
export function pular(e: EstadoJogo): EstadoJogo {
  if (e.fase !== 'pergunta' || e.resultado !== null || e.atual == null) return e
  return {
    ...e,
    fase: 'inicio',
    fila: [...e.fila, e.atual],
    contador: e.contador - 1,
    atual: null,
    proximaEquipe: e.equipe,
    cronometro: null,
  }
}

/** Escolhe a equipe da vez (a da pergunta em andamento ou a da próxima pergunta). */
export function escolherEquipe(e: EstadoJogo, indice: number): EstadoJogo {
  const proxima = (indice + 1) % EQUIPES.length
  if (e.fase === 'pergunta' && e.resultado === null) return { ...e, equipe: indice, proximaEquipe: proxima }
  return { ...e, proximaEquipe: indice }
}
