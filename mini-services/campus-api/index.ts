// =============================================================================
// Smart Campus ERP - Express.js Backend Server
// =============================================================================
// Main entry point for the campus ERP API server. Configures Express with:
//   - CORS (allows gateway routing from the Next.js frontend)
//   - Dual auth: cookie-based + Authorization header (for iframe/cross-site)
//   - JSON body parsing for API requests
//   - Multer for file upload handling
//   - Static file serving for uploaded materials
//   - Centralized route registration
//   - Global error handler
//
// The server runs as a mini-service on port 3001 and is accessed by the
// Next.js frontend through the Caddy gateway via XTransformPort query param.
//
// IMPORTANT: express-session was REMOVED because it conflicted with the custom
// auth system. Both used the same cookie name 'campus_session', causing
// express-session to parse/overwrite the custom auth token. The custom auth
// system (UUID tokens in DB + httpOnly cookies) is the sole auth mechanism.
// =============================================================================

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import prisma from './config/database';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// CORS Configuration
// Allow all origins since the Caddy gateway handles external routing.
// Credentials must be true for cookies (session token) to be sent cross-origin.
app.use(cors({
  origin: true,
  credentials: true,
}));

// JSON body parser for API request bodies
// 10MB limit matches the file upload limit to handle JSON with embedded data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser — required for req.cookies to work in auth middleware.
// Without this, req.cookies would be undefined and session token lookup would fail.
app.use(cookieParser());

// Serve uploaded files statically so they can be downloaded directly
// The uploads/ directory contains assignment attachments and study materials
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =============================================================================
// ROUTE REGISTRATION
// =============================================================================

// Health check endpoint — useful for monitoring and gateway health checks
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Smart Campus ERP API is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount all API routes under /api prefix
app.use('/api', routes);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Global error handler — must be registered AFTER all routes.
// Catches unhandled errors and returns consistent JSON error responses.
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer() {
  try {
    // Verify database connection before starting the server
    await prisma.$connect();
    console.log('[Database] Connected to MySQL database successfully.');

    app.listen(PORT, () => {
      console.log(`[Server] Smart Campus ERP API running on port ${PORT}`);
      console.log(`[Server] Health check available on port ${PORT}`);
    });
  } catch (error) {
    console.error('[Database] Failed to connect:', error);
    process.exit(1);
  }
}

// Graceful shutdown: close DB connection when the process exits
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('[Database] Connection closed.');
});

startServer();

