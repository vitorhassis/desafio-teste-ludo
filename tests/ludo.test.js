const { Ludo, CASAS_SEGURAS, TAMANHO_TRILHA, CASA_INICIAL, PROGRESSO_CHEGADA } = require('../src/ludo');

// Dado controlado: devolve os valores informados, na ordem. Falha se rolarem mais do que o esperado.
function dadosFixos(...valores) {
  const fila = [...valores];
  return () => {
    if (fila.length === 0) throw new Error('o dado foi rolado mais vezes do que o previsto');
    return fila.shift();
  };
}

// Partida em um estado escolhido: progresso das 4 pecas de cada jogador e jogador da vez.
// Progresso: -1 = na base; 0..50 = no caminho; 51..55 = reta final; 56 = chegada.
function partida({ pecas, vez = 1, dados = [] }) {
  return new Ludo({ dado: dadosFixos(...dados), situacao: { pecas, vez } });
}

const NA_BASE = [-1, -1, -1, -1];

// Verifica regras que valem em qualquer momento da partida.
function verificarIntegridade(jogo) {
  const ocupantes = new Map(); // casa do caminho -> conjunto de jogadores
  [1, 2].forEach((jogador) => {
    jogo.pecas(jogador).forEach((progresso, indice) => {
      expect(progresso).toBeGreaterThanOrEqual(-1);
      expect(progresso).toBeLessThanOrEqual(PROGRESSO_CHEGADA);
      const casa = jogo.posicaoGlobal(jogador, indice);
      if (casa !== null) {
        if (!ocupantes.has(casa)) ocupantes.set(casa, new Set());
        ocupantes.get(casa).add(jogador);
      }
    });
  });
  ocupantes.forEach((jogadores, casa) => {
    // fora das casas seguras nunca ha pecas de jogadores diferentes na mesma casa
    if (!CASAS_SEGURAS.includes(casa)) expect(jogadores.size).toBe(1);
  });
}

describe('O tabuleiro e as pecas', () => {
  test('o caminho tem 52 casas e as casas iniciais dos jogadores 1 e 2 sao opostas (0 e 26)', () => {
    expect(TAMANHO_TRILHA).toBe(52);
    expect(CASA_INICIAL).toEqual({ 1: 0, 2: 26 });
    expect(PROGRESSO_CHEGADA).toBe(56);
  });

  test('as casas seguras sao as casas iniciais e as estrelas', () => {
    expect(CASAS_SEGURAS).toEqual([0, 8, 13, 21, 26, 34, 39, 47]);
  });

  test('cada jogador comeca com 4 pecas na base e o jogador 1 joga primeiro', () => {
    const jogo = new Ludo();
    expect(jogo.pecas(1)).toEqual(NA_BASE);
    expect(jogo.pecas(2)).toEqual(NA_BASE);
    expect(jogo.vez).toBe(1);
    expect(jogo.estado).toBe('jogando');
    expect(jogo.dadoAtual).toBeNull();
    expect(jogo.vencedor).toBeNull();
  });

  test('pecas() devolve uma copia', () => {
    const jogo = new Ludo();
    jogo.pecas(1).fill(99);
    expect(jogo.pecas(1)).toEqual(NA_BASE);
  });

  test.each([
    [-1, 'base'],
    [0, 'caminho'],
    [50, 'caminho'],
    [51, 'reta-final'],
    [55, 'reta-final'],
    [56, 'chegada'],
  ])('uma peca com progresso %i esta em "%s"', (progresso, esperado) => {
    const jogo = partida({ pecas: [[progresso, -1, -1, -1], NA_BASE] });
    expect(jogo.estadoDaPeca(1, 0)).toBe(esperado);
  });

  test('posicaoGlobal converte o progresso em casa do caminho, de acordo com a casa inicial', () => {
    const jogo = partida({ pecas: [[0, 10, 51, -1], [0, 30, 56, 52]] });
    expect(jogo.posicaoGlobal(1, 0)).toBe(0);
    expect(jogo.posicaoGlobal(1, 1)).toBe(10);
    expect(jogo.posicaoGlobal(2, 0)).toBe(26);
    expect(jogo.posicaoGlobal(2, 1)).toBe(4); // (26 + 30) % 52: o caminho "da a volta"
  });

  test('pecas na base, na reta final ou na chegada nao ocupam casa do caminho', () => {
    const jogo = partida({ pecas: [[-1, 51, 55, 56], NA_BASE] });
    for (let i = 0; i < 4; i++) expect(jogo.posicaoGlobal(1, i)).toBeNull();
  });

  test('rejeita jogador e peca invalidos', () => {
    const jogo = new Ludo();
    expect(() => jogo.pecas(3)).toThrow(RangeError);
    expect(() => jogo.estadoDaPeca(0, 0)).toThrow(RangeError);
    expect(() => jogo.estadoDaPeca(1, 4)).toThrow(RangeError);
    expect(() => jogo.posicaoGlobal(1, -1)).toThrow(RangeError);
    expect(() => jogo.posicaoGlobal(1, 'a')).toThrow(RangeError);
  });

  test.each([
    ['nao e um objeto', 'situacao'],
    ['pecas nao sao duas listas', { pecas: [NA_BASE], vez: 1 }],
    ['jogador com 3 pecas', { pecas: [[-1, -1, -1], NA_BASE], vez: 1 }],
    ['progresso acima da chegada', { pecas: [[57, -1, -1, -1], NA_BASE], vez: 1 }],
    ['progresso abaixo da base', { pecas: [[-2, -1, -1, -1], NA_BASE], vez: 1 }],
    ['progresso nao inteiro', { pecas: [[1.5, -1, -1, -1], NA_BASE], vez: 1 }],
    ['vez invalida', { pecas: [NA_BASE, NA_BASE], vez: 3 }],
  ])('rejeita situacao invalida: %s', (_nome, situacao) => {
    expect(() => new Ludo({ situacao })).toThrow(RangeError);
  });
});

