export interface Pergunta {
  id: number
  pergunta: string
  opcoes: string[]
  /** Índice (0-3) da opção correta em `opcoes` */
  correta: number
  referencia: string
}

export type Fase = 'inicio' | 'pergunta' | 'fimRodada' | 'fim'

/** Como terminou a pergunta atual (null = ainda em andamento) */
export type Resultado = 'acerto' | 'erro' | 'tempo' | null

/**
 * Contagem regressiva para responder.
 * Rodando: `fim` é o horário (Date.now) em que acaba. Pausada: `fim` é null e vale `restanteMs`.
 */
export interface Cronometro {
  fim: number | null
  restanteMs: number
  totalMs: number
}

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
  /** Tocando a vinheta: o telão mostra a chamada da equipe e a pergunta aparece em seguida */
  vinheta: boolean
  /** Índice original da opção marcada, ou null */
  escolhida: number | null
  resultado: Resultado
  /** Se a resposta certa deve aparecer (acertou ou config "mostrar correta") */
  mostrarCorreta: boolean
  /** Equipe que responde a pergunta atual (índice em EQUIPES) */
  equipe: number
  /** Equipe que recebe a próxima pergunta sorteada */
  proximaEquipe: number
  /** Pontos de cada equipe (mesma ordem de EQUIPES) */
  placar: number[]
  cronometro: Cronometro | null
  /** Placar aparecendo no telão (o operador liga e desliga) */
  placarNoTelao: boolean
}

export interface Config {
  modoOpcoes: 'manual' | 'automatico'
  /** Tempo para ler a pergunta antes da 1ª opção (modo automático) */
  segundosLeitura: number
  /** Tempo entre uma opção e a próxima (modo automático) */
  segundosEntreOpcoes: number
  aoErrar: 'mostrarCorreta' | 'proximaRodada'
  embaralharOpcoes: boolean
  /** Quanto tempo a vinheta toca antes de a pergunta aparecer (0 = aparece na hora) */
  segundosVinheta: number
  pontosPorPergunta: number
  /** Contagem regressiva depois que a última opção aparece */
  cronometroAtivo: boolean
  segundosResposta: number
  somAtivo: boolean
  volume: number
}

export type Mensagem =
  | { tipo: 'estado'; estado: EstadoJogo; config: Config }
  | { tipo: 'ola' }
  | { tipo: 'ping' }
