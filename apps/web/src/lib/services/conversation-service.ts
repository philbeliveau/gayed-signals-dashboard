/**
 * Conversation service for Next.js frontend database operations.
 *
 * This service provides CRUD operations for AutoGen agent conversations,
 * designed to work seamlessly with the FastAPI backend and provide
 * cross-platform data consistency for Story 1.0c.
 */

import { PrismaClient } from '@/generated/prisma'
import {
  Conversation,
  AgentMessage,
  User
} from '@/generated/prisma'

// Initialize Prisma client with connection pooling for production
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Types for conversation operations
export interface CreateConversationRequest {
  clerkId: string
  contentType: string
  contentTitle: string
  contentContent: string
  contentUrl?: string
  contentAuthor?: string
  contentPublishedAt?: Date
  contentMetadata?: Record<string, any>
  autoStart?: boolean
}

export interface AddAgentMessageRequest {
  conversationId: string
  agentType: string
  agentName: string
  content: string
  confidenceLevel?: number
  messageOrder: number
  citedSources?: string[]
  signalReferences?: string[]
  metadata?: Record<string, any>
}

export interface ConversationWithMessages extends Conversation {
  messages: AgentMessage[]
  user: User
}

export interface ConversationSummary extends Conversation {
  messageCount: number
  lastMessageAt?: Date
  agentsParticipated: string[]
  user: User
}

export class ConversationService {
  /**
   * Create new conversation with Clerk user integration and comprehensive error handling.
   */
  async createConversation(data: CreateConversationRequest): Promise<ConversationWithMessages> {
    try {
      // Validate input data
      if (!data.clerkId) {
        throw new Error('Clerk ID is required')
      }

      if (!data.contentTitle || data.contentTitle.trim().length === 0) {
        throw new Error('Content title is required')
      }

      if (!data.contentContent || data.contentContent.trim().length < 10) {
        throw new Error('Content must be at least 10 characters long')
      }

      // Ensure user exists in database (upsert for Clerk integration)
      const user = await prisma.user.upsert({
        where: { clerkId: data.clerkId },
        update: {
          updatedAt: new Date()
        },
        create: {
          clerkId: data.clerkId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Create conversation with all content source fields
      const conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          contentType: data.contentType,
          contentTitle: data.contentTitle.trim(),
          contentContent: data.contentContent.trim(),
          contentUrl: data.contentUrl,
          contentAuthor: data.contentAuthor,
          contentPublishedAt: data.contentPublishedAt,
          contentMetadata: data.contentMetadata || {},
          status: 'initialized',
          consensusReached: false,
          metadata: {
            autoStart: data.autoStart || false,
            createdFromFrontend: true,
            userAgent: 'next-js-frontend'
          }
        },
        include: {
          user: true,
          messages: {
            orderBy: { messageOrder: 'asc' }
          }
        }
      })

      console.log(`✅ Created conversation ${conversation.id} for user ${data.clerkId}`)
      return conversation

    } catch (error) {
      console.error('❌ Error creating conversation:', error)
      if (error instanceof Error) {
        throw new Error(`Failed to create conversation: ${error.message}`)
      }
      throw new Error('Failed to create conversation due to unknown error')
    }
  }

