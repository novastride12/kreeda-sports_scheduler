"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Team = void 0;
const mongoose_1 = require("mongoose");
const TeamSchema = new mongoose_1.Schema({
    tournamentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    sport: { type: String, required: true },
    name: { type: String, required: true },
    code: { type: String },
    captainName: { type: String },
}, { timestamps: true });
// Add unique index on team name per tournament and sport to avoid duplicates
TeamSchema.index({ tournamentId: 1, sport: 1, name: 1 }, { unique: true });
exports.Team = (0, mongoose_1.model)('Team', TeamSchema);
exports.default = exports.Team;
