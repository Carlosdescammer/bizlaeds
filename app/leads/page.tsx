'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Download,
  Upload,
  BarChart3,
  Building2,
  Mail,
  Phone,
  MapPin,
  Star,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  TrendingUp,
  Users,
  Globe,
  Target,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { Badge } from '@/components/ui/badge';
import { calculateLeadScore } from '@/lib/lead-scoring';

type Business = {
  id: string;
  businessName: string;
  businessType: string | null;
  industry: string | null;
  companySize: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  formattedAddress: string | null;
  phone: string | null;
  email: string | null;
  emailValid: boolean | null;
  website: string | null;
  contactName: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  googlePlaceId: string | null;
  hunterEmailPattern: string | null;
  hunterEmailCount: number | null;
  hunterVerificationStatus: string | null;
  hunterVerificationScore: number | null;
  hunterEnrichedAt: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  facebookUrl: string | null;
  logoUrl: string | null;
  leadStatus: string;
  leadPriority: string | null;
  confidenceScore: number | null;
  createdAt: string;
  lastContactedAt: string | null;
};

export default function LeadsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    filterBusinesses();
  }, [businesses, searchQuery, statusFilter, priorityFilter, dateFrom, dateTo]);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/businesses');
      const data = await response.json();
      setBusinesses(data.businesses || []);
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBusinesses = () => {
    let filtered = [...businesses];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.businessName?.toLowerCase().includes(query) ||
          b.email?.toLowerCase().includes(query) ||
          b.phone?.toLowerCase().includes(query) ||
          b.city?.toLowerCase().includes(query) ||
          b.industry?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((b) => b.leadStatus === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((b) => b.leadPriority === priorityFilter);
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((b) => {
        const createdDate = new Date(b.createdAt);
        return createdDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((b) => {
        const createdDate = new Date(b.createdAt);
        return createdDate <= toDate;
      });
    }

    setFilteredBusinesses(filtered);
  };

  const handleExport = (type: string) => {
    let url = '/api/businesses/export?format=csv';
    if (type === 'high-priority') url += '&leadPriority=high';
    if (type === 'new') url += '&leadStatus=new';
    window.open(url, '_blank');
  };

  // Calculate stats
  const stats = {
    total: businesses.length,
    new: businesses.filter((b) => b.leadStatus === 'new').length,
    contacted: businesses.filter((b) => b.leadStatus === 'contacted').length,
    qualified: businesses.filter((b) => b.leadStatus === 'qualified').length,
    highPriority: businesses.filter((b) => b.leadPriority === 'high').length,
    avgScore: businesses.length > 0
      ? Math.round(businesses.reduce((sum, b) => sum + calculateLeadScore(b), 0) / businesses.length)
      : 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Leads</h1>
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {filteredBusinesses.length} leads
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                <Upload className="w-4 h-4" />
                Upload Photo
              </Link>
              <Link
                href="/usage"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg"
              >
                <BarChart3 className="w-4 h-4" />
                Usage
              </Link>
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Leads</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.new}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">New</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.contacted}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Contacted</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.qualified}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Qualified</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <Target className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.highPriority}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">High Priority</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgScore}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Avg Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search leads by name, email, phone, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => handleExport('all')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">From:</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">To:</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Leads Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredBusinesses.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No leads found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Upload a business card photo to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && priorityFilter === 'all' && (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  <Upload className="w-4 h-4" />
                  Upload Photo
                </Link>
              )}
            </div>
          ) : (
            filteredBusinesses.map((business) => {
              const leadScore = calculateLeadScore(business);
              const scoreColor = leadScore >= 80 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : leadScore >= 50 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
              const priorityColor =
                business.leadPriority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                business.leadPriority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';

              return (
                <Link
                  key={business.id}
                  href={`/leads/${business.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-200"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Company Logo */}
                      <div className="flex-shrink-0">
                        {business.logoUrl ? (
                          <img
                            src={business.logoUrl}
                            alt={business.businessName}
                            className="w-14 h-14 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Building2 className="w-7 h-7 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                {business.businessName}
                              </h3>
                              {/* Email Verification Badge */}
                              {business.hunterVerificationStatus === 'deliverable' && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/20 rounded-full" title={`Email Verified (${business.hunterVerificationScore}/100)`}>
                                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span className="text-xs font-medium text-green-700 dark:text-green-300">Verified</span>
                                </div>
                              )}
                              {business.hunterVerificationStatus === 'risky' && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/20 rounded-full" title={`Email Risky (${business.hunterVerificationScore}/100)`}>
                                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                  <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Risky</span>
                                </div>
                              )}
                              {business.hunterVerificationStatus === 'undeliverable' && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/20 rounded-full" title="Email Invalid">
                                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  <span className="text-xs font-medium text-red-700 dark:text-red-300">Invalid</span>
                                </div>
                              )}
                              {!business.hunterVerificationStatus && business.emailValid && (
                                <div title="Email Format Valid">
                                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                              {business.industry && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  {business.industry}
                                </span>
                              )}
                              {business.companySize && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {business.companySize}
                                  </span>
                                </>
                              )}
                              {business.city && business.state && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {business.city}, {business.state}
                                  </span>
                                </>
                              )}
                              {business.googleRating && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <span className="flex items-center gap-1">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    {business.googleRating} ({business.googleReviewCount})
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Lead Score */}
                          <div className={`flex-shrink-0 px-3 py-1 rounded-lg ${scoreColor} font-semibold`}>
                            {leadScore}
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                          {business.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-900 dark:text-white truncate">{business.email}</span>
                            </div>
                          )}
                          {business.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-900 dark:text-white">{business.phone}</span>
                            </div>
                          )}
                          {business.website && (
                            <div className="flex items-center gap-2 text-sm">
                              <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-blue-600 dark:text-blue-400 truncate hover:underline">
                                {business.website.replace(/^https?:\/\//, '')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Bottom Row - Badges and Date */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                              {(business.leadStatus || 'new').toUpperCase()}
                            </Badge>
                            {business.leadPriority && (
                              <Badge className={`${priorityColor} text-xs`}>
                                {business.leadPriority.toUpperCase()}
                              </Badge>
                            )}
                            {business.hunterEnrichedAt && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                                Enriched
                              </Badge>
                            )}
                            {business.confidenceScore && business.confidenceScore >= 0.8 && (
                              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs">
                                High Confidence
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(business.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Arrow Icon */}
                      <div className="flex-shrink-0 self-center">
                        <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
