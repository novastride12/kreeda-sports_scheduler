"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tournament = void 0;
const mongoose_1 = require("mongoose");
const TournamentSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    sports: { type: [String], required: true, default: [] },
    description: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    venue: { type: String },
    status: {
        type: String,
        enum: ['draft', 'published', 'ongoing', 'completed'],
        default: 'draft',
        required: true,
    },
    champions: [
        {
            sport: { type: String, required: true },
            team: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team', required: true }
        }
    ],
}, { timestamps: true });
exports.Tournament = (0, mongoose_1.model)('Tournament', TournamentSchema);
exports.default = exports.Tournament;
