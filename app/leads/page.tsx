'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Upload, BarChart3, Download } from 'lucide-react';
import { BusinessDataTable } from '@/components/business-data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ModeToggle } from '@/components/mode-toggle';

type Business = {
  id: string;
  businessName: string;
  businessType: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  formattedAddress: string | null;
  phone: string | null;
  email: string | null;
  reviewStatus: string;
  googleRating: number | null;
  googleReviewCount: number | null;
  confidenceScore: number | null;
  createdAt: string;
};

export default function LeadsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    avgRating: 0,
  });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/businesses');
      const data = await response.json();

      const businessData = data.businesses || [];
      setBusinesses(businessData);

      // Calculate stats
      const total = businessData.length;
      const pending = businessData.filter((b: Business) => b.reviewStatus === 'pending_review').length;
      const approved = businessData.filter((b: Business) => b.reviewStatus === 'approved').length;
      const ratingsSum = businessData
        .filter((b: Business) => b.googleRating)
        .reduce((sum: number, b: Business) => sum + Number(b.googleRating), 0);
      const ratingsCount = businessData.filter((b: Business) => b.googleRating).length;
      const avgRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

      setStats({ total, pending, approved, avgRating });
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Open export URL in new window to trigger download
    window.open('/api/businesses/export?format=csv', '_blank');
  };

  const handleExportApproved = () => {
    window.open('/api/businesses/export?format=csv&status=approved', '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Business Leads</h1>
              <p className="text-muted-foreground mt-1">Manage and track your business leads</p>
            </div>
            <nav className="flex gap-3">
              <Button variant="outline" onClick={handleExportApproved}>
                <Download className="w-4 h-4 mr-2" />
                Export Approved
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export All
              </Button>
              <Link href="/">
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </Button>
              </Link>
              <Link href="/usage">
                <Button variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Usage
                </Button>
              </Link>
              <ModeToggle />
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Leads</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Avg Rating</CardDescription>
              <CardTitle className="text-3xl">
                {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Businesses</CardTitle>
            <CardDescription>
              View and manage all business leads collected from photos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BusinessDataTable data={businesses} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
