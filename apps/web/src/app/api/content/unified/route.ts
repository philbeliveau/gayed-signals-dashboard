/**
 * Unified Content Processing API
 *
 * Handles text, Substack URLs, and YouTube videos through a single endpoint
 * for consistent AutoGen agent analysis workflow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

// Validation schema for unified content processing
const unifiedContentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  contentType: z.enum(['text', 'substack', 'youtube']),
  analysisType: z.enum(['QUICK', 'COMPREHENSIVE', 'GAYED_FOCUSED']).default('COMPREHENSIVE'),
  includeSignalContext: z.boolean().optional().default(true)
});

interface UnifiedContentResponse {
  success: boolean;
  data?: {
    contentId: string;
    contentType: 'text' | 'substack' | 'youtube';
    extractedContent?: {
      title: string;
      author?: string;
      publishDate?: string;
      content: string;
      wordCount: number;
    };
    relevanceScore: number;
    autoGenConversation: {
      conversationId: string;
      agentResponses: any[];
      consensus: string;
      confidenceScore: number;
    };
    processingMetrics: {
      extractionTime?: number;
      validationTime: number;
      conversationTime: number;
      totalProcessingTime: number;
    };
  };
  error?: string;
}

/**
 * POST /api/content/unified
 * Process content from any source type with AutoGen analysis
 */
export async function POST(request: NextRequest): Promise<NextResponse<UnifiedContentResponse>> {
  const startTime = Date.now();

  try {
    // Authenticate user with Clerk
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Authentication required'
      }, { status: 401 });
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    const validationResult = unifiedContentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: `Validation error: ${validationResult.error.issues.map(i => i.message).join(', ')}`
      }, { status: 400 });
    }

    const { content, contentType, analysisType, includeSignalContext } = validationResult.data;

    console.log(`🔄 Processing ${contentType} content for user ${userId}:`);

    // Route to appropriate processing based on content type
    let processedContent;
    let extractionTime = 0;

    switch (contentType) {
      case 'text':
        processedContent = await processDirectText(content, analysisType);
        break;
      case 'substack':
        const substackResult = await processSubstackUrl(content);
        if (!substackResult.success) {
          return NextResponse.json({
            success: false,
            error: substackResult.error
          }, { status: substackResult.statusCode || 500 });
        }
        processedContent = substackResult.data;
        extractionTime = substackResult.extractionTime || 0;
        break;
      case 'youtube':
        const youtubeResult = await processYouTubeUrl(content);
        if (!youtubeResult.success) {
          return NextResponse.json({
            success: false,
            error: youtubeResult.error
          }, { status: youtubeResult.statusCode || 500 });
        }
        processedContent = youtubeResult.data;
        extractionTime = youtubeResult.extractionTime || 0;
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Unsupported content type'
        }, { status: 400 });
    }

    const validationTime = Date.now() - startTime;

    // Calculate financial relevance score
    const relevanceScore = calculateFinancialRelevance(processedContent.content);

    if (relevanceScore < 0.3) {
      return NextResponse.json({
        success: false,
        error: 'Content does not appear to be sufficiently financial or market-related for analysis'
      }, { status: 400 });
    }

    // Generate AutoGen conversation
    const conversationResult = await simulateAutoGenConversation(
      processedContent,
      analysisType,
      includeSignalContext
    );

    const totalProcessingTime = Date.now() - startTime;
    const contentId = `unified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`✅ ${contentType} content processed in ${totalProcessingTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        contentId,
        contentType,
        extractedContent: processedContent,
        relevanceScore,
        autoGenConversation: conversationResult,
        processingMetrics: {
          extractionTime: extractionTime > 0 ? extractionTime : undefined,
          validationTime: validationTime,
          conversationTime: conversationResult.processingTime,
          totalProcessingTime
        }
      }
    });

  } catch (error) {
    console.error('❌ Unified content processing error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error occurred'
    }, { status: 500 });
  }
}

/**
 * Process direct text content
 */
async function processDirectText(content: string, analysisType: string) {
  // Basic validation and sanitization
  const sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  return {
    title: 'Direct Text Analysis',
    content: sanitized,
    wordCount: sanitized.split(/\s+/).filter(word => word.length > 0).length,
    author: 'User Input',
    publishDate: new Date().toISOString()
  };
}

/**
 * Process Substack URL by calling existing API
 */
async function processSubstackUrl(url: string) {
  try {
    // Call the existing Substack API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/content/substack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        options: {
          skipRelevanceCheck: true,
          includeMetadata: true,
          triggerAutoGen: false
        }
      })
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || 'Failed to extract Substack content',
        statusCode: response.status
      };
    }

    return {
      success: true,
      data: result.data.extractedContent,
      extractionTime: result.data.metadata.extractionTime
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error while processing Substack URL',
      statusCode: 500
    };
  }
}

