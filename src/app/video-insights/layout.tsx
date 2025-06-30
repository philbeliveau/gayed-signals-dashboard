import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Video Insights - Gayed Signal Dashboard",
  description: "AI-powered YouTube video analysis and summarization. Extract insights from financial videos, market commentary, and educational content with automated transcription and intelligent summarization.",
  keywords: "video analysis, YouTube transcription, AI summarization, financial videos, market analysis, trading education, video insights",
  openGraph: {
    title: "Video Insights - AI-Powered YouTube Analysis",
    description: "Transform YouTube videos into actionable insights with automated transcription and AI summarization",
    type: "website",
  },
};

export default function VideoInsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="video-insights-layout">
      {children}
    </div>
  );
}