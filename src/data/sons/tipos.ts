/*
 * Tipos dos DADOS de sons por lutador (docs/spec-sons-por-lutador.md §5.1). Nenhum import de `audio/` ou `render/`: `Chamada` tem a mesma
 * forma de `ChamadaReceita` (src/audio/receitas.ts) mais a camada, sem importar dela (o mesmo padrão de `receitas.ts` com o `Som` da render).
 */
export type Vogal = 'a' | 'e' | 'ê' | 'é' | 'i' | 'o' | 'u' | 'ə' | 'm' | 'n';
export type Consoante = 'p' | 't' | 'k' | 'b' | 'd' | 'g' | 's' | 'sh' | 'ch' | 'h' | 'f' | 'z' | 'r';

/** Sílaba: consoante de ataque, vogal (e a vogal de chegada, se for ditongo), duração em s, contorno em semitons e consoante final. */
export interface Silaba {
  readonly c?: Consoante;
  readonly v: Vogal;
  readonly v2?: Vogal;
  readonly t: number;
  /** Semitons relativos ao `f0` do perfil (início, pico, fim). Ausente = `PerfilVocal.contorno`. */
  readonly st?: readonly [number, number, number];
  readonly fim?: 'm' | 'n' | 't' | 'k' | 'p';
}

export interface Grito {
  readonly silabas: readonly Silaba[];
  /** Multiplica o `f0` do perfil (o grito do especial usa 1,25). */
  readonly fatorF0?: number;
  readonly vol?: number;
  /** Silêncio entre sílabas, em s. */
  readonly pausa?: number;
  /** Ganho da sub-oitava (sobrepõe o `coro.sub` do perfil). */
  readonly subOitava?: number;
  /** Soma à aspereza do perfil (o dano pesado usa +0,15). */
  readonly aspereza?: number;
}

/** Os gritos de um lutador (S2). */
export interface GritosDoLutador {
  readonly kiai: Grito;
  readonly vitoria: Grito;
  readonly ko: Grito;
  /** Variantes de dano leve (3 vogais) e pesado (2). */
  readonly leve: readonly Grito[];
  readonly pesado: readonly Grito[];
  readonly guarda: Grito;
  /** Só quem tem armadura (WEI LONG, BAATAR): o "HNN!" ao absorver. */
  readonly esforco?: Grito;
}

export interface PerfilVocal {
  readonly f0: number;
  /** Trato vocal: multiplica os 3 formantes. < 1 = trato longo (voz grande). */
  readonly k: number;
  readonly onda: 'sawtooth' | 'square';
  readonly q: number;
  readonly ganhoF3: number;
  /** Ataque do envelope, em s. */
  readonly atq: number;
  /** `hz` 0 = sem vibrato. */
  readonly vib: { readonly hz: number; readonly prof: number; readonly atraso: number };
  /** `hz` 0 = sem aspereza. */
  readonly aspereza: { readonly hz: number; readonly prof: number };
  readonly sopro: number;
  readonly coro?: { readonly cents: number; readonly sub: number };
  readonly formanteExtra?: { readonly f: number; readonly q: number; readonly ganho: number };
  /** Frequência do `r` rolado (Hz). */
  readonly vibrante?: number;
  /** Contorno típico (semitons) das sílabas que não trazem o próprio. */
  readonly contorno: readonly [number, number, number];
  /** Presente a partir da S2 (as 10 vozes). Sem gritos, o lutador cai nos sons genéricos de hoje. */
  readonly gritos?: GritosDoLutador;
  /**
   * Ganho em dB por categoria de grito, medido contra o som genérico que ele substitui (spec §6.3: ±3 dB; dano pesado 2 a 4 dB acima do leve).
   * Sem isto cada voz teria o volume que a síntese der. Calibrado em tests/unit/sons-volume.test.ts (ferramenta: sons-calibra-diag.test.ts).
   */
  readonly ganhoDb?: Partial<Record<'kiai' | 'leve' | 'pesado' | 'guarda' | 'ko' | 'vitoria' | 'esforco', number>>;
  /** Sons de troca de ficha (VADIVU da NILA): chave = ficha de destino; `base` = voltou à ficha base. */
  readonly troca?: Readonly<Record<string, readonly Chamada[]>>;
}

export type Camada = 'ataque' | 'corpo' | 'cauda' | 'extra';
/** A mesma forma de `ChamadaReceita` (src/audio/receitas.ts) mais a camada, sem importar de audio/. */
export type Chamada =
  | { readonly k: 'T'; readonly tipo: OscillatorType; readonly f0: number; readonly f1?: number; readonly t: number; readonly vol: number; readonly quando?: number; readonly filtro?: { readonly tipo: BiquadFilterType; readonly f: number }; readonly atq?: number; readonly desafina?: number; readonly camada: Camada }
  | { readonly k: 'R'; readonly tipo: BiquadFilterType; readonly f0: number; readonly f1?: number; readonly Q: number; readonly t: number; readonly vol: number; readonly quando?: number; readonly atq?: number; readonly camada: Camada };

export interface AssinaturaEspecial {
  /** null = sem grito no início (PARADE, GARKUWA: o rival não é avisado). */
  readonly grito: Grito | null;
  readonly conjuracao: readonly Chamada[];
  /** Só nas chaves de projétil (o golpe tem `proj`). */
  readonly lancamento?: readonly Chamada[];
  /** `proj.style` do golpe: como o `projectile` não traz o golpe, ele sai de (id, ficha, style). */
  readonly estilo?: 'orb' | 'wave' | 'blade' | 'boomerang' | 'anel';
  /** Impacto do projétil OU camada sobre punch/kick no corpo a corpo. */
  readonly estampa: readonly Chamada[];
  readonly sucesso?: { readonly grito: Grito | null; readonly chamadas: readonly Chamada[] };
  /** MASHI: a estampa se repete `nivelCarga` vezes (a cada 70 ms). */
  readonly porNivel?: true;
  /** MASHI, evento `carga`: batidas por nível (índice 0 = nível 1). */
  readonly carga?: readonly (readonly Chamada[])[];
  /** HOERI CHAGI: fator do f0 da estampa por `hit.acertos` (1, 2, 3...). */
  readonly porAcerto?: readonly number[];
  /** ZENON: só com `dreno > 0`. */
  readonly comDreno?: readonly Chamada[];
  /** COUP D'ARRÊT: junto da estampa quando o `hit` é `contraEspecial`. */
  readonly contraEspecial?: readonly Chamada[];
  /** CENTELLA, evento `rebote` (mantém `land`). */
  readonly rebote?: readonly Chamada[];
  /** Ganho em dB por momento (início = o grito E a conjuração, e o sucesso; lançamento; estampa; o grito do FOUETTÉ segue a estampa), medido contra o som genérico que substitui (§6.3). */
  readonly ganhoDb?: { readonly inicio?: number; readonly lancamento?: number; readonly estampa?: number };
  /** FOUETTÉ: o golpe `sResp` que segue a PARADE. */
  readonly resposta?: { readonly golpe: string; readonly grito: Grito; readonly estampa: readonly Chamada[] };
}

/** Tudo o que o plano sonoro lê. `DADOS_SONS` (index.ts) é o real; os testes passam dados sintéticos. */
export interface DadosSons {
  readonly perfis: Readonly<Record<string, PerfilVocal>>;
  /** Sobreposição por ficha: chave `<id>.<ficha>` (SARPA). */
  readonly perfisPorFicha: Readonly<Record<string, Partial<PerfilVocal>>>;
  readonly assinaturas: Readonly<Record<string, AssinaturaEspecial>>;
}
