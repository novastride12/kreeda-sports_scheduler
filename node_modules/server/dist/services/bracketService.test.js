"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mongoose_1 = __importDefault(require("mongoose"));
const bracketService_1 = require("./bracketService");
(0, vitest_1.describe)('Bracket Algorithm Utilities', () => {
    (0, vitest_1.it)('should identify powers of two correctly', () => {
        (0, vitest_1.expect)((0, bracketService_1.isPowerOfTwo)(1)).toBe(true);
        (0, vitest_1.expect)((0, bracketService_1.isPowerOfTwo)(2)).toBe(true);
        (0, vitest_1.expect)((0, bracketService_1.isPowerOfTwo)(4)).toBe(true);
        (0, vitest_1.expect)((0, bracketService_1.isPowerOfTwo)(8)).toBe(true);
        (0, vitest_1.expect)((0, bracketService_1.isPowerOfTwo)(16)).toBe(true);
        (0, vitest_1.expect)((0, bracketService_1.isPowerOfTwo)(32)).toBe(true);
        (0, vitest_1.expect)((0, bracketService_1.isPowerOfTwo)(0)).toBe(false);
        (0, vitest_1.expect)((0, bracketService_1.isPowerOfTwo)(3)).toBe(false);
        (0, vitest_1.expect)((0, bracketService_1.isPowerOfTwo)(5)).toBe(false);
        (0, vitest_1.expect)((0, bracketService_1.isPowerOfTwo)(13)).toBe(false);
        (0, vitest_1.expect)((0, bracketService_1.isPowerOfTwo)(30)).toBe(false);
    });
    (0, vitest_1.it)('should calculate next power of two correctly', () => {
        (0, vitest_1.expect)((0, bracketService_1.nextPowerOfTwo)(1)).toBe(2);
        (0, vitest_1.expect)((0, bracketService_1.nextPowerOfTwo)(2)).toBe(2);
        (0, vitest_1.expect)((0, bracketService_1.nextPowerOfTwo)(3)).toBe(4);
        (0, vitest_1.expect)((0, bracketService_1.nextPowerOfTwo)(4)).toBe(4);
        (0, vitest_1.expect)((0, bracketService_1.nextPowerOfTwo)(5)).toBe(8);
        (0, vitest_1.expect)((0, bracketService_1.nextPowerOfTwo)(8)).toBe(8);
        (0, vitest_1.expect)((0, bracketService_1.nextPowerOfTwo)(13)).toBe(16);
        (0, vitest_1.expect)((0, bracketService_1.nextPowerOfTwo)(16)).toBe(16);
        (0, vitest_1.expect)((0, bracketService_1.nextPowerOfTwo)(17)).toBe(32);
    });
    (0, vitest_1.it)('should calculate byes correctly', () => {
        (0, vitest_1.expect)((0, bracketService_1.calculateByes)(2, 2)).toBe(0);
        (0, vitest_1.expect)((0, bracketService_1.calculateByes)(3, 4)).toBe(1);
        (0, vitest_1.expect)((0, bracketService_1.calculateByes)(4, 4)).toBe(0);
        (0, vitest_1.expect)((0, bracketService_1.calculateByes)(5, 8)).toBe(3);
        (0, vitest_1.expect)((0, bracketService_1.calculateByes)(8, 8)).toBe(0);
        (0, vitest_1.expect)((0, bracketService_1.calculateByes)(13, 16)).toBe(3);
        (0, vitest_1.expect)((0, bracketService_1.calculateByes)(16, 16)).toBe(0);
        (0, vitest_1.expect)((0, bracketService_1.calculateByes)(21, 32)).toBe(11);
    });
    (0, vitest_1.it)('should shuffle arrays containing teams', () => {
        const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const shuffled = (0, bracketService_1.shuffleTeams)(list);
        (0, vitest_1.expect)(shuffled.length).toBe(list.length);
        (0, vitest_1.expect)(shuffled).toContain(1);
        (0, vitest_1.expect)(shuffled).toContain(10);
    });
    (0, vitest_1.it)('should generate beautiful round names', () => {
        (0, vitest_1.expect)((0, bracketService_1.getRoundName)(4, 4)).toBe('Final');
        (0, vitest_1.expect)((0, bracketService_1.getRoundName)(3, 4)).toBe('Semifinals');
        (0, vitest_1.expect)((0, bracketService_1.getRoundName)(2, 4)).toBe('Quarterfinals');
        (0, vitest_1.expect)((0, bracketService_1.getRoundName)(1, 4)).toBe('Round of 16');
        (0, vitest_1.expect)((0, bracketService_1.getRoundName)(1, 3)).toBe('Quarterfinals');
        (0, vitest_1.expect)((0, bracketService_1.getRoundName)(1, 2)).toBe('Semifinals');
    });
});
(0, vitest_1.describe)('Tournament Bracket Generation Engine', () => {
    const createMockTeams = (n) => {
        return Array.from({ length: n }, (_, i) => ({
            _id: new mongoose_1.default.Types.ObjectId(),
            name: `Team ${i + 1}`,
        }));
    };
    (0, vitest_1.it)('should throw an error for less than 2 teams', async () => {
        const teams = createMockTeams(1);
        await (0, vitest_1.expect)((0, bracketService_1.generateBracket)('tourn123', 'Soccer', teams)).rejects.toThrow('At least 2 teams are required to generate a bracket.');
    });
    (0, vitest_1.it)('should generate correct matches for 2 teams (Final only, 0 byes)', async () => {
        const teams = createMockTeams(2);
        const tournamentId = new mongoose_1.default.Types.ObjectId().toString();
        const matches = await (0, bracketService_1.generateBracket)(tournamentId, 'Soccer', teams);
        // P = 2, R = 1, matches count = P - 1 = 1
        (0, vitest_1.expect)(matches.length).toBe(1);
        const finalMatch = matches[0];
        (0, vitest_1.expect)(finalMatch.roundIndex).toBe(1);
        (0, vitest_1.expect)(finalMatch.roundName).toBe('Final');
        (0, vitest_1.expect)(finalMatch.isBye).toBe(false);
        (0, vitest_1.expect)(finalMatch.status).toBe('scheduled');
        (0, vitest_1.expect)(finalMatch.team1).toBeDefined();
        (0, vitest_1.expect)(finalMatch.team2).toBeDefined();
        (0, vitest_1.expect)(finalMatch.nextMatchId).toBeNull();
    });
    (0, vitest_1.it)('should generate correct matches for 5 teams (P = 8, B = 3)', async () => {
        const teams = createMockTeams(5);
        const tournamentId = new mongoose_1.default.Types.ObjectId().toString();
        const matches = await (0, bracketService_1.generateBracket)(tournamentId, 'Soccer', teams);
        // P = 8, R = 3. Total matches = 8 - 1 = 7 matches
        (0, vitest_1.expect)(matches.length).toBe(7);
        // Round 1 matches = 4 (indices 1 to 4)
        const round1 = matches.filter(m => m.roundIndex === 1);
        (0, vitest_1.expect)(round1.length).toBe(4);
        // First B = 3 matches in Round 1 should be byes
        const byes = round1.filter(m => m.isBye);
        (0, vitest_1.expect)(byes.length).toBe(3);
        // Validate bye properties
        byes.forEach(m => {
            (0, vitest_1.expect)(m.status).toBe('completed');
            (0, vitest_1.expect)(m.winner).toBeDefined();
            (0, vitest_1.expect)(m.team1).toBeDefined();
            (0, vitest_1.expect)(m.team2).toBeNull();
        });
        // Played match in Round 1
        const played = round1.filter(m => !m.isBye);
        (0, vitest_1.expect)(played.length).toBe(1);
        (0, vitest_1.expect)(played[0].status).toBe('scheduled');
        (0, vitest_1.expect)(played[0].team1).toBeDefined();
        (0, vitest_1.expect)(played[0].team2).toBeDefined();
        (0, vitest_1.expect)(played[0].winner).toBeNull();
        // Round 2 matches = 2
        const round2 = matches.filter(m => m.roundIndex === 2);
        (0, vitest_1.expect)(round2.length).toBe(2);
        // Round 3 (Final) matches = 1
        const round3 = matches.filter(m => m.roundIndex === 3);
        (0, vitest_1.expect)(round3.length).toBe(1);
        (0, vitest_1.expect)(round3[0].roundName).toBe('Final');
    });
    (0, vitest_1.it)('should generate correct matches for 8 teams (P = 8, B = 0)', async () => {
        const teams = createMockTeams(8);
        const tournamentId = new mongoose_1.default.Types.ObjectId().toString();
        const matches = await (0, bracketService_1.generateBracket)(tournamentId, 'Soccer', teams);
        (0, vitest_1.expect)(matches.length).toBe(7);
        const round1 = matches.filter(m => m.roundIndex === 1);
        (0, vitest_1.expect)(round1.length).toBe(4);
        // All matches are played, 0 byes
        const byes = round1.filter(m => m.isBye);
        (0, vitest_1.expect)(byes.length).toBe(0);
        round1.forEach(m => {
            (0, vitest_1.expect)(m.status).toBe('scheduled');
            (0, vitest_1.expect)(m.team1).toBeDefined();
            (0, vitest_1.expect)(m.team2).toBeDefined();
            (0, vitest_1.expect)(m.winner).toBeNull();
        });
    });
    (0, vitest_1.it)('should generate correct matches for 13 teams (P = 16, B = 3)', async () => {
        const teams = createMockTeams(13);
        const tournamentId = new mongoose_1.default.Types.ObjectId().toString();
        const matches = await (0, bracketService_1.generateBracket)(tournamentId, 'Soccer', teams);
        // P = 16, R = 4, Total matches = 15
        (0, vitest_1.expect)(matches.length).toBe(15);
        const round1 = matches.filter(m => m.roundIndex === 1);
        (0, vitest_1.expect)(round1.length).toBe(8);
        const byes = round1.filter(m => m.isBye);
        (0, vitest_1.expect)(byes.length).toBe(3);
        const played = round1.filter(m => !m.isBye);
        (0, vitest_1.expect)(played.length).toBe(5);
        // Round 2 has 4 matches
        const round2 = matches.filter(m => m.roundIndex === 2);
        (0, vitest_1.expect)(round2.length).toBe(4);
        // Verify bye propagation to Round 2
        // Bye 1 (Round 1 Match 1) winner advances to Round 2 Match 1 Slot 1
        // Bye 2 (Round 1 Match 2) winner advances to Round 2 Match 1 Slot 2
        // Bye 3 (Round 1 Match 3) winner advances to Round 2 Match 2 Slot 1
        const r2m1 = round2.find(m => m.matchIndex === 1);
        const r2m2 = round2.find(m => m.matchIndex === 2);
        (0, vitest_1.expect)(r2m1?.team1).toBeDefined();
        (0, vitest_1.expect)(r2m1?.team2).toBeDefined(); // Since both slot 1 and 2 were filled by byes 1 and 2
        (0, vitest_1.expect)(r2m2?.team1).toBeDefined();
        (0, vitest_1.expect)(r2m2?.team2).toBeNull(); // Still waiting for the winner of Round 1 Match 4
    });
});
