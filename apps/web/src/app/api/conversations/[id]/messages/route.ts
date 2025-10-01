/**
 * Next.js API routes for conversation message operations.
 *
 * These routes handle adding agent messages to conversations
 * with validation, ordering, and cross-platform compatibility
 * for Story 1.0c.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { conversationService } from '@/lib/services/conversation-service'
import { z } from 'zod'

// Validation schema for adding agent messages
const addMessageSchema = z.object({
  agentType: z.enum(['financial_analyst', 'market_context', 'risk_challenger']),
  agentName: z.string().min(1, 'Agent name is required').max(100, 'Agent name too long'),
  content: z.string().min(1, 'Message content is required'),
  confidenceLevel: z.number().min(0).max(1).optional(),
  messageOrder: z.number().min(0, 'Message order must be non-negative'),
  citedSources: z.array(z.string()).optional().default([]),
  signalReferences: z.array(z.string()).optional().default([]),
  metadata: z.record(z.any()).optional().default({})
})

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/conversations/[id]/messages
 * Add a new agent message to the conversation
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // AUTH STRATEGY: Development Mode with Disabled Middleware
    let userId: string | null = null
    try {
      const authResult = await auth()
      userId = authResult.userId
    } catch (authError) {
      console.log('⚠️ Clerk auth not available - using development mode')
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    const conversationId = params.id

    // Validate conversation ID format
    if (!conversationId || conversationId.length < 10) {
      return NextResponse.json(
        { error: 'Invalid conversation ID format' },
        { status: 422 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = addMessageSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 422 }
      )
    }

    const messageData = validationResult.data

    // Verify user has access to conversation before adding message
    const conversation = await conversationService.getConversation(
      conversationId,
      userId
    )

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      )
    }

    // Add message to conversation
    const message = await conversationService.addAgentMessage({
      conversationId,
      agentType: messageData.agentType,
      agentName: messageData.agentName,
      content: messageData.content,
      confidenceLevel: messageData.confidenceLevel,
      messageOrder: messageData.messageOrder,
      citedSources: messageData.citedSources,
      signalReferences: messageData.signalReferences,
      metadata: {
        ...messageData.metadata,
        addedViaNextjsApi: true,
        addedByUserId: userId,
        addedAt: new Date().toISOString()
      }
    })

    console.log(`✅ Added message ${message.id} to conversation ${conversationId} via Next.js API`)

    return NextResponse.json({
      message,
      conversationId,
      agentType: message.agentType,
      messageOrder: message.messageOrder,
      successMessage: 'Agent message added successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error adding agent message:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to add agent message' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/conversations/[id]/messages
 * Get all messages for a conversation (alternative endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // AUTH STRATEGY: Development Mode with Disabled Middleware
    let userId: string | null = null
    try {
      const authResult = await auth()
      userId = authResult.userId
    } catch (authError) {
      console.log('⚠️ Clerk auth not available - using development mode')
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    const conversationId = params.id

    // Validate conversation ID format
    if (!conversationId || conversationId.length < 10) {
      return NextResponse.json(
        { error: 'Invalid conversation ID format' },
        { status: 422 }
      )
    }

    // Get conversation with messages and access control
    const conversation = await conversationService.getConversation(
      conversationId,
      userId
    )

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      )
    }

    // Extract messages with metadata
    const messages = conversation.messages.map(message => ({
      ...message,
      conversationTitle: conversation.contentTitle,
      conversationStatus: conversation.status
    }))

    console.log(`✅ Retrieved ${messages.length} messages for conversation ${conversationId} via Next.js API`)

    return NextResponse.json({
      messages,
      conversationId,
      messageCount: messages.length,
      conversationStatus: conversation.status,
      agentTypes: [...new Set(messages.map(m => m.agentType))]
    })

  } catch (error) {
    console.error('❌ Error retrieving conversation messages:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to retrieve conversation messages' },
      { status: 500 }
    )
  }
}