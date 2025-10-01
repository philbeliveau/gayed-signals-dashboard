/**
 * Next.js API routes for unified conversation export functionality.
 *
 * Provides professional export capabilities for agent conversations
 * in multiple formats (PDF, JSON, TXT, Excel) with comprehensive
 * signal context and market data integration for Story 3.1.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { conversationService } from '@/lib/services/conversation-service'
import { signalService } from '@/domains/trading-signals/services/signalService'
import { z } from 'zod'

// Export format validation schema
const exportRequestSchema = z.object({
  format: z.enum(['pdf', 'json', 'txt', 'excel', 'markdown']),
  includeSignalContext: z.boolean().optional().default(true),
  includeMarketData: z.boolean().optional().default(true),
  includeMetrics: z.boolean().optional().default(true),
  clientPresentation: z.boolean().optional().default(false),
  partnershipMode: z.boolean().optional().default(false),
  customBranding: z.object({
    companyName: z.string().optional(),
    logoUrl: z.string().url().optional(),
    primaryColor: z.string().optional()
  }).optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

interface ExportMetadata {
  exportDate: string
  exportFormat: string
  conversationId: string
  userId: string
  includeSignalContext: boolean
  includeMarketData: boolean
  processingTime?: number
}

interface SignalContext {
  currentSignals: any[]
  marketConditions: {
    consensus: any
    calculatedAt: string
    dataSource: string
  }
  riskMetrics: {
    overallRisk: string
    signalCount: number
    strongSignals: number
  }
  lastUpdated: string
}

/**
 * GET /api/conversations/[id]/export
 * Export conversation in specified format with comprehensive context
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now()

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
    const { searchParams } = new URL(request.url)

    // Validate conversation ID format
    if (!conversationId || conversationId.length < 10) {
      return NextResponse.json(
        { error: 'Invalid conversation ID format' },
        { status: 422 }
      )
    }

    // Parse and validate query parameters
    const exportParams = {
      format: searchParams.get('format') || 'json',
      includeSignalContext: searchParams.get('includeSignalContext') !== 'false',
      includeMarketData: searchParams.get('includeMarketData') !== 'false',
      includeMetrics: searchParams.get('includeMetrics') !== 'false',
      clientPresentation: searchParams.get('clientPresentation') === 'true',
      partnershipMode: searchParams.get('partnershipMode') === 'true'
    }

    const validationResult = exportRequestSchema.safeParse(exportParams)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid export parameters',
          details: validationResult.error.errors
        },
        { status: 422 }
      )
    }

    const exportRequest = validationResult.data

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

    // Get signal context if requested
    let signalContext: SignalContext | null = null
    if (exportRequest.includeSignalContext) {
      try {
        const signalResult = await signalService.calculateAllSignals({ useCache: true })
        signalContext = {
          currentSignals: signalResult.signals,
          marketConditions: {
            consensus: signalResult.consensus,
            calculatedAt: signalResult.metadata.calculatedAt,
            dataSource: signalResult.metadata.dataSource
          },
          riskMetrics: {
            overallRisk: signalResult.consensus.risk,
            signalCount: signalResult.signals.length,
            strongSignals: signalResult.signals.filter(s => s.strength === 'strong').length
          },
          lastUpdated: signalResult.metadata.calculatedAt
        }
      } catch (error) {
        console.warn('⚠️ Signal context unavailable for export:', error)
        signalContext = {
          currentSignals: [],
          marketConditions: {
            consensus: null,
            calculatedAt: new Date().toISOString(),
            dataSource: 'unavailable'
          },
          riskMetrics: {
            overallRisk: 'unknown',
            signalCount: 0,
            strongSignals: 0
          },
          lastUpdated: new Date().toISOString()
        }
      }
    }

    // Create export metadata
    const metadata: ExportMetadata = {
      exportDate: new Date().toISOString(),
      exportFormat: exportRequest.format,
      conversationId,
      userId,
      includeSignalContext: exportRequest.includeSignalContext,
      includeMarketData: exportRequest.includeMarketData,
      processingTime: Date.now() - startTime
    }

    // Generate export content based on format
    let exportContent: any
    let contentType: string
    let filename: string

    switch (exportRequest.format) {
      case 'json':
        exportContent = generateJSONExport(conversation, signalContext, metadata, exportRequest)
        contentType = 'application/json'
        filename = `conversation-${conversationId}-${Date.now()}.json`
        break

      case 'txt':
        exportContent = generateTextExport(conversation, signalContext, metadata, exportRequest)
        contentType = 'text/plain'
        filename = `conversation-${conversationId}-${Date.now()}.txt`
        break

      case 'markdown':
        exportContent = generateMarkdownExport(conversation, signalContext, metadata, exportRequest)
        contentType = 'text/markdown'
        filename = `conversation-${conversationId}-${Date.now()}.md`
        break

      case 'pdf':
        // For PDF, return JSON with processing instruction for client-side generation
        exportContent = {
          type: 'pdf-generation-data',
          conversation,
          signalContext,
          metadata,
          exportRequest,
          message: 'PDF generation data - process client-side with jsPDF'
        }
        contentType = 'application/json'
        filename = `conversation-${conversationId}-pdf-data.json`
        break

      case 'excel':
        // For Excel, return structured data for client-side generation
        exportContent = generateExcelData(conversation, signalContext, metadata, exportRequest)
        contentType = 'application/json'
        filename = `conversation-${conversationId}-excel-data.json`
        break

      default:
        exportContent = generateJSONExport(conversation, signalContext, metadata, exportRequest)
        contentType = 'application/json'
        filename = `conversation-${conversationId}-${Date.now()}.json`
    }

    console.log(`✅ Generated ${exportRequest.format} export for conversation ${conversationId} (${Date.now() - startTime}ms)`)

    // Set appropriate headers for download
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })

    // Return export content
    if (typeof exportContent === 'string') {
      return new NextResponse(exportContent, { headers })
    } else {
      return new NextResponse(JSON.stringify(exportContent, null, 2), { headers })
    }

  } catch (error) {
    console.error('❌ Error generating conversation export:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
          processingTime: Date.now() - startTime
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to generate export',
        processingTime: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

/**
 * Generate comprehensive JSON export with all context
 */
