import { captureException, captureMessage, setReporter, type Reporter } from '../reporting';

describe('reporting seam', () => {
  it('routes captures through a swapped-in reporter', () => {
    const calls: unknown[][] = [];
    const mock: Reporter = {
      captureException: (e, extra) => calls.push(['ex', e, extra]),
      captureMessage: (m, extra) => calls.push(['msg', m, extra]),
    };
    setReporter(mock);

    const err = new Error('boom');
    captureException(err, { context: 'test' });
    captureMessage('hello');

    expect(calls).toEqual([
      ['ex', err, { context: 'test' }],
      ['msg', 'hello', undefined],
    ]);
  });
});
