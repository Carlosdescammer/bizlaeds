'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  CheckCircle,
  XCircle,
  Mail,
  Loader2,
  MapPin,
  Phone,
  Globe,
  Calendar,
  Star,
  Clock,
  DollarSign,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { HunterEnrichmentPanel } from '@/components/hunter-enrichment-panel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  calculateLeadScore,
  getTimingRecommendation,
  generateBusinessInsights,
  getRecommendedActions,
  getTalkingPoints,
} from '@/lib/lead-scoring';

type Business = {
  id: string;
  businessName: string;
  businessType: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  reviewStatus: string;
  confidenceScore: number | null;
  createdAt: string;
  approvedAt: string | null;
  photos: any[];
  emailCampaigns: any[];
  // Google Places fields
  googleRating: number | null;
  googleReviewCount: number | null;
  googlePriceLevel: number | null;
  googleBusinessHours: any;
  formattedAddress: string | null;
  googlePhotosData: any;
  googleEnrichedAt: string | null;
  // Hunter.io enrichment fields
  contactName?: string | null;
  contactPosition?: string | null;
  contactSeniority?: string | null;
  contactDepartment?: string | null;
  contactLinkedin?: string | null;
  contactTwitter?: string | null;
  contactLocation?: string | null;
  hunterEmailCount?: number | null;
  hunterVerificationStatus?: string | null;
  hunterVerificationScore?: number | null;
  emailConfidence?: number | null;
  emailDeliverability?: string | null;
  emailRiskLevel?: string | null;
  relevanceScore?: number | null;
  leadPriority?: string | null;
  hunterEnrichedAt?: string | null;
  hunterVerifiedAt?: string | null;
};

