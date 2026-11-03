export interface SheetInfo {
  url: string;
  w: number;
  h: number;
}

export const SHEETS: Record<string, SheetInfo> = {
  covers: {
    url: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261029_010644_837e04ca-2418-45c1-b8e0-0233265c4cd5.png&w=1744&q=85',
    w: 1744,
    h: 2336,
  },
  spines: {
    url: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261029_010738_a3e47ead-18f2-4974-9468-06d16a25edc5.png&w=2688&q=85',
    w: 2688,
    h: 1152,
  },
  fix: {
    url: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261029_010831_3ebb874b-93dc-433e-87ed-6299aba720f0.png&w=1520&q=85',
    w: 1520,
    h: 2688,
  },
  fix2: {
    url: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261029_092020_f96bc094-db7b-46de-9298-074a24e0a3b8.png&w=1520&q=85',
    w: 1520,
    h: 2688,
  },
};

export type CropBox = [sheet: 'covers' | 'spines' | 'fix' | 'fix2', x: number, y: number, w: number, h: number];

export interface FilmItem {
  id: string;
  title: string;
  romaji: string;
  kanji: string;
  year: number;
  decade: '1950s' | '1960s' | '1970s' | '1980s';
  genre: string;
  minutes: number;
  synopsis: string;
  spineCrop: CropBox;
  coverCrop: CropBox;
}

