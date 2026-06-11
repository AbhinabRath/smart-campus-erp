// =============================================================================
// Database Configuration - Prisma Client Singleton
// =============================================================================
// Creates and exports a single PrismaClient instance with the correct datasource.
// Using a singleton prevents multiple connections from being created during
// hot-reload development, which would exhaust the SQLite connection pool.
// The datasource URL is explicitly set to ensure the mini-service connects
// to the shared database even though it has its own prisma schema symlink.
// =============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:../../../db/custom.db',
    },
  },
});

export default prisma;
