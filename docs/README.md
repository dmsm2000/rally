# Fluxos por ecrã

Um ficheiro por rota-folha da aplicação: um mapa de estados do ecrã mais os fluxos de utilizador —
sequências concretas de ações — que esse ecrã suporta. É a lista de trabalho para a avaliação
ecrã-a-ecrã, e é a fonte de verdade que o projeto irmão [`rally-e2e-tests`](../../rally-e2e-tests)
(Playwright) lê para desenhar os testes que vão correr todas as noites na pipeline.

**Formato de cada ficheiro:** cabeçalho (rota, guards, componentes, dependências) → diagrama de
estados em Mermaid, como mapa técnico rápido do ecrã → **Fluxos de utilizador**: uma secção por
ação possível, cada uma uma sequência numerada de passos concretos ("escreve email", "clica X")
terminando num **Resultado** verificável. É esta segunda parte que interessa ao `rally-e2e-test` —
cada fluxo mapeia quase 1:1 para os passos de um teste Playwright. O diagrama é o mapa; os fluxos
são os percursos que se andam nesse mapa. Ver [`login.md`](flows/login.md), [`forgot-password.md`](flows/forgot-password.md) e
[`reset-password.md`](flows/reset-password.md) como referência do formato atual.

**Regra de idioma:** os ficheiros em `docs/flows/*.md` são escritos em inglês (prosa, cabeçalhos,
nomes de estado nos diagramas). A única exceção é texto literal da UI entre aspas (labels de botão,
placeholders, mensagens de erro/toast, nomes de ecrã como "verifica o teu email") — esse fica tal
e qual aparece na app, que é portuguese-first, porque é isso que um teste Playwright vai procurar.

**Regra do ponto de entrada:** cada fluxo começa por onde um utilizador real chega àquele ecrã —
não por uma visita direta ao URL, exceto quando isso é explicitamente o que se está a testar (ex.
"sessão já autenticada visita `/login` manualmente"). Um ecrã só alcançável a partir de outro (ex.
`/forgot-password` só a partir de `/login`) documenta isso no cabeçalho, em "Ponto de entrada real",
e os seus fluxos partem de lá.

## Manutenção

Estes ficheiros só valem alguma coisa enquanto forem verdade. Regra prática: **um fluxo, uma
dialog nova, um estado de vazio/erro que mude no código é razão para atualizar o `.md`
correspondente antes de dar a alteração como fechada** — não depois, não "quando der jeito". Se o
`rally-e2e-test` vier a gerar ou validar testes a partir daqui, um diagrama desatualizado passa a
gerar um teste que verifica o comportamento errado, o que é pior do que não ter teste nenhum.

Ao rever um ecrã (corrigir o que precisar, atualizar o diagrama para bater certo com o código
real), marca **📝**. Um ecrã só passa a **✅** quando o
[`rally-e2e-tests`](../../rally-e2e-tests) tiver um teste real e a passar para **cada** fluxo desse
`.md` — os que ainda não dá para automatizar (falta uma conta de teste semeada, falta mockar algo
fora do nosso controlo) ficam lá como `test.skip(...)` com o motivo escrito, nunca omitidos em
silêncio, para o buraco entre "documentado" e "testado" continuar visível. Diagrama fiel ao código
sem testes a cobri-lo é condição necessária para ✅, não suficiente.

**Estados:** ⬜ sem diagrama · 📝 diagrama e código revistos, ainda sem cobertura completa de testes · ✅ todos os fluxos têm um teste real e a passar em `rally-e2e-tests`

## Rotas públicas (sem sessão, fora da app shell)

| #   | Ecrã                      | Rota               | Ficheiro                                         | Estado |
| --- | ------------------------- | ------------------ | ------------------------------------------------ | ------ |
| 1   | Registo                   | `/register`        | [`register.md`](flows/register.md)               | ✅     |
| 2   | Login                     | `/login`           | [`login.md`](flows/login.md)                     | ✅     |
| 3   | Esqueceste-te da password | `/forgot-password` | [`forgot-password.md`](flows/forgot-password.md) | ✅     |
| 4   | Repor a password          | `/reset-password`  | [`reset-password.md`](flows/reset-password.md)   | ✅     |

## Rotas autenticadas (dentro da app shell)

| #   | Ecrã                      | Rota                 | Guards extra                              | Ficheiro                                     | Estado |
| --- | ------------------------- | -------------------- | ----------------------------------------- | -------------------------------------------- | ------ |
| 5   | Feed                      | `/`                  | —                                         | [`feed.md`](flows/feed.md)                   | ⬜     |
| 6   | Perfil público de jogador | `/players/:playerId` | —                                         | [`player-detail.md`](flows/player-detail.md) | ⬜     |
| 7   | Courts (catálogo)         | `/courts`            | —                                         | [`courts-list.md`](flows/courts-list.md)     | ⬜     |
| 8   | Detalhe de court          | `/courts/:courtId`   | —                                         | [`court-detail.md`](flows/court-detail.md)   | ⬜     |
| 9   | Partidas                  | `/matches`           | —                                         | [`matches-list.md`](flows/matches-list.md)   | ⬜     |
| 10  | Detalhe de partida        | `/matches/:matchId`  | —                                         | [`match-detail.md`](flows/match-detail.md)   | ⬜     |
| 11  | Explorar (Mundo)          | `/world`             | —                                         | [`world.md`](flows/world.md)                 | ⬜     |
| 12  | Passaporte                | `/passport`          | `noObserverGuard`                         | [`passport.md`](flows/passport.md)           | ⬜     |
| 13  | O meu perfil              | `/profile`           | `noObserverGuard` + `unsavedChangesGuard` | [`profile.md`](flows/profile.md)             | 📝     |

Todas as rotas autenticadas passam primeiro por `authGuard` (sem sessão real nem de observador →
`/login`); a coluna "Guards extra" só lista o que se soma a esse.

## Fora do âmbito por agora

Diálogos e composers internos (registo de court, publicar/convidar para partida, publicar no feed,
pedido de trip, mudar avatar/password, etc.) não são ecrãs próprios — são sub-fluxos dentro do
diagrama do ecrã onde aparecem, e ficam documentados lá dentro.
