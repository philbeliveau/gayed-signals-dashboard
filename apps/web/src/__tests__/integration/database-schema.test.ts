/**
 * Database Schema Integration Tests
 *
 * Tests validate:
 * - Schema constraints and relationships
 * - Data integrity and foreign key constraints
 * - Index performance for expected query patterns
 * - Pydantic model compatibility
 *
 * @jest-environment node
 */

import { PrismaClient } from '../../generated/prisma'

describe('Database Schema Integration Tests', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = new PrismaClient()
    // Ensure we're testing against a clean state
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up data before each test
    await prisma.agentMessage.deleteMany()
    await prisma.conversation.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('User Model', () => {
    it('should create user with Clerk integration', async () => {
      const user = await prisma.user.create({
        data: {
          clerkId: 'user_test_123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      })

      expect(user.id).toBeDefined()
      expect(user.clerkId).toBe('user_test_123')
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should enforce unique clerkId constraint', async () => {
      const userData = {
        clerkId: 'user_duplicate_test',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      }

      await prisma.user.create({ data: userData })

      await expect(
        prisma.user.create({ data: userData })
      ).rejects.toThrow()
    })

    it('should allow optional email, firstName, lastName', async () => {
      const user = await prisma.user.create({
        data: {
          clerkId: 'user_minimal_test',
        },
      })

      expect(user.email).toBeNull()
      expect(user.firstName).toBeNull()
      expect(user.lastName).toBeNull()
    })
  })

  describe('Conversation Model', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          clerkId: 'user_conv_test',
          email: 'conv@test.com',
        },
      })
    })

    it('should create conversation with required fields', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          userId: testUser.id,
          contentType: 'text',
          contentTitle: 'Test Analysis',
          contentContent: 'Sample content for analysis',
        },
      })

      expect(conversation.id).toBeDefined()
      expect(conversation.userId).toBe(testUser.id)
      expect(conversation.contentType).toBe('text')
      expect(conversation.contentTitle).toBe('Test Analysis')
      expect(conversation.contentContent).toBe('Sample content for analysis')
      expect(conversation.status).toBe('initialized') // default value
      expect(conversation.consensusReached).toBe(false) // default value
      expect(conversation.metadata).toEqual({}) // default value
    })

    it('should support all content types from Pydantic models', async () => {
      const contentTypes = ['text', 'substack_article', 'youtube_video']

      for (const contentType of contentTypes) {
        const conversation = await prisma.conversation.create({
          data: {
            userId: testUser.id,
            contentType,
            contentTitle: `Test ${contentType}`,
            contentContent: `Content for ${contentType}`,
          },
        })

        expect(conversation.contentType).toBe(contentType)
      }
    })

    it('should support conversation status transitions', async () => {
      const statuses = ['initialized', 'running', 'paused', 'completed', 'error', 'cancelled']

      for (const status of statuses) {
        const conversation = await prisma.conversation.create({
          data: {
            userId: testUser.id,
            contentType: 'text',
            contentTitle: `Test ${status}`,
            contentContent: 'Test content',
            status,
          },
        })

        expect(conversation.status).toBe(status)
      }
    })

    it('should enforce cascade delete on user deletion', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          userId: testUser.id,
          contentType: 'text',
          contentTitle: 'Test Cascade',
          contentContent: 'Test content',
        },
      })

      await prisma.user.delete({
        where: { id: testUser.id },
      })

      const deletedConversation = await prisma.conversation.findUnique({
        where: { id: conversation.id },
      })

      expect(deletedConversation).toBeNull()
    })

    it('should store complex metadata as JSON', async () => {
      const metadata = {
        debateRounds: 3,
        analysisDepth: 'comprehensive',
        signalContext: 'defensive',
        tags: ['federal-reserve', 'monetary-policy'],
      }

      const conversation = await prisma.conversation.create({
        data: {
          userId: testUser.id,
          contentType: 'substack_article',
          contentTitle: 'Complex Metadata Test',
          contentContent: 'Test content',
          metadata,
        },
      })

      expect(conversation.metadata).toEqual(metadata)
    })
  })

  describe('AgentMessage Model', () => {
    let testUser: any
    let testConversation: any

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          clerkId: 'user_msg_test',
          email: 'msg@test.com',
        },
      })

      testConversation = await prisma.conversation.create({
        data: {
          userId: testUser.id,
          contentType: 'text',
          contentTitle: 'Message Test Conversation',
          contentContent: 'Test content',
        },
      })
    })

    it('should create agent message with required fields', async () => {
      const message = await prisma.agentMessage.create({
        data: {
          conversationId: testConversation.id,
          agentType: 'financial_analyst',
          agentName: 'Financial Analyst',
          content: 'Test message content',
          messageOrder: 1,
        },
      })

      expect(message.id).toBeDefined()
      expect(message.conversationId).toBe(testConversation.id)
      expect(message.agentType).toBe('financial_analyst')
      expect(message.agentName).toBe('Financial Analyst')
      expect(message.content).toBe('Test message content')
      expect(message.messageOrder).toBe(1)
      expect(message.citedSources).toEqual([]) // default value
      expect(message.signalReferences).toEqual([]) // default value
      expect(message.metadata).toEqual({}) // default value
    })

    it('should support all agent types from Pydantic models', async () => {
      const agentTypes = ['financial_analyst', 'market_context', 'risk_challenger']

      for (let i = 0; i < agentTypes.length; i++) {
        const agentType = agentTypes[i]
        const message = await prisma.agentMessage.create({
          data: {
            conversationId: testConversation.id,
            agentType,
            agentName: `Test ${agentType}`,
            content: `Message from ${agentType}`,
            messageOrder: i + 1,
          },
        })

        expect(message.agentType).toBe(agentType)
      }
    })

    it('should store cited sources and signal references as arrays', async () => {
      const citedSources = ['Utilities/SPY Ratio: 0.91', 'VIX Signal: 3.2']
      const signalReferences = ['defensive_signal', 'utilities_spy_ratio']

      const message = await prisma.agentMessage.create({
        data: {
          conversationId: testConversation.id,
          agentType: 'financial_analyst',
          agentName: 'Financial Analyst',
          content: 'Analysis with sources',
          messageOrder: 1,
          citedSources,
          signalReferences,
        },
      })

      expect(message.citedSources).toEqual(citedSources)
      expect(message.signalReferences).toEqual(signalReferences)
    })

    it('should enforce cascade delete on conversation deletion', async () => {
      const message = await prisma.agentMessage.create({
        data: {
          conversationId: testConversation.id,
          agentType: 'financial_analyst',
          agentName: 'Test Agent',
          content: 'Test message',
          messageOrder: 1,
        },
      })

      await prisma.conversation.delete({
        where: { id: testConversation.id },
      })

      const deletedMessage = await prisma.agentMessage.findUnique({
        where: { id: message.id },
      })

      expect(deletedMessage).toBeNull()
    })

    it('should maintain message order within conversation', async () => {
      const messages = []

      // Create messages in reverse order to test ordering
      for (let i = 3; i >= 1; i--) {
        const message = await prisma.agentMessage.create({
          data: {
            conversationId: testConversation.id,
            agentType: 'financial_analyst',
            agentName: 'Test Agent',
            content: `Message ${i}`,
            messageOrder: i,
          },
        })
        messages.push(message)
      }

      const orderedMessages = await prisma.agentMessage.findMany({
        where: { conversationId: testConversation.id },
        orderBy: { messageOrder: 'asc' },
      })

      expect(orderedMessages).toHaveLength(3)
      expect(orderedMessages[0].messageOrder).toBe(1)
      expect(orderedMessages[1].messageOrder).toBe(2)
      expect(orderedMessages[2].messageOrder).toBe(3)
    })
  })

  describe('Relationships and Indexes', () => {
    let testUser: any
    let testConversation: any

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          clerkId: 'user_rel_test',
          email: 'rel@test.com',
        },
      })

      testConversation = await prisma.conversation.create({
        data: {
          userId: testUser.id,
          contentType: 'text',
          contentTitle: 'Relationship Test',
          contentContent: 'Test content',
        },
      })
    })

    it('should load user with conversations', async () => {
      const userWithConversations = await prisma.user.findUnique({
        where: { id: testUser.id },
        include: { conversations: true },
      })

      expect(userWithConversations).not.toBeNull()
      expect(userWithConversations!.conversations).toHaveLength(1)
      expect(userWithConversations!.conversations[0].id).toBe(testConversation.id)
    })

    it('should load conversation with user and messages', async () => {
      await prisma.agentMessage.create({
        data: {
          conversationId: testConversation.id,
          agentType: 'financial_analyst',
          agentName: 'Test Agent',
          content: 'Test message',
          messageOrder: 1,
        },
      })

      const conversationWithRelations = await prisma.conversation.findUnique({
        where: { id: testConversation.id },
        include: {
          user: true,
          messages: { orderBy: { messageOrder: 'asc' } },
        },
      })

      expect(conversationWithRelations).not.toBeNull()
      expect(conversationWithRelations!.user.id).toBe(testUser.id)
      expect(conversationWithRelations!.messages).toHaveLength(1)
    })

    it('should query conversations by status efficiently (indexed)', async () => {
      // Create multiple conversations with different statuses
      await Promise.all([
        prisma.conversation.create({
          data: {
            userId: testUser.id,
            contentType: 'text',
            contentTitle: 'Completed 1',
            contentContent: 'Content',
            status: 'completed',
          },
        }),
        prisma.conversation.create({
          data: {
            userId: testUser.id,
            contentType: 'text',
            contentTitle: 'Running 1',
            contentContent: 'Content',
            status: 'running',
          },
        }),
      ])

      const completedConversations = await prisma.conversation.findMany({
        where: { status: 'completed' },
        orderBy: { createdAt: 'desc' },
      })

      expect(completedConversations).toHaveLength(1)
      expect(completedConversations[0].status).toBe('completed')
    })

    it('should query user conversations efficiently (indexed)', async () => {
      const anotherUser = await prisma.user.create({
        data: {
          clerkId: 'user_another_test',
          email: 'another@test.com',
        },
      })

      await prisma.conversation.create({
        data: {
          userId: anotherUser.id,
          contentType: 'text',
          contentTitle: 'Another User Conversation',
          contentContent: 'Content',
        },
      })

      const userConversations = await prisma.conversation.findMany({
        where: { userId: testUser.id },
        orderBy: { createdAt: 'desc' },
      })

      expect(userConversations).toHaveLength(1)
      expect(userConversations[0].userId).toBe(testUser.id)
    })
  })

  describe('Data Validation and Constraints', () => {
    it('should validate contentTitle length constraint', async () => {
      const testUser = await prisma.user.create({
        data: { clerkId: 'user_validation_test' },
      })

      // Test maximum length (500 characters)
      const longTitle = 'a'.repeat(500)

      const conversation = await prisma.conversation.create({
        data: {
          userId: testUser.id,
          contentType: 'text',
          contentTitle: longTitle,
          contentContent: 'Test content',
        },
      })

      expect(conversation.contentTitle).toBe(longTitle)
    })

    it('should validate agentName length constraint', async () => {
      const testUser = await prisma.user.create({
        data: { clerkId: 'user_agent_test' },
      })

      const testConversation = await prisma.conversation.create({
        data: {
          userId: testUser.id,
          contentType: 'text',
          contentTitle: 'Agent Name Test',
          contentContent: 'Test content',
        },
      })

      // Test maximum length (100 characters)
      const longAgentName = 'a'.repeat(100)

      const message = await prisma.agentMessage.create({
        data: {
          conversationId: testConversation.id,
          agentType: 'financial_analyst',
          agentName: longAgentName,
          content: 'Test message',
          messageOrder: 1,
        },
      })

      expect(message.agentName).toBe(longAgentName)
    })

    it('should store confidence scores as floats', async () => {
      const testUser = await prisma.user.create({
        data: { clerkId: 'user_confidence_test' },
      })

      const testConversation = await prisma.conversation.create({
        data: {
          userId: testUser.id,
          contentType: 'text',
          contentTitle: 'Confidence Test',
          contentContent: 'Test content',
          confidenceScore: 0.75,
        },
      })

      const message = await prisma.agentMessage.create({
        data: {
          conversationId: testConversation.id,
          agentType: 'financial_analyst',
          agentName: 'Test Agent',
          content: 'Test message',
          messageOrder: 1,
          confidenceLevel: 0.82,
        },
      })

      expect(testConversation.confidenceScore).toBe(0.75)
      expect(message.confidenceLevel).toBe(0.82)
    })
  })
})