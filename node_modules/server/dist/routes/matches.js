"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Tournament_1 = require("../models/Tournament");
const Match_1 = require("../models/Match");
const bracketService_1 = require("../services/bracketService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/tournaments/:id/matches - Get all matches (Public)
router.get('/', async (req, res) => {
    try {
        const { id } = req.params;
        const { sport } = req.query;
        const filter = { tournamentId: id };
        if (sport) {
            filter.sport = String(sport);
        }
        const matches = await Match_1.Match.find(filter)
            .sort({ roundIndex: 1, matchIndex: 1 })
            .populate('team1')
            .populate('team2')
            .populate('winner');
        return res.status(200).json(matches);
    }
    catch (error) {
        console.error('Error fetching matches:', error);
        return res.status(500).json({ message: 'Internal server error fetching matches.' });
    }
});
// PATCH /api/tournaments/:id/matches/:matchId - Update date/time/venue (Admin)
router.patch('/:matchId', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { id, matchId } = req.params;
        const { scheduledDate, scheduledTime, venue, team1Score, team2Score } = req.body;
        const match = await Match_1.Match.findOne({ _id: matchId, tournamentId: id });
        if (!match) {
            return res.status(404).json({ message: 'Match not found in this tournament.' });
        }
        if (match.status === 'completed') {
            return res.status(400).json({ message: 'Cannot update a completed match.' });
        }
        if (scheduledDate !== undefined)
            match.scheduledDate = scheduledDate ? new Date(scheduledDate) : undefined;
        if (scheduledTime !== undefined)
            match.scheduledTime = scheduledTime;
        if (venue !== undefined)
            match.venue = venue;
        if (team1Score !== undefined)
            match.team1Score = String(team1Score);
        if (team2Score !== undefined)
            match.team2Score = String(team2Score);
        await match.save();
        return res.status(200).json(match);
    }
    catch (error) {
        console.error('Error updating match scheduling:', error);
        return res.status(500).json({ message: 'Internal server error updating match.' });
    }
});
// PATCH /api/tournaments/:id/matches/:matchId/status - Start match / make live (Admin)
router.patch('/:matchId/status', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { id, matchId } = req.params;
        const { status } = req.body; // should be 'live' or 'scheduled'
        if (status !== 'live' && status !== 'scheduled') {
            return res.status(400).json({ message: 'Status must be "live" or "scheduled".' });
        }
        const match = await Match_1.Match.findOne({ _id: matchId, tournamentId: id })
            .populate('team1')
            .populate('team2');
        if (!match) {
            return res.status(404).json({ message: 'Match not found in this tournament.' });
        }
        if (match.status === 'completed') {
            return res.status(400).json({ message: 'Cannot change status of a completed match.' });
        }
        if (!match.team1 || !match.team2) {
            return res.status(400).json({
                message: 'Cannot start a match that does not have both teams decided.'
            });
        }
        match.status = status;
        await match.save();
        // If starting a match, auto-transition tournament status to 'ongoing' if it was 'published'
        const tournament = await Tournament_1.Tournament.findById(id);
        if (tournament && tournament.status === 'published' && status === 'live') {
            tournament.status = 'ongoing';
            await tournament.save();
        }
        return res.status(200).json(match);
    }
    catch (error) {
        console.error('Error updating match status:', error);
        return res.status(500).json({ message: 'Internal server error updating match status.' });
    }
});
// PATCH /api/tournaments/:id/matches/:matchId/result - Submit score and winner (Admin)
router.patch('/:matchId/result', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { id, matchId } = req.params;
        const { team1Score, team2Score, winnerId } = req.body;
        if (team1Score === undefined || team2Score === undefined || !winnerId) {
            return res.status(400).json({
                message: 'Scores for both teams and the winnerId are required.'
            });
        }
        const match = await Match_1.Match.findOne({ _id: matchId, tournamentId: id });
        if (!match) {
            return res.status(404).json({ message: 'Match not found in this tournament.' });
        }
        if (match.status === 'completed') {
            return res.status(400).json({ message: 'Match is already completed.' });
        }
        // Validate that the winnerId is one of the teams in the match
        const isTeam1 = match.team1 && match.team1.toString() === winnerId;
        const isTeam2 = match.team2 && match.team2.toString() === winnerId;
        if (!isTeam1 && !isTeam2) {
            return res.status(400).json({
                message: 'The selected winner must be one of the teams playing in the match.'
            });
        }
        // Advance the winner using the bracket service helper
        const result = await (0, bracketService_1.advanceWinner)(matchId, winnerId, team1Score, team2Score);
        return res.status(200).json({
            message: 'Match result saved and winner advanced successfully.',
            currentMatch: result.currentMatch,
            nextMatch: result.nextMatch,
            tournamentCompleted: result.tournamentCompleted,
        });
    }
    catch (error) {
        console.error('Error submitting match result:', error);
        return res.status(500).json({
            message: error.message || 'Internal server error submitting result.'
        });
    }
});
exports.default = router;
