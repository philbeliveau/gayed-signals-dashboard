/**
 * Direct Text Content Analysis API
 *
 * Provides automated text content analysis through AutoGen agents
 * for financial content with security validation and relevance scoring.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
// import * as DOMPurify from 'isomorphic-dompurify'
import { PrismaClient } from '../../../../generated/prisma'
import { TextAnalysisRequest, TextAnalysisResponse, AnalysisType } from '../../../../types/agents'

// Validation schemas following existing patterns
const textAnalysisSchema = z.object({
  content: z.string()
    .min(50, 'Content too short for meaningful analysis')
    .max(10000, 'Content exceeds maximum length limit'),
  analysisType: z.enum(['QUICK', 'COMPREHENSIVE', 'GAYED_FOCUSED']).default('COMPREHENSIVE'),
  includeSignalContext: z.boolean().optional().default(true)
})

// Initialize Prisma client
const prisma = new PrismaClient()

/**
 * POST /api/content/text
 * Analyze direct text content with AutoGen agents and Clerk authentication
 */
export async function POST(request: NextRequest): Promise<NextResponse<TextAnalysisResponse>> {
  const startTime = Date.now();

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
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Authentication required'
      }, { status: 401 })
    }

    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 })
    }

    const validationResult = textAnalysisSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: `Validation error: ${validationResult.error.issues.map(i => i.message).join(', ')}`
      }, { status: 400 })
    }

    const { content, analysisType, includeSignalContext } = validationResult.data

    // Security validation and sanitization
    const validationTime = Date.now();
    const sanitizedContent = await validateAndSanitizeContent(content);

    if (!sanitizedContent.isValid) {
      return NextResponse.json({
        success: false,
        error: `Security validation failed: ${sanitizedContent.issues?.join(', ')}`
      }, { status: 400 })
    }

    // Financial relevance scoring
    const relevanceScore = calculateFinancialRelevance(sanitizedContent.sanitizedText);

    if (relevanceScore < 0.3) {
      return NextResponse.json({
        success: false,
        error: 'Content does not appear to be sufficiently financial or market-related for analysis'
      }, { status: 400 })
    }

    // Generate unique text ID
    const textId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Mock AutoGen conversation (to be replaced with actual AutoGen integration)
    const conversationResult = await simulateAutoGenConversation(
      sanitizedContent.sanitizedText,
      analysisType,
      includeSignalContext
    );

    // Store conversation in database
    const conversation = await prisma.conversation.create({
      data: {
        userId: userId,
        contentType: 'text',
        contentTitle: `Direct Text Analysis - ${analysisType}`,
        contentContent: sanitizedContent.sanitizedText,
        status: 'completed',
        consensusReached: true,
        finalRecommendation: conversationResult.consensus,
        confidenceScore: conversationResult.confidenceScore,
        completedAt: new Date(),
        metadata: {
          analysisType,
          relevanceScore,
          includeSignalContext,
          financialCategories: identifyFinancialCategories(sanitizedContent.sanitizedText)
        }
      }
    });

    // Store agent messages
    await Promise.all(
      conversationResult.agentResponses.map((message, index) =>
        prisma.agentMessage.create({
          data: {
            conversationId: conversation.id,
            agentType: message.agentType.toLowerCase(),
            agentName: message.agentName,
            content: message.message,
            confidenceLevel: message.confidence,
            messageOrder: index + 1,
            citedSources: [],
            signalReferences: includeSignalContext ? ['gayed_signals'] : [],
            metadata: {
              originalId: message.id,
              role: message.role
            }
          }
        })
      )
    );

    const processingTime = Date.now() - startTime;

    const response: TextAnalysisResponse = {
      success: true,
      data: {
        textId: conversation.id, // Use database ID as textId
        relevanceScore,
        financialCategories: identifyFinancialCategories(sanitizedContent.sanitizedText),
        autoGenConversation: {
          ...conversationResult,
          conversationId: conversation.id
        },
        processingMetrics: {
          validationTime: validationTime - startTime,
          conversationTime: conversationResult.processingTime,
          totalProcessingTime: processingTime
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Text analysis API error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error occurred'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// Security validation and sanitization
async function validateAndSanitizeContent(content: string) {
  const issues: string[] = [];

  // XSS prevention - simplified without DOMPurify for now
  const sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Check for malicious patterns
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  const hasMaliciousContent = maliciousPatterns.some(pattern => pattern.test(content));
  if (hasMaliciousContent) {
    issues.push('Potentially malicious content detected');
  }

  // Check for spam-like patterns
  const spamPatterns = [
    /(.)\1{10,}/g, // Repeated characters
    /[A-Z]{20,}/g, // Excessive caps
    /\$\$\$|\!\!\!/g // Spam indicators
  ];

  const hasSpamContent = spamPatterns.some(pattern => pattern.test(content));
  if (hasSpamContent) {
    issues.push('Content appears to be spam-like');
  }

  return {
    isValid: issues.length === 0,
    sanitizedText: sanitized,
    issues: issues.length > 0 ? issues : undefined
  };
}

// Calculate financial relevance score
function calculateFinancialRelevance(content: string): number {
  const financialKeywords = [
    'market', 'stock', 'bond', 'investment', 'trading', 'price', 'return',
    'portfolio', 'risk', 'financial', 'economic', 'fed', 'interest', 'rate',
    'equity', 'etf', 'fund', 'sector', 'earnings', 'revenue', 'volatility',
    'inflation', 'gdp', 'unemployment', 'treasury', 'yield', 'dividend',
    'valuation', 'analyst', 'forecast', 'bull', 'bear', 'correlation',
    'hedge', 'commodity', 'currency', 'forex', 'bitcoin', 'crypto'
  ];

  const lowerContent = content.toLowerCase();
  const words = lowerContent.split(/\s+/);
  const totalWords = words.length;

  let matchCount = 0;
  financialKeywords.forEach(keyword => {
    const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
    matchCount += matches;
  });

  return Math.min(matchCount / totalWords * 10, 1.0); // Cap at 1.0
}

// Identify financial categories
function identifyFinancialCategories(content: string) {
  const categories = [
    {
      category: 'Market Analysis',
      keywords: ['market', 'stock', 'index', 'sector', 'performance'],
      relevance: 0
    },
    {
      category: 'Economic Indicators',
      keywords: ['gdp', 'inflation', 'employment', 'fed', 'interest rate'],
      relevance: 0
    },
    {
      category: 'Investment Strategy',
      keywords: ['portfolio', 'allocation', 'risk', 'return', 'diversification'],
      relevance: 0
    },
    {
      category: 'Corporate Analysis',
      keywords: ['earnings', 'revenue', 'valuation', 'analyst', 'forecast'],
      relevance: 0
    }
  ];

  const lowerContent = content.toLowerCase();

  categories.forEach(cat => {
    let matchCount = 0;
    cat.keywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        matchCount++;
      }
    });
    cat.relevance = matchCount / cat.keywords.length;
  });

  return categories.filter(cat => cat.relevance > 0);
}

