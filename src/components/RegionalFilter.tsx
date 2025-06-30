'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  MapPin, 
  Search, 
  Star, 
  StarOff, 
  ChevronDown, 
  Check,
  Globe,
  Building,
  Home
} from 'lucide-react';

interface Region {
  code: string;
  name: string;
  type: 'national' | 'state' | 'metro' | 'city';
  population?: number;
  parentRegion?: string;
  coordinates?: { lat: number; lng: number };
  marketData?: {
    index: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
}

interface RegionalFilterProps {
  regions: Region[];
  selectedRegion: string;
  onRegionChange: (regionCode: string) => void;
  placeholder?: string;
  showFavorites?: boolean;
  showSearch?: boolean;
  showMetadata?: boolean;
  className?: string;
  favorites?: string[];
  onFavoriteToggle?: (regionCode: string) => void;
  loading?: boolean;
}

export default function RegionalFilter({
  regions,
  selectedRegion,
  onRegionChange,
  placeholder = 'Select region...',
  showFavorites = true,
  showSearch = true,
  showMetadata = true,
  className = '',
  favorites = [],
  onFavoriteToggle,
  loading = false
}: RegionalFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRegions, setFilteredRegions] = useState(regions);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchTerm) {
      setFilteredRegions(
        regions.filter(region =>
          region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          region.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          region.type.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredRegions(regions);
    }
  }, [searchTerm, regions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  const selectedRegionData = regions.find(r => r.code === selectedRegion);

  const getRegionIcon = (type: string) => {
    switch (type) {
      case 'national':
        return <Globe className="w-4 h-4" />;
      case 'state':
        return <Building className="w-4 h-4" />;
      case 'metro':
      case 'city':
        return <Home className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const formatPopulation = (population?: number) => {
    if (!population) return '';
    if (population >= 1000000) {
      return `${(population / 1000000).toFixed(1)}M`;
    } else if (population >= 1000) {
      return `${(population / 1000).toFixed(0)}K`;
    }
    return population.toString();
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-theme-success';
      case 'down':
        return 'text-theme-danger';
      default:
        return 'text-theme-text-muted';
    }
  };

  const handleRegionSelect = (regionCode: string) => {
    onRegionChange(regionCode);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleFavoriteToggle = (e: React.MouseEvent, regionCode: string) => {
    e.stopPropagation();
    onFavoriteToggle?.(regionCode);
  };

  const groupedRegions = filteredRegions.reduce((acc, region) => {
    if (!acc[region.type]) {
      acc[region.type] = [];
    }
    acc[region.type].push(region);
    return acc;
  }, {} as Record<string, Region[]>);

  // Sort groups by type priority
  const typeOrder = ['national', 'state', 'metro', 'city'];
  const sortedGroups = Object.entries(groupedRegions).sort(
    ([a], [b]) => typeOrder.indexOf(a) - typeOrder.indexOf(b)
  );

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-theme-card border border-theme-border rounded-lg px-4 py-2 animate-pulse">
          <div className="h-5 bg-theme-bg-secondary rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-theme-card border border-theme-border rounded-lg px-4 py-2 text-left flex items-center justify-between hover:border-theme-border-hover focus:border-theme-primary focus:outline-none transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select region"
      >
        <div className="flex items-center gap-3">
          <div className="text-theme-text-muted">
            {selectedRegionData ? getRegionIcon(selectedRegionData.type) : <MapPin className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-theme-text font-medium">
              {selectedRegionData ? selectedRegionData.name : placeholder}
            </div>
            {selectedRegionData && showMetadata && (
              <div className="text-xs text-theme-text-muted capitalize">
                {selectedRegionData.type}
                {selectedRegionData.population && ` • ${formatPopulation(selectedRegionData.population)}`}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedRegionData?.marketData && showMetadata && (
            <div className={`text-xs font-medium ${getTrendColor(selectedRegionData.marketData.trend)}`}>
              {selectedRegionData.marketData.change > 0 ? '+' : ''}
              {selectedRegionData.marketData.change.toFixed(1)}%
            </div>
          )}
          <ChevronDown className={`w-4 h-4 text-theme-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-theme-card border border-theme-border rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* Search Input */}
          {showSearch && (
            <div className="p-3 border-b border-theme-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search regions..."
                  className="w-full pl-10 pr-4 py-2 bg-theme-bg border border-theme-border rounded-lg text-theme-text placeholder-theme-text-muted focus:border-theme-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Favorites Section */}
          {showFavorites && favorites.length > 0 && !searchTerm && (
            <div className="border-b border-theme-border">
              <div className="px-3 py-2 text-xs font-medium text-theme-text-muted uppercase tracking-wide bg-theme-bg-secondary">
                <Star className="w-3 h-3 inline mr-1" />
                Favorites
              </div>
              <div className="max-h-32 overflow-y-auto">
                {regions
                  .filter(region => favorites.includes(region.code))
                  .map(region => (
                    <RegionOption
                      key={`fav-${region.code}`}
                      region={region}
                      isSelected={region.code === selectedRegion}
                      isFavorite={favorites.includes(region.code)}
                      onSelect={() => handleRegionSelect(region.code)}
                      onFavoriteToggle={showFavorites && onFavoriteToggle ? (e) => handleFavoriteToggle(e, region.code) : undefined}
                      showMetadata={showMetadata}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Grouped Regions */}
          <div className="max-h-64 overflow-y-auto">
            {sortedGroups.map(([type, typeRegions]) => (
              <div key={type}>
                <div className="px-3 py-2 text-xs font-medium text-theme-text-muted uppercase tracking-wide bg-theme-bg-secondary">
                  {type === 'national' && 'National'}
                  {type === 'state' && 'States'}
                  {type === 'metro' && 'Metro Areas'}
                  {type === 'city' && 'Cities'}
                </div>
                {typeRegions.map(region => (
                  <RegionOption
                    key={region.code}
                    region={region}
                    isSelected={region.code === selectedRegion}
                    isFavorite={showFavorites && favorites.includes(region.code)}
                    onSelect={() => handleRegionSelect(region.code)}
                    onFavoriteToggle={showFavorites && onFavoriteToggle ? (e) => handleFavoriteToggle(e, region.code) : undefined}
                    showMetadata={showMetadata}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* No Results */}
          {filteredRegions.length === 0 && (
            <div className="p-6 text-center text-theme-text-muted">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">No regions found</div>
              <div className="text-xs mt-1">Try adjusting your search</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Individual Region Option Component
const RegionOption: React.FC<{
  region: Region;
  isSelected: boolean;
  isFavorite?: boolean;
  onSelect: () => void;
  onFavoriteToggle?: (e: React.MouseEvent) => void;
  showMetadata: boolean;
}> = ({ region, isSelected, isFavorite, onSelect, onFavoriteToggle, showMetadata }) => {
  const getRegionIcon = (type: string) => {
    switch (type) {
      case 'national':
        return <Globe className="w-4 h-4" />;
      case 'state':
        return <Building className="w-4 h-4" />;
      case 'metro':
      case 'city':
        return <Home className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const formatPopulation = (population?: number) => {
    if (!population) return '';
    if (population >= 1000000) {
      return `${(population / 1000000).toFixed(1)}M`;
    } else if (population >= 1000) {
      return `${(population / 1000).toFixed(0)}K`;
    }
    return population.toString();
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-theme-success';
      case 'down':
        return 'text-theme-danger';
      default:
        return 'text-theme-text-muted';
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors hover:bg-theme-card-hover ${
        isSelected ? 'bg-theme-primary/10 text-theme-primary' : 'text-theme-text'
      }`}
      role="option"
      aria-selected={isSelected}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-theme-text-muted">
          {getRegionIcon(region.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{region.name}</div>
          {showMetadata && (
            <div className="text-xs text-theme-text-muted">
              {region.population && `${formatPopulation(region.population)}`}
              {region.parentRegion && ` • ${region.parentRegion}`}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {region.marketData && showMetadata && (
          <div className={`text-xs font-medium ${getTrendColor(region.marketData.trend)}`}>
            {region.marketData.change > 0 ? '+' : ''}
            {region.marketData.change.toFixed(1)}%
          </div>
        )}
        
        {onFavoriteToggle && (
          <button
            onClick={onFavoriteToggle}
            className="p-1 hover:bg-theme-card-secondary rounded transition-colors"
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? (
              <Star className="w-4 h-4 text-theme-warning fill-current" />
            ) : (
              <StarOff className="w-4 h-4 text-theme-text-muted" />
            )}
          </button>
        )}
        
        {isSelected && (
          <Check className="w-4 h-4 text-theme-primary" />
        )}
      </div>
    </div>
  );
};