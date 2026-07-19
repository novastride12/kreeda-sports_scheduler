import { Router, Response } from 'express';
import xlsx from 'xlsx';
import { Tournament } from '../models/Tournament';
import { Team } from '../models/Team';
import { Match } from '../models/Match';
import { authenticateAdmin, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true }); // Enable mergeParams to access :id (tournamentId) from parent router

// GET /api/tournaments/:id/teams - Get all teams for a tournament (Public)
router.get('/', async (req, res) => {
  try {
    const { id } = req.params as any;
    const { sport } = req.query;
    const filter: any = { tournamentId: id };
    if (sport) {
      filter.sport = String(sport);
    }
    const teams = await Team.find(filter).sort({ name: 1 });
    return res.status(200).json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return res.status(500).json({ message: 'Internal server error fetching teams.' });
  }
});

// POST /api/tournaments/:id/teams/upload - Excel/CSV Upload (Admin)
router.post('/upload', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params as any;
    const { file, fileName, sport } = req.body;

    if (!file) {
      return res.status(400).json({ message: 'No file data provided.' });
    }

    if (!sport) {
      return res.status(400).json({ message: 'Sport category is required.' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Check if bracket matches already exist for this sport
    const matchesExist = await Match.exists({ tournamentId: id, sport });
    if (matchesExist) {
      return res.status(400).json({ 
        message: 'Teams cannot be modified because the bracket has already been generated for this sport.' 
      });
    }

    // Decode base64 buffer
    const fileBuffer = Buffer.from(file, 'base64');
    
    // Parse using SheetJS (xlsx)
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (rawData.length === 0) {
      return res.status(400).json({ message: 'The uploaded file is empty.' });
    }

    // Parse headers
    const headerRow = rawData[0].map(h => String(h).trim().toLowerCase());
    
    // Find column indexes
    const nameIndex = headerRow.findIndex(h => h.includes('name'));
    const codeIndex = headerRow.findIndex(h => h.includes('code'));
    const captainIndex = headerRow.findIndex(h => h.includes('captain'));

    if (nameIndex === -1) {
      return res.status(400).json({ 
        message: 'Could not find a "Team Name" column in the Excel/CSV file.' 
      });
    }

    const parsedTeams: Array<{ name: string; code?: string; captainName?: string }> = [];
    const errors: string[] = [];
    const nameSet = new Set<string>();

    // Fetch existing teams to check database duplicates
    const existingTeams = await Team.find({ tournamentId: id, sport });
    const existingNames = new Set(existingTeams.map(t => t.name.toLowerCase()));

    // Iterate through data rows
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const teamName = row[nameIndex] ? String(row[nameIndex]).trim() : '';
      const code = codeIndex !== -1 && row[codeIndex] ? String(row[codeIndex]).trim() : '';
      const captainName = captainIndex !== -1 && row[captainIndex] ? String(row[captainIndex]).trim() : '';

      // Skip fully empty rows
      if (!teamName && !code && !captainName) continue;

      if (!teamName) {
        errors.push(`Row ${i + 1}: Team Name is missing.`);
        continue;
      }

      const lowerName = teamName.toLowerCase();

      // Check duplicates in the Excel file
      if (nameSet.has(lowerName)) {
        errors.push(`Row ${i + 1}: Duplicate team name "${teamName}" in file.`);
        continue;
      }

      // Check duplicates in the database
      if (existingNames.has(lowerName)) {
        errors.push(`Row ${i + 1}: Team "${teamName}" already exists for this sport in this tournament.`);
        continue;
      }

      nameSet.add(lowerName);
      parsedTeams.push({
        name: teamName,
        code: code || undefined,
        captainName: captainName || undefined,
      });
    }

    return res.status(200).json({
      success: errors.length === 0,
      teams: parsedTeams,
      errors,
    });
  } catch (error) {
    console.error('Error parsing team upload:', error);
    return res.status(500).json({ message: 'Internal server error parsing Excel file.' });
  }
});

// POST /api/tournaments/:id/teams/batch - Save a list of teams (Admin)
router.post('/batch', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params as any;
    const { teams, sport } = req.body; // Array of { name, code, captainName }

    if (!sport) {
      return res.status(400).json({ message: 'Sport category is required.' });
    }

    if (!Array.isArray(teams) || teams.length === 0) {
      return res.status(400).json({ message: 'Teams list is empty or invalid.' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Check if bracket matches already exist for this sport
    const matchesExist = await Match.exists({ tournamentId: id, sport });
    if (matchesExist) {
      return res.status(400).json({ 
        message: 'Teams cannot be modified because the bracket has already been generated for this sport.' 
      });
    }

    // Insert teams
    const teamsToCreate = teams.map(t => ({
      tournamentId: id,
      sport,
      name: t.name.trim(),
      code: t.code ? t.code.trim() : undefined,
      captainName: t.captainName ? t.captainName.trim() : undefined,
    }));

    const createdTeams = await Team.insertMany(teamsToCreate);
    return res.status(201).json({
      message: `${createdTeams.length} teams imported successfully.`,
      teams: createdTeams,
    });
  } catch (error: any) {
    console.error('Error saving batch teams:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'One or more team names already exist for this sport in this tournament.' });
    }
    return res.status(500).json({ message: 'Internal server error saving teams.' });
  }
});

// DELETE /api/tournaments/:id/teams/:teamId - Remove a specific team (Admin)
router.delete('/:teamId', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, teamId } = req.params as any;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    const team = await Team.findOne({ _id: teamId, tournamentId: id });
    if (!team) {
      return res.status(404).json({ message: 'Team not found in this tournament.' });
    }

    // Check if bracket matches already exist for this team's sport
    const matchesExist = await Match.exists({ tournamentId: id, sport: team.sport });
    if (matchesExist) {
      return res.status(400).json({ 
        message: 'Teams cannot be removed because the bracket has already been generated for this sport.' 
      });
    }

    await team.deleteOne();
    return res.status(200).json({ message: `Team "${team.name}" removed successfully.` });
  } catch (error) {
    console.error('Error deleting team:', error);
    return res.status(500).json({ message: 'Internal server error removing team.' });
  }
});

// DELETE /api/tournaments/:id/teams - Remove all teams for a specific sport category (Admin)
router.delete('/', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params as any;
    const { sport } = req.query;

    if (!sport) {
      return res.status(400).json({ message: 'Sport category is required to clear teams.' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Check if bracket matches already exist for this sport
    const matchesExist = await Match.exists({ tournamentId: id, sport: String(sport) });
    if (matchesExist) {
      return res.status(400).json({ 
        message: 'Teams cannot be cleared because the bracket has already been generated for this sport.' 
      });
    }

    const deleteResult = await Team.deleteMany({ tournamentId: id, sport: String(sport) });
    return res.status(200).json({ 
      message: `All teams (${deleteResult.deletedCount}) removed successfully for sport "${sport}".` 
    });
  } catch (error) {
    console.error('Error deleting all teams:', error);
    return res.status(500).json({ message: 'Internal server error removing all teams.' });
  }
});

export default router;
