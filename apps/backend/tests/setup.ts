import { beforeAll, afterAll } from 'vitest';
import { DBConnection } from '@suna/agentpress';

// Global test setup
beforeAll(async () => {
  // Initialize test database connection
  const db = DBConnection.getInstance();
  await db.initialize();
});

afterAll(async () => {
  // Cleanup after tests
  const db = DBConnection.getInstance();
  await db.close();
});