// Simulate AutoGen conversation (to be replaced with actual implementation)
async function simulateAutoGenConversation(content: string, analysisType: AnalysisType, includeSignalContext: boolean) {
  const startTime = Date.now();

  // Simulate processing time based on analysis type
  const processingTime = analysisType === 'QUICK' ? 2 : analysisType === 'COMPREHENSIVE' ? 8 : 5;

  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const agentResponses = [
    {
      id: 'msg_1',
      agentName: 'Financial Analyst',
      agentType: 'FINANCIAL_ANALYST' as const,
      role: 'Primary Analyst',
      message: `Based on the provided content, I identify key financial themes and market indicators. The analysis reveals ${Math.floor(Math.random() * 5) + 3} significant market signals with moderate to high confidence levels.`,
      timestamp: new Date().toISOString(),
      confidence: 0.75 + Math.random() * 0.2
    },
    {
      id: 'msg_2',
      agentName: 'Market Context',
      agentType: 'MARKET_CONTEXT' as const,
      role: 'Context Provider',
      message: `Current market conditions suggest this analysis aligns with ${includeSignalContext ? 'existing Gayed signals showing ' : ''}ongoing market trends. Key correlations identified with sector rotation patterns.`,
      timestamp: new Date().toISOString(),
      confidence: 0.68 + Math.random() * 0.25
    },
    {
      id: 'msg_3',
      agentName: 'Risk Challenger',
      agentType: 'RISK_CHALLENGER' as const,
      role: 'Risk Assessor',
      message: `Important considerations: The analysis may underestimate volatility risks and potential market regime changes. Recommend ${analysisType === 'GAYED_FOCUSED' ? 'cross-referencing with current signal confidence levels' : 'additional risk assessment'}.`,
      timestamp: new Date().toISOString(),
      confidence: 0.82 + Math.random() * 0.15
    }
  ];

  const consensus = `Agent analysis converges on a ${Math.random() > 0.5 ? 'moderately bullish' : 'cautiously optimistic'} outlook with ${Math.floor(Math.random() * 20) + 65}% confidence. Key risks and opportunities identified for ${analysisType.toLowerCase()} timeframe.`;

  return {
    conversationId,
    agentResponses,
    consensus,
    confidenceScore: 0.70 + Math.random() * 0.25,
    processingTime: Date.now() - startTime
  };
}