describe('Rolar o dado', () => {
  test('rolarDado devolve o valor do dado e o registra', () => {
    const jogo = partida({ pecas: [[5, -1, -1, -1], NA_BASE], dados: [3] });
    expect(jogo.rolarDado()).toBe(3);
    expect(jogo.dadoAtual).toBe(3);
    expect(jogo.ultimoDado).toBe(3);
  });

  test.each([[0], [7], [1.5], ['a'], [undefined]])('rejeita o valor de dado %p', (valor) => {
    const jogo = new Ludo({ dado: () => valor });
    expect(() => jogo.rolarDado()).toThrow(RangeError);
    expect(jogo.dadoAtual).toBeNull();
  });

  test('o dado padrao (aleatorio) devolve sempre um valor de 1 a 6', () => {
    const jogo = new Ludo();
    for (let i = 0; i < 50; i++) {
      const valor = jogo.rolarDado();
      expect(valor).toBeGreaterThanOrEqual(1);
      expect(valor).toBeLessThanOrEqual(6);
      if (jogo.dadoAtual !== null) {
        jogo.mover(jogo.movimentosValidos()[0]);
      }
      if (jogo.estado === 'fim') break;
    }
  });

  test('nao e possivel rolar o dado duas vezes sem mover uma peca', () => {
    const jogo = partida({ pecas: [[5, -1, -1, -1], NA_BASE], dados: [3, 4] });
    jogo.rolarDado();
    expect(() => jogo.rolarDado()).toThrow('Mova uma peca antes de rolar o dado de novo');
  });

  test('nao e possivel mover sem rolar o dado primeiro', () => {
    const jogo = partida({ pecas: [[5, -1, -1, -1], NA_BASE] });
    expect(() => jogo.mover(0)).toThrow('Role o dado primeiro');
  });

  test('movimentosValidos e vazio antes de rolar o dado', () => {
    expect(new Ludo().movimentosValidos()).toEqual([]);
  });
});

