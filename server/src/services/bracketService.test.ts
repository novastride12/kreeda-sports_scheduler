import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import {
  isPowerOfTwo,
  nextPowerOfTwo,
  calculateByes,
  shuffleTeams,
  getRoundName,
  generateBracket,
} from './bracketService';

describe('Bracket Algorithm Utilities', () => {
  it('should identify powers of two correctly', () => {
    expect(isPowerOfTwo(1)).toBe(true);
    expect(isPowerOfTwo(2)).toBe(true);
    expect(isPowerOfTwo(4)).toBe(true);
    expect(isPowerOfTwo(8)).toBe(true);
    expect(isPowerOfTwo(16)).toBe(true);
    expect(isPowerOfTwo(32)).toBe(true);

    expect(isPowerOfTwo(0)).toBe(false);
    expect(isPowerOfTwo(3)).toBe(false);
    expect(isPowerOfTwo(5)).toBe(false);
    expect(isPowerOfTwo(13)).toBe(false);
    expect(isPowerOfTwo(30)).toBe(false);
  });

  it('should calculate next power of two correctly', () => {
    expect(nextPowerOfTwo(1)).toBe(2);
    expect(nextPowerOfTwo(2)).toBe(2);
    expect(nextPowerOfTwo(3)).toBe(4);
    expect(nextPowerOfTwo(4)).toBe(4);
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(8)).toBe(8);
    expect(nextPowerOfTwo(13)).toBe(16);
    expect(nextPowerOfTwo(16)).toBe(16);
    expect(nextPowerOfTwo(17)).toBe(32);
  });

  it('should calculate byes correctly', () => {
    expect(calculateByes(2, 2)).toBe(0);
    expect(calculateByes(3, 4)).toBe(1);
    expect(calculateByes(4, 4)).toBe(0);
    expect(calculateByes(5, 8)).toBe(3);
    expect(calculateByes(8, 8)).toBe(0);
    expect(calculateByes(13, 16)).toBe(3);
    expect(calculateByes(16, 16)).toBe(0);
    expect(calculateByes(21, 32)).toBe(11);
  });

  it('should shuffle arrays containing teams', () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = shuffleTeams(list);
    expect(shuffled.length).toBe(list.length);
    expect(shuffled).toContain(1);
    expect(shuffled).toContain(10);
  });

  it('should generate beautiful round names', () => {
    expect(getRoundName(4, 4)).toBe('Final');
    expect(getRoundName(3, 4)).toBe('Semifinals');
    expect(getRoundName(2, 4)).toBe('Quarterfinals');
    expect(getRoundName(1, 4)).toBe('Round of 16');
    expect(getRoundName(1, 3)).toBe('Quarterfinals');
    expect(getRoundName(1, 2)).toBe('Semifinals');
  });
});

