import { isValidEmail } from '../validation';

describe('isValidEmail', () => {
  it('accepts normal addresses (trimming whitespace)', () => {
    expect(isValidEmail('you@dealer.com')).toBe(true);
    expect(isValidEmail('  a.b+c@sub.example.co  ')).toBe(true);
  });

  it('rejects obvious typos', () => {
    for (const bad of ['', 'nope', 'a@b', 'a@b.', '@x.com', 'a b@x.com', 'a@x .com', 'a@@b.com']) {
      expect(isValidEmail(bad)).toBe(false);
    }
  });
});
