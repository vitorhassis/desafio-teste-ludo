'use strict';

/**
 * Gerador pseudoaleatorio deterministico (mulberry32).
 * A mesma semente sempre produz a mesma sequencia de numeros em [0, 1).
 */
function criarGerador(semente) {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dado deterministico de 6 faces: devolve inteiros de 1 a 6 a partir da semente. */
function criarDado(semente) {
  const gerador = criarGerador(semente);
  return () => Math.floor(gerador() * 6) + 1;
}

module.exports = { criarGerador, criarDado };
