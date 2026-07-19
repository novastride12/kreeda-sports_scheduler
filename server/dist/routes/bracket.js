"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Tournament_1 = require("../models/Tournament");
const Team_1 = require("../models/Team");
const Match_1 = require("../models/Match");
const bracketService_1 = require("../services/bracketService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/tournaments/:id/bracket - Get bracket matches (Public)
router.get('/', async (req, res) => {
    try {
        const { id } = req.params;
        const { sport } = req.query;
        if (!sport) {
            return res.status(400).json({ message: 'Sport category is required.' });
        }
        const matches = await Match_1.Match.find({ tournamentId: id, sport: String(sport) })
            .sort({ roundIndex: 1, matchIndex: 1 })
            .populate('team1')
            .populate('team2')
            .populate('winner');
        return res.status(200).json(matches);
    }
    catch (error) {
        console.error('Error fetching bracket:', error);
        return res.status(500).json({ message: 'Internal server error fetching bracket.' });
    }
});
// POST /api/tournaments/:id/bracket/generate - Generate bracket (Admin, only in Draft status)
router.post('/generate', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { sport } = req.body;
        if (!sport) {
            return res.status(400).json({ message: 'Sport category is required.' });
        }
        const tournament = await Tournament_1.Tournament.findById(id);
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found.' });
        }
        // Check if bracket already exists
        const existingMatchesCount = await Match_1.Match.countDocuments({ tournamentId: id, sport });
        if (existingMatchesCount > 0) {
            return res.status(400).json({
                message: 'Bracket is already generated for this sport. Use regenerate endpoint instead.'
            });
        }
        // Fetch all teams for this sport
        const teams = await Team_1.Team.find({ tournamentId: id, sport });
        if (teams.length < 2) {
            return res.status(400).json({
                message: `At least 2 teams are required to generate a bracket for ${sport}.`
            });
        }
        // Generate matches in-memory
        const matchesToCreate = await (0, bracketService_1.generateBracket)(id, sport, teams);
        // Save matches in a single batch insert
        const createdMatches = await Match_1.Match.insertMany(matchesToCreate);
        // Transition tournament status to published
        if (tournament.status === 'draft') {
            tournament.status = 'published';
            await tournament.save();
        }
        return res.status(201).json({
            message: `Bracket generated successfully for ${sport}.`,
            tournamentStatus: tournament.status,
            matchesCount: createdMatches.length,
        });
    }
    catch (error) {
        console.error('Error generating bracket:', error);
        return res.status(500).json({
            message: error.message || 'Internal server error generating bracket.'
        });
    }
});
// POST /api/tournaments/:id/bracket/regenerate - Wipe and regenerate bracket (Admin, only if not ongoing/completed)
router.post('/regenerate', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { sport } = req.body;
        if (!sport) {
            return res.status(400).json({ message: 'Sport category is required.' });
        }
        const tournament = await Tournament_1.Tournament.findById(id);
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found.' });
        }
        // Fetch all teams for this sport
        const teams = await Team_1.Team.find({ tournamentId: id, sport });
        if (teams.length < 2) {
            return res.status(400).json({
                message: `At least 2 teams are required to regenerate the bracket for ${sport}.`
            });
        }
        // Delete all existing matches for this sport
        await Match_1.Match.deleteMany({ tournamentId: id, sport });
        // Generate new matches in-memory
        const matchesToCreate = await (0, bracketService_1.generateBracket)(id, sport, teams);
        // Save matches
        const createdMatches = await Match_1.Match.insertMany(matchesToCreate);
        return res.status(200).json({
            message: `Bracket regenerated successfully for ${sport}.`,
            tournamentStatus: tournament.status,
            matchesCount: createdMatches.length,
        });
    }
    catch (error) {
        console.error('Error regenerating bracket:', error);
        return res.status(500).json({
            message: error.message || 'Internal server error regenerating bracket.'
        });
    }
});
exports.default = router;
