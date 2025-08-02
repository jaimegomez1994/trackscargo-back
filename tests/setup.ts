import { prisma } from '../src/lib/prisma';

// Global test setup
beforeAll(async () => {
  // Clean up test database before starting
  await cleanupDatabase();
});

afterAll(async () => {
  // Clean up test database after all tests
  await cleanupDatabase();
  await prisma.$disconnect();
});

// Clean up database between test suites
beforeEach(async () => {
  await cleanupDatabase();
});

async function cleanupDatabase() {
  // Delete in reverse order of dependencies
  await prisma.travelEvent.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.userInvitation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

// Extend Jest matchers
expect.extend({
  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JWT`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid JWT`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidJWT(): R;
    }
  }
}