'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Star,
  Users,
  Calendar,
  ExternalLink,
  Linkedin,
  Twitter,
  Facebook,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Target,
  Zap,
  RefreshCw,
  Edit,
  Trash2,
} from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  calculateLeadScore,
  generateBusinessInsights,
  getTalkingPoints,
  getRecommendedActions,
  getTimingRecommendation
} from '@/lib/lead-scoring';

type Business = {
  id: string;
  businessName: string;
  businessType: string | null;
  industry: string | null;
  companySize: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  formattedAddress: string | null;
  phone: string | null;
  email: string | null;
  emailValid: boolean | null;
  website: string | null;
  contactName: string | null;

  // Location
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;

  // Google enrichment
  googleRating: number | null;
  googleReviewCount: number | null;

  // Hunter.io enrichment
  hunterEmailPattern: string | null;
  hunterEmailCount: number | null;
  hunterVerificationStatus: string | null;
  hunterVerificationScore: number | null;
  hunterEnrichedAt: string | null;

  // Social profiles
  linkedinUrl: string | null;
  twitterHandle: string | null;
  facebookUrl: string | null;
  logoUrl: string | null;

  // Lead management
  leadStatus: string;
  leadPriority: string | null;
  confidenceScore: number | null;
  createdAt: string;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
};

