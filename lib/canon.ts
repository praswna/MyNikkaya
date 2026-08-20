import type { Quote } from "./types";

// =============================================
// 불교 경전 맵 (삼장 구조)
//
// 빠알리 삼장(Tipiṭaka)의 정식 계층을 정적 데이터로 담는다.
// 앱이 가진 명언은 본문 머리의 경 번호(MN 2, SN 12.15 …)를 파싱해
// 이 트리 위에 얹는다.
//
// 경을 추가하고 싶으면 CANON 아래 children 배열에 노드를 넣으면 된다.
// nikaya + from~to 범위가 있는 노드에 해당 번호의 명언이 자동으로 붙는다.
// =============================================

export type Nikaya = "DN" | "MN" | "SN" | "AN" | "KN";

export interface CanonNode {
  id: string;
  ko: string;
  pali?: string;
  note?: string; // 범위 표기 (예: "MN 1–50")
  nikaya?: Nikaya; // 이 노드가 담당하는 니까야
  from?: number; // 담당 번호 범위 (SN은 상응 번호, MN/DN은 경 번호, AN은 모음 번호)
  to?: number;
  children?: CanonNode[];
}

// 상응부 5편의 상응(saṁyutta) 목록
function sn(n: number, ko: string, pali: string): CanonNode {
  return { id: `sn-${n}`, ko, pali, note: `SN ${n}`, nikaya: "SN", from: n, to: n };
}

// 중부의 품(vagga)
function mn(id: string, ko: string, pali: string, from: number, to: number): CanonNode {
  return { id, ko, pali, note: `MN ${from}–${to}`, nikaya: "MN", from, to };
}