describe('Sair da base (so com 6)', () => {
  test('sem nenhuma peca no caminho e sem 6, nao ha jogada e a vez passa ao adversario', () => {
    const jogo = partida({ pecas: [NA_BASE, NA_BASE], dados: [4] });
    jogo.rolarDado();
    expect(jogo.vez).toBe(2);
    expect(jogo.dadoAtual).toBeNull();
    expect(jogo.ultimoDado).toBe(4);
  });

  test('com 6, qualquer peca da base pode sair', () => {
    const jogo = partida({ pecas: [NA_BASE, NA_BASE], dados: [6] });
    jogo.rolarDado();
    expect(jogo.movimentosValidos()).toEqual([0, 1, 2, 3]);
  });

  test('a peca que sai da base vai para a casa inicial do jogador', () => {
    const um = partida({ pecas: [NA_BASE, NA_BASE], dados: [6] });
    um.rolarDado();
    um.mover(0);
    expect(um.pecas(1)).toEqual([0, -1, -1, -1]);
    expect(um.posicaoGlobal(1, 0)).toBe(0);

    const dois = partida({ pecas: [NA_BASE, NA_BASE], vez: 2, dados: [6] });
    dois.rolarDado();
    dois.mover(2);
    expect(dois.pecas(2)).toEqual([-1, -1, 0, -1]);
    expect(dois.posicaoGlobal(2, 2)).toBe(26);
  });

  test('so as pecas do caminho podem andar quando o dado nao e 6', () => {
    const jogo = partida({ pecas: [[-1, -1, 10, -1], NA_BASE], dados: [4] });
    jogo.rolarDado();
    expect(jogo.movimentosValidos()).toEqual([2]);
  });

  test('mover uma peca da base sem tirar 6 e rejeitado', () => {
    const jogo = partida({ pecas: [[-1, -1, 10, -1], NA_BASE], dados: [4] });
    jogo.rolarDado();
    expect(() => jogo.mover(0)).toThrow('Movimento invalido');
  });
});

describe('Mover pelo caminho', () => {
  test('a peca avanca o numero de casas do dado e a vez passa ao adversario', () => {
    const jogo = partida({ pecas: [[5, -1, -1, -1], NA_BASE], dados: [3] });
    jogo.rolarDado();
    expect(jogo.mover(0)).toEqual({ peca: 0, de: 5, para: 8, capturadas: 0 });
    expect(jogo.pecas(1)[0]).toBe(8);
    expect(jogo.vez).toBe(2);
    expect(jogo.dadoAtual).toBeNull();
  });

  test('tirar 6 da direito a jogar novamente', () => {
    const jogo = partida({ pecas: [[5, -1, -1, -1], NA_BASE], dados: [6, 2] });
    jogo.rolarDado();
    jogo.mover(0);
    expect(jogo.pecas(1)[0]).toBe(11);
    expect(jogo.vez).toBe(1); // continua a vez do jogador 1
    expect(jogo.rolarDado()).toBe(2);
  });

  test('sair da base com 6 tambem da direito a jogar novamente', () => {
    const jogo = partida({ pecas: [NA_BASE, NA_BASE], dados: [6] });
    jogo.rolarDado();
    jogo.mover(0);
    expect(jogo.vez).toBe(1);
  });

  test('o jogador escolhe qual peca mover entre as possiveis', () => {
    const jogo = partida({ pecas: [[5, 20, -1, -1], NA_BASE], dados: [2] });
    jogo.rolarDado();
    expect(jogo.movimentosValidos()).toEqual([0, 1]);
    jogo.mover(1);
    expect(jogo.pecas(1)).toEqual([5, 22, -1, -1]);
  });

  test('o jogador 2 anda pelo caminho dando a volta no tabuleiro', () => {
    const jogo = partida({ pecas: [NA_BASE, [22, -1, -1, -1]], vez: 2, dados: [4] });
    jogo.rolarDado();
    expect(jogo.posicaoGlobal(2, 0)).toBe(48);
    jogo.mover(0);
    expect(jogo.posicaoGlobal(2, 0)).toBe(0); // casa 52 do caminho = casa 0
  });

  test('rejeita indice de peca invalido e peca que nao pode se mover', () => {
    const jogo = partida({ pecas: [[5, -1, -1, -1], NA_BASE], dados: [3] });
    jogo.rolarDado();
    expect(() => jogo.mover(4)).toThrow(RangeError);
    expect(() => jogo.mover(-1)).toThrow(RangeError);
    expect(() => jogo.mover('a')).toThrow(RangeError);
    expect(() => jogo.mover(1)).toThrow('Movimento invalido');
  });
});

