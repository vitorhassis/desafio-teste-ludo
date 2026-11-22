'use strict';

/** Casas do caminho comum (o circuito que todos percorrem). */
const TAMANHO_TRILHA = 52;

/** Casa do caminho em que cada jogador entra (2 jogadores: lados opostos do tabuleiro). */
const CASA_INICIAL = Object.freeze({ 1: 0, 2: 26 });

/** Casas onde nao ha captura: as casas iniciais (0 e 26) e as estrelas. */
const CASAS_SEGURAS = Object.freeze([0, 8, 13, 21, 26, 34, 39, 47]);

/**
 * Progresso de uma peca:
 *  -1      = na base
 *  0..50   = no caminho (0 = casa inicial do jogador; 51 casas antes de entrar na reta final)
 *  51..55  = reta final (casas exclusivas do jogador, sem captura)
 *  56      = chegada
 */
const NA_BASE = -1;
const ULTIMA_CASA_DO_CAMINHO = 50;
const PROGRESSO_CHEGADA = 56;
const PECAS_POR_JOGADOR = 4;
const DADO_PARA_SAIR = 6;

const dadoAleatorio = () => Math.floor(Math.random() * 6) + 1;

function situacaoValida(situacao) {
  return typeof situacao === 'object' && situacao !== null
    && Array.isArray(situacao.pecas) && situacao.pecas.length === 2
    && situacao.pecas.every((lista) => Array.isArray(lista) && lista.length === PECAS_POR_JOGADOR
      && lista.every((p) => Number.isInteger(p) && p >= NA_BASE && p <= PROGRESSO_CHEGADA))
    && (situacao.vez === 1 || situacao.vez === 2);
}

/**
 * Partida de Ludo para 2 jogadores (1 e 2), com 4 pecas cada.
 *
 * Regras:
 *  - So sai da base quem tira 6; a peca vai para a casa inicial do jogador.
 *  - Tirar 6 da direito a jogar novamente (depois de mover a peca).
 *  - Sem nenhuma peca que possa se mover, a vez passa ao adversario.
 *  - Cair em uma casa com pecas do adversario (fora das casas seguras) as envia de volta para a base.
 *  - Depois da ultima casa do caminho a peca entra na reta final; para chegar e preciso o numero exato.
 *  - Vence quem levar as 4 pecas para a chegada.
 *
 * Opcoes: dado (funcao que devolve 1..6; padrao aleatorio) e situacao ({ pecas: [progJ1, progJ2], vez })
 * para retomar uma partida em andamento.
 */
class Ludo {
  constructor({ dado = dadoAleatorio, situacao } = {}) {
    this._dado = dado;
    this.estado = 'jogando';
    this.vencedor = null;
    this.dadoAtual = null; // valor rolado que ainda precisa ser usado em um movimento
    this.ultimoDado = null;

    if (situacao === undefined) {
      this._pecas = { 1: Array(PECAS_POR_JOGADOR).fill(NA_BASE), 2: Array(PECAS_POR_JOGADOR).fill(NA_BASE) };
      this.vez = 1;
    } else {
      if (!situacaoValida(situacao)) throw new RangeError('Situacao invalida');
      this._pecas = { 1: [...situacao.pecas[0]], 2: [...situacao.pecas[1]] };
      this.vez = situacao.vez;
    }
  }

  /** Progresso das 4 pecas do jogador (copia). */
  pecas(jogador) {
    this._validarJogador(jogador);
    return [...this._pecas[jogador]];
  }

  /** 'base' | 'caminho' | 'reta-final' | 'chegada'. */
  estadoDaPeca(jogador, indice) {
    const progresso = this._progresso(jogador, indice);
    if (progresso === NA_BASE) return 'base';
    if (progresso <= ULTIMA_CASA_DO_CAMINHO) return 'caminho';
    if (progresso < PROGRESSO_CHEGADA) return 'reta-final';
    return 'chegada';
  }