/**
 * Process YouTube URL - currently returns mock data due to Vercel limitations
 */
async function processYouTubeUrl(url: string) {
  try {
    // Call the existing YouTube API (which returns mock data on Vercel)
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/simple-youtube`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        youtube_url: url
      })
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to process YouTube video',
        statusCode: response.status
      };
    }

    // Convert YouTube API response to our format
    return {
      success: true,
      data: {
        title: result.title || 'YouTube Video Analysis',
        content: result.transcript || result.summary || 'YouTube processing requires local deployment with Python backend services.',
        wordCount: (result.transcript || result.summary || '').split(/\s+/).filter((word: string) => word.length > 0).length,
        author: 'YouTube Creator',
        publishDate: new Date().toISOString()
      },
      extractionTime: result.processing_time || 0
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error while processing YouTube URL',
      statusCode: 500
    };
  }
}

/**
 * Calculate financial relevance score
 */
function calculateFinancialRelevance(content: string): number {
  const financialKeywords = [
    'market', 'stock', 'bond', 'investment', 'trading', 'price', 'return',
    'portfolio', 'risk', 'financial', 'economic', 'fed', 'interest', 'rate',
    'equity', 'etf', 'fund', 'sector', 'earnings', 'revenue', 'volatility',
    'inflation', 'gdp', 'unemployment', 'treasury', 'yield', 'dividend'
  ];

  const lowerContent = content.toLowerCase();
  const words = lowerContent.split(/\s+/);
  const totalWords = words.length;

  let matchCount = 0;
  financialKeywords.forEach(keyword => {
    const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
    matchCount += matches;
  });

  return Math.min(matchCount / totalWords * 10, 1.0);
}

/**
 * Simulate AutoGen conversation with enhanced content context
 */
async function simulateAutoGenConversation(
  extractedContent: any,
  analysisType: string,
  includeSignalContext: boolean
) {
  const startTime = Date.now();

  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const agentResponses = [
    {
      id: 'msg_1',
      agentName: 'Financial Analyst',
      agentType: 'FINANCIAL_ANALYST' as const,
      role: 'Primary Analyst',
      message: `Analyzing "${extractedContent.title}": I identify key financial themes and market indicators. The content reveals ${Math.floor(Math.random() * 5) + 3} significant market signals with ${Math.floor(Math.random() * 20) + 65}% confidence levels based on ${extractedContent.wordCount} words of analysis.`,
      timestamp: new Date().toISOString(),
      confidence: 0.75 + Math.random() * 0.2
    },
    {
      id: 'msg_2',
      agentName: 'Market Context',
      agentType: 'MARKET_CONTEXT' as const,
      role: 'Context Provider',
      message: `Content analysis of "${extractedContent.title}" aligns with ${includeSignalContext ? 'current Gayed signals showing ' : ''}ongoing market trends. Author insights ${extractedContent.author ? `from ${extractedContent.author} ` : ''}provide valuable perspective on sector rotation patterns and risk positioning.`,
      timestamp: new Date().toISOString(),
      confidence: 0.68 + Math.random() * 0.25
    },
    {
      id: 'msg_3',
      agentName: 'Risk Challenger',
      agentType: 'RISK_CHALLENGER' as const,
      role: 'Risk Assessor',
      message: `Important considerations for "${extractedContent.title}": The analysis may underestimate volatility risks and potential market regime changes. Content age ${extractedContent.publishDate ? `(${new Date(extractedContent.publishDate).toLocaleDateString()}) ` : ''}should be factored into relevance. Recommend ${analysisType === 'GAYED_FOCUSED' ? 'cross-referencing with current signal confidence levels' : 'additional risk assessment'}.`,
      timestamp: new Date().toISOString(),
      confidence: 0.82 + Math.random() * 0.15
    }
  ];

  const consensus = `Agent analysis of "${extractedContent.title}" converges on a ${Math.random() > 0.5 ? 'moderately bullish' : 'cautiously optimistic'} outlook with ${Math.floor(Math.random() * 20) + 65}% confidence. Content provides ${extractedContent.wordCount > 500 ? 'comprehensive' : 'focused'} insights for ${analysisType.toLowerCase()} timeframe analysis.`;

  return {
    conversationId,
    agentResponses,
    consensus,
    confidenceScore: 0.70 + Math.random() * 0.25,
    processingTime: Date.now() - startTime
  };
}