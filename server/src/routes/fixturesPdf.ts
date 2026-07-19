import { Router, Response } from 'express';
import PDFDocument from 'pdfkit';
import { Tournament } from '../models/Tournament';
import { Match } from '../models/Match';

const router = Router({ mergeParams: true });

// GET /api/tournaments/:id/fixtures/pdf - Generate and download PDF fixtures (Public)
router.get('/', async (req, res) => {
  try {
    const { id } = req.params as any;
    const { sport } = req.query;

    if (!sport) {
      return res.status(400).json({ message: 'Sport category is required.' });
    }

    // Fetch tournament details
    const tournament = await Tournament.findById(id).populate('champions.team');
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Fetch all matches sorted by round and index
    const matches = await Match.find({ tournamentId: id, sport: String(sport) })
      .sort({ roundIndex: 1, matchIndex: 1 })
      .populate('team1')
      .populate('team2')
      .populate('winner');

    // Create PDF Document
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Set response headers to trigger file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Kreeda_${tournament.name.replace(/\s+/g, '_')}_Fixtures.pdf"`
    );

    // Stream PDF directly to Express response
    doc.pipe(res);

    // Draw header bar
    doc.rect(0, 0, 595.28, 100).fill('#121214');

    // Branding Title
    doc.fillColor('#D4AF37')
       .font('Helvetica-Bold')
       .fontSize(24)
       .text('K R E E D A', 40, 30);

    // Document Subtitle
    doc.fillColor('#F4F4F6')
       .font('Helvetica')
       .fontSize(10)
       .text('PREMIUM TOURNAMENT ARENA', 40, 58);

    // Print Date
    const printDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.fillColor('#A1A1A5')
       .font('Helvetica-Oblique')
       .fontSize(8)
       .text(`Generated on ${printDate}`, 430, 75, { width: 125, align: 'right' });

    // Tournament Details
    doc.fillColor('#0B0B0C')
       .font('Helvetica-Bold')
       .fontSize(18)
       .text(tournament.name, 40, 120);

    doc.fillColor('#7E7E82')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text(`Sport: `, 40, 142, { continued: true })
       .font('Helvetica')
       .fillColor('#0B0B0C')
       .text(String(sport), { continued: true })
       .font('Helvetica-Bold')
       .fillColor('#7E7E82')
       .text(`   |   Venue: `, { continued: true })
       .font('Helvetica')
       .fillColor('#0B0B0C')
       .text(tournament.venue || 'TBD', { continued: true })
       .font('Helvetica-Bold')
       .fillColor('#7E7E82')
       .text(`   |   Status: `, { continued: true })
       .font('Helvetica')
       .fillColor('#0B0B0C')
       .text(tournament.status.toUpperCase());

    // Horizontal Divider Line
    doc.moveTo(40, 160).lineTo(555, 160).strokeColor('#E5C060').lineWidth(1).stroke();

    if (matches.length === 0) {
      doc.fillColor('#7E7E82')
         .font('Helvetica-Oblique')
         .fontSize(12)
         .text('No bracket generated yet. Teams are still registering.', 40, 190);
      doc.end();
      return;
    }

    // Group matches by roundIndex
    const matchesByRound: { [key: number]: any[] } = {};
    matches.forEach(m => {
      if (!matchesByRound[m.roundIndex]) {
        matchesByRound[m.roundIndex] = [];
      }
      matchesByRound[m.roundIndex].push(m);
    });

    let currentY = 180;

    // Loop through each round
    const sortedRounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
    
    for (const rIndex of sortedRounds) {
      const roundMatches = matchesByRound[rIndex];
      const roundName = roundMatches[0].roundName;

      // Page break check (approximate height: round title (30px) + each match card (45px))
      const estimatedHeightNeeded = 30 + (roundMatches.length * 45);
      if (currentY + estimatedHeightNeeded > 780) {
        doc.addPage();
        currentY = 40;
      }

      // Round Header
      doc.rect(40, currentY, 515, 20).fill('#F4F4F6');
      doc.fillColor('#D4AF37')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text(roundName.toUpperCase(), 48, currentY + 5);
      
      currentY += 25;

      // Print matches in this round
      for (const match of roundMatches) {
        // Page break check for individual match card
        if (currentY + 45 > 800) {
          doc.addPage();
          currentY = 40;
        }

        // Left vertical indicator line based on status
        const isLive = match.status === 'live';
        const isCompleted = match.status === 'completed';
        const indicatorColor = isLive ? '#D9383A' : (isCompleted ? '#D4AF37' : '#7E7E82');

        doc.rect(40, currentY, 3, 35).fill(indicatorColor);

        // Teams text formatting
        const t1Name = match.team1 ? match.team1.name : (match.isBye ? 'BYE' : 'TBD');
        const t2Name = match.team2 ? match.team2.name : (match.isBye ? 'BYE' : 'TBD');

        doc.fillColor('#0B0B0C')
           .font('Helvetica-Bold')
           .fontSize(10)
           .text(`${t1Name}  vs  ${t2Name}`, 55, currentY + 5, { width: 300 });

        // Match Info (Date, Time, Venue)
        const dateStr = match.scheduledDate ? new Date(match.scheduledDate).toLocaleDateString() : '';
        const timeStr = match.scheduledTime || '';
        const venueStr = match.venue || '';
        const metaParts = [];
        if (dateStr) metaParts.push(dateStr);
        if (timeStr) metaParts.push(timeStr);
        if (venueStr) metaParts.push(venueStr);
        const metaText = metaParts.join(' @ ') || 'Schedule TBD';

        doc.fillColor('#7E7E82')
           .font('Helvetica')
           .fontSize(8)
           .text(metaText, 55, currentY + 20, { width: 300 });

        // Match Status and Score
        if (isCompleted) {
          doc.fillColor('#D4AF37')
             .font('Helvetica-Bold')
             .fontSize(10)
             .text(`FT: ${match.team1Score} - ${match.team2Score}`, 400, currentY + 12, { width: 140, align: 'right' });
        } else if (isLive) {
          doc.fillColor('#D9383A')
             .font('Helvetica-Bold')
             .fontSize(10)
             .text(`LIVE: ${match.team1Score} - ${match.team2Score}`, 400, currentY + 12, { width: 140, align: 'right' });
        } else if (match.isBye) {
          doc.fillColor('#7E7E82')
             .font('Helvetica-Oblique')
             .fontSize(9)
             .text('BYE ADVANCEMENT', 400, currentY + 12, { width: 140, align: 'right' });
        } else {
          doc.fillColor('#7E7E82')
             .font('Helvetica')
             .fontSize(9)
             .text('SCHEDULED', 400, currentY + 12, { width: 140, align: 'right' });
        }

        // Draw light bottom border
        doc.moveTo(40, currentY + 38).lineTo(555, currentY + 38).strokeColor('#F4F4F6').lineWidth(0.5).stroke();

        currentY += 42;
      }

      currentY += 15; // spacing between rounds
    }

    // Finalize PDF file
    doc.end();

  } catch (error) {
    console.error('Error generating PDF fixtures:', error);
    return res.status(500).json({ message: 'Internal server error generating PDF.' });
  }
});

export default router;
