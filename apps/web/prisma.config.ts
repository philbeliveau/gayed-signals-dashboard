// Prisma Configuration File
// Replaces deprecated package.json#prisma configuration

export default {
  migrations: {
    // Seed configuration - replaces deprecated package.json prisma.seed
    seed: 'npx tsx prisma/seed.ts',
  },
}