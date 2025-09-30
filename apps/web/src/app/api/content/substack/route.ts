/**
 * Substack Content Extraction API
 *
 * Provides automated content extraction from Substack articles
 * for AutoGen agent analysis with financial relevance validation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

// Validation schemas following existing patterns
const substackExtractionSchema = z.object({
  url: z.string().url('Invalid URL format').max(500, 'URL too long'),
  options: z.object({
    skipRelevanceCheck: z.boolean().optional().default(false),
    includeMetadata: z.boolean().optional().default(true),
    triggerAutoGen: z.boolean().optional().default(false)
  }).optional().default({})
})

// Response interfaces matching story specifications
interface SubstackExtractionRequest {
  url: string;
  userId: string;
  options?: {
    skipRelevanceCheck?: boolean;
    includeMetadata?: boolean;
    triggerAutoGen?: boolean;
  };
}

interface SubstackExtractionResponse {
  success: boolean;
  data?: {
    contentId: string;
    extractedContent: {
      title: string;
      author: string;
      publishDate: string;
      content: string;
      wordCount: number;
    };
    relevanceScore: number;
    metadata: {
      extractionTime: number;
      financialTermsFound: string[];
      confidenceScore: number;
    };
    autoGenTriggered?: boolean;
    conversationId?: string;
  };
  error?: {
    code: 'INVALID_URL' | 'PAYWALL_DETECTED' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'PROCESSING_FAILED';
    message: string;
    retryAfter?: number;
  };
}

/**
 * POST /api/content/substack
 * Extract and analyze Substack article content with Clerk authentication
 */
export async function POST(request: NextRequest): Promise<NextResponse<SubstackExtractionResponse>> {
  const startTime = Date.now();

  try {
    // Authenticate user with Clerk
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Unauthorized - Authentication required'
        }
      }, { status: 401 })
    }

    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Invalid JSON in request body'
        }
      }, { status: 400 })
    }

    const validationResult = substackExtractionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Validation failed: ' + validationResult.error.errors.map(e => e.message).join(', ')
        }
      }, { status: 422 })
    }

    const { url, options = {} } = validationResult.data

    // Validate Substack URL
    if (!isValidSubstackUrl(url)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Invalid Substack URL. Please provide a valid Substack article URL.'
        }
      }, { status: 400 })
    }

    console.log(`🔄 Processing Substack URL: ${url} for user ${userId}`)

    // Extract content from Substack
    const extractionResult = await extractSubstackContent(url)

    if (!extractionResult.success) {
      return NextResponse.json({
        success: false,
        error: extractionResult.error
      }, { status: extractionResult.statusCode || 500 })
    }

    const { content, metadata } = extractionResult

    // Financial relevance validation (unless skipped)
    let relevanceScore = 100 // Default to relevant if skipped
    let financialTermsFound: string[] = []
    let confidenceScore = 100

    if (!options.skipRelevanceCheck) {
      const relevanceResult = await validateFinancialRelevance(content.content)
      relevanceScore = relevanceResult.relevanceScore
      financialTermsFound = relevanceResult.financialTermsFound
      confidenceScore = relevanceResult.confidenceScore

      // Check minimum relevance threshold
      if (relevanceScore < 40) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'PROCESSING_FAILED',
            message: `Content not financially relevant (score: ${relevanceScore}%). Minimum threshold is 40%.`
          }
        }, { status: 422 })
      }
    }

    const extractionTime = Date.now() - startTime
    const contentId = generateContentId()

    // TODO: Trigger AutoGen conversation if requested (Epic 1 dependency)
    const autoGenTriggered = false
    let conversationId: string | undefined

    if (options.triggerAutoGen) {
      console.log('⚠️ AutoGen integration not yet available - Epic 1 dependency')
      // Will be implemented after Epic 1.1-1.5 completion
    }

    console.log(`✅ Substack extraction completed in ${extractionTime}ms: ${content.title}`)

    return NextResponse.json({
      success: true,
      data: {
        contentId,
        extractedContent: {
          title: content.title,
          author: content.author,
          publishDate: content.publishDate,
          content: content.content,
          wordCount: content.wordCount
        },
        relevanceScore,
        metadata: {
          extractionTime,
          financialTermsFound,
          confidenceScore
        },
        autoGenTriggered,
        conversationId
      }
    }, { status: 200 })

  } catch (error) {
    const extractionTime = Date.now() - startTime
    console.error('❌ Substack extraction error:', error)

    const sanitizedMessage = error instanceof Error ?
      sanitizeErrorMessage(error.message) :
      'Internal server error'

    return NextResponse.json({
      success: false,
      error: {
        code: 'PROCESSING_FAILED',
        message: sanitizedMessage
      }
    }, { status: 500 })
  }
}

