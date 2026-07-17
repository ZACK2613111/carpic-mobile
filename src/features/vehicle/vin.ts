// Offline VIN decoder. The VIN is the one piece of vehicle data we always have
// (stamped on the windshield / door jamb), and its structure is an ISO standard
// — so we can surface year / make / region with ZERO network or third-party
// API. Best-effort by design: the WMI table covers the makes common in Algeria
// (Renault, Dacia, Peugeot, VW, Hyundai, Kia, Toyota…), unknowns degrade to the
// raw WMI rather than guessing wrong.

export type VinInfo = {
  vin: string;
  valid: boolean;
  /** First 3 chars — World Manufacturer Identifier. */
  wmi: string;
  make?: string;
  year?: number;
  region?: string;
};

// I, O, Q are never valid in a VIN (look-alikes for 1, 0). 17 chars total.
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

export function normalizeVin(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '').replace(/[IOQ]/g, '');
}

export function isValidVinFormat(vin: string): boolean {
  return VIN_RE.test(vin);
}

// Position 10 → model year. The code repeats on a 30-year cycle, so we
// disambiguate with position 7: alphabetic there means 2010+, numeric means the
// 1980–2009 range (per the ISO convention).
const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';

function decodeYear(vin: string): number | undefined {
  const code = vin[9];
  const idx = YEAR_CODES.indexOf(code);
  if (idx < 0) return undefined;
  const modern = 2010 + idx; // A=2010 … 9=2039
  const legacy = 1980 + idx; // A=1980 … 9=2009
  const pos7Alpha = /[A-Z]/.test(vin[6]);
  return pos7Alpha ? modern : legacy;
}

// First char → broad origin. Coarse but standards-correct grouping.
const REGION_BY_FIRST: Record<string, string> = {
  A: 'Africa', B: 'Africa', C: 'Africa', D: 'Africa', E: 'Africa', F: 'Africa', G: 'Africa', H: 'Africa',
  J: 'Japan', K: 'Korea', L: 'China', M: 'India', N: 'Turkey/Asia', P: 'Asia', R: 'Asia',
  S: 'Europe', T: 'Europe', U: 'Europe', V: 'Europe', W: 'Germany', X: 'Europe', Y: 'Europe', Z: 'Italy',
  '1': 'USA', '2': 'Canada', '3': 'Mexico', '4': 'USA', '5': 'USA',
  '6': 'Oceania', '7': 'Oceania', '8': 'South America', '9': 'South America',
};

// WMI (first 3) → make. Prefix match; covers the Algerian fleet's common brands.
const WMI_MAKES: Record<string, string> = {
  VF1: 'Renault', VF2: 'Renault', VF3: 'Peugeot', VF7: 'Citroën', VF6: 'Renault',
  UU1: 'Dacia', UU5: 'Dacia', UU6: 'Dacia',
  WVW: 'Volkswagen', WV1: 'Volkswagen', WV2: 'Volkswagen', WVG: 'Volkswagen', '1VW': 'Volkswagen',
  WAU: 'Audi', TRU: 'Audi',
  WBA: 'BMW', WBS: 'BMW', '4US': 'BMW',
  WDB: 'Mercedes-Benz', WDD: 'Mercedes-Benz', WDC: 'Mercedes-Benz', W1K: 'Mercedes-Benz', W1N: 'Mercedes-Benz',
  WME: 'Smart', WMW: 'Mini',
  W0L: 'Opel', W0V: 'Opel', W0R: 'Opel',
  VSS: 'SEAT', VSA: 'SEAT',
  TMB: 'Škoda', TMP: 'Škoda',
  ZFA: 'Fiat', ZFF: 'Ferrari', ZAR: 'Alfa Romeo', ZLA: 'Lancia',
  KNA: 'Kia', KNB: 'Kia', KND: 'Kia', KNE: 'Kia',
  KMH: 'Hyundai', KMF: 'Hyundai', KMJ: 'Hyundai', TMA: 'Hyundai', NLH: 'Hyundai',
  JHM: 'Honda', SHH: 'Honda',
  JTD: 'Toyota', JTM: 'Toyota', JTN: 'Toyota', SB1: 'Toyota', VNK: 'Toyota', MR0: 'Toyota',
  JN1: 'Nissan', JN6: 'Nissan', VSK: 'Nissan', SJN: 'Nissan',
  MA3: 'Suzuki', TSM: 'Suzuki', JSA: 'Suzuki',
  VF8: 'Chevrolet', KL1: 'Chevrolet', KL3: 'Chevrolet',
  UNY: 'Kia', U5Y: 'Kia', U6Y: 'Kia',
};

function decodeMake(wmi: string): string | undefined {
  if (WMI_MAKES[wmi]) return WMI_MAKES[wmi];
  // Some manufacturers share a 2-char prefix across models.
  const two = wmi.slice(0, 2);
  const hit = Object.keys(WMI_MAKES).find((k) => k.startsWith(two) && k.slice(0, 2) === two);
  return hit ? WMI_MAKES[hit] : undefined;
}

export function decodeVin(input: string): VinInfo {
  const vin = normalizeVin(input);
  const valid = isValidVinFormat(vin);
  const wmi = vin.slice(0, 3);
  if (!valid) return { vin, valid: false, wmi };
  return {
    vin,
    valid: true,
    wmi,
    make: decodeMake(wmi),
    year: decodeYear(vin),
    region: REGION_BY_FIRST[vin[0]],
  };
}

/** One-line human summary, e.g. "2018 · Renault · Europe". Empty if nothing decoded. */
export function vinSummary(info: VinInfo): string {
  return [info.year, info.make, info.region].filter(Boolean).join(' · ');
}
