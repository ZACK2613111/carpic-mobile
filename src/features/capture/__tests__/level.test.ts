import { isLevel, levelStatus, radToDeg, rollFromGravity } from '../level';

describe('levelStatus', () => {
  it('is "level" within ±2° (inclusive)', () => {
    expect(levelStatus(0)).toBe('level');
    expect(levelStatus(2)).toBe('level');
    expect(levelStatus(-2)).toBe('level');
    expect(levelStatus(1.9)).toBe('level');
  });

  it('is "close" between 2° and 6° (inclusive)', () => {
    expect(levelStatus(2.1)).toBe('close');
    expect(levelStatus(5)).toBe('close');
    expect(levelStatus(6)).toBe('close');
    expect(levelStatus(-4)).toBe('close');
  });

  it('is "off" beyond 6°', () => {
    expect(levelStatus(6.1)).toBe('off');
    expect(levelStatus(45)).toBe('off');
    expect(levelStatus(-90)).toBe('off');
  });

  it('respects custom tolerance / off thresholds', () => {
    expect(levelStatus(3, 4, 10)).toBe('level');
    expect(levelStatus(8, 4, 10)).toBe('close');
    expect(levelStatus(12, 4, 10)).toBe('off');
  });
});

describe('isLevel', () => {
  it('mirrors the ±2° default band', () => {
    expect(isLevel(0)).toBe(true);
    expect(isLevel(2)).toBe(true);
    expect(isLevel(-2)).toBe(true);
    expect(isLevel(2.1)).toBe(false);
    expect(isLevel(-2.1)).toBe(false);
  });

  it('respects a custom tolerance', () => {
    expect(isLevel(4, 5)).toBe(true);
    expect(isLevel(6, 5)).toBe(false);
  });
});

describe('radToDeg', () => {
  it('converts radians to degrees', () => {
    expect(radToDeg(Math.PI)).toBeCloseTo(180);
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
    expect(radToDeg(0)).toBe(0);
  });
});

describe('rollFromGravity', () => {
  it('reads ~0° when the phone is upright in portrait (x≈0)', () => {
    expect(rollFromGravity(0, 9.8)).toBeCloseTo(0);
  });

  it('reads ~90° when fully rolled onto its side', () => {
    expect(rollFromGravity(9.8, 0)).toBeCloseTo(90);
    expect(rollFromGravity(-9.8, 0)).toBeCloseTo(-90);
  });

  it('is signed by tilt direction', () => {
    expect(rollFromGravity(1, 9.8)).toBeGreaterThan(0);
    expect(rollFromGravity(-1, 9.8)).toBeLessThan(0);
  });
});