/**
 * Validate if URL is a proper Substack article URL
 */
function isValidSubstackUrl(url: string): boolean {
  try {
    // Basic null/undefined checks
    if (!url || typeof url !== 'string') {
      return false
    }

    // Must have protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false
    }

    const urlObj = new URL(url)

    // Check for Substack domain patterns
    const isSubstackDomain =
      urlObj.hostname.endsWith('.substack.com') ||
      urlObj.hostname === 'substack.com'

    // Check for article path patterns
    const hasValidPath =
      urlObj.pathname.includes('/p/') ||
      urlObj.pathname.includes('/posts/')

    return isSubstackDomain && hasValidPath
  } catch {
    return false
  }
}

/**
 * Extract content from Substack article
 */
async function extractSubstackContent(url: string): Promise<{
  success: boolean;
  content?: {
    title: string;
    author: string;
    publishDate: string;
    content: string;
    wordCount: number;
  };
  metadata?: any;
  error?: {
    code: 'INVALID_URL' | 'PAYWALL_DETECTED' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'PROCESSING_FAILED';
    message: string;
    retryAfter?: number;
  };
  statusCode?: number;
}> {
  try {
    // Fetch the Substack page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AutoGen Financial Analysis Bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000 // 10 second timeout
    })

    if (!response.ok) {
      if (response.status === 429) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Rate limited by Substack. Please try again later.',
            retryAfter: 300
          },
          statusCode: 429
        }
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()

    // Parse HTML content using basic string parsing (following CLAUDE.md - no external dependencies)
    const extractedContent = parseSubstackHtml(html)

    // Check for paywall
    if (detectPaywall(html)) {
      return {
        success: false,
        error: {
          code: 'PAYWALL_DETECTED',
          message: 'Article is behind a paywall. Only preview content available.'
        },
        statusCode: 402
      }
    }

    return {
      success: true,
      content: extractedContent,
      metadata: {
        url,
        extractedAt: new Date().toISOString(),
        responseSize: html.length
      }
    }

  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Request timeout. Please check the URL and try again.'
        },
        statusCode: 408
      }
    }

    // Sanitize error message to avoid exposing sensitive information
    const sanitizedMessage = error instanceof Error ?
      sanitizeErrorMessage(error.message) :
      'Network error occurred'

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: sanitizedMessage
      },
      statusCode: 500
    }
  }
}

/**
 * Parse Substack HTML to extract article content
 */
function parseSubstackHtml(html: string): {
  title: string;
  author: string;
  publishDate: string;
  content: string;
  wordCount: number;
} {
  // Extract title
  const titleMatch = html.match(/<h1[^>]*class="[^"]*post-title[^"]*"[^>]*>(.*?)<\/h1>/s) ||
                     html.match(/<title>([^<]+)<\/title>/)
  const title = titleMatch ? cleanHtmlText(titleMatch[1]) : 'Untitled Article'

  // Extract author
  const authorMatch = html.match(/rel="author"[^>]*>([^<]+)</) ||
                      html.match(/<span[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/span>/)
  const author = authorMatch ? cleanHtmlText(authorMatch[1]) : 'Unknown Author'

  // Extract publish date
  const dateMatch = html.match(/<time[^>]*datetime="([^"]+)"/) ||
                    html.match(/<time[^>]*>([^<]+)<\/time>/)
  const publishDate = dateMatch ?
    (new Date(dateMatch[1]).toISOString()) :
    new Date().toISOString()

  // Extract main content
  const contentMatch = html.match(/<div[^>]*class="[^"]*available-content[^"]*"[^>]*>(.*?)<\/div>/s) ||
                       html.match(/<article[^>]*class="[^"]*markup[^"]*"[^>]*>(.*?)<\/article>/s) ||
                       html.match(/<div[^>]*class="[^"]*post-content[^"]*"[^>]*>(.*?)<\/div>/s)

  let content = ''
  if (contentMatch) {
    // Clean HTML tags and extract text
    content = cleanHtmlText(contentMatch[1])
      .replace(/\s+/g, ' ')
      .trim()
  }

  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length

  return {
    title: title.substring(0, 500), // Limit title length
    author: author.substring(0, 200), // Limit author length
    publishDate,
    content,
    wordCount
  }
}