export const FILMS: FilmItem[] = [
  {
    id: 'valley',
    title: 'The Silent Valley',
    romaji: 'SHIZUKANA TANI',
    kanji: '静かな谷',
    year: 1958,
    decade: '1950s',
    genre: 'Drama',
    minutes: 104,
    synopsis: 'A schoolteacher returns to the mountain village that exiled her father, and finds the valley has kept every one of its secrets.',
    spineCrop: ['spines', 266, 31, 189, 1089],
    coverCrop: ['covers', 497, 72, 344, 659],
  },
  {
    id: 'bluehour',
    title: 'The Blue Hour',
    romaji: 'AO NO TOKI',
    kanji: '青の刻',
    year: 1962,
    decade: '1960s',
    genre: 'Romance',
    minutes: 97,
    synopsis: 'Over one long evening in a harbour town, a widow and a stranger trade small lies until the light runs out.',
    spineCrop: ['spines', 492, 31, 189, 1089],
    coverCrop: ['covers', 914, 72, 342, 659],
  },
  {
    id: 'river',
    title: 'River of Salt',
    romaji: 'SHIO NO KAWA',
    kanji: '塩の川',
    year: 1964,
    decade: '1960s',
    genre: 'Drama',
    minutes: 121,
    synopsis: 'Two brothers drag a salt barge downriver to a city that no longer wants anything they carry.',
    spineCrop: ['fix', 197, 54, 324, 2566],
    coverCrop: ['covers', 1332, 72, 344, 659],
  },
  {
    id: 'summer',
    title: 'The Last Summer',
    romaji: 'SAIGO NO NATSU',
    kanji: '最後の夏',
    year: 1966,
    decade: '1960s',
    genre: 'Drama',
    minutes: 109,
    synopsis: 'The summer before the dam floods their village, three friends set fire to everything they cannot take with them.',
    spineCrop: ['spines', 937, 31, 188, 1089],
    coverCrop: ['covers', 74, 813, 344, 676],
  },
  {
    id: 'green',
    title: 'The Green Road',
    romaji: 'MIDORI NO MICHI',
    kanji: '緑の道',
    year: 1969,
    decade: '1960s',
    genre: 'Mystery',
    minutes: 101,
    synopsis: 'A surveyor mapping a forest road keeps finding the same footprints, always one day ahead of him.',
    spineCrop: ['spines', 1157, 31, 185, 1090],
    coverCrop: ['covers', 497, 815, 344, 674],
  },
  {
    id: 'noon',
    title: 'Noon in Ashes',
    romaji: 'HAI NO SHOGO',
    kanji: '灰の正午',
    year: 1971,
    decade: '1970s',
    genre: 'Western',
    minutes: 112,
    synopsis: 'A rider crosses a white desert to settle an old debt, and learns too late who sent him.',
    spineCrop: ['spines', 44, 32, 184, 1088],
    coverCrop: ['covers', 74, 72, 347, 659],
  },
  {
    id: 'observer',
    title: 'The Observer',
    romaji: 'KANSATSUSHA',
    kanji: '観察者',
    year: 1973,
    decade: '1970s',
    genre: 'Thriller',
    minutes: 96,
    synopsis: 'A night watchman begins to suspect that the building he guards has started watching him back.',
    spineCrop: ['fix2', 371, 15, 349, 2655],
    coverCrop: ['covers', 915, 815, 342, 675],
  },
  {
    id: 'birds',
    title: 'The Fallen Birds',
    romaji: 'OCHITA TORI',
    kanji: '落ちた鳥',
    year: 1975,
    decade: '1970s',
    genre: 'Drama',
    minutes: 118,
    synopsis: 'When the birds stop singing over a frontier town, the mayor\'s daughter is the only one who goes looking for the reason.',
    spineCrop: ['spines', 1573, 31, 183, 1089],
    coverCrop: ['covers', 1331, 815, 345, 675],
  },
  {
    id: 'storm',
    title: 'Light in the Storm',
    romaji: 'ARASHI NO HI',
    kanji: '嵐の灯',
    year: 1978,
    decade: '1970s',
    genre: 'Drama',
    minutes: 127,
    synopsis: 'A lighthouse keeper and his son wait out a three-day storm with a shipwrecked sailor who will not give his name.',
    spineCrop: ['fix2', 808, 15, 347, 2656],
    coverCrop: ['covers', 74, 1571, 345, 681],
  },
  {
    id: 'tide',
    title: 'The Long Tide',
    romaji: 'NAGAI SHIO',
    kanji: '長い潮',
    year: 1981,
    decade: '1980s',
    genre: 'Drama',
    minutes: 99,
    synopsis: 'A fisherman\'s wife counts the tides on the harbour wall while her husband\'s boat fails to come home.',
    spineCrop: ['spines', 2012, 31, 188, 1089],
    coverCrop: ['covers', 496, 1577, 343, 678],
  },
  {
    id: 'war',
    title: 'A Quiet War',
    romaji: 'SHIZUKANA SENSO',
    kanji: '静かな戦争',
    year: 1985,
    decade: '1980s',
    genre: 'Comedy',
    minutes: 103,
    synopsis: 'Two neighbours fight a silent war over a garden wall for thirty years, and neither will say how it began.',
    spineCrop: ['spines', 2236, 31, 189, 1089],
    coverCrop: ['covers', 913, 1579, 343, 676],
  },
  {
    id: 'door',
    title: 'Red Door',
    romaji: 'AKAI TOBIRA',
    kanji: '赤い扉',
    year: 1989,
    decade: '1980s',
    genre: 'Thriller',
    minutes: 114,
    synopsis: 'A projectionist follows a reel of unknown film through the corridors of a cinema on its final night.',
    spineCrop: ['spines', 2462, 31, 188, 1089],
    coverCrop: ['covers', 1331, 1579, 344, 677],
  },
];

export interface CropStyle {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
}

export function computeCropStyle(crop: CropBox): CropStyle {
  const [sheetKey, x, y, w, h] = crop;
  const sheet = SHEETS[sheetKey];
  const sizeX = (sheet.w / w) * 100;
  const sizeY = (sheet.h / h) * 100;
  const posX = sheet.w === w ? 0 : (x / (sheet.w - w)) * 100;
  const posY = sheet.h === h ? 0 : (y / (sheet.h - h)) * 100;

  return {
    backgroundImage: `url(${sheet.url})`,
    backgroundSize: `${sizeX}% ${sizeY}%`,
    backgroundPosition: `${posX}% ${posY}%`,
  };
}

export interface SvgPosterImageProps {
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeSvgPosterProps(crop: CropBox): SvgPosterImageProps {
  const [sheetKey, x, y, w, h] = crop;
  const sheet = SHEETS[sheetKey];
  return {
    href: sheet.url,
    x: (-x * 474) / w,
    y: (-y * 900) / h,
    width: (sheet.w * 474) / w,
    height: (sheet.h * 900) / h,
  };
}