function generateJSONExport(
  conversation: any,
  signalContext: SignalContext | null,
  metadata: ExportMetadata,
  exportRequest: any
) {
  return {
    metadata,
    conversation: {
      id: conversation.id,
      status: conversation.status,
      contentType: conversation.contentType,
      contentTitle: conversation.contentTitle,
      contentAuthor: conversation.contentAuthor,
      contentUrl: conversation.contentUrl,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      finalRecommendation: conversation.finalRecommendation,
      confidenceScore: conversation.confidenceScore,
      consensusReached: conversation.consensusReached
    },
    messages: conversation.messages.map((message: any) => ({
      id: message.id,
      agentType: message.agentType,
      content: message.content,
      confidence: message.confidence,
      timestamp: message.timestamp,
      messageOrder: message.messageOrder,
      reasoning: message.reasoning,
      citations: message.citations
    })),
    signalContext: exportRequest.includeSignalContext ? signalContext : null,
    analytics: {
      messageCount: conversation.messages.length,
      averageConfidence: calculateAverageConfidence(conversation.messages),
      conversationDuration: calculateConversationDuration(conversation),
      agentParticipation: analyzeAgentParticipation(conversation.messages)
    },
    exportSettings: exportRequest
  }
}

/**
 * Generate professional text export for compliance
 */