export const CANON: CanonNode = {
  id: "tipitaka",
  ko: "삼장",
  pali: "tipiṭaka",
  children: [
    {
      id: "vinaya",
      ko: "율장",
      pali: "vinayapiṭaka",
      children: [
        { id: "vin-sutta", ko: "경분별", pali: "suttavibhaṅga" },
        {
          id: "vin-khandhaka",
          ko: "건도부",
          pali: "khandhaka",
          children: [
            { id: "vin-maha", ko: "대품", pali: "mahāvagga" },
            { id: "vin-culla", ko: "소품", pali: "cullavagga" },
          ],
        },
        { id: "vin-parivara", ko: "부수", pali: "parivāra" },
      ],
    },
    {
      id: "sutta",
      ko: "경장",
      pali: "suttapiṭaka",
      children: [
        {
          id: "dn",
          ko: "장부",
          pali: "dīghanikāya",
          note: "34경",
          nikaya: "DN",
          from: 1,
          to: 34,
          children: [
            { id: "dn-sila", ko: "계온품", pali: "sīlakkhandhavagga", note: "DN 1–13", nikaya: "DN", from: 1, to: 13 },
            { id: "dn-maha", ko: "대품", pali: "mahāvagga", note: "DN 14–23", nikaya: "DN", from: 14, to: 23 },
            { id: "dn-patika", ko: "빠띠까품", pali: "pāthikavagga", note: "DN 24–34", nikaya: "DN", from: 24, to: 34 },
          ],
        },
        {
          id: "mn",
          ko: "중부",
          pali: "majjhimanikāya",
          note: "152경",
          nikaya: "MN",
          from: 1,
          to: 152,
          children: [
            {
              id: "mn-mula",
              ko: "근본-오십개-묶음",
              pali: "mūlapaṇṇāsa",
              note: "MN 1–50",
              nikaya: "MN",
              from: 1,
              to: 50,
              children: [
                mn("mn-v1", "근본법문품", "mūlapariyāyavagga", 1, 10),
                mn("mn-v2", "사자후품", "sīhanādavagga", 11, 20),
                mn("mn-v3", "비유법문품", "opammavagga", 21, 30),
                mn("mn-v4", "대쌍품", "mahāyamakavagga", 31, 40),
                mn("mn-v5", "소쌍품", "cūḷayamakavagga", 41, 50),
              ],
            },
            {
              id: "mn-majjhima",
              ko: "중간-오십개-묶음",
              pali: "majjhimapaṇṇāsa",
              note: "MN 51–100",
              nikaya: "MN",
              from: 51,
              to: 100,
              children: [
                mn("mn-v6", "장자품", "gahapativagga", 51, 60),
                mn("mn-v7", "비구품", "bhikkhuvagga", 61, 70),
                mn("mn-v8", "유행자품", "paribbājakavagga", 71, 80),
                mn("mn-v9", "왕품", "rājavagga", 81, 90),
                mn("mn-v10", "바라문품", "brāhmaṇavagga", 91, 100),
              ],
            },
            {
              id: "mn-upari",
              ko: "뒤-오십개-묶음",
              pali: "uparipaṇṇāsa",
              note: "MN 101–152",
              nikaya: "MN",
              from: 101,
              to: 152,
              children: [
                mn("mn-v11", "천비품", "devadahavagga", 101, 110),
                mn("mn-v12", "차례품", "anupadavagga", 111, 120),
                mn("mn-v13", "공품", "suññatavagga", 121, 130),
                mn("mn-v14", "분별품", "vibhaṅgavagga", 131, 142),
                mn("mn-v15", "육처품", "saḷāyatanavagga", 143, 152),
              ],
            },
          ],
        },
        {
          id: "sn",
          ko: "상응부",
          pali: "saṁyuttanikāya",
          note: "56상응",
          nikaya: "SN",
          from: 1,
          to: 56,
          children: [
            {
              id: "sn-sagatha",
              ko: "게송-편",
              pali: "sagāthāvagga",
              note: "SN 1–11",
              nikaya: "SN",
              from: 1,
              to: 11,
              children: [
                sn(1, "천신-상응", "devatāsaṁyutta"),
                sn(2, "천자-상응", "devaputtasaṁyutta"),
                sn(3, "꼬살라-상응", "kosalasaṁyutta"),
                sn(4, "마라-상응", "mārasaṁyutta"),
                sn(5, "비구니-상응", "bhikkhunīsaṁyutta"),
                sn(6, "범천-상응", "brahmasaṁyutta"),
                sn(7, "바라문-상응", "brāhmaṇasaṁyutta"),
                sn(8, "왕기사-상응", "vaṅgīsasaṁyutta"),
                sn(9, "숲-상응", "vanasaṁyutta"),
                sn(10, "야차-상응", "yakkhasaṁyutta"),
                sn(11, "제석-상응", "sakkasaṁyutta"),
              ],
            },
            {
              id: "sn-nidana",
              ko: "인연-편",
              pali: "nidānavagga",
              note: "SN 12–21",
              nikaya: "SN",
              from: 12,
              to: 21,
              children: [
                sn(12, "인연-상응", "nidānasaṁyutta"),
                sn(13, "현관-상응", "abhisamayasaṁyutta"),
                sn(14, "계-상응", "dhātusaṁyutta"),
                sn(15, "시작없음-상응", "anamataggasaṁyutta"),
                sn(16, "깟사빠-상응", "kassapasaṁyutta"),
                sn(17, "이득과공경-상응", "lābhasakkārasaṁyutta"),
                sn(18, "라훌라-상응", "rāhulasaṁyutta"),
                sn(19, "락카나-상응", "lakkhaṇasaṁyutta"),
                sn(20, "비유-상응", "opammasaṁyutta"),
                sn(21, "비구-상응", "bhikkhusaṁyutta"),
              ],
            },
            {
              id: "sn-khandha",
              ko: "무더기-편",
              pali: "khandhavagga",
              note: "SN 22–34",
              nikaya: "SN",
              from: 22,
              to: 34,
              children: [
                sn(22, "무더기-상응", "khandhasaṁyutta"),
                sn(23, "라다-상응", "rādhasaṁyutta"),
                sn(24, "견해-상응", "diṭṭhisaṁyutta"),
                sn(25, "들어감-상응", "okkantasaṁyutta"),
                sn(26, "일어남-상응", "uppādasaṁyutta"),
                sn(27, "오염-상응", "kilesasaṁyutta"),
                sn(28, "사리뿟따-상응", "sāriputtasaṁyutta"),
                sn(29, "용-상응", "nāgasaṁyutta"),
                sn(30, "금시조-상응", "supaṇṇasaṁyutta"),
                sn(31, "간답바-상응", "gandhabbakāyasaṁyutta"),
                sn(32, "구름-상응", "valāhakasaṁyutta"),
                sn(33, "왓차곳따-상응", "vacchagottasaṁyutta"),
                sn(34, "선정-상응", "jhānasaṁyutta"),
              ],
            },
            {
              id: "sn-salayatana",
              ko: "육처-편",
              pali: "saḷāyatanavagga",
              note: "SN 35–44",
              nikaya: "SN",
              from: 35,
              to: 44,
              children: [
                sn(35, "육처-상응", "saḷāyatanasaṁyutta"),
                sn(36, "느낌-상응", "vedanāsaṁyutta"),
                sn(37, "여인-상응", "mātugāmasaṁyutta"),
                sn(38, "잠부카다까-상응", "jambukhādakasaṁyutta"),
                sn(39, "사만다까-상응", "sāmaṇḍakasaṁyutta"),
                sn(40, "목갈라나-상응", "moggallānasaṁyutta"),
                sn(41, "찟따-상응", "cittasaṁyutta"),
                sn(42, "촌장-상응", "gāmaṇisaṁyutta"),
                sn(43, "무위-상응", "asaṅkhatasaṁyutta"),
                sn(44, "설명하지않음-상응", "abyākatasaṁyutta"),
              ],
            },
            {
              id: "sn-maha",
              ko: "대-편",
              pali: "mahāvagga",
              note: "SN 45–56",
              nikaya: "SN",
              from: 45,
              to: 56,
              children: [
                sn(45, "도-상응", "maggasaṁyutta"),
                sn(46, "각지-상응", "bojjhaṅgasaṁyutta"),
                sn(47, "염처-상응", "satipaṭṭhānasaṁyutta"),
                sn(48, "기능-상응", "indriyasaṁyutta"),
                sn(49, "바른노력-상응", "sammappadhānasaṁyutta"),
                sn(50, "힘-상응", "balasaṁyutta"),
                sn(51, "신족-상응", "iddhipādasaṁyutta"),
                sn(52, "아누룻다-상응", "anuruddhasaṁyutta"),
                sn(53, "선정-상응", "jhānasaṁyutta"),
                sn(54, "호흡-상응", "ānāpānasaṁyutta"),
                sn(55, "예류-상응", "sotāpattisaṁyutta"),
                sn(56, "진리-상응", "saccasaṁyutta"),
              ],
            },
          ],
        },
        {
          id: "an",
          ko: "증지부",
          pali: "aṅguttaranikāya",
          note: "11모음",
          nikaya: "AN",
          from: 1,
          to: 11,
          children: [
            { id: "an-1", ko: "하나-모음", pali: "ekakanipāta", note: "AN 1", nikaya: "AN", from: 1, to: 1 },
            { id: "an-2", ko: "둘-모음", pali: "dukanipāta", note: "AN 2", nikaya: "AN", from: 2, to: 2 },
            { id: "an-3", ko: "셋-모음", pali: "tikanipāta", note: "AN 3", nikaya: "AN", from: 3, to: 3 },
            { id: "an-4", ko: "넷-모음", pali: "catukkanipāta", note: "AN 4", nikaya: "AN", from: 4, to: 4 },
            { id: "an-5", ko: "다섯-모음", pali: "pañcakanipāta", note: "AN 5", nikaya: "AN", from: 5, to: 5 },
            { id: "an-6", ko: "여섯-모음", pali: "chakkanipāta", note: "AN 6", nikaya: "AN", from: 6, to: 6 },
            { id: "an-7", ko: "일곱-모음", pali: "sattakanipāta", note: "AN 7", nikaya: "AN", from: 7, to: 7 },
            { id: "an-8", ko: "여덟-모음", pali: "aṭṭhakanipāta", note: "AN 8", nikaya: "AN", from: 8, to: 8 },
            { id: "an-9", ko: "아홉-모음", pali: "navakanipāta", note: "AN 9", nikaya: "AN", from: 9, to: 9 },
            { id: "an-10", ko: "열-모음", pali: "dasakanipāta", note: "AN 10", nikaya: "AN", from: 10, to: 10 },
            { id: "an-11", ko: "열하나-모음", pali: "ekādasakanipāta", note: "AN 11", nikaya: "AN", from: 11, to: 11 },
          ],
        },
        {
          id: "kn",
          ko: "소부",
          pali: "khuddakanikāya",
          note: "15부",
          nikaya: "KN",
          from: 1,
          to: 999,
          children: [
            { id: "kn-khp", ko: "소송경", pali: "khuddakapāṭha" },
            { id: "kn-dhp", ko: "법구경", pali: "dhammapada" },
            { id: "kn-ud", ko: "자설경", pali: "udāna" },
            { id: "kn-iti", ko: "여시어경", pali: "itivuttaka" },
            { id: "kn-snp", ko: "경집", pali: "suttanipāta" },
            { id: "kn-vv", ko: "천궁사", pali: "vimānavatthu" },
            { id: "kn-pv", ko: "아귀사", pali: "petavatthu" },
            { id: "kn-thag", ko: "장로게", pali: "theragāthā" },
            { id: "kn-thig", ko: "장로니게", pali: "therīgāthā" },
            { id: "kn-ja", ko: "본생담", pali: "jātaka" },
            { id: "kn-nd", ko: "의석", pali: "niddesa" },
            { id: "kn-ps", ko: "무애해도", pali: "paṭisambhidāmagga" },
            { id: "kn-ap", ko: "비유경", pali: "apadāna" },
            { id: "kn-bv", ko: "불종성경", pali: "buddhavaṁsa" },
            { id: "kn-cp", ko: "소행장", pali: "cariyāpiṭaka" },
          ],
        },
      ],
    },
    {
      id: "abhidhamma",
      ko: "논장",
      pali: "abhidhammapiṭaka",
      note: "7론",
      children: [
        { id: "ab-1", ko: "법집론", pali: "dhammasaṅgaṇī" },
        { id: "ab-2", ko: "분별론", pali: "vibhaṅga" },
        { id: "ab-3", ko: "계론", pali: "dhātukathā" },
        { id: "ab-4", ko: "인시설론", pali: "puggalapaññatti" },
        { id: "ab-5", ko: "논사", pali: "kathāvatthu" },
        { id: "ab-6", ko: "쌍론", pali: "yamaka" },
        { id: "ab-7", ko: "발취론", pali: "paṭṭhāna" },
      ],
    },
  ],
};