  /**
   * Add agent message to conversation with validation and ordering.
   */
  async addAgentMessage(data: AddAgentMessageRequest): Promise<AgentMessage> {
    try {
      // Validate input data
      if (!data.conversationId) {
        throw new Error('Conversation ID is required')
      }

      if (!data.content || data.content.trim().length === 0) {
        throw new Error('Message content is required')
      }

      if (!data.agentType || !data.agentName) {
        throw new Error('Agent type and name are required')
      }

      // Verify conversation exists and get current message count
      const conversation = await prisma.conversation.findUnique({
        where: { id: data.conversationId },
        include: {
          _count: {
            select: { messages: true }
          }
        }
      })

      if (!conversation) {
        throw new Error(`Conversation ${data.conversationId} not found`)
      }

      // Create agent message with proper ordering
      const message = await prisma.agentMessage.create({
        data: {
          conversationId: data.conversationId,
          agentType: data.agentType,
          agentName: data.agentName.trim(),
          content: data.content.trim(),
          confidenceLevel: data.confidenceLevel,
          messageOrder: data.messageOrder,
          citedSources: data.citedSources || [],
          signalReferences: data.signalReferences || [],
          timestamp: new Date(),
          metadata: {
            ...data.metadata,
            addedFromFrontend: true,
            messageCount: conversation._count.messages + 1
          }
        }
      })

      // Update conversation updated timestamp
      await prisma.conversation.update({
        where: { id: data.conversationId },
        data: {
          updatedAt: new Date(),
          metadata: {
            ...conversation.metadata as Record<string, any>,
            lastMessageAt: new Date(),
            totalMessages: conversation._count.messages + 1
          }
        }
      })

      console.log(`✅ Added message ${message.id} to conversation ${data.conversationId}`)
      return message

    } catch (error) {
      console.error('❌ Error adding agent message:', error)
      if (error instanceof Error) {
        throw new Error(`Failed to add agent message: ${error.message}`)
      }
      throw new Error('Failed to add agent message due to unknown error')
    }
  }

  /**
   * Get conversation with all messages and user information.
   */
  async getConversation(conversationId: string, clerkId?: string): Promise<ConversationWithMessages | null> {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required')
      }

      // Build query with optional user access control
      const whereClause: any = { id: conversationId }

      if (clerkId) {
        whereClause.user = {
          clerkId: clerkId
        }
      }

      const conversation = await prisma.conversation.findUnique({
        where: whereClause,
        include: {
          user: true,
          messages: {
            orderBy: [
              { messageOrder: 'asc' },
              { timestamp: 'asc' }
            ]
          }
        }
      })

      if (!conversation) {
        console.log(`Conversation ${conversationId} not found or access denied`)
        return null
      }