function generateTextExport(
  conversation: any,
  signalContext: SignalContext | null,
  metadata: ExportMetadata,
  exportRequest: any
): string {
  const lines: string[] = []

  // Header
  lines.push('AUTOGEN FINANCIAL INTELLIGENCE CONVERSATION EXPORT')
  lines.push('=' .repeat(60))
  lines.push('')

  // Metadata
  lines.push(`Export Date: ${new Date(metadata.exportDate).toLocaleString()}`)
  lines.push(`Conversation ID: ${conversation.id}`)
  lines.push(`Content Type: ${conversation.contentType}`)
  lines.push(`Content Title: ${conversation.contentTitle}`)
  if (conversation.contentAuthor) {
    lines.push(`Content Author: ${conversation.contentAuthor}`)
  }
  if (conversation.contentUrl) {
    lines.push(`Content URL: ${conversation.contentUrl}`)
  }
  lines.push(`Status: ${conversation.status}`)
  lines.push(`Created: ${new Date(conversation.createdAt).toLocaleString()}`)
  lines.push('')

  // Conversation Summary
  lines.push('CONVERSATION SUMMARY')
  lines.push('-' .repeat(30))
  lines.push(`Messages: ${conversation.messages.length}`)
  lines.push(`Final Recommendation: ${conversation.finalRecommendation || 'Not available'}`)
  lines.push(`Confidence Score: ${conversation.confidenceScore ? Math.round(conversation.confidenceScore * 100) + '%' : 'Not available'}`)
  lines.push(`Consensus Reached: ${conversation.consensusReached ? 'Yes' : 'No'}`)
  lines.push('')

  // Signal Context
  if (exportRequest.includeSignalContext && signalContext) {
    lines.push('MARKET SIGNAL CONTEXT')
    lines.push('-' .repeat(30))
    lines.push(`Last Updated: ${new Date(signalContext.lastUpdated).toLocaleString()}`)
    lines.push(`Active Signals: ${signalContext.currentSignals.length}`)
    lines.push('')
  }

  // Agent Conversation
  lines.push('AGENT CONVERSATION TRANSCRIPT')
  lines.push('-' .repeat(40))
  lines.push('')

  conversation.messages.forEach((message: any, index: number) => {
    lines.push(`${index + 1}. ${message.agentType} Agent`)
    lines.push(`   Time: ${new Date(message.timestamp).toLocaleString()}`)
    lines.push(`   Confidence: ${message.confidence ? Math.round(message.confidence * 100) + '%' : 'N/A'}`)
    lines.push('')
    lines.push(`   ${message.content}`)
    lines.push('')
    if (message.reasoning) {
      lines.push(`   Reasoning: ${message.reasoning}`)
      lines.push('')
    }
    lines.push('-' .repeat(40))
    lines.push('')
  })

  // Footer
  lines.push('Generated by AutoGen Financial Intelligence Platform')
  lines.push(`Processing Time: ${metadata.processingTime}ms`)
  lines.push(`Export Format: ${metadata.exportFormat.toUpperCase()}`)

  return lines.join('\n')
}

/**
 * Generate professional Markdown export
 */
