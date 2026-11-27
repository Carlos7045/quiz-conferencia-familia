# Gincana Peniel: Quiz Bíblico

Sistema de perguntas e respostas para projetar no telão. Não tem login nem banco de dados: as perguntas ficam em `src/data/perguntas.json` e as configurações ficam salvas no próprio navegador.

## Como usar no dia

### Com o telão estendido (recomendado)
1. Abra o site no notebook. Essa é a tela de **controle**, que só vocês veem e que mostra qual é a resposta certa.
2. Clique em **🖥️ Abrir telão**. Arraste a janela que abriu para o telão e aperte **F11** (ou dê um duplo clique) para deixar em tela cheia.
3. O indicador "● Telão conectado" fica verde quando as duas janelas estão conversando.

### Com a tela espelhada (uma tela só)
Clique em **⛶ Tela única**. A tela do público ocupa a tela inteira. Os botões aparecem embaixo quando você mexe o mouse e somem sozinhos. Também dá para clicar direto na opção que a pessoa respondeu.

### Dinâmica
| Ação | Botão | Teclado |
|---|---|---|
| Sortear a próxima pergunta (toca a abertura) | Próxima pergunta | `Enter` ou `N` |
| Mostrar a próxima opção | Próxima opção | `Espaço` ou `→` |
| Marcar a resposta da pessoa | clicar na opção | `A`–`D` ou `1`–`4` |
| Mostrar a certa (quando a pergunta ficou para a próxima rodada) | Mostrar resposta certa | `R` |
| Pausar o modo automático | Pausar automático | `P` |
| Desfazer o último passo (ex.: clicou errado) | Desfazer | `Backspace` ou `Ctrl+Z` |

O progresso fica salvo no navegador. Se a página fechar ou recarregar, o jogo continua de onde parou. Para começar do zero, use **Configurações → Reiniciar jogo**.

### Configurações (⚙️)
- **Como as opções aparecem:** manual, ou automático com tempo de leitura da pergunta e tempo entre as opções.
- **Quando errar:** mostrar a certa com a referência, ou não mostrar e devolver a pergunta para a próxima rodada.
- **Embaralhar a ordem das opções:** vem ligado, porque no PDF a resposta certa é a letra B em 75 das 120 perguntas.
- **Sons:** liga/desliga, volume e botões de teste.

## Sons personalizados
Por padrão os sons são gerados pelo próprio navegador. Para usar seus próprios sons, coloque arquivos mp3 em `public/sons/` com estes nomes:

- `abertura.mp3`: música quando a pergunta aparece
- `opcao.mp3`: quando cada opção aparece
- `acerto.mp3`
- `erro.mp3`

Pode colocar só alguns. Os que faltarem continuam com o som gerado.

## Atualizar as perguntas
Substitua o PDF na raiz (mantendo o mesmo formato) e rode:

```bash
pip install pymupdf
npm run extrair
```

O script mostra um aviso se alguma pergunta vier sem 4 opções, sem resposta ou sem referência. Também dá para editar `src/data/perguntas.json` direto (`correta` vai de 0 a 3: 0 = A, 1 = B...).

## Desenvolvimento
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera a pasta dist/
```

## Publicar na Vercel
1. Suba o projeto para um repositório no GitHub.
2. Na Vercel: **Add New → Project**, escolha o repositório e clique em **Deploy**. A Vercel detecta o Vite sozinha (build `npm run build`, pasta `dist`).

Depois que a página carrega, o quiz funciona mesmo se a internet cair, porque tudo vem num pacote só.
