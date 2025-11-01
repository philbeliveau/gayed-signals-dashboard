/**
 * Prisma Client Configuration for AutoGen Financial Intelligence Demo
 *
 * Provides singleton pattern for Prisma client initialization with proper
 * connection management for both development and production environments.
 */

import { PrismaClient } from '../../generated/prisma'

declare global {
  var __prisma: PrismaClient | undefined
}

/**
 * Global Prisma client instance
 * Uses singleton pattern to prevent multiple connections in development
 */
const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
})

// Prevent multiple instances in development
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma
}

/**
 * Graceful shutdown handling
 * Ensures database connections are properly closed
 */
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

export { prisma }
export default prisma

/**
 * Type exports for convenient imports
 */
export type {
  User,
  Conversation,
  AgentMessage,
  Prisma
} from '../../generated/prisma'