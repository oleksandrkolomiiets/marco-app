import { examResultMessage } from '@/exam/resultMessage';

describe('examResultMessage', () => {
  it('celebrates a pass', () => {
    expect(examResultMessage(true, 2)).toEqual({
      headline: '¡Vamos!',
      subLine: 'You passed. Rookie license unlocked.',
    });
  });

  it('celebrates a perfect score the same way', () => {
    expect(examResultMessage(true, 0).headline).toBe('¡Vamos!');
  });

  it('calls a near miss close', () => {
    const { headline, subLine } = examResultMessage(false, 3);
    expect(headline).toBe('¡Casi!');
    expect(subLine).toContain('So close');
  });

  // Passing is 18 of 20. Every failure used to read "Close. Review the wrong
  // ones and retake." under a celebratory "¡Vamos!", so a player who got six
  // right was told they had nearly reached eighteen.
  describe('a score that is not close', () => {
    it('does not claim 6/20 was close', () => {
      const { headline, subLine } = examResultMessage(false, 14);
      expect(subLine).not.toContain('close');
      expect(subLine).toBe('Not there yet. Work through the wrong ones and retake.');
      expect(headline).not.toBe('¡Vamos!');
    });

    it('does not celebrate a total wipeout', () => {
      const { headline, subLine } = examResultMessage(false, 20);
      expect(headline).toBe('¡Ánimo!');
      expect(subLine).not.toContain('close');
    });
  });

  it('never celebrates a failure', () => {
    for (let wrong = 3; wrong <= 20; wrong++) {
      expect(examResultMessage(false, wrong).headline).not.toBe('¡Vamos!');
    }
  });

  // The boundary between "so close" and "not there yet".
  it.each([
    [4, '¡Casi!'],
    [5, '¡Ánimo!'],
  ])('with %i wrong says %s', (wrong, headline) => {
    expect(examResultMessage(false, wrong).headline).toBe(headline);
  });

  it('always tells them what to do next', () => {
    for (const msg of [
      examResultMessage(false, 1),
      examResultMessage(false, 14),
    ]) {
      expect(msg.subLine).toContain('retake');
    }
  });
});
