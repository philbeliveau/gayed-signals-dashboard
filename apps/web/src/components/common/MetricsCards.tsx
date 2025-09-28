'use client';

import React, { memo } from 'react';
import { 
  ArrowUpRight,
  ArrowDownRight,
  Home,
  TrendingUp,
  Calendar,
  Users,
  FileText,
  Briefcase
} from 'lucide-react';

interface TrendArrowProps {
  value: number;
  showValue?: boolean;
  prefix?: string;
  suffix?: string;
  inverse?: boolean;
}

const TrendArrow: React.FC<TrendArrowProps> = memo(({ 
  value, 
  showValue = true, 
  prefix = '', 
  suffix = '%', 
  inverse = false 
}) => {
  const isPositive = inverse ? value < 0 : value > 0;
  const isNeutral = value === 0;

  const colorClass = isNeutral 
    ? 'text-theme-text-muted' 
    : isPositive 
      ? 'text-theme-success' 
      : 'text-theme-danger';

  const IconComponent = isNeutral ? null : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      {IconComponent && <IconComponent className="w-4 h-4" />}
      {showValue && (
        <span className="font-medium text-sm">
          {prefix}{Math.abs(value).toFixed(1)}{suffix}
        </span>
      )}
    </div>
  );
});

interface StressIndicatorProps {
  level: 'low' | 'medium' | 'high';
  size?: 'sm' | 'md' | 'lg';
}

const StressIndicator: React.FC<StressIndicatorProps> = memo(({ level, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  const colorClasses = {
    low: 'bg-theme-success',
    medium: 'bg-theme-warning',
    high: 'bg-theme-danger'
  };

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[level]} rounded-full animate-pulse`} />
  );
});

interface DataCardProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon?: React.ReactNode;
  status?: 'normal' | 'warning' | 'critical';
  loading?: boolean;
  inverse?: boolean;
}

const DataCard: React.FC<DataCardProps> = memo(({
  title,
  value,
  change,
  subtitle,
  icon,
  status = 'normal',
  loading = false,
  inverse = false
}) => {
  const statusColors = {
    normal: 'border-theme-border bg-theme-card',
    warning: 'border-theme-warning-border bg-theme-warning-bg',
    critical: 'border-theme-danger-border bg-theme-danger-bg'
  };

  if (loading) {
    return (
      <div className="bg-theme-card border border-theme-border rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-theme-bg-secondary rounded mb-2"></div>
        <div className="h-8 bg-theme-bg-secondary rounded mb-2"></div>
        <div className="h-3 bg-theme-bg-secondary rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-6 border transition-all duration-200 hover:border-theme-border-hover hover:shadow-lg ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-theme-text-muted uppercase tracking-wide">{title}</div>
        {icon && <div className="text-theme-text-muted">{icon}</div>}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold text-theme-text">{value}</div>
        {change !== undefined && <TrendArrow value={change} inverse={inverse} />}
      </div>
      
      {subtitle && (
        <div className="text-xs text-theme-text-light mt-1">{subtitle}</div>
      )}
    </div>
  );
});

// Housing-specific metrics cards
interface HousingMetricsProps {
  currentData: any;
  stressLevel: 'low' | 'medium' | 'high';
  loading?: boolean;
}

export const HousingMetricsCards: React.FC<HousingMetricsProps> = memo(({
  currentData,
  stressLevel,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <DataCard key={i} title="" value="" loading />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <DataCard
        title="Case-Shiller Index"
        value={currentData?.caseSillerIndex.toFixed(1) || '--'}
        change={currentData?.priceChangeMonthly}
        subtitle="National Home Price Index"
        icon={<TrendingUp className="w-5 h-5" />}
        status={currentData && currentData.priceChangeMonthly < -1.0 ? 'warning' : 'normal'}
      />
      
      <DataCard
        title="Housing Supply"
        value={`${currentData?.monthsSupply.toFixed(1) || '--'} months`}
        subtitle="Months of Inventory"
        icon={<Home className="w-5 h-5" />}
        status={currentData && currentData.monthsSupply > 6.0 ? 'critical' : 'normal'}
      />
      
      <DataCard
        title="New Home Sales"
        value={currentData ? `${(currentData.newHomeSales / 1000).toFixed(0)}K` : '--'}
        subtitle="Monthly Sales Rate"
        icon={<Calendar className="w-5 h-5" />}
      />
      
      <DataCard
        title="Market Stress"
        value="--"
        subtitle={`${stressLevel.toUpperCase()} stress level`}
        icon={<StressIndicator level={stressLevel} size="lg" />}
        status={stressLevel === 'high' ? 'critical' : stressLevel === 'medium' ? 'warning' : 'normal'}
      />
    </div>
  );
});

// Labor-specific metrics cards
interface LaborMetricsProps {
  currentData: any;
  stressLevel: 'low' | 'medium' | 'high';
  claimsComparison: any;
  loading?: boolean;
}

export const LaborMetricsCards: React.FC<LaborMetricsProps> = memo(({
  currentData,
  stressLevel,
  claimsComparison,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <DataCard key={i} title="" value="" loading />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <DataCard
        title="Initial Claims"
        value={currentData ? currentData.initialClaims.toLocaleString() : '--'}
        change={currentData?.weeklyChangeInitial}
        subtitle="Weekly jobless claims"
        icon={<FileText className="w-5 h-5" />}
        status={currentData && currentData.weeklyChangeInitial > 10 ? 'warning' : 'normal'}
        inverse={true}
      />
      
      <DataCard
        title="Continued Claims"
        value={currentData ? `${(currentData.continuedClaims / 1000000).toFixed(2)}M` : '--'}
        change={currentData?.weeklyChangeContinued}
        subtitle="Ongoing unemployment claims"
        icon={<Users className="w-5 h-5" />}
        status={claimsComparison?.status === 'worse' ? 'critical' : claimsComparison?.status === 'similar' ? 'warning' : 'normal'}
        inverse={true}
      />
      
      <DataCard
        title="Unemployment Rate"
        value={currentData ? `${currentData.unemploymentRate}%` : '--'}
        subtitle="Official unemployment rate"
        icon={<Briefcase className="w-5 h-5" />}
        status={currentData && currentData.unemploymentRate > 4.5 ? 'warning' : 'normal'}
        inverse={true}
      />
      
      <DataCard
        title="Labor Market Stress"
        value="--"
        subtitle={`${stressLevel.toUpperCase()} stress level`}
        icon={<StressIndicator level={stressLevel} size="lg" />}
        status={stressLevel === 'high' ? 'critical' : stressLevel === 'medium' ? 'warning' : 'normal'}
      />
    </div>
  );
});

export { TrendArrow, StressIndicator, DataCard };