'use client';

import { useState } from 'react';
import { ArrowLeft, Wand2, Save, Send, Loader2, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function EmailComposerPage() {
  const { toast } = useToast();

  // Email fields
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // AI assistance
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [savedEmails, setSavedEmails] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  // AI Actions
  const [aiAction, setAiAction] = useState<'generate' | 'improve' | 'shorten' | 'expand' | 'tone'>('generate');
  const [tone, setTone] = useState('professional');

  const handleAIAssist = async () => {
    if (!prompt && aiAction === 'generate') {
      toast({
        title: 'Prompt Required',
        description: 'Please describe what you want the email to be about',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);

    try {
      let aiPrompt = '';

      switch (aiAction) {
        case 'generate':
          aiPrompt = `Write a ${tone} email about: ${prompt}`;
          break;
        case 'improve':
          aiPrompt = `Improve this email to be more ${tone}:\n\n${body}`;
          break;
        case 'shorten':
          aiPrompt = `Make this email shorter and more concise while keeping the key points:\n\n${body}`;
          break;
        case 'expand':
          aiPrompt = `Expand this email with more details and context:\n\n${body}`;
          break;
        case 'tone':
          aiPrompt = `Rewrite this email in a ${tone} tone:\n\n${body}`;
          break;
      }

      const response = await fetch('/api/compose-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          currentEmail: body,
          subject,
          action: aiAction,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.subject && !subject) {
          setSubject(data.subject);
        }
        setBody(data.body);

        toast({
          title: 'AI Generated!',
          description: 'Your email has been created/updated',
        });
      } else {
        throw new Error(data.error || 'Failed to generate email');
      }
    } catch (error: any) {
      toast({
        title: 'AI Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    const fullEmail = `To: ${to}\nSubject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast({
      title: 'Copied!',
      description: 'Email copied to clipboard',
    });
  };

  const handleSave = () => {
    const email = {
      id: Date.now(),
      to,
      subject,
      body,
      createdAt: new Date().toISOString(),
    };

    setSavedEmails([email, ...savedEmails]);

    toast({
      title: 'Saved!',
      description: 'Email draft saved',
    });
  };

  const loadSavedEmail = (email: any) => {
    setTo(email.to);
    setSubject(email.subject);
    setBody(email.body);

    toast({
      title: 'Loaded!',
      description: 'Email draft loaded',
    });
  };

  const handleSend = async () => {
    if (!to) {
      toast({
        title: 'Missing Recipient',
        description: 'Please enter a recipient email address',
        variant: 'destructive',
      });
      return;
    }

    if (!subject) {
      toast({
        title: 'Missing Subject',
        description: 'Please enter an email subject',
        variant: 'destructive',
      });
      return;
    }

    if (!body) {
      toast({
        title: 'Empty Email',
        description: 'Please write an email message',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Email Sent!',
          description: `Successfully sent to ${to}`,
        });

        // Clear form after sending
        setTo('');
        setSubject('');
        setBody('');
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (error: any) {
      toast({
        title: 'Send Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/leads">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Leads
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">AI Email Composer</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Composer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Email Form */}
            <Card>
              <CardHeader>
                <CardTitle>Compose Email</CardTitle>
                <CardDescription>Create and edit your email with AI assistance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="to">To</Label>
                  <Input
                    id="to"
                    type="email"
                    placeholder="recipient@example.com"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Email subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="body">Message</Label>
                  <Textarea
                    id="body"
                    placeholder="Write your email here..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="mt-1 min-h-[300px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {body.split(/\s+/).filter(Boolean).length} words
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button onClick={handleSave} variant="outline" className="gap-2">
                    <Save className="w-4 h-4" />
                    Save Draft
                  </Button>
                  <Button onClick={handleCopy} variant="outline" className="gap-2">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={sending || !to || !subject || !body}
                    className="gap-2 ml-auto"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Assistant Sidebar */}
          <div className="space-y-6">
            {/* AI Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-600" />
                  AI Assistant
                </CardTitle>
                <CardDescription>Let AI help you write better emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="aiAction">Action</Label>
                  <select
                    id="aiAction"
                    value={aiAction}
                    onChange={(e) => setAiAction(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                  >
                    <option value="generate">Generate New Email</option>
                    <option value="improve">Improve Email</option>
                    <option value="shorten">Make Shorter</option>
                    <option value="expand">Make Longer</option>
                    <option value="tone">Change Tone</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="tone">Tone</Label>
                  <select
                    id="tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                    <option value="enthusiastic">Enthusiastic</option>
                    <option value="warm">Warm</option>
                  </select>
                </div>

                {aiAction === 'generate' && (
                  <div>
                    <Label htmlFor="prompt">What should the email be about?</Label>
                    <Textarea
                      id="prompt"
                      placeholder="e.g., Follow up on headshot photography services for their business"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="mt-1 min-h-[100px]"
                    />
                  </div>
                )}

                <Button
                  onClick={handleAIAssist}
                  disabled={generating}
                  className="w-full gap-2"
                  variant="default"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      {aiAction === 'generate' ? 'Generate Email' :
                       aiAction === 'improve' ? 'Improve Email' :
                       aiAction === 'shorten' ? 'Shorten Email' :
                       aiAction === 'expand' ? 'Expand Email' :
                       'Change Tone'}
                    </>
                  )}
                </Button>

                {/* Quick Prompts */}
                {aiAction === 'generate' && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label className="text-xs">Quick Prompts:</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrompt('Follow up on our previous conversation about photography services')}
                      >
                        Follow Up
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrompt('Introduce our professional headshot photography services')}
                      >
                        Introduction
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrompt('Thank them for their business and offer a special promotion')}
                      >
                        Thank You
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saved Drafts */}
            {savedEmails.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Saved Drafts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {savedEmails.slice(0, 5).map((email) => (
                      <button
                        key={email.id}
                        onClick={() => loadSavedEmail(email)}
                        className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <p className="font-medium text-sm truncate">{email.subject || 'No subject'}</p>
                        <p className="text-xs text-muted-foreground truncate">{email.to}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(email.createdAt).toLocaleString()}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
