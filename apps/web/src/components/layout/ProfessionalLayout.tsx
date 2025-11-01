'use client';

import React from 'react';
import ProfessionalSidebar from '../navigation/ProfessionalSidebar';
import ProfessionalTopNav from '../navigation/ProfessionalTopNav';
import MobileBottomNav from '../navigation/MobileBottomNav';

interface ProfessionalLayoutProps {
  children: React.ReactNode;
  className?: string;
  showThemeToggle?: boolean;
}

/**
 * Professional layout wrapper that combines sidebar and top navigation
 * Matches the reference design with proper spacing and responsive behavior
 */
export default function ProfessionalLayout({
  children,
  className = '',
  showThemeToggle = true
}: ProfessionalLayoutProps) {
  return (
    <div className={`min-h-screen bg-theme-bg ${className}`}>
      {/* Left Sidebar */}
      <ProfessionalSidebar />

      {/* Main Content Area - No padding on mobile, desktop padding for sidebar */}
      <div className="md:pl-[70px]">
        {/* Top Navigation */}
        <ProfessionalTopNav showThemeToggle={showThemeToggle} />

        {/* Page Content - Mobile optimized with bottom nav spacing */}
        <main className="p-4 md:p-8 bg-theme-bg min-h-screen pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}

/**
 * Content card component with professional styling
 */
interface ContentCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  hoverable?: boolean;
}

export function ContentCard({
  children,
  title,
  subtitle,
  className = '',
  hoverable = false
}: ContentCardProps) {
  return (
    <div
      className={`
        bg-theme-card rounded-2xl shadow-sm border border-theme-border/50
        ${hoverable ? 'hover:shadow-lg hover:border-theme-border transition-all duration-300 ease-out cursor-pointer' : ''}
        ${className}
      `}
    >
      {(title || subtitle) && (
        <div className="px-8 py-5 border-b border-theme-border/30">
          {title && (
            <h3 className="text-lg font-medium text-theme-text tracking-wide">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-theme-text-muted mt-1.5">{subtitle}</p>
          )}
        </div>
      )}
      <div className="p-8">
        {children}
      </div>
    </div>
  );
}

/**
 * Grid layout for cards
 */
interface CardGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 4 | 6 | 8;
  className?: string;
}

export function CardGrid({
  children,
  cols = 3,
  gap = 6,
  className = ''
}: CardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  const gridGap = {
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8'
  };

  return (
    <div className={`grid ${gridCols[cols]} ${gridGap[gap]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Page header component
 */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className = ''
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between mb-12 ${className}`}>
      <div>
        <h1 className="text-3xl font-semibold text-theme-text tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-theme-text-muted mt-3 font-light">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Stats card component for displaying metrics
 */
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  className = ''
}: StatsCardProps) {
  const changeColors = {
    positive: 'text-theme-success',
    negative: 'text-theme-danger',
    neutral: 'text-theme-text-muted'
  };

  return (
    <ContentCard className={className} hoverable>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-normal text-theme-text-muted mb-2 tracking-wide">{title}</p>
          <p className="text-3xl font-semibold text-theme-text tabular-nums">{value}</p>
          {change && (
            <p className={`text-sm font-medium ${changeColors[changeType]} mt-2`}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-6">
            <div className="w-14 h-14 bg-theme-primary/5 rounded-2xl flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
      </div>
    </ContentCard>
  );
}