// =============================================
// 본문에서 경 번호 뽑아내기
// =============================================

export interface SuttaRef {
  nikaya: Nikaya;
  major: number | null; // SN은 상응 번호, MN/DN은 경 번호, AN은 모음 번호
  minor: number | null; // SN의 경 번호
}

// 한글 니까야 표기 → 코드
const NIKAYA_ALIASES: [string, Nikaya][] = [
  ["장부", "DN"], ["디가", "DN"], ["장아함", "DN"],
  ["중부", "MN"], ["맛지마", "MN"], ["마지마", "MN"], ["중아함", "MN"],
  ["상응부", "SN"], ["상윳따", "SN"], ["상윳타", "SN"], ["쌍윳따", "SN"], ["잡아함", "SN"],
  ["증지부", "AN"], ["앙굿따라", "AN"], ["앙굿타라", "AN"], ["증일아함", "AN"],
  ["소부", "KN"], ["쿳다까", "KN"],
];

// 상응 이름만 적혀 있고 번호가 없을 때 쓰는 보조 표
const SAMYUTTA_ALIASES: [string, number][] = [
  ["연기", 12], ["인연", 12],
  ["무더기", 22], ["온 ", 22],
  ["육처", 35],
  ["느낌", 36],
  ["도-", 45],
  ["각지", 46], ["보장가", 46],
  ["염처", 47],
];

