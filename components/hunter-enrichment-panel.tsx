"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  Building2,
  User,
  Award,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  Twitter
} from "lucide-react"

interface Business {
  id: string
  businessName: string
  email?: string | null
  website?: string | null
  phone?: string | null
  contactName?: string | null
  contactPosition?: string | null
  contactSeniority?: string | null
  contactDepartment?: string | null
  contactLinkedin?: string | null
  contactTwitter?: string | null
  contactLocation?: string | null
  hunterEmailCount?: number | null
  hunterVerificationStatus?: string | null
  hunterVerificationScore?: number | null
  emailConfidence?: number | null
  emailDeliverability?: string | null
  emailRiskLevel?: string | null
  relevanceScore?: number | null
  leadPriority?: string | null
  hunterEnrichedAt?: string | null
  hunterVerifiedAt?: string | null
}

interface HunterEnrichmentPanelProps {
  business: Business
  onRefresh?: () => void
}

export function HunterEnrichmentPanel({ business, onRefresh }: HunterEnrichmentPanelProps) {
  const [loading, setLoading] = React.useState(false)
  const [activeAction, setActiveAction] = React.useState<string | null>(null)
  const [enrichmentResult, setEnrichmentResult] = React.useState<any>(null)

  // Check if domain exists
  const getDomain = () => {
    if (business.website) {
      try {
        let url = business.website
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url
        }
        return new URL(url).hostname.replace(/^www\./, '')
      } catch {
        return null
      }
    }
    if (business.email) {
      return business.email.split('@')[1]
    }
    return null
  }

  const domain = getDomain()

  // Execute Hunter API action
  const executeAction = async (action: string, params?: any) => {
    setLoading(true)
    setActiveAction(action)
    setEnrichmentResult(null)

    try {
      const response = await fetch('/api/hunter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          businessId: business.id,
          domain,
          ...params,
        }),
      })

      const result = await response.json()
      setEnrichmentResult(result)

      if (result.success && onRefresh) {
        // Wait a bit then refresh
        setTimeout(() => onRefresh(), 1000)
      }
    } catch (error) {
      console.error('Hunter action error:', error)
      setEnrichmentResult({ success: false, error: 'Request failed' })
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }

  // Auto-enrich action
  const autoEnrich = async () => {
    setLoading(true)
    setActiveAction('auto-enrich')
    setEnrichmentResult(null)

    try {
      const response = await fetch('/api/auto-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enrich-one',
          businessId: business.id,
        }),
      })

      const result = await response.json()
      setEnrichmentResult(result)

      if (result.success && onRefresh) {
        setTimeout(() => onRefresh(), 1000)
      }
    } catch (error) {
      console.error('Auto-enrich error:', error)
      setEnrichmentResult({ success: false, error: 'Request failed' })
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }

  // Calculate score
  const calculateScore = async () => {
    setLoading(true)
    setActiveAction('calculate-score')

    try {
      const response = await fetch('/api/auto-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate-score',
          businessId: business.id,
        }),
      })

      const result = await response.json()
      setEnrichmentResult(result)

      if (result.success && onRefresh) {
        setTimeout(() => onRefresh(), 1000)
      }
    } catch (error) {
      console.error('Calculate score error:', error)
      setEnrichmentResult({ success: false, error: 'Request failed' })
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }

  // Render verification status badge
  const renderVerificationBadge = () => {
    if (!business.hunterVerificationStatus) return null

    const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
      valid: { label: 'Valid', variant: 'default', icon: CheckCircle },
      invalid: { label: 'Invalid', variant: 'destructive', icon: XCircle },
      accept_all: { label: 'Accept All', variant: 'secondary', icon: AlertCircle },
      webmail: { label: 'Webmail', variant: 'secondary', icon: Mail },
      disposable: { label: 'Disposable', variant: 'destructive', icon: AlertCircle },
      unknown: { label: 'Unknown', variant: 'outline', icon: AlertCircle },
    }

    const config = statusConfig[business.hunterVerificationStatus] || statusConfig.unknown
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  // Render deliverability badge
  const renderDeliverabilityBadge = () => {
    if (!business.emailDeliverability) return null

    const deliverabilityConfig: Record<string, { label: string; variant: any }> = {
      deliverable: { label: 'Deliverable', variant: 'default' },
      undeliverable: { label: 'Undeliverable', variant: 'destructive' },
      risky: { label: 'Risky', variant: 'secondary' },
      unknown: { label: 'Unknown', variant: 'outline' },
    }

    const config = deliverabilityConfig[business.emailDeliverability] || deliverabilityConfig.unknown

    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Render lead priority badge
  const renderPriorityBadge = () => {
    if (!business.leadPriority) return null

    const priorityConfig: Record<string, { label: string; variant: any }> = {
      high: { label: 'High Priority', variant: 'default' },
      medium: { label: 'Medium Priority', variant: 'secondary' },
      low: { label: 'Low Priority', variant: 'outline' },
    }

    const config = priorityConfig[business.leadPriority] || priorityConfig.low

    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Render lead score
  const renderLeadScore = () => {
    if (!business.relevanceScore) return null

    const score = business.relevanceScore
    const percentage = score

    let color = 'text-gray-600'
    if (score >= 80) color = 'text-green-600'
    else if (score >= 60) color = 'text-blue-600'
    else if (score >= 40) color = 'text-yellow-600'
    else color = 'text-red-600'

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Lead Score</span>
          <span className={`text-2xl font-bold ${color}`}>{score}/100</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Hunter.io Enrichment
            </CardTitle>
            <CardDescription>
              AI-powered email finding, verification, and lead scoring
            </CardDescription>
          </div>
          {domain && (
            <Badge variant="outline" className="gap-1">
              <Globe className="h-3 w-3" />
              {domain}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Lead Score Display */}
        {business.relevanceScore && (
          <div className="rounded-lg border bg-gradient-to-r from-purple-50 to-blue-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                <span className="font-semibold">Lead Quality</span>
              </div>
              {renderPriorityBadge()}
            </div>
            {renderLeadScore()}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={calculateScore}
              disabled={loading}
            >
              {loading && activeAction === 'calculate-score' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Recalculate Score
                </>
              )}
            </Button>
          </div>
        )}

        {/* Email Status */}
        {business.email && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Status
              </span>
              <div className="flex gap-2">
                {renderVerificationBadge()}
                {renderDeliverabilityBadge()}
              </div>
            </div>

            {business.emailConfidence && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium">{business.emailConfidence}%</span>
                </div>
                <Progress value={business.emailConfidence} className="h-1" />
              </div>
            )}

            {business.hunterVerificationScore && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Verification Score</span>
                  <span className="font-medium">{business.hunterVerificationScore}/100</span>
                </div>
                <Progress value={business.hunterVerificationScore} className="h-1" />
              </div>
            )}
          </div>
        )}

        {/* Contact Information */}
        {(business.contactName || business.contactPosition || business.contactSeniority) && (
          <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
            <div className="flex items-center gap-2 font-medium text-sm">
              <User className="h-4 w-4" />
              Contact Details
            </div>
            {business.contactName && (
              <div className="text-sm">
                <span className="text-muted-foreground">Name: </span>
                <span className="font-medium">{business.contactName}</span>
              </div>
            )}
            {business.contactPosition && (
              <div className="text-sm">
                <span className="text-muted-foreground">Position: </span>
                <span className="font-medium">{business.contactPosition}</span>
              </div>
            )}
            {business.contactSeniority && (
              <Badge variant="secondary" className="text-xs">
                {business.contactSeniority}
              </Badge>
            )}
            {business.contactDepartment && (
              <Badge variant="outline" className="text-xs">
                {business.contactDepartment}
              </Badge>
            )}
            <div className="flex gap-2 mt-2">
              {business.contactLinkedin && (
                <a
                  href={business.contactLinkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {business.contactTwitter && (
                <a
                  href={`https://twitter.com/${business.contactTwitter.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-500"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Hunter Stats */}
        {business.hunterEmailCount !== null && business.hunterEmailCount !== undefined && (
          <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-blue-50 border border-blue-100">
            <span className="text-muted-foreground">Available Emails</span>
            <Badge variant="secondary">{business.hunterEmailCount} contacts</Badge>
          </div>
        )}

        {/* Action Tabs */}
        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quick">Quick</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="auto">Auto</TabsTrigger>
          </TabsList>

          {/* Quick Actions */}
          <TabsContent value="quick" className="space-y-2 mt-4">
            {domain && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => executeAction('email-count')}
                  disabled={loading || !domain}
                >
                  {loading && activeAction === 'email-count' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Check Email Count (FREE)
                </Button>

                {!business.email && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => executeAction('domain-search')}
                    disabled={loading || !domain}
                  >
                    {loading && activeAction === 'domain-search' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Find Emails (1 credit)
                  </Button>
                )}

                {business.email && !business.hunterVerifiedAt && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => executeAction('email-verifier', { email: business.email })}
                    disabled={loading || !business.email}
                  >
                    {loading && activeAction === 'email-verifier' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-2" />
                    )}
                    Verify Email (0.5 credits)
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => executeAction('company-enrichment')}
                  disabled={loading || !domain}
                >
                  {loading && activeAction === 'company-enrichment' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Building2 className="h-4 w-4 mr-2" />
                  )}
                  Enrich Company (1 credit)
                </Button>
              </>
            )}

            {!domain && (
              <div className="text-sm text-muted-foreground text-center py-4">
                Add a website or email to enable enrichment
              </div>
            )}
          </TabsContent>

          {/* Advanced Actions */}
          <TabsContent value="advanced" className="space-y-2 mt-4">
            {business.email && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => executeAction('email-enrichment', { email: business.email })}
                disabled={loading || !business.email}
              >
                {loading && activeAction === 'email-enrichment' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <User className="h-4 w-4 mr-2" />
                )}
                Enrich Contact Profile (1 credit)
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={calculateScore}
              disabled={loading}
            >
              {loading && activeAction === 'calculate-score' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Award className="h-4 w-4 mr-2" />
              )}
              Calculate Lead Score (FREE)
            </Button>
          </TabsContent>

          {/* Auto Enrichment */}
          <TabsContent value="auto" className="space-y-3 mt-4">
            <div className="rounded-lg border p-3 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-sm">Full Auto-Enrichment</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Automatically runs all enrichment steps: Email Count, Company Enrichment,
                Find Emails, Verify Email, Enrich Profile, and Calculate Score
              </p>
              <div className="text-xs text-muted-foreground mb-3">
                Cost: ~3-4 credits (~$0.003)
              </div>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={autoEnrich}
                disabled={loading || !domain}
              >
                {loading && activeAction === 'auto-enrich' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enriching...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Run Full Auto-Enrichment
                  </>
                )}
              </Button>
            </div>

            {business.hunterEnrichedAt && (
              <div className="text-xs text-muted-foreground text-center">
                Last enriched: {new Date(business.hunterEnrichedAt).toLocaleDateString()}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Results Display */}
        {enrichmentResult && (
          <div className={`rounded-lg border p-4 ${enrichmentResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-2">
              {enrichmentResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium text-sm mb-1">
                  {enrichmentResult.success ? 'Success!' : 'Error'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {enrichmentResult.error || 'Enrichment completed successfully'}
                </div>
                {enrichmentResult.leadScore && (
                  <div className="mt-2 text-sm font-medium">
                    Lead Score: {enrichmentResult.leadScore}/100
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
