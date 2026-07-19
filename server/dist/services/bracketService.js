"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.advanceWinner = exports.generateBracket = exports.getRoundName = exports.shuffleTeams = exports.calculateByes = exports.nextPowerOfTwo = exports.isPowerOfTwo = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Match_1 = require("../models/Match");
const Tournament_1 = require("../models/Tournament");
// Helper: check if power of two
const isPowerOfTwo = (n) => {
    return n > 0 && (n & (n - 1)) === 0;
};
exports.isPowerOfTwo = isPowerOfTwo;
// Helper: get next power of two >= n
const nextPowerOfTwo = (n) => {
    if (n <= 2)
        return 2;
    let p = 2;
    while (p < n) {
        p *= 2;
    }
    return p;
};
exports.nextPowerOfTwo = nextPowerOfTwo;
// Helper: calculate byes
const calculateByes = (n, p) => {
    return p - n;
};
exports.calculateByes = calculateByes;
// Helper: shuffle array randomly (Fisher-Yates)
const shuffleTeams = (teams) => {
    const arr = [...teams];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};
exports.shuffleTeams = shuffleTeams;
// Helper: get beautiful round name
const getRoundName = (roundIndex, totalRounds) => {
    if (roundIndex === totalRounds)
        return 'Final';
    if (roundIndex === totalRounds - 1)
        return 'Semifinals';
    if (roundIndex === totalRounds - 2)
        return 'Quarterfinals';
    if (roundIndex === totalRounds - 3)
        return 'Round of 16';
    if (roundIndex === totalRounds - 4)
        return 'Round of 32';
    return `Round ${roundIndex}`;
};
exports.getRoundName = getRoundName;
// Main algorithm: generate bracket for tournament
const generateBracket = async (tournamentId, sport, teamsList) => {
    const N = teamsList.length;
    if (N < 2) {
        throw new Error('At least 2 teams are required to generate a bracket.');
    }
    const P = (0, exports.nextPowerOfTwo)(N);
    const B = (0, exports.calculateByes)(N, P);
    const R = Math.log2(P);
    // Shuffle teams
    const shuffled = (0, exports.shuffleTeams)(teamsList);
    // Map to hold matches in memory for pre-linking
    const matchesMap = {};
    const allMatchesToCreate = [];
    // 1. Initialize and generate all ObjectIds in memory for all matches
    for (let r = 1; r <= R; r++) {
        matchesMap[r] = {};
        const matchesInRound = P / Math.pow(2, r);
        for (let i = 1; i <= matchesInRound; i++) {
            const matchId = new mongoose_1.default.Types.ObjectId();
            const matchObj = {
                _id: matchId,
                tournamentId: new mongoose_1.default.Types.ObjectId(tournamentId),
                sport,
                roundIndex: r,
                roundName: (0, exports.getRoundName)(r, R),
                matchIndex: i,
                team1: null,
                team2: null,
                team1Score: '',
                team2Score: '',
                winner: null,
                status: 'scheduled',
                isBye: false,
                nextMatchId: null,
                nextMatchSlot: null,
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
        }
        else {
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
exports.generateBracket = generateBracket;
// Advance winner to the next match or complete the tournament
const advanceWinner = async (matchId, winnerId, score1, score2) => {
    // Update the current match as completed
    const currentMatch = await Match_1.Match.findById(matchId);
    if (!currentMatch) {
        throw new Error('Match not found.');
    }
    if (currentMatch.status === 'completed') {
        throw new Error('Match is already completed.');
    }
    // Set scores and status
    currentMatch.team1Score = String(score1);
    currentMatch.team2Score = String(score2);
    currentMatch.winner = new mongoose_1.default.Types.ObjectId(winnerId);
    currentMatch.status = 'completed';
    await currentMatch.save();
    // Check if this is the final match (i.e. no nextMatchId)
    if (!currentMatch.nextMatchId) {
        // This is the final! Update tournament status to completed and set champion in the champions list
        const tournament = await Tournament_1.Tournament.findById(currentMatch.tournamentId);
        if (tournament) {
            if (!tournament.champions) {
                tournament.champions = [];
            }
            const existingIdx = tournament.champions.findIndex((c) => c.sport === currentMatch.sport);
            if (existingIdx > -1) {
                tournament.champions[existingIdx].team = new mongoose_1.default.Types.ObjectId(winnerId);
            }
            else {
                tournament.champions.push({
                    sport: currentMatch.sport,
                    team: new mongoose_1.default.Types.ObjectId(winnerId),
                });
            }
            await tournament.save();
        }
        return { currentMatch, nextMatch: null, tournamentCompleted: true };
    }
    // Find the next match
    const nextMatch = await Match_1.Match.findById(currentMatch.nextMatchId);
    if (!nextMatch) {
        throw new Error('Next match reference is broken.');
    }
    // Put winner in the correct slot of nextMatch
    const slot = currentMatch.nextMatchSlot;
    if (slot === 'team1') {
        nextMatch.team1 = new mongoose_1.default.Types.ObjectId(winnerId);
    }
    else if (slot === 'team2') {
        nextMatch.team2 = new mongoose_1.default.Types.ObjectId(winnerId);
    }
    else {
        throw new Error('Invalid next match slot configuration.');
    }
    await nextMatch.save();
    return { currentMatch, nextMatch, tournamentCompleted: false };
};
exports.advanceWinner = advanceWinner;
