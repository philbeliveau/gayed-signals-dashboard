'use client';

import React, { useState } from 'react';
import LiveConversationDisplay from '@/components/agents/LiveConversationDisplay';
import { ConversationResult } from '@/types/agents';
import { DataCard, AlertBanner } from '@/components/SharedUIComponents';

export default function LiveConversationDemo() {
  const [sessionId, setSessionId] = useState<string>('demo-session-' + Date.now());
  const [conversationResult, setConversationResult] = useState<ConversationResult | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  const handleConversationComplete = (result: ConversationResult) => {
    setConversationResult(result);
  };

  const resetConversation = () => {
    setSessionId('demo-session-' + Date.now());
    setConversationResult(null);
  };

  return (
    <div className="min-h-screen bg-theme-bg">
      {/* Header */}
      <div className="bg-theme-card border-b border-theme-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-theme-text">
                Live Agent Conversation Demo
              </h1>
              <p className="mt-2 text-theme-text-muted">
                Experience real-time AutoGen agent debates for financial analysis
              </p>
            </div>
            <button
              onClick={resetConversation}
              className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors touch-manipulation"
            >
              New Conversation
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Info Banner */}
        {showBanner && (
          <AlertBanner
            type="info"
            message="This is a demonstration of the live conversation display component using mock data. In production, this would connect to real AutoGen agents via WebSocket."
            onDismiss={() => setShowBanner(false)}
            timestamp={new Date().toISOString()}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation Display */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-theme-text">
                  Agent Conversation
                </h2>
                <div className="text-sm text-theme-text-muted">
                  Session: {sessionId.slice(-8)}
                </div>
              </div>

              <LiveConversationDisplay
                sessionId={sessionId}
                onConversationComplete={handleConversationComplete}
                mockMode={true}
                enableWebSocket={false}
                className="w-full"
              />

              {conversationResult && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-theme-text">
                    Conversation Summary
                  </h3>

                  <div className="bg-theme-card border border-theme-border rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-theme-text-muted">Consensus Reached:</span>
                      <span className={`font-medium ${conversationResult.consensusReached ? 'text-theme-success' : 'text-theme-warning'}`}>
                        {conversationResult.consensusReached ? 'Yes' : 'No'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-theme-text-muted">Confidence Level:</span>
                      <span className="font-medium text-theme-text">
                        {Math.round(conversationResult.confidenceLevel * 100)}%
                      </span>
                    </div>

                    <div>
                      <span className="text-theme-text-muted block mb-2">Final Recommendation:</span>
                      <p className="text-theme-text text-sm bg-theme-bg-secondary p-3 rounded-lg">
                        {conversationResult.finalRecommendation}
                      </p>
                    </div>

                    <div>
                      <span className="text-theme-text-muted block mb-2">Key Insights:</span>
                      <ul className="space-y-1">
                        {conversationResult.keyInsights.map((insight, index) => (
                          <li key={index} className="text-theme-text-secondary text-sm flex items-start gap-2">
                            <span className="text-theme-primary mt-1">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Information */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-theme-text mb-4">
                Features Demonstrated
              </h3>
              <div className="space-y-4">
                <DataCard
                  title="Real-time Display"
                  value="✓"
                  subtitle="Progressive message rendering"
                  size="sm"
                />
                <DataCard
                  title="Auto-scroll"
                  value="✓"
                  subtitle="Smooth scrolling to latest messages"
                  size="sm"
                />
                <DataCard
                  title="Mobile Responsive"
                  value="✓"
                  subtitle="Touch-optimized interface"
                  size="sm"
                />
                <DataCard
                  title="Agent Indicators"
                  value="✓"
                  subtitle="Visual agent identification"
                  size="sm"
                />
                <DataCard
                  title="Confidence Scores"
                  value="✓"
                  subtitle="Real-time confidence tracking"
                  size="sm"
                />
                <DataCard
                  title="Error Handling"
                  value="✓"
                  subtitle="Graceful error recovery"
                  size="sm"
                />
              </div>
            </div>

            <div className="bg-theme-card border border-theme-border rounded-xl p-4">
              <h4 className="font-semibold text-theme-text mb-3">Technical Details</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-theme-text-muted">Framework:</span>
                  <span className="text-theme-text ml-2">React + TypeScript</span>
                </div>
                <div>
                  <span className="text-theme-text-muted">Real-time:</span>
                  <span className="text-theme-text ml-2">WebSocket Support</span>
                </div>
                <div>
                  <span className="text-theme-text-muted">Styling:</span>
                  <span className="text-theme-text ml-2">Theme System</span>
                </div>
                <div>
                  <span className="text-theme-text-muted">Performance:</span>
                  <span className="text-theme-text ml-2">Optimized Scrolling</span>
                </div>
                <div>
                  <span className="text-theme-text-muted">Accessibility:</span>
                  <span className="text-theme-text ml-2">ARIA Compliant</span>
                </div>
              </div>
            </div>

            <div className="bg-theme-warning-bg border border-theme-warning-border rounded-xl p-4">
              <h4 className="font-semibold text-theme-warning mb-2">Demo Mode</h4>
              <p className="text-theme-warning text-sm">
                This demonstration uses mock agent responses. In production,
                the component connects to real AutoGen agents via WebSocket
                for authentic multi-agent conversations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}