function generateMarkdownExport(
  conversation: any,
  signalContext: SignalContext | null,
  metadata: ExportMetadata,
  exportRequest: any
): string {
  const lines: string[] = []

  // Header
  lines.push('# AutoGen Financial Intelligence Analysis')
  lines.push('')
  lines.push(`**Export Date:** ${new Date(metadata.exportDate).toLocaleString()}`)
  lines.push(`**Conversation ID:** ${conversation.id}`)
  lines.push(`**Content Type:** ${conversation.contentType}`)
  lines.push(`**Status:** ${conversation.status}`)
  lines.push('')

  // Content Information
  lines.push('## Content Analysis')
  lines.push('')
  lines.push(`**Title:** ${conversation.contentTitle}`)
  if (conversation.contentAuthor) {
    lines.push(`**Author:** ${conversation.contentAuthor}`)
  }
  if (conversation.contentUrl) {
    lines.push(`**Source:** [Link](${conversation.contentUrl})`)
  }
  lines.push(`**Created:** ${new Date(conversation.createdAt).toLocaleString()}`)
  lines.push('')

  // Summary
  lines.push('## Analysis Summary')
  lines.push('')
  lines.push(`- **Messages:** ${conversation.messages.length}`)
  lines.push(`- **Final Recommendation:** ${conversation.finalRecommendation || 'Not available'}`)
  lines.push(`- **Confidence Score:** ${conversation.confidenceScore ? Math.round(conversation.confidenceScore * 100) + '%' : 'Not available'}`)
  lines.push(`- **Consensus Reached:** ${conversation.consensusReached ? 'Yes' : 'No'}`)
  lines.push('')

  // Signal Context
  if (exportRequest.includeSignalContext && signalContext) {
    lines.push('## Market Signal Context')
    lines.push('')
    lines.push(`**Last Updated:** ${new Date(signalContext.lastUpdated).toLocaleString()}`)
    lines.push(`**Active Signals:** ${signalContext.currentSignals.length}`)
    lines.push('')
  }

  // Agent Conversation
  lines.push('## Agent Conversation')
  lines.push('')

  conversation.messages.forEach((message: any, index: number) => {
    lines.push(`### ${message.agentType} Agent`)
    lines.push('')
    lines.push(`**Time:** ${new Date(message.timestamp).toLocaleString()}`)
    lines.push(`**Confidence:** ${message.confidence ? Math.round(message.confidence * 100) + '%' : 'N/A'}`)
    lines.push('')
    lines.push(message.content)
    lines.push('')
    if (message.reasoning) {
      lines.push(`**Reasoning:** ${message.reasoning}`)
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  })

  // Footer
  lines.push('*Generated by AutoGen Financial Intelligence Platform*')
  lines.push('')
  lines.push(`*Processing Time: ${metadata.processingTime}ms*`)

  return lines.join('\n')
}

/**
 * Generate Excel-compatible data structure
 */
function generateExcelData(
  conversation: any,
  signalContext: SignalContext | null,
  metadata: ExportMetadata,
  exportRequest: any
) {
  return {
    type: 'excel-data',
    sheets: {
      'Summary': {
        headers: ['Property', 'Value'],
        data: [
          ['Conversation ID', conversation.id],
          ['Content Type', conversation.contentType],
          ['Content Title', conversation.contentTitle],
          ['Status', conversation.status],
          ['Created', conversation.createdAt],
          ['Messages', conversation.messages.length],
          ['Final Recommendation', conversation.finalRecommendation || 'Not available'],
          ['Confidence Score', conversation.confidenceScore ? Math.round(conversation.confidenceScore * 100) + '%' : 'Not available'],
          ['Consensus Reached', conversation.consensusReached ? 'Yes' : 'No']
        ]
      },
      'Messages': {
        headers: ['Order', 'Agent Type', 'Timestamp', 'Confidence', 'Content', 'Reasoning'],
        data: conversation.messages.map((message: any) => [
          message.messageOrder,
          message.agentType,
          new Date(message.timestamp).toLocaleString(),
          message.confidence ? Math.round(message.confidence * 100) + '%' : 'N/A',
          message.content,
          message.reasoning || ''
        ])
      },
      'Analytics': {
        headers: ['Metric', 'Value'],
        data: [
          ['Total Messages', conversation.messages.length],
          ['Average Confidence', calculateAverageConfidence(conversation.messages) + '%'],
          ['Conversation Duration', calculateConversationDuration(conversation)],
          ['Export Date', new Date(metadata.exportDate).toLocaleString()],
          ['Processing Time', metadata.processingTime + 'ms']
        ]
      }
    }
  }
}

/**
 * Calculate average confidence across all messages
 */
function calculateAverageConfidence(messages: any[]): number {
  const confidences = messages
    .filter(m => m.confidence !== null && m.confidence !== undefined)
    .map(m => m.confidence)

  if (confidences.length === 0) return 0

  const average = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
  return Math.round(average * 100)
}

/**
 * Calculate conversation duration
 */
function calculateConversationDuration(conversation: any): string {
  if (!conversation.messages || conversation.messages.length < 2) {
    return 'N/A'
  }

  const firstMessage = conversation.messages[0]
  const lastMessage = conversation.messages[conversation.messages.length - 1]

  const startTime = new Date(firstMessage.timestamp).getTime()
  const endTime = new Date(lastMessage.timestamp).getTime()
  const durationMs = endTime - startTime

  const minutes = Math.floor(durationMs / 60000)
  const seconds = Math.floor((durationMs % 60000) / 1000)

  return `${minutes}m ${seconds}s`
}

/**
 * Analyze agent participation
 */
function analyzeAgentParticipation(messages: any[]): Record<string, number> {
  const participation: Record<string, number> = {}

  messages.forEach(message => {
    const agentType = message.agentType
    participation[agentType] = (participation[agentType] || 0) + 1
  })

  return participation
}