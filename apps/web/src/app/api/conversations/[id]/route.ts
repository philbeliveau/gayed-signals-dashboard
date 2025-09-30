/**
 * Next.js API routes for individual conversation operations.
 *
 * These routes handle conversation-specific operations like retrieval,
 * updates, and deletion with Clerk authentication and cross-platform
 * compatibility for Story 1.0c.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { conversationService } from '@/lib/services/conversation-service'
import { z } from 'zod'

// Validation schemas
const updateStatusSchema = z.object({
  status: z.enum(['initialized', 'running', 'paused', 'completed', 'error', 'cancelled']),
  finalRecommendation: z.string().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  consensusReached: z.boolean().optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/conversations/[id]
 * Get specific conversation with all messages
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Authenticate user with Clerk
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    const conversationId = params.id

    // Validate conversation ID format (basic UUID check)
    if (!conversationId || conversationId.length < 10) {
      return NextResponse.json(
        { error: 'Invalid conversation ID format' },
        { status: 422 }
      )
    }

    // Get conversation with access control
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

    console.log(`✅ Retrieved conversation ${conversationId} via Next.js API for user ${userId}`)

    return NextResponse.json({
      conversation,
      messageCount: conversation.messages.length
    })

  } catch (error) {
    console.error('❌ Error retrieving conversation:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to retrieve conversation' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/conversations/[id]
 * Update conversation status and metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Authenticate user with Clerk
    const { userId } = auth()
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
    const validationResult = updateStatusSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 422 }
      )
    }

    const { status, finalRecommendation, confidenceScore, consensusReached } = validationResult.data

    // Update conversation with access control
    const updatedConversation = await conversationService.updateConversationStatus(
      conversationId,
      status,
      {
        finalRecommendation,
        confidenceScore,
        consensusReached,
        clerkId: userId
      }
    )

    console.log(`✅ Updated conversation ${conversationId} status to ${status} via Next.js API`)

    return NextResponse.json({
      conversation: updatedConversation,
      message: 'Conversation status updated successfully'
    })

  } catch (error) {
    console.error('❌ Error updating conversation:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/conversations/[id]
 * Delete conversation and all associated messages
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Authenticate user with Clerk
    const { userId } = auth()
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

    // Delete conversation with access control
    const success = await conversationService.deleteConversation(
      conversationId,
      userId
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      )
    }

    console.log(`✅ Deleted conversation ${conversationId} via Next.js API for user ${userId}`)

    return NextResponse.json({
      message: 'Conversation deleted successfully',
      conversationId,
      deletedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error deleting conversation:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}