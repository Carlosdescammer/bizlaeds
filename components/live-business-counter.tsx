'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Database, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BusinessStats {
  total: number;
  approved: number;
  pending: number;
  archived: number;
  recentlyAdded: number;
  enrichment: {
    google: number;
    hunter: number;
    verified: number;
  };
  timestamp: string;
}

export function LiveBusinessCounter({
  refreshInterval = 30000, // 30 seconds default
  variant = 'full' // 'full' | 'compact' | 'minimal'
}: {
  refreshInterval?: number;
  variant?: 'full' | 'compact' | 'minimal';
}) {
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats', {
        cache: 'no-store',
      });
      const data = await response.json();

      // Trigger animation when count changes
      if (stats && data.total !== stats.total) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);
      }

      setStats(data);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading stats...</span>
      </div>
    );
  }

  if (!stats) return null;

  // Minimal variant - just the total count
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-primary" />
        <span className={`font-bold text-lg ${isAnimating ? 'scale-110 text-green-600' : ''} transition-all`}>
          {stats.total.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground">businesses</span>
      </div>
    );
  }

  // Compact variant - key metrics in a row
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <span className={`font-bold ${isAnimating ? 'scale-110 text-green-600' : ''} transition-all`}>
            {stats.total.toLocaleString()}
          </span>
        </div>
        {stats.recentlyAdded > 0 && (
          <Badge variant="secondary" className="gap-1">
            <TrendingUp className="w-3 h-3" />
            +{stats.recentlyAdded} today
          </Badge>
        )}
        <div className="flex items-center gap-1 text-muted-foreground">
          <CheckCircle className="w-3 h-3" />
          <span>{stats.approved} approved</span>
        </div>
      </div>
    );
  }

  // Full variant - comprehensive stats card
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Main Counter */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Database className="w-6 h-6 text-primary" />
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Total Businesses
              </h3>
            </div>
            <div className={`text-5xl font-bold ${isAnimating ? 'scale-110 text-green-600' : 'text-foreground'} transition-all duration-500`}>
              {stats.total.toLocaleString()}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.approved.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">{stats.archived.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Archived</div>
            </div>
          </div>

          {/* Recent Activity */}
          {stats.recentlyAdded > 0 && (
            <div className="flex items-center justify-center gap-2 pt-3 border-t">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">
                +{stats.recentlyAdded} added in last 24 hours
              </span>
            </div>
          )}

          {/* Enrichment Stats */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t">
            <div className="text-center">
              <div className="text-sm font-semibold text-blue-600">{stats.enrichment.google}</div>
              <div className="text-xs text-muted-foreground">Google</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-purple-600">{stats.enrichment.hunter}</div>
              <div className="text-xs text-muted-foreground">Hunter</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-green-600">{stats.enrichment.verified}</div>
              <div className="text-xs text-muted-foreground">Verified</div>
            </div>
          </div>

          {/* Last Update */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Clock className="w-3 h-3" />
            <span>
              Updated {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'just now'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