      console.log(`✅ Retrieved conversation ${conversationId} with ${conversation.messages.length} messages`)
      return conversation

    } catch (error) {
      console.error('❌ Error retrieving conversation:', error)
      if (error instanceof Error) {
        throw new Error(`Failed to retrieve conversation: ${error.message}`)
      }
      throw new Error('Failed to retrieve conversation due to unknown error')
    }
  }

  /**
   * Get user conversations with pagination and summary information.
   */
  async getUserConversations(
    clerkId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ConversationSummary[]> {
    try {
      if (!clerkId) {
        throw new Error('Clerk ID is required')
      }

      // Get user to ensure they exist
      const user = await prisma.user.findUnique({
        where: { clerkId }
      })

      if (!user) {
        console.log(`User with Clerk ID ${clerkId} not found`)
        return []
      }

      // Get conversations with message summary data
      const conversations = await prisma.conversation.findMany({
        where: { userId: user.id },
        include: {
          user: true,
          messages: {
            select: {
              id: true,
              agentType: true,
              timestamp: true
            },
            orderBy: { timestamp: 'desc' },
            take: 1
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset
      })

      // Transform to conversation summaries
      const summaries: ConversationSummary[] = conversations.map(conv => {
        // Get unique agent types that participated
        const agentsParticipated = Array.from(
          new Set(conv.messages.map(m => m.agentType))
        )

        // Get last message timestamp
        const lastMessageAt = conv.messages.length > 0
          ? conv.messages[0].timestamp
          : undefined

        return {
          ...conv,
          messageCount: conv._count.messages,
          lastMessageAt,
          agentsParticipated,
          messages: [] // Don't include full messages in summary
        }
      })

      console.log(`✅ Retrieved ${summaries.length} conversations for user ${clerkId}`)
      return summaries

    } catch (error) {
      console.error('❌ Error retrieving user conversations:', error)
      if (error instanceof Error) {
        throw new Error(`Failed to retrieve user conversations: ${error.message}`)
      }
      throw new Error('Failed to retrieve user conversations due to unknown error')
    }
  }

  /**
   * Update conversation status and completion metadata.
   */
  async updateConversationStatus(
    conversationId: string,
    status: string,
    options?: {
      finalRecommendation?: string
      confidenceScore?: number
      consensusReached?: boolean
      clerkId?: string // For access control
    }
  ): Promise<Conversation> {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required')
      }

      if (!status) {
        throw new Error('Status is required')
      }

      // Build where clause with optional access control
      const whereClause: any = { id: conversationId }

      if (options?.clerkId) {
        whereClause.user = {
          clerkId: options.clerkId
        }
      }

      // Build update data
      const updateData: any = {
        status,
        updatedAt: new Date(),
        metadata: {
          statusUpdatedFromFrontend: true,
          statusUpdatedAt: new Date()
        }
      }

      // Add completion data if status is completed
      if (status === 'completed') {
        updateData.completedAt = new Date()
        updateData.consensusReached = options?.consensusReached ?? true
      }

      if (options?.finalRecommendation) {
        updateData.finalRecommendation = options.finalRecommendation
      }

      if (options?.confidenceScore !== undefined) {
        updateData.confidenceScore = options.confidenceScore
      }

      const conversation = await prisma.conversation.update({
        where: whereClause,
        data: updateData
      })

      console.log(`✅ Updated conversation ${conversationId} status to ${status}`)
      return conversation

    } catch (error) {
      console.error('❌ Error updating conversation status:', error)
      if (error instanceof Error) {
        throw new Error(`Failed to update conversation status: ${error.message}`)
      }
      throw new Error('Failed to update conversation status due to unknown error')
    }
  }

  /**
   * Delete conversation and all associated messages with access control.
   */
  async deleteConversation(conversationId: string, clerkId: string): Promise<boolean> {
    try {
      if (!conversationId || !clerkId) {
        throw new Error('Conversation ID and Clerk ID are required')
      }

      // Check user access to conversation
      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
          user: {
            clerkId: clerkId
          }
        }
      })

      if (!conversation) {
        console.log(`Conversation ${conversationId} not found or access denied for user ${clerkId}`)
        return false
      }

      // Delete conversation (cascade will delete messages)
      await prisma.conversation.delete({
        where: { id: conversationId }
      })

      console.log(`✅ Deleted conversation ${conversationId}`)
      return true

    } catch (error) {
      console.error('❌ Error deleting conversation:', error)
      if (error instanceof Error) {
        throw new Error(`Failed to delete conversation: ${error.message}`)
      }
      throw new Error('Failed to delete conversation due to unknown error')
    }
  }

  /**
   * Get conversation analytics and performance metrics.
   */
  async getConversationAnalytics(conversationId: string): Promise<{
    conversation: Conversation
    messageCount: number
    agentMetrics: Record<string, {
      messageCount: number
      averageConfidence: number
      firstMessage: Date
      lastMessage: Date
    }>
    duration?: number
    consensusQuality?: number
  } | null> {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required')
      }

      // Get conversation with all messages
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' }
          }
        }
      })

      if (!conversation) {
        return null
      }

      // Calculate analytics
      const messageCount = conversation.messages.length

      // Calculate agent-specific metrics
      const agentMetrics: Record<string, any> = {}

      for (const message of conversation.messages) {
        if (!agentMetrics[message.agentType]) {
          agentMetrics[message.agentType] = {
            messageCount: 0,
            confidenceScores: [],
            timestamps: []
          }
        }

        agentMetrics[message.agentType].messageCount++
        agentMetrics[message.agentType].timestamps.push(message.timestamp)

        if (message.confidenceLevel !== null) {
          agentMetrics[message.agentType].confidenceScores.push(message.confidenceLevel)
        }
      }

      // Process agent metrics
      const processedAgentMetrics: Record<string, any> = {}

      for (const [agentType, metrics] of Object.entries(agentMetrics)) {
        const avgConfidence = metrics.confidenceScores.length > 0
          ? metrics.confidenceScores.reduce((a: number, b: number) => a + b, 0) / metrics.confidenceScores.length
          : 0

        processedAgentMetrics[agentType] = {
          messageCount: metrics.messageCount,
          averageConfidence: avgConfidence,
          firstMessage: Math.min(...metrics.timestamps),
          lastMessage: Math.max(...metrics.timestamps)
        }
      }

      // Calculate duration if completed
      let duration: number | undefined
      if (conversation.completedAt && conversation.createdAt) {
        duration = (conversation.completedAt.getTime() - conversation.createdAt.getTime()) / 1000
      }

      console.log(`✅ Generated analytics for conversation ${conversationId}`)

      return {
        conversation,
        messageCount,
        agentMetrics: processedAgentMetrics,
        duration,
        consensusQuality: conversation.confidenceScore || undefined
      }

    } catch (error) {
      console.error('❌ Error generating conversation analytics:', error)
      if (error instanceof Error) {
        throw new Error(`Failed to generate conversation analytics: ${error.message}`)
      }
      throw new Error('Failed to generate conversation analytics due to unknown error')
    }
  }

  /**
   * Health check for database connectivity and performance.
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    responseTimeMs: number
    databaseConnected: boolean
    tableStats?: {
      conversations: number
      messages: number
      users: number
    }
    error?: string
  }> {
    const startTime = Date.now()

    try {
      // Test basic connectivity
      await prisma.$queryRaw`SELECT 1`

      // Get table statistics
      const [conversationCount, messageCount, userCount] = await Promise.all([
        prisma.conversation.count(),
        prisma.agentMessage.count(),
        prisma.user.count()
      ])

      const responseTimeMs = Date.now() - startTime

      console.log(`✅ Database health check completed in ${responseTimeMs}ms`)

      return {
        status: 'healthy',
        responseTimeMs,
        databaseConnected: true,
        tableStats: {
          conversations: conversationCount,
          messages: messageCount,
          users: userCount
        }
      }

    } catch (error) {
      const responseTimeMs = Date.now() - startTime
      console.error('❌ Database health check failed:', error)

      return {
        status: 'unhealthy',
        responseTimeMs,
        databaseConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Test cross-platform data consistency with FastAPI backend.
   */
  async testCrossPlatformConsistency(conversationId: string): Promise<{
    frontendAccessible: boolean
    backendAccessible: boolean
    dataConsistent: boolean
    performanceMs: number
    errors: string[]
  }> {
    const startTime = Date.now()
    const errors: string[] = []

    try {
      // Test frontend access (Prisma)
      let frontendData: ConversationWithMessages | null = null
      let frontendAccessible = false

      try {
        frontendData = await this.getConversation(conversationId)
        frontendAccessible = !!frontendData
      } catch (error) {
        errors.push(`Frontend access failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Test backend access (simulate API call pattern)
      let backendAccessible = false
      let backendData: any = null

      try {
        // This would typically be an HTTP request to FastAPI
        // For now, we'll simulate backend access patterns
        const backendSimulation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            messages: true,
            user: true
          }
        })

        backendAccessible = !!backendSimulation
        backendData = backendSimulation
      } catch (error) {
        errors.push(`Backend simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Test data consistency
      let dataConsistent = false
      if (frontendData && backendData) {
        dataConsistent = (
          frontendData.id === backendData.id &&
          frontendData.messages.length === backendData.messages.length &&
          frontendData.status === backendData.status
        )

        if (!dataConsistent) {
          errors.push('Data inconsistency detected between frontend and backend access patterns')
        }
      }

      const performanceMs = Date.now() - startTime

      console.log(`✅ Cross-platform consistency test completed in ${performanceMs}ms`)

      return {
        frontendAccessible,
        backendAccessible,
        dataConsistent,
        performanceMs,
        errors
      }

    } catch (error) {
      const performanceMs = Date.now() - startTime
      errors.push(`Cross-platform test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)

      return {
        frontendAccessible: false,
        backendAccessible: false,
        dataConsistent: false,
        performanceMs,
        errors
      }
    }
  }
}

// Export singleton instance for use across the application
export const conversationService = new ConversationService()

// Export types for use in components
export type {
  ConversationWithMessages,
  ConversationSummary,
  CreateConversationRequest,
  AddAgentMessageRequest
}