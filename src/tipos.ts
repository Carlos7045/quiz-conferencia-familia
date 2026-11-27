export interface Pergunta {
  id: number
  pergunta: string
  opcoes: string[]
  /** Índice (0-3) da opção correta em `opcoes` */
  correta: number
  referencia: string
}

export type Fase = 'inicio' | 'pergunta' | 'fimRodada' | 'fim'

export interface EstadoJogo {
  fase: Fase
  rodada: number
  /** Perguntas que ainda vão sair nesta rodada (já embaralhadas) */
  fila: number[]
  /** Perguntas erradas que voltam na próxima rodada */
  adiadas: number[]
  /** Quantas perguntas já foram sorteadas (para exibir "Pergunta N") */
  contador: number
  atual: number | null
  /** Ordem de exibição: ordem[posição na tela] = índice original da opção */
  ordem: number[]
  opcoesVisiveis: number
  /** Índice original da opção marcada, ou null */
  escolhida: number | null
  /** Se a resposta certa deve aparecer (acertou ou config "mostrar correta") */
  mostrarCorreta: boolean
}

export interface Config {
  modoOpcoes: 'manual' | 'automatico'
  /** Tempo para ler a pergunta antes da 1ª opção (modo automático) */
  segundosLeitura: number
  /** Tempo entre uma opção e a próxima (modo automático) */
  segundosEntreOpcoes: number
  aoErrar: 'mostrarCorreta' | 'proximaRodada'
  embaralharOpcoes: boolean
  somAtivo: boolean
  volume: number
}

export type Mensagem =
  | { tipo: 'estado'; estado: EstadoJogo; config: Config }
  | { tipo: 'ola' }
  | { tipo: 'ping' }