export default function BusinessDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const businessId = params.id;
  const initialTab = searchParams.get('tab') || 'details';

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formData, setFormData] = useState<Partial<Business>>({});

  // Email state
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState<any>(null);

  // Enrichment state
  const [enrichingGoogle, setEnrichingGoogle] = useState(false);
  const [enrichingHunter, setEnrichingHunter] = useState(false);

  useEffect(() => {
    fetchBusiness();
  }, [businessId]);

  const fetchBusiness = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/businesses/${businessId}`);
      const data = await response.json();
      setBusiness(data.business);
      setFormData(data.business);
    } catch (error) {
      console.error('Failed to fetch business:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/businesses/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchBusiness();
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await fetch(`/api/businesses/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus: 'approved' }),
      });
      await fetchBusiness();
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      await fetch(`/api/businesses/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus: 'rejected' }),
      });
      await fetchBusiness();
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setSaving(false);
    }
  };

  const generateEmail = async () => {
    setGeneratingEmail(true);
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          action: 'generate',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEmailDraft(data.campaign);
      }
    } catch (error) {
      console.error('Failed to generate email:', error);
    } finally {
      setGeneratingEmail(false);
    }
  };

  const sendEmail = async () => {
    if (!emailDraft && !business?.email) return;

    setSendingEmail(true);
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          action: 'send',
          campaignId: emailDraft?.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Email sent successfully!');
        await fetchBusiness();
        setEmailDraft(null);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const enrichWithGoogle = async () => {
    setEnrichingGoogle(true);
    try {
      const response = await fetch(`/api/businesses/${businessId}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'google' }),
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Google Places data refreshed successfully!');
        await fetchBusiness();
      } else {
        alert('❌ ' + (data.error || 'Failed to enrich with Google'));
      }
    } catch (error) {
      console.error('Failed to enrich with Google:', error);
      alert('❌ Failed to enrich with Google');
    } finally {
      setEnrichingGoogle(false);
    }
  };

  const enrichWithHunter = async () => {
    setEnrichingHunter(true);
    try {
      const response = await fetch(`/api/businesses/${businessId}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hunter' }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Found ${data.emails?.length || 1} email(s)! Email updated.`);
        await fetchBusiness();
      } else {
        alert('❌ ' + (data.error || 'Failed to find email'));
      }
    } catch (error) {
      console.error('Failed to enrich with Hunter:', error);
      alert('❌ Failed to find email');
    } finally {
      setEnrichingHunter(false);
    }
  };

  const deleteBusiness = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/businesses/${businessId}/delete`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        router.push('/leads');
      } else {
        alert('❌ ' + (data.error || 'Failed to delete business'));
        setDeleting(false);
      }
    } catch (error) {
      console.error('Failed to delete business:', error);
      alert('❌ Failed to delete business');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Business not found</h2>
          <Link href="/leads" className="text-primary hover:text-primary/80">
            Back to Leads
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Link href="/leads" className="text-muted-foreground hover:text-foreground flex-shrink-0">
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </Link>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">{business.businessName}</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={enrichWithGoogle}
                disabled={enrichingGoogle}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
              >
                {enrichingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="hidden sm:inline">Google</span>
              </button>
              <button
                onClick={enrichWithHunter}
                disabled={enrichingHunter || !business.website}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 min-h-[44px]"
                title={!business.website ? "Website required" : "Find email with Hunter.io"}
              >
                {enrichingHunter ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span className="hidden sm:inline">Email</span>
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={deleting}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 min-h-[44px]"
                    title="Delete business"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete <strong>{business.businessName}</strong> and all associated data (photos, emails, campaigns). This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteBusiness}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        'Delete'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <ModeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Photo */}
            {business.photos[0]?.fileUrl && (
              <div className="bg-card rounded-lg shadow-md overflow-hidden border">
                <img
                  src={business.photos[0].fileUrl}
                  alt={business.businessName}
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* Google Photos Gallery */}
            {business.googlePhotosData && Array.isArray(business.googlePhotosData) && business.googlePhotosData.length > 0 && (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <span className="text-xl">📸</span>
                    Google Photos ({business.googlePhotosData.length})
                  </CardTitle>
                  <CardDescription className="text-sm">Professional photos from Google Places</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                    {business.googlePhotosData.slice(0, 9).map((photo: any, idx: number) => (
                      <div key={idx} className="aspect-square sm:aspect-video rounded-lg overflow-hidden border border-border bg-muted">
                        <img
                          src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}`}
                          alt={`${business.businessName} photo ${idx + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => window.open(`https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}`, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                  {business.googlePhotosData.length > 9 && (
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      +{business.googlePhotosData.length - 9} more photos available
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Hunter.io Enrichment Panel */}
            <HunterEnrichmentPanel business={business} onRefresh={fetchBusiness} />

            {/* Business Intelligence Card */}
            {(() => {
              const leadScore = calculateLeadScore(business);
              const timing = getTimingRecommendation(business);
              const insights = generateBusinessInsights(business);
              const actions = getRecommendedActions(business, timing);
              const talkingPoints = getTalkingPoints(business);

              return (
                <Card className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">🎯</span>
                        Lead Intelligence
                      </CardTitle>
                      <Badge className={`${leadScore.color} border px-3 py-1`}>
                        {leadScore.label}: {leadScore.total}/100
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Contact Readiness */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Contact Readiness
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className={`p-3 rounded-lg border ${business.email ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-muted border-border'}`}>
                          <div className="flex items-center gap-2">
                            <Mail className={`w-4 h-4 ${business.email ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                            <span className={`text-sm font-medium ${business.email ? 'text-green-900 dark:text-green-100' : 'text-muted-foreground'}`}>
                              {business.email ? 'Email ✓' : 'No Email'}
                            </span>
                          </div>
                          {business.email && (
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1 truncate">{business.email}</p>
                          )}
                        </div>

                        <div className={`p-3 rounded-lg border ${business.phone ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-muted border-border'}`}>
                          <div className="flex items-center gap-2">
                            <Phone className={`w-4 h-4 ${business.phone ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                            <span className={`text-sm font-medium ${business.phone ? 'text-green-900 dark:text-green-100' : 'text-muted-foreground'}`}>
                              {business.phone ? 'Phone ✓' : 'No Phone'}
                            </span>
                          </div>
                          {business.phone && (
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">{business.phone}</p>
                          )}
                        </div>

                        <div className={`p-3 rounded-lg border ${business.website ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-muted border-border'}`}>
                          <div className="flex items-center gap-2">
                            <Globe className={`w-4 h-4 ${business.website ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                            <span className={`text-sm font-medium ${business.website ? 'text-green-900 dark:text-green-100' : 'text-muted-foreground'}`}>
                              {business.website ? 'Website ✓' : 'No Website'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Business Strength */}
                    {(business.googleRating || business.googleBusinessHours || business.googlePriceLevel) && (
                      <div>
                        <h4 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                          <Star className="w-4 h-4" />
                          Business Strength
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {business.googleRating && (
                            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                                  {Number(business.googleRating).toFixed(1)} Stars
                                </span>
                              </div>
                              {business.googleReviewCount && (
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">{business.googleReviewCount} reviews</p>
                              )}
                            </div>
                          )}

                          {business.googleBusinessHours && (
                            <div className={`p-3 rounded-lg border ${
                              timing.status === 'open'
                                ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Clock className={`w-4 h-4 ${timing.statusColor}`} />
                                <span className={`text-sm font-medium ${
                                  timing.status === 'open' ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
                                }`}>
                                  {timing.message}
                                </span>
                              </div>
                            </div>
                          )}

                          {business.googlePriceLevel && (
                            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                  {'$'.repeat(business.googlePriceLevel)} Pricing
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* AI Insights */}
                    {insights.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          AI Insights
                        </h4>
                        <div className="space-y-2">
                          {insights.map((insight, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border text-sm ${
                                insight.type === 'positive'
                                  ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
                                  : insight.type === 'negative'
                                  ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
                                  : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100'
                              }`}
                            >
                              <span className="mr-2">{insight.icon}</span>
                              {insight.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Actions */}
                    {actions.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Recommended Actions
                        </h4>
                        <div className="space-y-2">
                          {actions.map((action, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-foreground">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Talking Points */}
                    {talkingPoints.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                          💬 Talking Points
                        </h4>
                        <div className="space-y-2">
                          {talkingPoints.map((point, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                              <p className="text-sm text-purple-900 dark:text-purple-100 italic">{point}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Google Places Info Card */}
            {(business.googleRating || business.googleBusinessHours || business.googlePriceLevel) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    Google Places Information
                  </CardTitle>
                  {business.formattedAddress && (
                    <CardDescription>{business.formattedAddress}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Rating */}
                    {business.googleRating && (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 mb-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-2xl font-bold text-foreground">{Number(business.googleRating).toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MessageSquare className="w-3 h-3" />
                          {business.googleReviewCount || 0} reviews
                        </div>
                      </div>
                    )}

                    {/* Price Level */}
                    {business.googlePriceLevel && (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 mb-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="text-lg font-semibold text-green-600">
                            {'$'.repeat(business.googlePriceLevel)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">Price level</span>
                      </div>
                    )}

                    {/* Business Hours Status */}
                    {business.googleBusinessHours?.open_now !== undefined && (
                      <div className="flex flex-col">
                        <Badge
                          variant={business.googleBusinessHours.open_now ? "default" : "secondary"}
                          className="w-fit mb-1"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {business.googleBusinessHours.open_now ? 'Open Now' : 'Closed'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Current status</span>
                      </div>
                    )}
                  </div>

                  {/* Business Hours */}
                  {business.googleBusinessHours?.weekday_text && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-foreground">
                          <Clock className="w-4 h-4" />
                          Business Hours
                        </h4>
                        <div className="grid gap-1 text-sm">
                          {business.googleBusinessHours.weekday_text.map((day: string, idx: number) => (
                            <div key={idx} className="flex justify-between">
                              <span className="text-muted-foreground">{day.split(': ')[0]}:</span>
                              <span className="font-medium text-foreground">{day.split(': ')[1]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <div className="bg-card rounded-lg shadow-md border">
              <div className="border-b border-border overflow-x-auto">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-4 sm:px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap min-h-[48px] ${
                      activeTab === 'details'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('email')}
                    className={`px-4 sm:px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap min-h-[48px] ${
                      activeTab === 'email'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Email
                  </button>
                </nav>
              </div>

              <div className="p-4 sm:p-6">
                {/* Details Tab */}
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    {editing ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Business Name
                          </label>
                          <input
                            type="text"
                            value={formData.businessName || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, businessName: e.target.value })
                            }
                            placeholder="Enter business name"
                            className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Business Type
                          </label>
                          <input
                            type="text"
                            value={formData.businessType || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, businessType: e.target.value })
                            }
                            placeholder="Enter business type"
                            className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Address
                          </label>
                          <input
                            type="text"
                            value={formData.address || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, address: e.target.value })
                            }
                            placeholder="Enter address"
                            className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              City
                            </label>
                            <input
                              type="text"
                              value={formData.city || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, city: e.target.value })
                              }
                              placeholder="Enter city"
                              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              State
                            </label>
                            <input
                              type="text"
                              value={formData.state || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, state: e.target.value })
                              }
                              placeholder="Enter state"
                              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Phone
                          </label>
                          <input
                            type="text"
                            value={formData.phone || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, phone: e.target.value })
                            }
                            placeholder="Enter phone number"
                            className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={formData.email || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, email: e.target.value })
                            }
                            placeholder="Enter email address"
                            className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Website
                          </label>
                          <input
                            type="url"
                            value={formData.website || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, website: e.target.value })
                            }
                            placeholder="Enter website URL"
                            className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditing(false);
                              setFormData(business);
                            }}
                            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-4">
                          {business.businessType && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Type</label>
                              <p className="text-foreground">{business.businessType}</p>
                            </div>
                          )}

                          {business.address && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Address
                              </label>
                              <p className="text-foreground">
                                {business.address}
                                {business.city && `, ${business.city}`}
                                {business.state && `, ${business.state}`}
                                {business.zipCode && ` ${business.zipCode}`}
                              </p>
                            </div>
                          )}

                          {business.phone && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                Phone
                              </label>
                              <p className="text-foreground">{business.phone}</p>
                            </div>
                          )}

                          {business.email && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email
                              </label>
                              <p className="text-foreground">{business.email}</p>
                            </div>
                          )}

                          {business.website && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Website
                              </label>
                              <a
                                href={business.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80"
                              >
                                {business.website}
                              </a>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => setEditing(true)}
                          className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Email Tab */}
                {activeTab === 'email' && (
                  <div className="space-y-4">
                    {!business.email ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No email address available</p>
                      </div>
                    ) : (
                      <>
                        {!emailDraft ? (
                          <div className="text-center py-8">
                            <button
                              onClick={generateEmail}
                              disabled={generatingEmail}
                              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 mx-auto"
                            >
                              {generatingEmail ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Mail className="w-5 h-5" />
                              )}
                              {generatingEmail ? 'Generating...' : 'Generate Email'}
                            </button>
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-muted-foreground mb-2">
                                To: {emailDraft.recipient}
                              </label>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-muted-foreground mb-2">
                                Subject
                              </label>
                              <input
                                type="text"
                                value={emailDraft.subject}
                                onChange={(e) =>
                                  setEmailDraft({ ...emailDraft, subject: e.target.value })
                                }
                                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-muted-foreground mb-2">
                                Message
                              </label>
                              <textarea
                                value={emailDraft.body}
                                onChange={(e) =>
                                  setEmailDraft({ ...emailDraft, body: e.target.value })
                                }
                                rows={12}
                                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary font-mono text-sm"
                              />
                            </div>

                            <div className="flex gap-3">
                              <button
                                onClick={sendEmail}
                                disabled={sendingEmail}
                                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                {sendingEmail ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                  <Mail className="w-5 h-5" />
                                )}
                                {sendingEmail ? 'Sending...' : 'Send Email'}
                              </button>

                              <button
                                onClick={() => setEmailDraft(null)}
                                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          </>
                        )}

                        {/* Email History */}
                        {business.emailCampaigns.length > 0 && (
                          <div className="mt-8 border-t pt-6">
                            <h3 className="font-bold text-lg mb-4">Email History</h3>
                            <div className="space-y-3">
                              {business.emailCampaigns.map((campaign: any) => (
                                <div
                                  key={campaign.id}
                                  className="border border-border rounded-lg p-4 bg-card"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-foreground">{campaign.subject || 'No subject'}</span>
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        campaign.sent
                                          ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-100'
                                          : 'bg-muted text-foreground'
                                      }`}
                                    >
                                      {campaign.sent ? 'sent' : 'draft'}
                                    </span>
                                  </div>
                                  {campaign.sentAt && (
                                    <p className="text-sm text-muted-foreground">
                                      <Calendar className="w-4 h-4 inline mr-1" />
                                      {new Date(campaign.sentAt).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6 lg:order-last order-first">
            {/* Status Card */}
            <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border">
              <h3 className="font-bold text-lg mb-4 text-foreground">Review Status</h3>

              <div className="mb-4">
                <span
                  className={`inline-block px-4 py-2 rounded-lg font-medium ${
                    business.reviewStatus === 'approved'
                      ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-100'
                      : business.reviewStatus === 'rejected'
                      ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-100'
                      : 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-100'
                  }`}
                >
                  {business.reviewStatus.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {business.reviewStatus === 'pending_review' && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}

              {business.confidenceScore !== null && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    AI Confidence
                  </label>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(Number(business.confidenceScore) * 100)}%
                  </div>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border">
              <h3 className="font-bold text-lg mb-4 text-foreground">Metadata</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-muted-foreground">Created</label>
                  <p className="text-foreground">
                    {new Date(business.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {business.approvedAt && (
                  <div>
                    <label className="text-muted-foreground">Approved</label>
                    <p className="text-foreground">
                      {new Date(business.approvedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-muted-foreground">Photos</label>
                  <p className="text-foreground">{business.photos.length}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">Emails Sent</label>
                  <p className="text-foreground">
                    {business.emailCampaigns.filter((c: any) => c.status === 'sent').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
