import { Router, Response } from 'express';
import { Tournament } from '../models/Tournament';
import { Team } from '../models/Team';
import { Match } from '../models/Match';
import { authenticateAdmin, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/tournaments - Get all tournaments (Public)
router.get('/', async (req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ createdAt: -1 }).populate('champions.team');
    return res.status(200).json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return res.status(500).json({ message: 'Internal server error fetching tournaments.' });
  }
});

// GET /api/tournaments/:id - Get tournament by ID (Public)
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('champions.team');
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }
    return res.status(200).json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return res.status(500).json({ message: 'Internal server error fetching tournament.' });
  }
});

// POST /api/tournaments - Create tournament (Admin)
router.post('/', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, sports, description, startDate, endDate, venue } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Tournament Name is a required field.' });
    }

    // Parse sports if provided
    let parsedSports: string[] = [];
    if (sports) {
      if (Array.isArray(sports)) {
        parsedSports = sports.map(s => String(s).trim()).filter(Boolean);
      } else if (typeof sports === 'string') {
        parsedSports = sports.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const tournament = new Tournament({
      name,
      sports: parsedSports,
      description,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      venue,
      status: 'draft',
    });

    await tournament.save();
    return res.status(201).json(tournament);
  } catch (error) {
    console.error('Error creating tournament:', error);
    return res.status(500).json({ message: 'Internal server error creating tournament.' });
  }
});

// PATCH /api/tournaments/:id - Update tournament details (Admin)
router.patch('/:id', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, sports, description, startDate, endDate, venue, status, champions } = req.body;
    
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Update fields if provided
    if (name !== undefined) tournament.name = name;
    if (sports !== undefined) {
      let parsedSports: string[] = [];
      if (Array.isArray(sports)) {
        parsedSports = sports.map(s => String(s).trim()).filter(Boolean);
      } else if (typeof sports === 'string') {
        parsedSports = sports.split(',').map(s => s.trim()).filter(Boolean);
      }
      tournament.sports = parsedSports;
    }
    if (description !== undefined) tournament.description = description;
    if (startDate !== undefined) tournament.startDate = startDate ? new Date(startDate) : undefined;
    if (endDate !== undefined) tournament.endDate = endDate ? new Date(endDate) : undefined;
    if (venue !== undefined) tournament.venue = venue;
    if (status !== undefined) {
      // Validate transition status
      const validStatuses = ['draft', 'published', 'ongoing', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
      }
      tournament.status = status as any;
    }
    if (champions !== undefined) {
      tournament.champions = champions;
    }

    await tournament.save();
    return res.status(200).json(tournament);
  } catch (error) {
    console.error('Error updating tournament:', error);
    return res.status(500).json({ message: 'Internal server error updating tournament.' });
  }
});

// DELETE /api/tournaments/:id - Delete tournament (Admin)
router.delete('/:id', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Cascade deletion of teams and matches
    await Team.deleteMany({ tournamentId: tournament._id });
    await Match.deleteMany({ tournamentId: tournament._id });
    
    // Delete the tournament
    await Tournament.findByIdAndDelete(tournament._id);

    return res.status(200).json({ 
      message: 'Tournament and all associated teams and matches deleted successfully.' 
    });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return res.status(500).json({ message: 'Internal server error deleting tournament.' });
  }
});

export default router;
