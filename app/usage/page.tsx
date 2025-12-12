'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Activity,
  Zap,
  Database,
  Mail,
  MapPin,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { Badge } from '@/components/ui/badge';

type ServiceUsage = {
  service: string;
  requestsCount: number;
  estimatedCost: number;
  percentage: number;
  status: string;
  limit: number;
};

export default function UsagePage() {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/usage');
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }
      const data = await response.json();
      setUsageData(data);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
      setUsageData({ services: [], totals: { cost: 0, requests: 0 }, alerts: [], recentLogs: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsage();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getServiceName = (service: string) => {
    const names: Record<string, string> = {
      openai: 'OpenAI Vision API',
      google_maps: 'Google Maps API',
      hunter_io: 'Hunter.io',
    };
    return names[service] || service;
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'openai':
        return <Zap className="w-5 h-5" />;
      case 'google_maps':
        return <MapPin className="w-5 h-5" />;
      case 'hunter_io':
        return <Mail className="w-5 h-5" />;
      default:
        return <Database className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'bg-green-600';
      case 'warning':
        return 'bg-yellow-600';
      case 'critical':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  if (loading || !usageData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/leads" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">API Usage</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hunter.io Live Credits Banner */}
        {usageData?.hunterLive && (
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg p-6 mb-8 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Hunter.io Live Status</h3>
                    <Badge className="bg-white/20 text-white border-white/30 mt-1">
                      {usageData.hunterLive.plan}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                    <p className="text-purple-100 text-sm mb-1">Search Credits</p>
                    <p className="text-3xl font-bold">
                      {usageData.hunterLive.credits.available}
                      <span className="text-lg text-purple-100 ml-2">
                        / {usageData.hunterLive.credits.total}
                      </span>
                    </p>
                    <div className="mt-2 w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-white rounded-full h-2 transition-all"
                        style={{
                          width: `${(usageData.hunterLive.credits.available / usageData.hunterLive.credits.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                    <p className="text-purple-100 text-sm mb-1">Searches Available</p>
                    <p className="text-3xl font-bold">{usageData.hunterLive.searches.available}</p>
                    <p className="text-sm text-purple-100 mt-2">
                      {usageData.hunterLive.searches.used} used this month
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                    <p className="text-purple-100 text-sm mb-1">Verifications</p>
                    <p className="text-3xl font-bold">{usageData.hunterLive.verifications.available}</p>
                    <p className="text-sm text-purple-100 mt-2">
                      {usageData.hunterLive.verifications.used} used this month
                    </p>
                  </div>
                </div>

                {usageData.hunterLive.resetDate && (
                  <p className="text-purple-100 mt-4 text-sm">
                    Resets on {new Date(usageData.hunterLive.resetDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm text-gray-500 dark:text-gray-400">Total Cost</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${(usageData?.totals?.cost || 0).toFixed(2)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">This month</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm text-gray-500 dark:text-gray-400">API Requests</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {usageData?.totals?.requests || 0}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Calls made</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm text-gray-500 dark:text-gray-400">Active Alerts</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {usageData?.alerts?.length || 0}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Last 7 days</p>
          </div>
        </div>

        {/* Service Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Service Usage</h2>
          </div>

          <div className="p-6 space-y-6">
            {(usageData?.services || []).map((service: ServiceUsage) => (
              <div key={service.service} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      {getServiceIcon(service.service)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {getServiceName(service.service)}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {service.service === 'hunter_io'
                          ? `${Number(service.estimatedCost).toFixed(1)} credits • ${service.requestsCount} requests`
                          : `${service.requestsCount} requests • $${Number(service.estimatedCost).toFixed(2)}`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(service.status)}`}>
                      {Number(service.percentage).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all ${getProgressColor(service.status)}`}
                      style={{ width: `${Math.min(service.percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      {service.service === 'hunter_io'
                        ? `${Number(service.estimatedCost).toFixed(1)} of ${service.limit} credits`
                        : `$${Number(service.estimatedCost).toFixed(2)} of $${service.limit}`}
                    </span>
                    <span>
                      {service.service === 'hunter_io'
                        ? `${Number(service.limit - Number(service.estimatedCost)).toFixed(1)} remaining`
                        : `$${Number(service.limit - Number(service.estimatedCost)).toFixed(2)} remaining`}
                    </span>
                  </div>
                </div>

                {/* Warning Messages */}
                {service.status === 'warning' && (
                  <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                        Approaching limit
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        You've used over 80% of your allocation. Consider monitoring usage closely.
                      </p>
                    </div>
                  </div>
                )}

                {service.status === 'critical' && (
                  <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">
                        Critical: Near limit!
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        You've used over 94% of your allocation. Service may be interrupted soon.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Log */}
        {usageData?.recentLogs && Array.isArray(usageData.recentLogs) && usageData.recentLogs.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Business
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {usageData.recentLogs.slice(0, 20).map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-3 px-6 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-900 dark:text-white">
                        {getServiceName(log.service)}
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-600 dark:text-gray-400">
                        {log.requestType}
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-600 dark:text-gray-400">
                        {log.business?.businessName || '-'}
                      </td>
                      <td className="py-3 px-6">
                        <Badge
                          className={
                            log.success
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }
                        >
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-900 dark:text-white text-right font-mono">
                        ${Number(log.estimatedCost).toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