/**
 * Clean HTML text by removing tags and decoding entities
 */
function cleanHtmlText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags completely
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-zA-Z0-9#]+;/g, '') // Remove any remaining HTML entities
    .trim()
}

/**
 * Detect if article is behind paywall
 */
function detectPaywall(html: string): boolean {
  const paywallIndicators = [
    'paywall-callout',
    'subscription-required',
    'premium-content',
    'subscribe to continue',
    'become a paid subscriber',
    'upgrade to paid'
  ]

  const lowercaseHtml = html.toLowerCase()
  return paywallIndicators.some(indicator => lowercaseHtml.includes(indicator))
}

/**
 * Validate financial relevance of content
 */
async function validateFinancialRelevance(content: string): Promise<{
  relevanceScore: number;
  financialTermsFound: string[];
  confidenceScore: number;
}> {
  // Financial keywords for relevance scoring
  const financialTerms = [
    'market', 'stock', 'trading', 'investment', 'portfolio', 'financial', 'economy',
    'fed', 'interest rate', 'inflation', 'recession', 'bull market', 'bear market',
    'earnings', 'dividend', 'bond', 'equity', 'asset', 'valuation', 'volatility',
    'yield', 'credit', 'debt', 'economic', 'monetary', 'fiscal', 'gdp', 'unemployment',
    'sector', 'commodity', 'currency', 'forex', 'crypto', 'bitcoin', 'ethereum',
    'signals', 'indicators', 'analysis', 'strategies', 'techniques', 'management'
  ]

  const lowercaseContent = content.toLowerCase()
  const foundTerms = financialTerms.filter(term => lowercaseContent.includes(term))

  // Calculate relevance score based on term frequency and content length
  const termFrequency = foundTerms.length / financialTerms.length
  const contentDensity = foundTerms.length / (content.split(' ').length / 100) // Terms per 100 words

  let relevanceScore = Math.min(100, (termFrequency * 50) + (contentDensity * 50))

  // Boost score for specific financial phrases
  const financialPhrases = [
    'market analysis', 'investment strategy', 'trading signals', 'economic outlook',
    'financial markets', 'portfolio management', 'risk management'
  ]

  const phraseBonus = financialPhrases.filter(phrase =>
    lowercaseContent.includes(phrase)
  ).length * 10

  relevanceScore = Math.min(100, relevanceScore + phraseBonus)

  // Confidence score based on content length and term diversity
  const confidenceScore = Math.min(100,
    (content.length / 50) + // Content length factor
    (foundTerms.length * 5) // Term diversity factor
  )

  return {
    relevanceScore: Math.round(relevanceScore),
    financialTermsFound: foundTerms,
    confidenceScore: Math.round(confidenceScore)
  }
}

/**
 * Generate unique content ID
 */
function generateContentId(): string {
  return `substack_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Sanitize error messages to prevent sensitive information exposure
 */
function sanitizeErrorMessage(message: string): string {
  // Remove sensitive patterns
  const sensitivePatterns = [
    /api key/gi,
    /token/gi,
    /secret/gi,
    /password/gi,
    /internal/gi,
    /process\.env/gi,
    /OPENAI_API_KEY/gi,
    /CLERK_SECRET/gi
  ]

  let sanitized = message
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]')
  })

  // Generic fallback for unknown errors
  if (sanitized.toLowerCase().includes('[redacted]')) {
    return 'Service temporarily unavailable'
  }

  return sanitized
}