// 경 제목만으로 위치를 알 수 있는 것들 (번호 표기가 없는 자료용)
const TITLE_ALIASES: [string, SuttaRef][] = [
  ["대인연경", { nikaya: "DN", major: 15, minor: null }],
  ["마하니다나", { nikaya: "DN", major: 15, minor: null }],
];

// 본문 머리의 [[ ]] 블록만 훑는다. 없으면 앞부분만 본다.
function headerOf(text: string): string {
  const blocks = text.match(/\[\[([\s\S]*?)\]\]/g);
  if (blocks && blocks.length > 0) return blocks.slice(0, 4).join("\n");
  return text.slice(0, 200);
}

export function parseSuttaRef(text: string): SuttaRef | null {
  const header = headerOf(text);

  // MN 2 / SN 22.59 / sn12.23 형태
  const latin = header.match(/\b(DN|MN|SN|AN|KN)\s*\.?\s*(\d+)(?:\s*[.:]\s*(\d+))?/i);
  if (latin) {
    return {
      nikaya: latin[1].toUpperCase() as Nikaya,
      major: parseInt(latin[2], 10),
      minor: latin[3] ? parseInt(latin[3], 10) : null,
    };
  }

  // 상윳따-니카야 12.15 형태
  for (const [alias, nikaya] of NIKAYA_ALIASES) {
    const at = header.indexOf(alias);
    if (at < 0) continue;
    const tail = header.slice(at, at + 60);
    const num = tail.match(/(\d+)(?:\s*[.:]\s*(\d+))?/);
    if (num) {
      return {
        nikaya,
        major: parseInt(num[1], 10),
        minor: num[2] ? parseInt(num[2], 10) : null,
      };
    }
    // 번호 없이 상응 이름만 있는 경우
    if (nikaya === "SN") {
      for (const [name, no] of SAMYUTTA_ALIASES) {
        if (header.includes(name)) return { nikaya: "SN", major: no, minor: null };
      }
    }
    return { nikaya, major: null, minor: null };
  }

  // 제목으로 찾기
  const plain = header.replace(/\{[^}]*\}/g, "");
  for (const [title, ref] of TITLE_ALIASES) {
    if (plain.includes(title)) return ref;
  }

  return null;
}

