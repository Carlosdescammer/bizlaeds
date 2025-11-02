'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, AlertCircle, CheckCircle, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';

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

  const getServiceName = (service: string) => {
    const names: Record<string, string> = {
      openai: 'OpenAI (GPT-4 Vision)',
      google_maps: 'Google Maps API',
      hunter_io: 'Hunter.io Email Finder',
    };
    return names[service] || service;
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
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-100 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-100 border-yellow-200 dark:border-yellow-800';
      case 'critical':
        return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-100 border-red-200 dark:border-red-800';
      default:
        return 'bg-muted text-foreground border-border';
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Link href="/" className="text-muted-foreground hover:text-foreground flex-shrink-0">
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </Link>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">API Usage Monitor</h1>
            </div>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Hunter.io Live Credits Banner */}
        {usageData?.hunterLive && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-start justify-between">
              <div className="w-full">
                <h3 className="text-base sm:text-lg font-bold text-foreground flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xl sm:text-2xl">🎯</span>
                  <span>Hunter.io Live Credits</span>
                  <span className="text-xs sm:text-sm font-normal px-2 py-1 rounded-full bg-purple-600 text-white">
                    {usageData.hunterLive.plan}
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-3 sm:mt-4">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Credits</p>
                    <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                      {usageData.hunterLive.credits.available}
                      <span className="text-sm sm:text-base text-muted-foreground ml-2">
                        / {usageData.hunterLive.credits.total}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {usageData.hunterLive.credits.used} credits used
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Searches</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                      {usageData.hunterLive.searches.available}
                      <span className="text-xs sm:text-sm text-muted-foreground ml-2">available</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {usageData.hunterLive.searches.used} used
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Verifications</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      {usageData.hunterLive.verifications.available}
                      <span className="text-xs sm:text-sm text-muted-foreground ml-2">available</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {usageData.hunterLive.verifications.used} used
                    </p>
                  </div>
                </div>
                {usageData.hunterLive.resetDate && (
                  <p className="text-sm text-muted-foreground mt-4">
                    ⏱️ Resets on: <strong>{new Date(usageData.hunterLive.resetDate).toLocaleDateString()}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-medium text-sm sm:text-base text-muted-foreground">Total Cost</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">
              ${(usageData?.totals?.cost || 0).toFixed(2)}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">This month</p>
          </div>

          <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 dark:bg-indigo-950 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-medium text-sm sm:text-base text-muted-foreground">Total Requests</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">
              {usageData?.totals?.requests || 0}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">API calls made</p>
          </div>

          <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-medium text-sm sm:text-base text-muted-foreground">Active Alerts</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">
              {usageData?.alerts?.length || 0}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Last 7 days</p>
          </div>
        </div>

        {/* Service Usage */}
        <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8 border">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6">Service Usage</h2>

          <div className="space-y-6">
            {(usageData?.services || []).map((service: ServiceUsage) => (
              <div key={service.service} className="border-b border-border last:border-0 pb-6 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {getServiceName(service.service)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {service.service === 'hunter_io'
                          ? `${Number(service.estimatedCost).toFixed(1)} credits used`
                          : service.service === 'openai' || service.service.includes('linkedin')
                          ? `${service.requestsCount} requests • $${Number(service.estimatedCost).toFixed(2)}`
                          : `${service.requestsCount} requests`
                        }
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                      service.status
                    )}`}
                  >
                    {Number(service.percentage).toFixed(1)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="relative">
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getProgressColor(
                        service.status
                      )}`}
                      style={{ width: `${Math.min(service.percentage, 100)}%` }}
                    />
                  </div>

                  {/* Threshold markers */}
                  <div className="relative h-6 mt-1">
                    <div className="absolute left-[80%] transform -translate-x-1/2">
                      <div className="w-px h-4 bg-yellow-400" />
                      <span className="text-xs text-muted-foreground absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        80%
                      </span>
                    </div>
                    <div className="absolute left-[94%] transform -translate-x-1/2">
                      <div className="w-px h-4 bg-red-400" />
                      <span className="text-xs text-muted-foreground absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        94%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Limit Info */}
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>
                    {service.service === 'hunter_io'
                      ? `${Number(service.estimatedCost).toFixed(1)} of ${service.limit} credits`
                      : service.service === 'openai' || service.service.includes('linkedin')
                      ? `$${Number(service.estimatedCost).toFixed(2)} of $${service.limit} budget`
                      : `${service.requestsCount} of ${service.limit} requests`}
                  </span>
                  <span>
                    {service.service === 'hunter_io'
                      ? `${Number(service.limit - Number(service.estimatedCost)).toFixed(1)} credits remaining`
                      : service.service === 'openai' || service.service.includes('linkedin')
                      ? `$${Number(service.limit - Number(service.estimatedCost)).toFixed(2)} remaining`
                      : `${service.limit - service.requestsCount} remaining`}
                  </span>
                </div>

                {/* Warning Messages */}
                {service.status === 'warning' && (
                  <div className="mt-3 flex items-start gap-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                        Approaching limit
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        You've used over 80% of your free tier. Consider upgrading or reducing usage.
                      </p>
                    </div>
                  </div>
                )}

                {service.status === 'critical' && (
                  <div className="mt-3 flex items-start gap-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">
                        Critical: Near limit!
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        You've used over 94% of your free tier. Service may be interrupted soon.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        {usageData?.alerts && Array.isArray(usageData.alerts) && usageData.alerts.length > 0 && (
          <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8 border">
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Recent Alerts</h2>
            <div className="space-y-3">
              {usageData.alerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    alert.alertLevel === 'critical'
                      ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                      : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                  }`}
                >
                  {alert.alertLevel === 'critical' ? (
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{alert.message}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getServiceName(alert.service)} •{' '}
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity Log */}
        {usageData?.recentLogs && Array.isArray(usageData.recentLogs) && usageData.recentLogs.length > 0 && (
          <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border">
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Recent API Activity</h2>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Time
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Service
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Business
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.recentLogs.map((log: any) => (
                    <tr key={log.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {getServiceName(log.service)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {log.requestType}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {log.business?.businessName || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            log.success
                              ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-100'
                              : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-100'
                          }`}
                        >
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground text-right">
                        ${Number(log.estimatedCost).toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
