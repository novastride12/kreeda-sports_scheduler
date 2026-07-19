import mongoose from 'mongoose';
import { Match } from '../models/Match';
import { Team } from '../models/Team';
import { Tournament } from '../models/Tournament';

// Helper: check if power of two
export const isPowerOfTwo = (n: number): boolean => {
  return n > 0 && (n & (n - 1)) === 0;
};

// Helper: get next power of two >= n
export const nextPowerOfTwo = (n: number): number => {
  if (n <= 2) return 2;
  let p = 2;
  while (p < n) {
    p *= 2;
  }
  return p;
};

// Helper: calculate byes
export const calculateByes = (n: number, p: number): number => {
  return p - n;
};

// Helper: shuffle array randomly (Fisher-Yates)
export const shuffleTeams = <T>(teams: T[]): T[] => {
  const arr = [...teams];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Helper: get beautiful round name
export const getRoundName = (roundIndex: number, totalRounds: number): string => {
  if (roundIndex === totalRounds) return 'Final';
  if (roundIndex === totalRounds - 1) return 'Semifinals';
  if (roundIndex === totalRounds - 2) return 'Quarterfinals';
  if (roundIndex === totalRounds - 3) return 'Round of 16';
  if (roundIndex === totalRounds - 4) return 'Round of 32';
  return `Round ${roundIndex}`;
};

// Main algorithm: generate bracket for tournament
export const generateBracket = async (
  tournamentId: string,
  sport: string,
  teamsList: any[]
): Promise<any[]> => {
  const N = teamsList.length;
  if (N < 2) {
    throw new Error('At least 2 teams are required to generate a bracket.');
  }

  const P = nextPowerOfTwo(N);
  const B = calculateByes(N, P);
  const R = Math.log2(P);

  // Shuffle teams
  const shuffled = shuffleTeams(teamsList);

  // Map to hold matches in memory for pre-linking
  const matchesMap: { [round: number]: { [matchIndex: number]: any } } = {};
  const allMatchesToCreate: any[] = [];

  // 1. Initialize and generate all ObjectIds in memory for all matches
  for (let r = 1; r <= R; r++) {
    matchesMap[r] = {};
    const matchesInRound = P / Math.pow(2, r);
    for (let i = 1; i <= matchesInRound; i++) {
      const matchId = new mongoose.Types.ObjectId();
      const matchObj = {
        _id: matchId,
        tournamentId: new mongoose.Types.ObjectId(tournamentId),
        sport,
        roundIndex: r,
        roundName: getRoundName(r, R),
        matchIndex: i,
        team1: null as any,
        team2: null as any,
        team1Score: '',
        team2Score: '',
        winner: null as any,
        status: 'scheduled',
        isBye: false,
        nextMatchId: null as any,
        nextMatchSlot: null as any,
      };
      matchesMap[r][i] = matchObj;
    }
  }

  // 2. Pre-link the matches (assign nextMatchId and nextMatchSlot)
  for (let r = 1; r <= R; r++) {
    const matchesInRound = P / Math.pow(2, r);
    for (let i = 1; i <= matchesInRound; i++) {
      const currentMatch = matchesMap[r][i];
      if (r < R) {
        const nextRound = r + 1;
        const nextIndex = Math.ceil(i / 2);
        const nextSlot = i % 2 !== 0 ? 'team1' : 'team2';
        currentMatch.nextMatchId = matchesMap[nextRound][nextIndex]._id;
        currentMatch.nextMatchSlot = nextSlot;
      }
    }
  }

  // 3. Distribute teams in Round 1, accounting for byes
  const round1MatchesCount = P / 2;
  for (let i = 1; i <= round1MatchesCount; i++) {
    const match = matchesMap[1][i];
    if (i <= B) {
      // Bye match: only one team, immediately completed and advanced
      const team = shuffled[i - 1];
      match.team1 = team._id;
      match.team2 = null;
      match.isBye = true;
      match.status = 'completed';
      match.winner = team._id;

      // Advance winner to the next round match slot in memory
      if (match.nextMatchId) {
        const nextRound = 2;
        const nextIndex = Math.ceil(i / 2);
        const nextSlot = match.nextMatchSlot;
        matchesMap[nextRound][nextIndex][nextSlot] = team._id;
      }
    } else {
      // Played match: pair remaining teams
      const team1Index = B + 2 * (i - B - 1);
      const team2Index = team1Index + 1;
      match.team1 = shuffled[team1Index]._id;
      match.team2 = shuffled[team2Index]._id;
      match.isBye = false;
      match.status = 'scheduled';
      match.winner = null;
    }
  }

  // 4. Flatten the map into an array of match records
  for (let r = 1; r <= R; r++) {
    const matchesInRound = P / Math.pow(2, r);
    for (let i = 1; i <= matchesInRound; i++) {
      allMatchesToCreate.push(matchesMap[r][i]);
    }
  }

  return allMatchesToCreate;
};

// Advance winner to the next match or complete the tournament
export const advanceWinner = async (
  matchId: string,
  winnerId: string,
  score1: number | string,
  score2: number | string
): Promise<any> => {
  // Update the current match as completed
  const currentMatch = await Match.findById(matchId);
  if (!currentMatch) {
    throw new Error('Match not found.');
  }

  if (currentMatch.status === 'completed') {
    throw new Error('Match is already completed.');
  }

  // Set scores and status
  currentMatch.team1Score = String(score1);
  currentMatch.team2Score = String(score2);
  currentMatch.winner = new mongoose.Types.ObjectId(winnerId);
  currentMatch.status = 'completed';
  await currentMatch.save();

  // Check if this is the final match (i.e. no nextMatchId)
  if (!currentMatch.nextMatchId) {
    // This is the final! Update tournament status to completed and set champion in the champions list
    const tournament = await Tournament.findById(currentMatch.tournamentId);
    if (tournament) {
      if (!tournament.champions) {
        tournament.champions = [] as any;
      }
      const existingIdx = tournament.champions.findIndex((c: any) => c.sport === currentMatch.sport);
      if (existingIdx > -1) {
        tournament.champions[existingIdx].team = new mongoose.Types.ObjectId(winnerId) as any;
      } else {
        tournament.champions.push({
          sport: currentMatch.sport,
          team: new mongoose.Types.ObjectId(winnerId) as any,
        });
      }
      await tournament.save();
    }
    return { currentMatch, nextMatch: null, tournamentCompleted: true };
  }

  // Find the next match
  const nextMatch = await Match.findById(currentMatch.nextMatchId);
  if (!nextMatch) {
    throw new Error('Next match reference is broken.');
  }

  // Put winner in the correct slot of nextMatch
  const slot = currentMatch.nextMatchSlot;
  if (slot === 'team1') {
    nextMatch.team1 = new mongoose.Types.ObjectId(winnerId);
  } else if (slot === 'team2') {
    nextMatch.team2 = new mongoose.Types.ObjectId(winnerId);
  } else {
    throw new Error('Invalid next match slot configuration.');
  }

  await nextMatch.save();
  return { currentMatch, nextMatch, tournamentCompleted: false };
};