export function formatRef(ref: SuttaRef): string {
  if (ref.major === null) return ref.nikaya;
  if (ref.minor === null) return `${ref.nikaya} ${ref.major}`;
  return `${ref.nikaya} ${ref.major}.${ref.minor}`;
}

// 본문 머리에서 경 이름을 뽑는다. 못 찾으면 카테고리를 쓴다.
export function extractSuttaTitle(quote: Quote): string {
  const blocks = [...quote.text.matchAll(/\[\[([\s\S]*?)\]\]/g)].map((m) =>
    m[1].replace(/\{[^}]*\}/g, "").replace(/\s+/g, " ").trim()
  );
  for (let i = blocks.length - 1; i >= 0; i--) {
    // 제목 앞에 붙은 경 번호(MN 18 …)는 따로 표시하므로 떼어낸다
    const b = blocks[i].replace(/^(DN|MN|SN|AN|KN)\s*\.?\s*\d+(?:\s*[.:]\s*\d+)?\s*/i, "").trim();
    if (!b) continue;
    if (/경$/.test(b) && b.length <= 30) return b;
  }
  return quote.category;
}

// =============================================
// 명언을 트리에 얹기
// =============================================

export interface CanonPlacement {
  quote: Quote;
  ref: SuttaRef | null;
  title: string;
}

export interface CanonIndex {
  /** 노드 id → 그 노드에 직접 붙은 명언들 */
  byNode: Record<string, CanonPlacement[]>;
  /** 노드 id → 자기 자신 + 하위 전체의 명언 수 */
  subtreeCount: Record<string, number>;
  /** 경 번호를 찾지 못한 명언들 */
  unplaced: CanonPlacement[];
  ownedTotal: number;
}

// 주어진 번호를 담당하는 가장 깊은 노드를 찾는다.
function deepestMatch(node: CanonNode, ref: SuttaRef): CanonNode | null {
  const covers =
    node.nikaya === ref.nikaya &&
    (ref.major === null ||
      (node.from !== undefined && node.to !== undefined && ref.major >= node.from && ref.major <= node.to));

  if (!covers) {
    // 이 노드가 담당하지 않아도 하위에 담당 노드가 있을 수 있다 (경장 같은 중간 노드)
    if (node.nikaya === undefined && node.children) {
      for (const child of node.children) {
        const found = deepestMatch(child, ref);
        if (found) return found;
      }
    }
    return null;
  }

  if (node.children) {
    for (const child of node.children) {
      const found = deepestMatch(child, ref);
      if (found) return found;
    }
  }
  return node;
}

export function buildCanonIndex(quotes: Quote[]): CanonIndex {
  const byNode: Record<string, CanonPlacement[]> = {};
  const unplaced: CanonPlacement[] = [];

  for (const quote of quotes) {
    const ref = parseSuttaRef(quote.text);
    const placement: CanonPlacement = { quote, ref, title: extractSuttaTitle(quote) };
    const node = ref ? deepestMatch(CANON, ref) : null;
    if (node) {
      (byNode[node.id] ??= []).push(placement);
    } else {
      unplaced.push(placement);
    }
  }

  const subtreeCount: Record<string, number> = {};
  const walk = (node: CanonNode): number => {
    let total = byNode[node.id]?.length ?? 0;
    if (node.children) for (const child of node.children) total += walk(child);
    subtreeCount[node.id] = total;
    return total;
  };
  walk(CANON);

  return {
    byNode,
    subtreeCount,
    unplaced,
    ownedTotal: quotes.length - unplaced.length,
  };
}

// 보유한 명언이 있는 노드의 조상들을 모두 펼치기 위한 id 집합
export function expandedIdsFor(index: CanonIndex): Set<string> {
  const ids = new Set<string>();
  const walk = (node: CanonNode, ancestors: string[]) => {
    if ((index.subtreeCount[node.id] ?? 0) > 0) {
      for (const a of ancestors) ids.add(a);
      ids.add(node.id);
    }
    if (node.children) for (const child of node.children) walk(child, [...ancestors, node.id]);
  };
  walk(CANON, []);
  return ids;
}
