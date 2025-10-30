'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, Mail, Eye, Trash2, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';

type Business = {
  id: string;
  businessName: string;
  businessType: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  reviewStatus: string;
  confidenceScore: number | null;
  createdAt: string;
  photos: any[];
  emailCampaigns: any[];
};

export default function LeadsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchBusinesses();
  }, [search, statusFilter]);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/businesses?${params}`);
      const data = await response.json();

      setBusinesses(data.businesses || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBusiness = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business?')) return;

    try {
      await fetch(`/api/businesses/${id}`, { method: 'DELETE' });
      fetchBusinesses();
    } catch (error) {
      console.error('Failed to delete business:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    const icons: Record<string, any> = {
      pending_review: Clock,
      approved: CheckCircle,
      rejected: XCircle,
    };

    const Icon = icons[status] || Clock;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        <Icon className="w-4 h-4" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Business Leads</h1>
            <nav className="flex gap-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium">
                Home
              </Link>
              <Link href="/usage" className="text-gray-600 hover:text-gray-900 font-medium">
                Usage
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, address, or type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {businesses.length} of {total} businesses
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Business Cards */}
        {!loading && businesses.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No businesses found</p>
            <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block">
              Upload your first photo
            </Link>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((business) => (
            <div key={business.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              {/* Photo */}
              {business.photos[0]?.fileUrl && (
                <div className="aspect-video bg-gray-200 relative">
                  <img
                    src={business.photos[0].fileUrl}
                    alt={business.businessName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg text-gray-900 flex-1">
                    {business.businessName}
                  </h3>
                  {getStatusBadge(business.reviewStatus)}
                </div>

                {business.businessType && (
                  <p className="text-sm text-gray-600 mb-2">{business.businessType}</p>
                )}

                {business.address && (
                  <p className="text-sm text-gray-600 mb-2">
                    {business.address}
                    {business.city && `, ${business.city}`}
                    {business.state && `, ${business.state}`}
                  </p>
                )}

                {business.phone && (
                  <p className="text-sm text-gray-600 mb-2">{business.phone}</p>
                )}

                {business.email && (
                  <p className="text-sm text-gray-600 mb-2">{business.email}</p>
                )}

                {business.confidenceScore !== null && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Confidence</span>
                      <span>{Math.round(Number(business.confidenceScore) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Number(business.confidenceScore) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Email Campaign Status */}
                {business.emailCampaigns.length > 0 && (
                  <div className="mb-3 text-xs text-gray-500">
                    Last email: {business.emailCampaigns[0].sent ? 'sent' : 'draft'}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Link
                    href={`/leads/${business.id}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Link>

                  {business.email && business.reviewStatus === 'approved' && (
                    <button
                      onClick={() => window.location.href = `/leads/${business.id}?tab=email`}
                      className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => deleteBusiness(business.id)}
                    className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
