"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Match = void 0;
const mongoose_1 = require("mongoose");
const MatchSchema = new mongoose_1.Schema({
    tournamentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    sport: { type: String, required: true },
    roundIndex: { type: Number, required: true },
    roundName: { type: String, required: true },
    matchIndex: { type: Number, required: true },
    team1: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team', default: null },
    team2: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team', default: null },
    team1Score: { type: String, default: '0' },
    team2Score: { type: String, default: '0' },
    winner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team', default: null },
    status: {
        type: String,
        enum: ['scheduled', 'live', 'completed'],
        default: 'scheduled',
        required: true,
    },
    scheduledDate: { type: Date },
    scheduledTime: { type: String }, // e.g., "15:30"
    venue: { type: String },
    isBye: { type: Boolean, default: false },
    nextMatchId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Match', default: null },
    nextMatchSlot: {
        type: String,
        enum: ['team1', 'team2', null],
        default: null,
    },
}, { timestamps: true });
exports.Match = (0, mongoose_1.model)('Match', MatchSchema);
exports.default = exports.Match;
