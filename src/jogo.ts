import todas from './data/perguntas.json'
import type { Config, EstadoJogo, Pergunta } from './tipos'

export const PERGUNTAS = todas as Pergunta[]
const porId = new Map(PERGUNTAS.map((p) => [p.id, p]))

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
    mostrarCorreta: false,
  }
}

/** Já marcou a resposta da pergunta atual? */
export const respondida = (e: EstadoJogo) => e.fase === 'pergunta' && e.escolhida !== null

/** Pode sortear a próxima pergunta agora? */
export const podeSortear = (e: EstadoJogo) => e.fase === 'inicio' || respondida(e)

export function sortear(e: EstadoJogo, config: Config): EstadoJogo {
  if (e.fila.length === 0) {
    return e.adiadas.length > 0
      ? { ...e, fase: 'fimRodada', atual: null }
      : { ...e, fase: 'fim', atual: null }
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
    mostrarCorreta: false,
  }
}

export function proximaRodada(e: EstadoJogo): EstadoJogo {
  return { ...e, fase: 'inicio', rodada: e.rodada + 1, fila: embaralhar(e.adiadas), adiadas: [], atual: null }
}

export function revelarOpcao(e: EstadoJogo): EstadoJogo {
  if (e.fase !== 'pergunta' || e.escolhida !== null || e.opcoesVisiveis >= e.ordem.length) return e
  return { ...e, opcoesVisiveis: e.opcoesVisiveis + 1 }
}

/** Marca a opção que está na posição `posicao` da tela (0 = A). */
export function marcar(e: EstadoJogo, posicao: number, config: Config): EstadoJogo {
  if (e.fase !== 'pergunta' || e.escolhida !== null || posicao >= e.opcoesVisiveis) return e
  const pergunta = buscarPergunta(e.atual)!
  const escolhida = e.ordem[posicao]
  const acertou = escolhida === pergunta.correta
  const adiar = !acertou && config.aoErrar === 'proximaRodada'
  return {
    ...e,
    escolhida,
    opcoesVisiveis: e.ordem.length,
    mostrarCorreta: !adiar,
    adiadas: adiar ? [...e.adiadas, pergunta.id] : e.adiadas,
  }
}

/** Revela a resposta certa de uma pergunta que foi adiada (decisão do operador). */
export function revelarCorreta(e: EstadoJogo): EstadoJogo {
  if (!respondida(e) || e.mostrarCorreta) return e
  return { ...e, mostrarCorreta: true, adiadas: e.adiadas.filter((id) => id !== e.atual) }
}

/** Devolve a pergunta atual para o fim da fila, sem resposta. */
export function pular(e: EstadoJogo): EstadoJogo {
  if (e.fase !== 'pergunta' || e.escolhida !== null || e.atual == null) return e
  return { ...e, fase: 'inicio', fila: [...e.fila, e.atual], contador: e.contador - 1, atual: null }
}

export const acertou = (e: EstadoJogo) => {
  const p = buscarPergunta(e.atual)
  return p != null && e.escolhida === p.correta
}