export default function BusinessDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const businessId = params.id;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    fetchBusiness();
  }, [businessId]);

  const fetchBusiness = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/businesses/${businessId}`);
      const data = await response.json();
      setBusiness(data.business);
    } catch (error) {
      console.error('Failed to fetch business:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchBusiness();
      }
    } catch (error) {
      console.error('Enrichment failed:', error);
    } finally {
      setEnriching(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this business?')) return;

    try {
      const response = await fetch(`/api/businesses/${businessId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/leads');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Business not found</h2>
          <Link href="/leads" className="text-blue-600 hover:text-blue-700">
            ← Back to Leads
          </Link>
        </div>
      </div>
    );
  }

  const leadScore = calculateLeadScore(business);
  const scoreColor = leadScore >= 80 ? 'text-green-600' : leadScore >= 50 ? 'text-yellow-600' : 'text-gray-600';
  const priorityColor =
    business.leadPriority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
    business.leadPriority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';

  // Generate insights and recommendations
  const businessInsights = generateBusinessInsights(business);
  const talkingPoints = getTalkingPoints(business);
  const recommendedActions = getRecommendedActions(business);
  const timingRec = getTimingRecommendation(business);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/leads" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Lead Details</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${enriching ? 'animate-spin' : ''}`} />
                {enriching ? 'Enriching...' : 'Enrich Data'}
              </button>
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start gap-4">
                {/* Company Logo */}
                <div className="flex-shrink-0">
                  {business.logoUrl ? (
                    <img
                      src={business.logoUrl}
                      alt={business.businessName}
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>

                {/* Company Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                      {business.businessName}
                    </h2>
                    {business.emailValid && (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" title="Verified" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {business.industry && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {business.industry}
                      </span>
                    )}
                    {business.companySize && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {business.companySize} employees
                        </span>
                      </>
                    )}
                    {business.googleRating && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {business.googleRating} ({business.googleReviewCount} reviews)
                        </span>
                      </>
                    )}
                  </div>

                  {/* Quick Links */}
                  <div className="flex flex-wrap gap-2">
                    {business.website && (
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        <Globe className="w-4 h-4" />
                        Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {business.linkedinUrl && (
                      <a
                        href={business.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        <Linkedin className="w-4 h-4" />
                        LinkedIn
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {business.twitterHandle && (
                      <a
                        href={`https://twitter.com/${business.twitterHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        <Twitter className="w-4 h-4" />
                        Twitter
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {business.facebookUrl && (
                      <a
                        href={business.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        <Facebook className="w-4 h-4" />
                        Facebook
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Business Summary & Insights Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Business Summary & Insights</h3>
              </div>

              {/* Quick Decision Metrics */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 mb-5 border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  Quick Decision Metrics
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Company Size</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      {business.companySize || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Industry</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {business.industry || 'Unknown'}
                    </div>
                  </div>
                  {business.googleRating && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reputation</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {business.googleRating}/5.0
                        <span className="text-sm font-normal text-gray-500">
                          ({business.googleReviewCount} reviews)
                        </span>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data Quality</div>
                    <div className="text-lg font-bold flex items-center gap-2">
                      <span className={leadScore >= 80 ? 'text-green-600' : leadScore >= 50 ? 'text-yellow-600' : 'text-gray-600'}>
                        {leadScore}/100
                      </span>
                      {leadScore >= 80 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </div>
                  </div>
                </div>

                {/* Quick Decision Indicators */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className={`p-3 rounded-lg ${business.email && business.emailValid ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <CheckCircle2 className={`w-5 h-5 mx-auto mb-1 ${business.email && business.emailValid ? 'text-green-600' : 'text-gray-400'}`} />
                      <div className="text-xs font-medium">Email Ready</div>
                    </div>
                    <div className={`p-3 rounded-lg ${business.phone ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <CheckCircle2 className={`w-5 h-5 mx-auto mb-1 ${business.phone ? 'text-green-600' : 'text-gray-400'}`} />
                      <div className="text-xs font-medium">Phone Contact</div>
                    </div>
                    <div className={`p-3 rounded-lg ${business.website ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <CheckCircle2 className={`w-5 h-5 mx-auto mb-1 ${business.website ? 'text-green-600' : 'text-gray-400'}`} />
                      <div className="text-xs font-medium">Website</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Insights */}
              {businessInsights.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-5 mb-5 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    Key Business Insights
                  </h4>
                  <ul className="space-y-2">
                    {businessInsights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Email Talking Points */}
              {talkingPoints.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-5 mb-5 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-green-600" />
                    Email Talking Points
                  </h4>
                  <div className="space-y-2">
                    {talkingPoints.map((point, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{point}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      href={`/compose?businessId=${businessId}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <Zap className="w-4 h-4" />
                      Use these points to generate email
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Recommended Actions */}
              {recommendedActions.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-5 mb-5 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    Recommended Next Actions
                  </h4>
                  <ul className="space-y-2">
                    {recommendedActions.map((action, index) => (
                      <li key={index} className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="w-5 h-5 rounded border-2 border-purple-400 flex-shrink-0 mt-0.5"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up Timing */}
              <div className={`bg-white dark:bg-gray-800 rounded-lg p-5 border-2 ${
                timingRec.urgency === 'high' ? 'border-red-300 dark:border-red-700' :
                timingRec.urgency === 'medium' ? 'border-yellow-300 dark:border-yellow-700' :
                'border-gray-300 dark:border-gray-600'
              }`}>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  Follow-up Timing
                </h4>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg flex-shrink-0 ${
                    timingRec.urgency === 'high' ? 'bg-red-100 dark:bg-red-900/20' :
                    timingRec.urgency === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                    'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <div className={`text-2xl font-bold ${
                      timingRec.urgency === 'high' ? 'text-red-600' :
                      timingRec.urgency === 'medium' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {timingRec.urgency === 'high' ? '!' : timingRec.urgency === 'medium' ? '•' : '→'}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className={`text-lg font-bold mb-1 ${
                      timingRec.urgency === 'high' ? 'text-red-600 dark:text-red-400' :
                      timingRec.urgency === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-gray-700 dark:text-gray-300'
                    }`}>
                      {timingRec.timing}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {timingRec.reason}
                    </div>
                  </div>
                  <Badge className={
                    timingRec.urgency === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    timingRec.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }>
                    {timingRec.urgency.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Contact Information Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contact Information</h3>
              </div>
              <div className="p-6 space-y-4">
                {business.contactName && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Contact Name</div>
                      <div className="text-base font-medium text-gray-900 dark:text-white">{business.contactName}</div>
                    </div>
                  </div>
                )}

                {business.email && (
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      business.hunterVerificationStatus === 'deliverable' ? 'bg-green-100 dark:bg-green-900/20' :
                      business.hunterVerificationStatus === 'risky' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                      business.hunterVerificationStatus === 'undeliverable' ? 'bg-red-100 dark:bg-red-900/20' :
                      'bg-green-100 dark:bg-green-900/20'
                    }`}>
                      <Mail className={`w-5 h-5 ${
                        business.hunterVerificationStatus === 'deliverable' ? 'text-green-600 dark:text-green-400' :
                        business.hunterVerificationStatus === 'risky' ? 'text-yellow-600 dark:text-yellow-400' :
                        business.hunterVerificationStatus === 'undeliverable' ? 'text-red-600 dark:text-red-400' :
                        'text-green-600 dark:text-green-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
                        {/* Hunter.io Verification Badge */}
                        {business.hunterVerificationStatus === 'deliverable' && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            ✓ Verified ({business.hunterVerificationScore}/100)
                          </Badge>
                        )}
                        {business.hunterVerificationStatus === 'risky' && (
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            ⚠ Risky ({business.hunterVerificationScore}/100)
                          </Badge>
                        )}
                        {business.hunterVerificationStatus === 'undeliverable' && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            ✗ Invalid
                          </Badge>
                        )}
                        {!business.hunterVerificationStatus && business.emailValid === true && (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Format Valid
                          </Badge>
                        )}
                        {!business.hunterVerificationStatus && business.emailValid === false && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            Invalid Format
                          </Badge>
                        )}
                      </div>
                      <a href={`mailto:${business.email}`} className="text-base font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                        {business.email}
                      </a>
                      {business.hunterEmailPattern && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Pattern: {business.hunterEmailPattern}
                          {business.hunterEmailCount && ` • ${business.hunterEmailCount} emails found`}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {business.phone && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Phone</div>
                      <a href={`tel:${business.phone}`} className="text-base font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                        {business.phone}
                      </a>
                    </div>
                  </div>
                )}

                {business.formattedAddress && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Location</div>
                      <div className="text-base font-medium text-gray-900 dark:text-white">{business.formattedAddress}</div>
                      {business.googlePlaceId && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.formattedAddress)}&query_place_id=${business.googlePlaceId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 inline-flex items-center gap-1 mt-1"
                        >
                          View on Google Maps
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enrichment Data Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Data Enrichment</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Data Quality</div>
                    <div className={`text-2xl font-bold ${scoreColor}`}>{leadScore}%</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lead Score</div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Confidence</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {business.confidenceScore ? Math.round(business.confidenceScore * 100) : 0}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">OCR Accuracy</div>
                  </div>

                  {business.googleRating && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Google Rating</div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{business.googleRating}</div>
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{business.googleReviewCount} reviews</div>
                    </div>
                  )}

                  {business.hunterEnrichedAt && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Hunter.io</div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Enriched</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(business.hunterEnrichedAt).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Lead Score Card */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5" />
                <h3 className="font-semibold">Lead Score</h3>
              </div>
              <div className="text-4xl font-bold mb-1">{leadScore}</div>
              <div className="text-blue-100 text-sm">
                {leadScore >= 80 ? 'High Priority Lead' : leadScore >= 50 ? 'Good Potential' : 'Needs More Data'}
              </div>
            </div>

            {/* Status & Priority Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Status & Priority</h3>

              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Lead Status</div>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {(business.leadStatus || 'new').toUpperCase()}
                  </Badge>
                </div>

                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Priority</div>
                  <Badge className={priorityColor}>
                    {(business.leadPriority || 'medium').toUpperCase()}
                  </Badge>
                </div>

                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Created</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(business.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {business.lastContactedAt && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Contacted</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(business.lastContactedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>

              <div className="space-y-2">
                {business.email && (
                  <a
                    href={`mailto:${business.email}`}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    <Mail className="w-4 h-4" />
                    Send Email
                  </a>
                )}

                <Link
                  href={`/compose?businessId=${businessId}`}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg"
                >
                  <Zap className="w-4 h-4" />
                  Generate Email
                </Link>

                <Link
                  href={`/leads/${businessId}/edit`}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                  Edit Details
                </Link>

                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Lead
                </button>
              </div>
            </div>

            {/* Data Completeness */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Data Completeness</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                  {business.email ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Phone</span>
                  {business.phone ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Website</span>
                  {business.website ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Location</span>
                  {business.googlePlaceId ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Social Profiles</span>
                  {(business.linkedinUrl || business.twitterHandle || business.facebookUrl) ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
