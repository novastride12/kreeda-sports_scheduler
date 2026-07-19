"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'kreeda_super_secret_jwt_key_2026';
const authenticateAdmin = (req, res, next) => {
    try {
        let token = '';
        // Check cookie first
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        // Check Authorization header next (Bearer <token>)
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({ message: 'Authentication required. No token provided.' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.adminId = decoded.id;
        req.adminUsername = decoded.username;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: 'Invalid or expired authentication token.' });
    }
};
exports.authenticateAdmin = authenticateAdmin;