describe('Captura', () => {
  test('cair na casa de uma peca adversaria (fora das casas seguras) a envia de volta para a base', () => {
    // jogador 1 na casa 3; peca do jogador 2 na casa 6 ((26 + 32) % 52)
    const jogo = partida({ pecas: [[3, -1, -1, -1], [32, -1, -1, -1]], dados: [3] });
    jogo.rolarDado();
    expect(jogo.mover(0)).toEqual({ peca: 0, de: 3, para: 6, capturadas: 1 });
    expect(jogo.pecas(1)[0]).toBe(6);
    expect(jogo.pecas(2)[0]).toBe(-1);
  });

  test('todas as pecas adversarias na casa sao capturadas', () => {
    const jogo = partida({ pecas: [[3, -1, -1, -1], [32, 32, -1, -1]], dados: [3] });
    jogo.rolarDado();
    expect(jogo.mover(0).capturadas).toBe(2);
    expect(jogo.pecas(2)).toEqual(NA_BASE);
  });

  test('o jogador 2 tambem captura pecas do jogador 1', () => {
    // jogador 2 na casa global 20 ((26 + 46) % 52); peca do jogador 1 na casa 23 (progresso 23)
    const jogo = partida({ pecas: [[23, -1, -1, -1], [46, -1, -1, -1]], vez: 2, dados: [3] });
    jogo.rolarDado();
    expect(jogo.mover(0).capturadas).toBe(1);
    expect(jogo.pecas(1)[0]).toBe(-1);
  });

  test.each([8, 13, 21, 26, 34, 39, 47])(
    'a casa segura %i nao permite captura: as pecas dividem a casa',
    (casa) => {
      // O jogador 1 chega na casa (progresso = casa); o jogador 2 ja esta nela.
      const progressoDoDois = (casa - 26 + 52) % 52;
      const jogo = partida({
        pecas: [[casa - 2, -1, -1, -1], [progressoDoDois, -1, -1, -1]],
        dados: [2],
      });
      jogo.rolarDado();
      expect(jogo.mover(0).capturadas).toBe(0);
      expect(jogo.posicaoGlobal(1, 0)).toBe(casa);
      expect(jogo.posicaoGlobal(2, 0)).toBe(casa);
      expect(jogo.pecas(2)[0]).toBe(progressoDoDois);
      verificarIntegridade(jogo);
    },
  );

  test('sair da base para a casa inicial nao captura uma peca adversaria que esteja nela', () => {
    // A peca do jogador 2 esta na casa 0 (progresso 26), que e a casa inicial do jogador 1.
    const jogo = partida({ pecas: [NA_BASE, [26, -1, -1, -1]], dados: [6] });
    jogo.rolarDado();
    expect(jogo.mover(0).capturadas).toBe(0);
    expect(jogo.posicaoGlobal(1, 0)).toBe(0);
    expect(jogo.posicaoGlobal(2, 0)).toBe(0);
  });

  test('uma peca nao captura outra peca do proprio jogador', () => {
    const jogo = partida({ pecas: [[3, 6, -1, -1], NA_BASE], dados: [3] });
    jogo.rolarDado();
    expect(jogo.mover(0).capturadas).toBe(0);
    expect(jogo.pecas(1)).toEqual([6, 6, -1, -1]);
  });

  test('pecas na reta final nao podem ser capturadas', () => {
    // jogador 2 na reta final (progresso 53); jogador 1 anda sobre o caminho
    const jogo = partida({ pecas: [[10, -1, -1, -1], [53, -1, -1, -1]], dados: [3] });
    jogo.rolarDado();
    expect(jogo.mover(0).capturadas).toBe(0);
    expect(jogo.pecas(2)[0]).toBe(53);
  });
});

