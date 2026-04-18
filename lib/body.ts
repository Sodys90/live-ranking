// Tabulka IV - body za umístění v turnajích jednotlivců
// Sloupce: V, F, SF, 8, 16, 32, 64, 128
export const TABULKA_IV: Record<number, number[]> = {
  1:  [10,  7,  5,  4,  3,  2,  1,  0],
  2:  [15, 11,  7,  5,  4,  3,  2,  0],
  3:  [20, 14, 10,  7,  5,  4,  3,  0],
  4:  [30, 20, 14, 10,  7,  5,  4,  0],
  5:  [40, 27, 19, 13,  9,  6,  4,  0],
  6:  [50, 34, 23, 16, 11,  8,  5,  3],
  7:  [60, 41, 28, 19, 13,  9,  6,  4],
  8:  [80, 55, 38, 25, 17, 12,  8,  6],
  9:  [100, 69, 48, 33, 22, 15, 10,  7],
  10: [120, 82, 57, 39, 27, 18, 12,  8],
  11: [170,117, 81, 56, 39, 27, 19, 13],
  12: [200,138, 96, 67, 47, 33, 23, 16],
  13: [230,159,110, 76, 53, 37, 26, 18],
  14: [260,180,125, 87, 60, 42, 29, 20],
  15: [300,207,143, 99, 69, 48, 34, 23],
  16: [340,235,163,113, 78, 54, 38, 26],
  17: [380,263,182,126, 87, 60, 42, 29],
  18: [420,290,200,138, 96, 67, 47, 32],
  19: [460,318,220,152,105, 73, 51, 35],
  20: [500,345,238,165,114, 79, 55, 38],
  21: [600,414,286,198,137, 95, 66, 46],
}

export const UMISTENI = ["V", "F", "SF", "8", "16", "32", "64", "128"]
export const UMISTENI_LABELS: Record<string, string> = {
  V: "Vítěz", F: "Finále", SF: "Semifinále",
  "8": "Čtvrtfinále", "16": "Top 16", "32": "Top 32",
  "64": "Top 64", "128": "Top 128",
}

export function getBody(kategorie: number, umisteni: string): number {
  const radek = TABULKA_IV[kategorie]
  if (!radek) return 0
  const idx = UMISTENI.indexOf(umisteni)
  if (idx === -1) return 0
  return radek[idx] ?? 0
}

// Čtyřhra: body o dvě kola zpět (Článek 16)
export function getBodyCtyrhra(kategorie: number, umisteni: string): number {
  const idx = UMISTENI.indexOf(umisteni)
  if (idx === -1) return 0
  const idxCtyrhra = idx + 2  // o dvě kola zpět
  if (idxCtyrhra >= UMISTENI.length) return 1
  return TABULKA_IV[kategorie]?.[idxCtyrhra] ?? 0
}

// Typy turnajů a jejich kategorie
export const TYPY_TURNAJU = [
  // Mladší žactvo (do 12)
  { typ: "TEJT v ČR",        kategorie: 12, vk: ["mladsi-zaci","mladsi-zakyne"] },
  // Starší žactvo (do 14)
  { typ: "TEJT 3",           kategorie: 11, vk: ["starsi-zaci","starsi-zakyne"] },
  { typ: "TEJT 2",           kategorie: 13, vk: ["starsi-zaci","starsi-zakyne"] },
  { typ: "TEJT 1",           kategorie: 14, vk: ["starsi-zaci","starsi-zakyne"] },
  { typ: "TEJT S",           kategorie: 15, vk: ["starsi-zaci","starsi-zakyne"] },
  { typ: "ME do 13 let",     kategorie: 12, vk: ["starsi-zaci","starsi-zakyne"] },
  { typ: "EJT Jun. Masters", kategorie: 15, vk: ["starsi-zaci","starsi-zakyne"] },
  { typ: "ME + Orange Bowl", kategorie: 16, vk: ["starsi-zaci","starsi-zakyne"] },
  // Dorost (do 16 - TEJT)
  { typ: "TEJT 3",           kategorie:  8, vk: ["dorostenci","dorostenky"] },
  { typ: "TEJT 2",           kategorie:  9, vk: ["dorostenci","dorostenky"] },
  { typ: "TEJT 1",           kategorie: 10, vk: ["dorostenci","dorostenky"] },
  { typ: "TEJT S",           kategorie: 11, vk: ["dorostenci","dorostenky"] },
  { typ: "Masters",          kategorie: 12, vk: ["dorostenci","dorostenky"] },
  { typ: "ME",               kategorie: 13, vk: ["dorostenci","dorostenky"] },
  // Dorost ITF do 18
  { typ: "ITF J30",          kategorie: 12, vk: ["dorostenci","dorostenky"] },
  { typ: "ITF J60",          kategorie: 13, vk: ["dorostenci","dorostenky"] },
  { typ: "ITF J100",         kategorie: 14, vk: ["dorostenci","dorostenky"] },
  { typ: "ITF J200",         kategorie: 15, vk: ["dorostenci","dorostenky"] },
  { typ: "ITF J300",         kategorie: 16, vk: ["dorostenci","dorostenky"] },
  { typ: "ITF J500 / ME",    kategorie: 17, vk: ["dorostenci","dorostenky"] },
  { typ: "Grand Slam",       kategorie: 21, vk: ["dorostenci","dorostenky"] },
]
