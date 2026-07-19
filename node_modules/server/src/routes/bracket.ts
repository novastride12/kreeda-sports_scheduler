import { Router, Response } from 'express';
import { Tournament } from '../models/Tournament';
import { Team } from '../models/Team';
import { Match } from '../models/Match';
import { generateBracket } from '../services/bracketService';
import { authenticateAdmin, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });

// GET /api/tournaments/:id/bracket - Get bracket matches (Public)
router.get('/', async (req, res) => {
  try {
    const { id } = req.params as any;
    const { sport } = req.query;
    if (!sport) {
      return res.status(400).json({ message: 'Sport category is required.' });
    }
    const matches = await Match.find({ tournamentId: id, sport: String(sport) })
      .sort({ roundIndex: 1, matchIndex: 1 })
      .populate('team1')
      .populate('team2')
      .populate('winner');
    
    return res.status(200).json(matches);
  } catch (error) {
    console.error('Error fetching bracket:', error);
    return res.status(500).json({ message: 'Internal server error fetching bracket.' });
  }
});

// POST /api/tournaments/:id/bracket/generate - Generate bracket (Admin, only in Draft status)
router.post('/generate', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params as any;
    const { sport } = req.body;

    if (!sport) {
      return res.status(400).json({ message: 'Sport category is required.' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Check if bracket already exists
    const existingMatchesCount = await Match.countDocuments({ tournamentId: id, sport });
    if (existingMatchesCount > 0) {
      return res.status(400).json({ 
        message: 'Bracket is already generated for this sport. Use regenerate endpoint instead.' 
      });
    }

    // Fetch all teams for this sport
    const teams = await Team.find({ tournamentId: id, sport });
    if (teams.length < 2) {
      return res.status(400).json({ 
        message: `At least 2 teams are required to generate a bracket for ${sport}.` 
      });
    }

    // Generate matches in-memory
    const matchesToCreate = await generateBracket(id, sport, teams);

    // Save matches in a single batch insert
    const createdMatches = await Match.insertMany(matchesToCreate);

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
  } catch (error: any) {
    console.error('Error generating bracket:', error);
    return res.status(500).json({ 
      message: error.message || 'Internal server error generating bracket.' 
    });
  }
});

// POST /api/tournaments/:id/bracket/regenerate - Wipe and regenerate bracket (Admin, only if not ongoing/completed)
router.post('/regenerate', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params as any;
    const { sport } = req.body;

    if (!sport) {
      return res.status(400).json({ message: 'Sport category is required.' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Fetch all teams for this sport
    const teams = await Team.find({ tournamentId: id, sport });
    if (teams.length < 2) {
      return res.status(400).json({ 
        message: `At least 2 teams are required to regenerate the bracket for ${sport}.` 
      });
    }

    // Delete all existing matches for this sport
    await Match.deleteMany({ tournamentId: id, sport });

    // Generate new matches in-memory
    const matchesToCreate = await generateBracket(id, sport, teams);

    // Save matches
    const createdMatches = await Match.insertMany(matchesToCreate);

    return res.status(200).json({
      message: `Bracket regenerated successfully for ${sport}.`,
      tournamentStatus: tournament.status,
      matchesCount: createdMatches.length,
    });
  } catch (error: any) {
    console.error('Error regenerating bracket:', error);
    return res.status(500).json({ 
      message: error.message || 'Internal server error regenerating bracket.' 
    });
  }
});

export default router;