describe('Reta final e chegada', () => {
  test('depois da ultima casa do caminho (50) a peca entra na reta final', () => {
    const jogo = partida({ pecas: [[50, -1, -1, -1], NA_BASE], dados: [1] });
    jogo.rolarDado();
    jogo.mover(0);
    expect(jogo.estadoDaPeca(1, 0)).toBe('reta-final');
    expect(jogo.posicaoGlobal(1, 0)).toBeNull();
  });

  test('a peca chega em casa com o numero exato', () => {
    const jogo = partida({ pecas: [[52, -1, -1, -1], NA_BASE], dados: [4] });
    jogo.rolarDado();
    jogo.mover(0);
    expect(jogo.estadoDaPeca(1, 0)).toBe('chegada');
  });

  test('um dado maior do que o necessario para chegar nao pode ser usado por essa peca', () => {
    const jogo = partida({ pecas: [[52, 10, -1, -1], NA_BASE], dados: [5] });
    jogo.rolarDado();
    expect(jogo.movimentosValidos()).toEqual([1]);
    expect(() => jogo.mover(0)).toThrow('Movimento invalido');
  });

  test('sem nenhuma peca que possa se mover, a vez passa', () => {
    const jogo = partida({ pecas: [[52, -1, -1, -1], NA_BASE], dados: [5] });
    jogo.rolarDado();
    expect(jogo.vez).toBe(2);
  });

  test('uma peca que ja chegou nao pode mais se mover', () => {
    const jogo = partida({ pecas: [[56, 10, -1, -1], NA_BASE], dados: [1] });
    jogo.rolarDado();
    expect(jogo.movimentosValidos()).toEqual([1]);
  });
});

describe('Fim da partida', () => {
  test('vence o jogador que levar as 4 pecas para a chegada', () => {
    const jogo = partida({ pecas: [[56, 56, 56, 55], [10, 20, 30, 40]], dados: [1] });
    jogo.rolarDado();
    jogo.mover(3);
    expect(jogo.estado).toBe('fim');
    expect(jogo.vencedor).toBe(1);
  });

  test('o jogador 2 tambem pode vencer', () => {
    const jogo = partida({ pecas: [[10, 20, 30, 40], [56, 56, 56, 54]], vez: 2, dados: [2] });
    jogo.rolarDado();
    jogo.mover(3);
    expect(jogo.vencedor).toBe(2);
  });

  test('ao vencer com um 6 o jogo termina (nao ha nova jogada)', () => {
    const jogo = partida({ pecas: [[56, 56, 56, 50], NA_BASE], dados: [6] });
    jogo.rolarDado();
    jogo.mover(3);
    expect(jogo.estado).toBe('fim');
    expect(jogo.vencedor).toBe(1);
    expect(jogo.vez).toBeNull();
  });

  test('com tres pecas na chegada o jogo continua', () => {
    const jogo = partida({ pecas: [[56, 56, 55, 20], NA_BASE], dados: [1] });
    jogo.rolarDado();
    jogo.mover(2);
    expect(jogo.estado).toBe('jogando');
    expect(jogo.vencedor).toBeNull();
  });

  test('depois do fim nao e possivel rolar o dado nem mover pecas', () => {
    const jogo = partida({ pecas: [[56, 56, 56, 55], NA_BASE], dados: [1] });
    jogo.rolarDado();
    jogo.mover(3);
    expect(() => jogo.rolarDado()).toThrow('Jogo encerrado');
    expect(() => jogo.mover(0)).toThrow('Jogo encerrado');
  });
});

