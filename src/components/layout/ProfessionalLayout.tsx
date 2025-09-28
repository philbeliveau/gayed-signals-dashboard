'use client';

import React from 'react';
import ProfessionalSidebar from '../navigation/ProfessionalSidebar';
import ProfessionalTopNav from '../navigation/ProfessionalTopNav';

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

      {/* Main Content Area - Fixed for mobile */}
      <div className="pl-0 md:pl-[70px]">
        {/* Top Navigation */}
        <ProfessionalTopNav showThemeToggle={showThemeToggle} />

        {/* Page Content - Mobile optimized */}
        <main className="p-3 md:p-6 bg-theme-bg-tertiary min-h-screen">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
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
        bg-theme-card rounded-theme shadow-theme-card border border-theme-border
        ${hoverable ? 'hover:shadow-theme-card-hover transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
    >
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-theme-border">
          {title && (
            <h3 className="text-lg font-semibold text-theme-text">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-theme-text-muted mt-1">{subtitle}</p>
          )}
        </div>
      )}
      <div className="p-6">
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
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 ${className}`}>
      <div>
        <h1 className="text-3xl font-bold text-theme-text">{title}</h1>
        {subtitle && (
          <p className="text-theme-text-muted mt-2">{subtitle}</p>
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
          <p className="text-sm font-medium text-theme-text-muted mb-1">{title}</p>
          <p className="text-2xl font-bold text-theme-text">{value}</p>
          {change && (
            <p className={`text-sm ${changeColors[changeType]} mt-1`}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="w-12 h-12 bg-theme-primary/10 rounded-xl flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
      </div>
    </ContentCard>
  );
}