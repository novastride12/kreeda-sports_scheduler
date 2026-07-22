"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const Team_1 = require("./models/Team");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const tournaments_1 = __importDefault(require("./routes/tournaments"));
const teams_1 = __importDefault(require("./routes/teams"));
const bracket_1 = __importDefault(require("./routes/bracket"));
const matches_1 = __importDefault(require("./routes/matches"));
const fixturesPdf_1 = __importDefault(require("./routes/fixturesPdf"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
// Connect Database
if (!process.env.VERCEL) {
    (0, db_1.connectDB)().then(() => {
        Team_1.Team.cleanIndexes().then(() => {
            console.log('Team indexes synced successfully.');
        }).catch(err => {
            console.error('Error syncing Team indexes:', err);
        });
    });
}
// Database connection middleware for serverless environments
app.use(async (req, res, next) => {
    try {
        await (0, db_1.connectDB)();
        next();
    }
    catch (err) {
        next(err);
    }
});
// Middleware
app.use((0, cors_1.default)({
    origin: CLIENT_URL,
    credentials: true,
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Kreeda Server is running smoothly.' });
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/tournaments', tournaments_1.default);
app.use('/api/tournaments/:id/teams', teams_1.default);
app.use('/api/tournaments/:id/bracket', bracket_1.default);
app.use('/api/tournaments/:id/matches', matches_1.default);
app.use('/api/tournaments/:id/fixtures/pdf', fixturesPdf_1.default);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ message: 'Internal server error occurred.' });
});
// Start Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`========================================`);
        console.log(`Kreeda API Server started on port ${PORT}`);
        console.log(`URL: http://localhost:${PORT}`);
        console.log(`CORS allowed origin: ${CLIENT_URL}`);
        console.log(`========================================`);
    });
}
exports.default = app;
