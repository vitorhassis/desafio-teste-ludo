# Desafio de testes: Ludo

Implementação em JavaScript de uma partida de Ludo para dois jogadores, com uma suíte de testes automatizados em Jest (66 testes, 100% de cobertura).

## Colaboradores

- Vitor Hugo Assis da Silva — RA: 24140023-2
- Fernando Queiroz — RA: 24038237-2

## Regras

- Dois jogadores (1 e 2), com 4 peças cada. O jogador 1 começa.
- O caminho comum tem 52 casas. Os jogadores entram em lados opostos do tabuleiro: o jogador 1 na casa 0 e o jogador 2 na casa 26.
- Só sai da base quem tira **6**; a peça vai para a casa inicial do jogador.
- Tirar **6** dá direito a jogar de novo (depois de mover a peça).
- Se nenhuma peça puder se mover, a vez passa ao adversário.
- Cair em uma casa com peças do adversário **captura** essas peças, que voltam para a base. Não há captura nas casas seguras (as casas iniciais e as estrelas: 0, 8, 13, 21, 26, 34, 39 e 47), onde peças de jogadores diferentes dividem a casa.
- Depois da última casa do caminho a peça entra na **reta final** (5 casas exclusivas do jogador, sem captura). Para chegar ao final é preciso tirar o número exato.
- Vence quem levar as 4 peças para a chegada.

### Progresso de uma peça

| Valor | Significado |
| --- | --- |
| `-1` | na base |
| `0` a `50` | no caminho (0 é a casa inicial do jogador) |
| `51` a `55` | reta final |
| `56` | chegada |

## Estrutura

```
.
├── .github/workflows/testes.yml   # CI: roda npm ci e npm test
├── src/ludo.js                    # classe Ludo (regras do jogo)
├── tests/
│   ├── helpers.js                 # gerador pseudoaleatório determinístico por semente
│   └── ludo.test.js               # testes unitários e partidas completas
└── package.json
```

### Testes

- Casos unitários para tabuleiro, dado, saída da base, movimentos, captura, reta final e fim de jogo, usando dados controlados.
- Grupo **Partidas completas**: executa 40 partidas automáticas com dados gerados por semente (`tests/helpers.js`), com limite de segurança de 100.000 lances. Verifica que toda partida termina, que o vencedor tem as 4 peças na chegada e que a mesma semente produz sempre a mesma partida.

## Instalação

Requer [Node.js](https://nodejs.org/) 18 ou superior.

```bash
npm ci
```

## Execução

```bash
npm test
```

O comando roda o Jest com relatório de cobertura. O projeto exige 100% de cobertura (instruções, ramos, funções e linhas); se ficar abaixo disso, o comando falha. O relatório HTML é gerado na pasta `coverage/`.

## Integração contínua

O workflow `.github/workflows/testes.yml` executa `npm ci` e `npm test` a cada push e pull request.

## Licença

MIT
