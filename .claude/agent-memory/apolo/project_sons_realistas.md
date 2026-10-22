---
name: project-sons-realistas
description: Sons de luta realistas — plano IA (Runway, bloqueada) virou bibliotecas CC0 (Kenney+OpenGameArt); pacote v1 curado (159 cortes, 0,78 MB, validado, ainda não ouvido); armadilhas de 7z, régua e ganho
metadata:
  type: project
---

Em 2026-10-22 o dono (testando no iPhone) pediu sons de luta REALISTAS por lutador e decidiu: samples gerados por IA na
Runway (revoga a D8 "100% sintetizado" só para estes sons). Plano em docs/plano-sons-realistas.md; quem gera é o Atlas (MCP
da Runway), eu curo, Vega integra.

**Why:** a síntese (seno + ruído, voz formante) soa eletrônica no alto-falante do iPhone, que corta abaixo de ~150 Hz.
Orçamento de créditos é fixo e sem recarga: teto do plano 60 (51 planejados + 9 de refação).

**How to apply:**
- Custo: efeito = ceil(duration) (omitir = 2; 0,5 s custa o mesmo que 1 s, então pedir 1). Fala eleven_v3 = ceil(car/50):
  um pacote de <= 50 caracteres com 4 vocalizações (kiai, leve, pesado, KO) = 1 crédito. Fala é a rota barata da voz.
- 3 camadas: foley compartilhado + voz por lutador + 1 família por estilo E1-E12 multiplicada por taxa/filtro; a assinatura
  sintetizada fica a -6 dB sob a família (senão os 3 especiais do lutador viram "o mesmo som transposto", régua R2b).
- Portão primeiro (soco, pacote de voz do HAYATO, kiai por efeito): decide qualidade E rota da voz antes de gastar.
- Curadoria: MP3 CBR mono 44,1k (iOS), 40 ms de silêncio em volta de cada corte (atraso do MP3 varia por navegador; a Vega
  acha o ataque no buffer), rmsDb/picoDb no manifesto para testar volume no Node. Gongo do KO e jingles ficam sintetizados.
- Licença do áudio gerado no plano gratuito NÃO conferida: nunca afirmar uso comercial liberado.

**Lote 0 medido (2026-10-22, docs/relatorio-lote0-sons.md):** soco REPROVADO (100% < 150 Hz, raia de 22 Hz, ataque truncado:
"low thump" puxa subgrave e "starts instantly" corta a entrada; refação sem os dois). Kiai sfx e fala APROVADOS na medida.
- A fala eleven_v3 rendeu 5 eventos (sobra 1 grunhido), vales a -86 dBFS; durações naturais PASSAM das faixas do §4.2 (truncar
  com saída longa) e o início é suave (40-141 ms): cortar no "início seco" = 10% do pico - 25 ms.
- Grito de IA é mais agudo (f0 ~400 Hz) e tem MENOS 150-500 Hz que a síntese: o ganho é irregularidade de tom e presença >300 Hz,
  não "corpo grave". Não prometer corpo.
- sfx sai ESTÉREO mesmo pedindo mono; MP3 da Runway traz cabeçalho LAME (atraso 1105 amostras).
**Pivô CC0 (2026-10-22, docs/pesquisa-sons-cc0.md):** a Runway gratuita bloqueou a geração; o dono escolheu bibliotecas
CC0. Recomendado: 19 itens / 34,7 MB, só Kenney + OpenGameArt (sem login). Freesound EXIGE login (fora); Sonniss não é CC0;
packs johncarroll no itch têm selo CC0 mas texto "incorporating is prohibited" = conflito, descartar. Sem CC0 bom para
tambores, berimbau, serpente, estepe, águia, órgão nem voz idosa: ficam na síntese. Toalhas do qubodup: txt interno antigo
contradiz a página (vale a página). Listar ZIP remoto sem baixar áudio: Range só no diretório central (script no scratchpad
da sessão, refazer se preciso); itch.io bloqueia curl sem User-Agent de navegador completo.
**Pacote v1 curado (2026-10-22, docs/relatorio-curadoria-sons.md):** 22 downloads exatos (SHA em cc0/ORIGEM-downloads.tsv),
159 cortes/88 ids/0,78 MB em arte-fonte/sons/pacote-v1, passa no validarManifesto REAL (src/data/sons/amostras.ts, contrato
da Vega: `taxa` por corte = identidade da voz no código; filtros só assados). Nada ouvido ainda: portão = dono no iPhone.
- O bsdtar do Windows NÃO abre 7z LZMA: usar curadoria-scripts/x7z.py (stdlib, python -I). Sem 7-Zip na máquina.
- Régua: Kenney impactPunch_heavy/impactSoft/footstep_wood reprovam sozinhos (68-100% < 150 Hz); toalha do qubodup por
  cima resolve (camadas ASSADAS no arquivo). Os sfx da Runway têm 77-100% < 150 Hz: perdem por medida.
- ganhoDb = RMS do sintético (render-cc0.test.ts) - RMS do MP3 decodificado; swing/esquiva/pouso sintéticos a -48/-52 dBFS
  batem no teto ±18 do validador (ficam 5-14 dB acima de hoje). Pesado com piso +2 dB sobre o leve (MIN-JI precisou +4,1).
- MP3 de agudos (florete) passa de 0 dBFS depois de codificar: medir o decodificado e baixar o corte (validador exige pico <= 0).
- Ferramenta: scripts em arte-fonte/sons/curadoria-scripts/ (lote0.mjs corta+normaliza+mede; render.test.ts renderiza a
  síntese via vitest com config no scratchpad). `ebur128` só imprime o M por quadro com `-v verbose`.
