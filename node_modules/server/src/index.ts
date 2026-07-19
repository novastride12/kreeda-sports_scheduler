import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { Team } from './models/Team';

// Import routes
import authRoutes from './routes/auth';
import tournamentRoutes from './routes/tournaments';
import teamRoutes from './routes/teams';
import bracketRoutes from './routes/bracket';
import matchRoutes from './routes/matches';
import pdfRoutes from './routes/fixturesPdf';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Connect Database
connectDB().then(() => {
  Team.cleanIndexes().then(() => {
    console.log('Team indexes synced successfully.');
  }).catch(err => {
    console.error('Error syncing Team indexes:', err);
  });
});

// Middleware
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Kreeda Server is running smoothly.' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/tournaments/:id/teams', teamRoutes);
app.use('/api/tournaments/:id/bracket', bracketRoutes);
app.use('/api/tournaments/:id/matches', matchRoutes);
app.use('/api/tournaments/:id/fixtures/pdf', pdfRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ message: 'Internal server error occurred.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`Kreeda API Server started on port ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`CORS allowed origin: ${CLIENT_URL}`);
  console.log(`========================================`);
});
