/**
 * Next.js API routes for conversation management.
 *
 * These routes provide CRUD operations for AutoGen agent conversations
 * from the frontend, working seamlessly with the FastAPI backend
 * through shared database access patterns for Story 1.0c.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { conversationService } from '@/lib/services/conversation-service'
import { z } from 'zod'

// Validation schemas
const createConversationSchema = z.object({
  contentType: z.string().min(1, 'Content type is required'),
  contentTitle: z.string().min(1, 'Content title is required').max(500, 'Title too long'),
  contentContent: z.string().min(10, 'Content must be at least 10 characters'),
  contentUrl: z.string().url().optional(),
  contentAuthor: z.string().max(200).optional(),
  contentPublishedAt: z.string().datetime().optional(),
  contentMetadata: z.record(z.any()).optional(),
  autoStart: z.boolean().optional().default(false)
})

const queryParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0)
})

/**
 * POST /api/conversations
 * Create a new conversation with Clerk authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user with Clerk
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createConversationSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 422 }
      )
    }

    const data = validationResult.data

    // Create conversation with Clerk integration
    const conversation = await conversationService.createConversation({
      clerkId: userId,
      contentType: data.contentType,
      contentTitle: data.contentTitle,
      contentContent: data.contentContent,
      contentUrl: data.contentUrl,
      contentAuthor: data.contentAuthor,
      contentPublishedAt: data.contentPublishedAt ? new Date(data.contentPublishedAt) : undefined,
      contentMetadata: data.contentMetadata,
      autoStart: data.autoStart
    })

    console.log(`✅ Created conversation ${conversation.id} via Next.js API for user ${userId}`)

    return NextResponse.json({
      conversation,
      message: 'Conversation created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error creating conversation:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/conversations
 * Get user conversations with pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user with Clerk
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = queryParamsSchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset')
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryValidation.error.errors
        },
        { status: 422 }
      )
    }

    const { limit, offset } = queryValidation.data

    // Get user conversations
    const conversations = await conversationService.getUserConversations(
      userId,
      limit,
      offset
    )

    console.log(`✅ Retrieved ${conversations.length} conversations via Next.js API for user ${userId}`)

    return NextResponse.json({
      conversations,
      pagination: {
        limit,
        offset,
        count: conversations.length
      }
    })

  } catch (error) {
    console.error('❌ Error retrieving conversations:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to retrieve conversations' },
      { status: 500 }
    )
  }
}