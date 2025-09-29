/**
 * Prisma Seed Script for AutoGen Financial Intelligence Demo
 *
 * Creates sample data for development and testing:
 * - Test users with Clerk integration
 * - Sample financial conversations
 * - Agent messages with realistic financial analysis content
 * - Different conversation statuses and content types
 */

import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clean existing data (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...')
    await prisma.agentMessage.deleteMany()
    await prisma.conversation.deleteMany()
    await prisma.user.deleteMany()
  }

  // Create or update test users (upsert for graceful re-execution)
  console.log('👥 Creating/updating test users...')

  const testUser1 = await prisma.user.upsert({
    where: { clerkId: 'user_test_demo_12345' },
    update: {
      email: 'demo@autogenfinance.com',
      firstName: 'Demo',
      lastName: 'User',
    },
    create: {
      clerkId: 'user_test_demo_12345',
      email: 'demo@autogenfinance.com',
      firstName: 'Demo',
      lastName: 'User',
    },
  })

  const testUser2 = await prisma.user.upsert({
    where: { clerkId: 'user_test_analyst_67890' },
    update: {
      email: 'analyst@gayedsignals.com',
      firstName: 'Financial',
      lastName: 'Analyst',
    },
    create: {
      clerkId: 'user_test_analyst_67890',
      email: 'analyst@gayedsignals.com',
      firstName: 'Financial',
      lastName: 'Analyst',
    },
  })

  console.log(`✅ Created users: ${testUser1.id}, ${testUser2.id}`)

  // Sample conversation 1: Completed analysis of Fed policy
  console.log('💬 Creating sample conversations...')

  // Check if conversations already exist for this user to avoid duplicates
  const existingConversations = await prisma.conversation.findMany({
    where: { userId: testUser1.id }
  })

  let conversation1
  if (existingConversations.length === 0) {
    conversation1 = await prisma.conversation.create({
    data: {
      userId: testUser1.id,
      contentType: 'substack_article',
      contentTitle: 'Fed Policy Pivot: Why 2024 Could Be the Turning Point',
      contentContent: 'Recent Federal Reserve communications suggest a potential shift in monetary policy stance. With inflation showing signs of moderation and employment remaining robust, market participants are positioning for potential rate cuts in 2024. However, geopolitical tensions and energy price volatility continue to present challenges...',
      contentUrl: 'https://example-substack.com/fed-policy-pivot-2024',
      contentAuthor: 'Dr. Sarah Chen',
      contentPublishedAt: new Date('2024-01-15T10:30:00Z'),
      contentMetadata: {
        source: 'Substack',
        tags: ['federal-reserve', 'monetary-policy', 'interest-rates'],
        readTime: '8 minutes'
      },
      status: 'completed',
      consensusReached: true,
      finalRecommendation: 'Mixed signals suggest cautious optimism with 65% confidence in gradual policy normalization. Recommend 60% defensive positioning with flexibility for policy shifts.',
      confidenceScore: 0.65,
      completedAt: new Date(),
      metadata: {
        debateRounds: 3,
        analysisDepth: 'comprehensive',
        signalContext: 'defensive'
      },
      messages: {
        create: [
          {
            agentType: 'financial_analyst',
            agentName: 'Financial Analyst',
            content: 'Article claims Fed pivot based on slowing inflation. Our Utilities/SPY ratio at 0.91 suggests defensive positioning is warranted. Current VIX defensive signal at 3.2 confirms risk-off sentiment. Historical analysis shows 73% success rate for defensive signals over 21-day periods during policy uncertainty.',
            confidenceLevel: 0.8,
            messageOrder: 1,
            citedSources: ['Utilities/SPY Ratio: 0.91', 'VIX Defensive Signal: 3.2', 'Historical Success Rate: 73%'],
            signalReferences: ['defensive_signal', 'utilities_spy_ratio', 'vix_signal'],
            metadata: {
              analysisType: 'quantitative',
              dataPoints: 15,
              timeframe: '21-day'
            }
          },
          {
            agentType: 'market_context',
            agentName: 'Market Context Agent',
            content: 'However, latest market intelligence shows Powell\'s Jackson Hole comments suggest "higher for longer" stance. Current employment at 3.7% remains historically low. Latest CPI at 3.2% still above Fed\'s 2% target. Market pricing in 75bps cuts but Fed signaling suggests more cautious approach. Energy sector showing renewed strength with geopolitical tensions.',
            confidenceLevel: 0.7,
            messageOrder: 2,
            citedSources: ['Powell Jackson Hole Speech', 'Employment Rate: 3.7%', 'CPI: 3.2%', 'Fed Funds Futures'],
            signalReferences: ['employment_data', 'inflation_data', 'fed_communications'],
            metadata: {
              sourceType: 'fed_communications',
              marketSentiment: 'cautious',
              dataRecency: 'current'
            }
          },
          {
            agentType: 'risk_challenger',
            agentName: 'Risk Challenger',
            content: 'Classic Fed pivot mistake pattern emerging! Remember 2019 "insurance cuts" that became 2020 crisis response tool. What if inflation resurges due to supply chain disruptions or energy price spikes? Current employment strength could deteriorate rapidly if credit conditions tighten. Article assumes linear progression but markets rarely cooperate with smooth policy transitions.',
            confidenceLevel: 0.75,
            messageOrder: 3,
            citedSources: ['2019 Fed Policy Error', '2020 Crisis Response', 'Supply Chain Risk Assessment'],
            signalReferences: ['historical_parallels', 'credit_conditions', 'supply_chain_risk'],
            metadata: {
              riskType: 'policy_error',
              historicalContext: '2019-2020',
              contrarian: true
            }
          },
          {
            agentType: 'financial_analyst',
            agentName: 'Financial Analyst',
            content: 'Valid concerns raised about policy errors. Adjusting confidence level down to 65% given Fed uncertainty and employment strength persistence. Recommend modified defensive positioning: 60% defensive allocation vs normal 80% during clear defensive signals. Maintain flexibility for rapid repositioning if employment data deteriorates or inflation resurges above 3.5%.',
            confidenceLevel: 0.65,
            messageOrder: 4,
            citedSources: ['Adjusted Risk Assessment', 'Modified Allocation Model', 'Inflation Threshold: 3.5%'],
            signalReferences: ['adjusted_confidence', 'modified_allocation', 'inflation_threshold'],
            metadata: {
              revision: true,
              originalConfidence: 0.8,
              adjustmentReason: 'policy_uncertainty'
            }
          }
        ],
      },
    },
  })
  } else {
    conversation1 = existingConversations[0]
    console.log(`✅ Using existing conversation: ${conversation1.id}`)
  }

  // Sample conversation 2: Running debate on market volatility
  const existingConversations2 = await prisma.conversation.findMany({
    where: { userId: testUser2.id }
  })

  let conversation2
  if (existingConversations2.length === 0) {
    conversation2 = await prisma.conversation.create({
    data: {
      userId: testUser2.id,
      contentType: 'youtube_video',
      contentTitle: 'Market Volatility Ahead: Preparing for Q4 2024 Turbulence',
      contentContent: 'Video analysis of upcoming market catalysts including Q3 earnings season, election uncertainty, and potential Fed communications. Discussion of historical Q4 patterns and defensive strategies for portfolio protection...',
      contentUrl: 'https://youtube.com/watch?v=market-volatility-q4',
      contentAuthor: 'MarketWatch Pro',
      contentPublishedAt: new Date('2024-09-15T14:20:00Z'),
      contentMetadata: {
        source: 'YouTube',
        duration: '12:45',
        views: 25680,
        category: 'market-analysis'
      },
      status: 'running',
      consensusReached: false,
      metadata: {
        debateRounds: 2,
        analysisDepth: 'ongoing',
        signalContext: 'mixed'
      },
      messages: {
        create: [
          {
            agentType: 'market_context',
            agentName: 'Market Context Agent',
            content: 'Q4 historically shows increased volatility with average VIX spike of 28% during election years. Current market positioning shows elevated call/put ratios suggesting complacency. Earnings season could provide catalyst for mean reversion in overvalued sectors.',
            confidenceLevel: 0.72,
            messageOrder: 1,
            citedSources: ['Historical Q4 VIX Data', 'Call/Put Ratio Analysis', 'Sector Valuation Metrics'],
            signalReferences: ['volatility_forecast', 'options_positioning', 'sector_analysis'],
            metadata: {
              seasonality: 'Q4',
              historicalLookback: '20-year',
              marketRegime: 'late-cycle'
            }
          },
          {
            agentType: 'risk_challenger',
            agentName: 'Risk Challenger',
            content: 'Market timing based on historical patterns is notoriously unreliable. 2024 election cycle could prove different with unprecedented factors: AI sector dominance, changing energy landscape, potential paradigm shift in Fed policy. Current "complacency" might reflect genuine structural changes in market dynamics.',
            confidenceLevel: 0.68,
            messageOrder: 2,
            citedSources: ['Historical Pattern Reliability Studies', 'AI Sector Analysis', 'Structural Market Changes'],
            signalReferences: ['pattern_reliability', 'structural_changes', 'ai_sector_impact'],
            metadata: {
              contrarian: true,
              structuralFocus: true,
              innovationImpact: 'high'
            }
          }
        ],
      },
    },
  })
  } else {
    conversation2 = existingConversations2[0]
    console.log(`✅ Using existing conversation: ${conversation2.id}`)
  }

  // Sample conversation 3: Simple text analysis
  let conversation3
  // For user1, check if they already have multiple conversations
  if (existingConversations.length < 2) {
    conversation3 = await prisma.conversation.create({
    data: {
      userId: testUser1.id,
      contentType: 'text',
      contentTitle: 'Direct Text Analysis: Housing Market Outlook',
      contentContent: 'With mortgage rates approaching 8% and housing inventory remaining tight, the residential real estate market faces unprecedented challenges. Regional variations are significant, with coastal markets showing resilience while interior markets struggle with affordability.',
      status: 'initialized',
      metadata: {
        inputMethod: 'direct_text',
        analysisType: 'real_estate'
      }
    },
  })
  } else {
    conversation3 = existingConversations[1]
    console.log(`✅ Using existing conversation: ${conversation3.id}`)
  }

  console.log(`✅ Conversations ready:`)
  console.log(`   - Fed Policy Analysis (${conversation1.id}) - COMPLETED`)
  console.log(`   - Q4 Volatility Debate (${conversation2.id}) - RUNNING`)
  console.log(`   - Housing Market Analysis (${conversation3.id}) - INITIALIZED`)

  // Test data summary
  const userCount = await prisma.user.count()
  const conversationCount = await prisma.conversation.count()
  const messageCount = await prisma.agentMessage.count()

  console.log('\n📊 Seed Summary:')
  console.log(`   Users: ${userCount}`)
  console.log(`   Conversations: ${conversationCount}`)
  console.log(`   Agent Messages: ${messageCount}`)
  console.log('\n🎉 Database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })