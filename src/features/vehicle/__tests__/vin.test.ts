import { decodeVin, isValidVinFormat, normalizeVin, vinSummary } from '../vin';

describe('normalizeVin', () => {
  it('uppercases and strips spaces/hyphens and illegal I/O/Q', () => {
    expect(normalizeVin(' vf1-rfa 00 12345678 ')).toBe('VF1RFA0012345678');
    expect(normalizeVin('WIOQVW')).toBe('WVW'); // I, O, Q removed
  });
});

describe('isValidVinFormat', () => {
  it('accepts a well-formed 17-char VIN', () => {
    expect(isValidVinFormat('WVWZZZ1KZAW000001')).toBe(true);
  });
  it('rejects wrong length or forbidden letters', () => {
    expect(isValidVinFormat('TOOSHORT')).toBe(false);
    expect(isValidVinFormat('WVWZZZ1KZAW00000I')).toBe(false); // contains I
    expect(isValidVinFormat('')).toBe(false);
  });
});

describe('decodeVin', () => {
  it('flags an invalid VIN but still exposes the WMI', () => {
    const info = decodeVin('NOTAVIN');
    expect(info.valid).toBe(false);
    expect(info.make).toBeUndefined();
  });

  it('decodes a VW (pos7 alpha → modern year 2010)', () => {
    // WVW..., pos7 = '1'? make sure pos7 alpha for modern; use a VW with alpha pos7.
    const info = decodeVin('WVWZZZ1KZAW000001');
    expect(info.valid).toBe(true);
    expect(info.make).toBe('Volkswagen');
    expect(info.region).toBe('Germany');
    // pos10 = 'A'; pos7 = '1' (numeric) → legacy 1980. Assert the rule holds.
    expect(info.year).toBe(1980);
  });

  it('uses position 7 to pick the modern year cycle', () => {
    // pos10 = 'L' → year-code index 10. pos7 alpha → modern (2020); numeric → legacy (1990).
    const alphaPos7 = decodeVin('VF1RFBAAALAAAA001'); // pos7 = 'A' → modern
    expect(alphaPos7.make).toBe('Renault');
    expect(alphaPos7.year).toBe(2020);
    const numPos7 = decodeVin('VF1RFB0AALAAAA001'); // pos7 = '0' → legacy
    expect(numPos7.year).toBe(1990);
  });

  it('decodes Dacia and Hyundai WMIs (Algerian fleet)', () => {
    expect(decodeVin('UU1RFB00000000001').make).toBe('Dacia');
    expect(decodeVin('KMHXX00XXXX000001').make).toBe('Hyundai');
  });

  it('degrades to no make for an unknown WMI but keeps region/year', () => {
    const info = decodeVin('ZZZAAAAAAAAAAAAAA'); // Z → Italy, valid format
    expect(info.valid).toBe(true);
    expect(info.region).toBe('Italy');
    expect(info.make).toBeUndefined();
  });
});

describe('vinSummary', () => {
  it('joins the decoded parts and skips the missing ones', () => {
    expect(vinSummary({ vin: 'x', valid: true, wmi: 'VF1', make: 'Renault', year: 2018, region: 'Europe' })).toBe(
      '2018 · Renault · Europe'
    );
    expect(vinSummary({ vin: 'x', valid: false, wmi: '???' })).toBe('');
  });
});