  /** Casa do caminho (0..51) ocupada pela peca, ou null se estiver na base, reta final ou chegada. */
  posicaoGlobal(jogador, indice) {
    const progresso = this._progresso(jogador, indice);
    if (progresso < 0 || progresso > ULTIMA_CASA_DO_CAMINHO) return null;
    return (CASA_INICIAL[jogador] + progresso) % TAMANHO_TRILHA;
  }

  /** Rola o dado. Sem jogada possivel, a vez passa ao adversario automaticamente. */
  rolarDado() {
    this._validarEmAndamento();
    if (this.dadoAtual !== null) throw new Error('Mova uma peca antes de rolar o dado de novo');
    const valor = this._dado();
    if (!Number.isInteger(valor) || valor < 1 || valor > 6) throw new RangeError('Dado invalido');

    this.ultimoDado = valor;
    this.dadoAtual = valor;
    if (this.movimentosValidos().length === 0) {
      this.dadoAtual = null;
      this.vez = this._adversario(this.vez);
    }
    return valor;
  }

  /** Indices (0..3) das pecas do jogador da vez que podem usar o dado rolado. */
  movimentosValidos() {
    if (this.dadoAtual === null) return [];
    return this._pecas[this.vez]
      .map((progresso, indice) => ({ progresso, indice }))
      .filter(({ progresso }) => this._podeMover(progresso, this.dadoAtual))
      .map(({ indice }) => indice);
  }

  /** Move a peca escolhida com o dado rolado. Devolve { peca, de, para, capturadas }. */
  mover(indice) {
    this._validarEmAndamento();
    if (this.dadoAtual === null) throw new Error('Role o dado primeiro');
    this._validarPeca(indice);
    if (!this.movimentosValidos().includes(indice)) throw new Error('Movimento invalido');

    const jogador = this.vez;
    const pecas = this._pecas[jogador];
    const valor = this.dadoAtual;
    const de = pecas[indice];
    const para = de === NA_BASE ? 0 : de + valor;
    pecas[indice] = para;
    const capturadas = this._capturar(jogador, para);
    this.dadoAtual = null;

    if (pecas.every((progresso) => progresso === PROGRESSO_CHEGADA)) {
      this.estado = 'fim';
      this.vencedor = jogador;
      this.vez = null;
    } else if (valor !== DADO_PARA_SAIR) {
      this.vez = this._adversario(jogador);
    }
    return { peca: indice, de, para, capturadas };
  }

  // ---------------------------------------------------------------- privados

  _validarJogador(jogador) {
    if (jogador !== 1 && jogador !== 2) throw new RangeError('Jogador invalido: use 1 ou 2');
  }

  _validarPeca(indice) {
    if (!Number.isInteger(indice) || indice < 0 || indice >= PECAS_POR_JOGADOR) {
      throw new RangeError('Peca invalida: use 0 a 3');
    }
  }

  _validarEmAndamento() {
    if (this.estado === 'fim') throw new Error('Jogo encerrado');
  }

  _progresso(jogador, indice) {
    this._validarJogador(jogador);
    this._validarPeca(indice);
    return this._pecas[jogador][indice];
  }

  _adversario(jogador) {
    return jogador === 1 ? 2 : 1;
  }

  _podeMover(progresso, valor) {
    if (progresso === NA_BASE) return valor === DADO_PARA_SAIR;
    return progresso + valor <= PROGRESSO_CHEGADA; // a chegada exige o numero exato
  }

  // Envia de volta para a base as pecas do adversario que estao na casa onde o jogador parou.
  _capturar(jogador, progresso) {
    if (progresso > ULTIMA_CASA_DO_CAMINHO) return 0;
    const casa = (CASA_INICIAL[jogador] + progresso) % TAMANHO_TRILHA;
    if (CASAS_SEGURAS.includes(casa)) return 0;

    const adversario = this._adversario(jogador);
    let capturadas = 0;
    this._pecas[adversario].forEach((_, i) => {
      if (this.posicaoGlobal(adversario, i) === casa) {
        this._pecas[adversario][i] = NA_BASE;
        capturadas++;
      }
    });
    return capturadas;
  }
}

module.exports = { Ludo, CASAS_SEGURAS, TAMANHO_TRILHA, CASA_INICIAL, PROGRESSO_CHEGADA };