describe('Tournament Bracket Generation Engine', () => {
  const createMockTeams = (n: number) => {
    return Array.from({ length: n }, (_, i) => ({
      _id: new mongoose.Types.ObjectId(),
      name: `Team ${i + 1}`,
    }));
  };

  it('should throw an error for less than 2 teams', async () => {
    const teams = createMockTeams(1);
    await expect(generateBracket('tourn123', 'Soccer', teams)).rejects.toThrow(
      'At least 2 teams are required to generate a bracket.'
    );
  });

  it('should generate correct matches for 2 teams (Final only, 0 byes)', async () => {
    const teams = createMockTeams(2);
    const tournamentId = new mongoose.Types.ObjectId().toString();
    const matches = await generateBracket(tournamentId, 'Soccer', teams);

    // P = 2, R = 1, matches count = P - 1 = 1
    expect(matches.length).toBe(1);
    
    const finalMatch = matches[0];
    expect(finalMatch.roundIndex).toBe(1);
    expect(finalMatch.roundName).toBe('Final');
    expect(finalMatch.isBye).toBe(false);
    expect(finalMatch.status).toBe('scheduled');
    expect(finalMatch.team1).toBeDefined();
    expect(finalMatch.team2).toBeDefined();
    expect(finalMatch.nextMatchId).toBeNull();
  });

  it('should generate correct matches for 5 teams (P = 8, B = 3)', async () => {
    const teams = createMockTeams(5);
    const tournamentId = new mongoose.Types.ObjectId().toString();
    const matches = await generateBracket(tournamentId, 'Soccer', teams);

    // P = 8, R = 3. Total matches = 8 - 1 = 7 matches
    expect(matches.length).toBe(7);

    // Round 1 matches = 4 (indices 1 to 4)
    const round1 = matches.filter(m => m.roundIndex === 1);
    expect(round1.length).toBe(4);

    // First B = 3 matches in Round 1 should be byes
    const byes = round1.filter(m => m.isBye);
    expect(byes.length).toBe(3);
    
    // Validate bye properties
    byes.forEach(m => {
      expect(m.status).toBe('completed');
      expect(m.winner).toBeDefined();
      expect(m.team1).toBeDefined();
      expect(m.team2).toBeNull();
    });

    // Played match in Round 1
    const played = round1.filter(m => !m.isBye);
    expect(played.length).toBe(1);
    expect(played[0].status).toBe('scheduled');
    expect(played[0].team1).toBeDefined();
    expect(played[0].team2).toBeDefined();
    expect(played[0].winner).toBeNull();

    // Round 2 matches = 2
    const round2 = matches.filter(m => m.roundIndex === 2);
    expect(round2.length).toBe(2);

    // Round 3 (Final) matches = 1
    const round3 = matches.filter(m => m.roundIndex === 3);
    expect(round3.length).toBe(1);
    expect(round3[0].roundName).toBe('Final');
  });

  it('should generate correct matches for 8 teams (P = 8, B = 0)', async () => {
    const teams = createMockTeams(8);
    const tournamentId = new mongoose.Types.ObjectId().toString();
    const matches = await generateBracket(tournamentId, 'Soccer', teams);

    expect(matches.length).toBe(7);

    const round1 = matches.filter(m => m.roundIndex === 1);
    expect(round1.length).toBe(4);

    // All matches are played, 0 byes
    const byes = round1.filter(m => m.isBye);
    expect(byes.length).toBe(0);

    round1.forEach(m => {
      expect(m.status).toBe('scheduled');
      expect(m.team1).toBeDefined();
      expect(m.team2).toBeDefined();
      expect(m.winner).toBeNull();
    });
  });

  it('should generate correct matches for 13 teams (P = 16, B = 3)', async () => {
    const teams = createMockTeams(13);
    const tournamentId = new mongoose.Types.ObjectId().toString();
    const matches = await generateBracket(tournamentId, 'Soccer', teams);

    // P = 16, R = 4, Total matches = 15
    expect(matches.length).toBe(15);

    const round1 = matches.filter(m => m.roundIndex === 1);
    expect(round1.length).toBe(8);

    const byes = round1.filter(m => m.isBye);
    expect(byes.length).toBe(3);

    const played = round1.filter(m => !m.isBye);
    expect(played.length).toBe(5);

    // Round 2 has 4 matches
    const round2 = matches.filter(m => m.roundIndex === 2);
    expect(round2.length).toBe(4);

    // Verify bye propagation to Round 2
    // Bye 1 (Round 1 Match 1) winner advances to Round 2 Match 1 Slot 1
    // Bye 2 (Round 1 Match 2) winner advances to Round 2 Match 1 Slot 2
    // Bye 3 (Round 1 Match 3) winner advances to Round 2 Match 2 Slot 1
    const r2m1 = round2.find(m => m.matchIndex === 1);
    const r2m2 = round2.find(m => m.matchIndex === 2);
    
    expect(r2m1?.team1).toBeDefined();
    expect(r2m1?.team2).toBeDefined(); // Since both slot 1 and 2 were filled by byes 1 and 2
    expect(r2m2?.team1).toBeDefined();
    expect(r2m2?.team2).toBeNull(); // Still waiting for the winner of Round 1 Match 4
  });
});
