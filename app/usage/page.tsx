'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, AlertCircle, CheckCircle, TrendingUp, DollarSign, Activity } from 'lucide-react';

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
      const data = await response.json();
      setUsageData(data);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">API Usage Monitor</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-600">Total Cost</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${usageData?.totals?.cost?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-gray-500 mt-1">This month</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-medium text-gray-600">Total Requests</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {usageData?.totals?.requests || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">API calls made</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-medium text-gray-600">Active Alerts</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {usageData?.alerts?.length || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Last 7 days</p>
          </div>
        </div>

        {/* Service Usage */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Service Usage</h2>

          <div className="space-y-6">
            {usageData?.services?.map((service: ServiceUsage) => (
              <div key={service.service} className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {getServiceName(service.service)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {service.requestsCount} requests
                        {service.estimatedCost > 0 && ` • $${service.estimatedCost.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                      service.status
                    )}`}
                  >
                    {service.percentage.toFixed(1)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-3">
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
                      <span className="text-xs text-gray-500 absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        80%
                      </span>
                    </div>
                    <div className="absolute left-[94%] transform -translate-x-1/2">
                      <div className="w-px h-4 bg-red-400" />
                      <span className="text-xs text-gray-500 absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        94%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Limit Info */}
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>
                    {service.service === 'openai'
                      ? `$${service.estimatedCost.toFixed(2)} of $${service.limit} budget`
                      : `${service.requestsCount} of ${service.limit} requests`}
                  </span>
                  <span>
                    {service.service === 'openai'
                      ? `$${(service.limit - service.estimatedCost).toFixed(2)} remaining`
                      : `${service.limit - service.requestsCount} remaining`}
                  </span>
                </div>

                {/* Warning Messages */}
                {service.status === 'warning' && (
                  <div className="mt-3 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">
                        Approaching limit
                      </p>
                      <p className="text-sm text-yellow-700">
                        You've used over 80% of your free tier. Consider upgrading or reducing usage.
                      </p>
                    </div>
                  </div>
                )}

                {service.status === 'critical' && (
                  <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">
                        Critical: Near limit!
                      </p>
                      <p className="text-sm text-red-700">
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
        {usageData?.alerts && usageData.alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Alerts</h2>
            <div className="space-y-3">
              {usageData.alerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    alert.alertLevel === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  {alert.alertLevel === 'critical' ? (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{alert.message}</p>
                    <p className="text-sm text-gray-600 mt-1">
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
        {usageData?.recentLogs && usageData.recentLogs.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent API Activity</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Time
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Service
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Business
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.recentLogs.map((log: any) => (
                    <tr key={log.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {getServiceName(log.service)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {log.requestType}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {log.business?.businessName || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            log.success
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 text-right">
                        ${log.estimatedCost.toFixed(3)}
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
