import { describe, expect, it } from 'vitest';
import { syllabify, syllabifyWord } from '../src/lib/syllables';

describe('syllable beat guide', () => {
  it('matches the chants printed on p.82', () => {
    expect(syllabifyWord('madrase')).toEqual(['mad', 'ra', 'se']);
    expect(syllabifyWord('daftar')).toEqual(['daf', 'tar']);
    expect(syllabifyWord('miftāḥ')).toEqual(['mif', 'tāḥ']);
    expect(syllabifyWord('maṭār')).toEqual(['ma', 'ṭār']);
  });
  it('matches the p.40 beat line ṣa · bāḥ · il · khēr', () => {
    expect(syllabify('ṣabāḥ il-khēr')).toEqual(['ṣa', 'bāḥ', 'il', 'khēr']);
  });
  it('handles clusters and doubled consonants', () => {
    expect(syllabifyWord('shwayye')).toEqual(['shway', 'ye']);
    expect(syllabifyWord('kanabāye')).toEqual(['ka', 'na', 'bā', 'ye']);
    expect(syllabify('iṣ-ṣālōn')).toEqual(['iṣ', 'ṣā', 'lōn']);
  });
});
