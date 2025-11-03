'use client';

import { useState, useRef, Suspense } from 'react';
import { Camera, Upload, Loader2, CheckCircle2, XCircle, LogOut } from 'lucide-react';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import { useUser } from '@stackframe/stack';
import { ModeToggle } from '@/components/mode-toggle';
import { LiveBusinessCounter } from '@/components/live-business-counter';

function HomeContent() {
  const user = useUser();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setProcessing(false);
    setResult(null);
    setError('');

    try {
      // Check for HEIC format and show helpful error
      if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        setError('HEIC format not supported. Please convert to JPEG first, or change your iPhone camera settings to "Most Compatible" format.');
        setUploading(false);
        return;
      }

      // Compress and optimize image for better upload performance
      let processedFile = file;
      if (file.type.startsWith('image/') && file.size > 1000000) { // > 1MB
        try {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          };
          processedFile = await imageCompression(file, options);
        } catch (compressionError) {
          console.warn('Image compression failed, using original:', compressionError);
          // Continue with original file if compression fails
        }
      }

      // Upload photo
      const formData = new FormData();
      formData.append('photo', processedFile);
      formData.append('source', 'web');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();
      setUploading(false);
      setProcessing(true);

      // Process photo
      const processResponse = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: uploadData.photo.id }),
      });

      const processData = await processResponse.json();
      setProcessing(false);

      if (processData.success) {
        setResult(processData);
      } else {
        setError(processData.error || 'Processing failed');
      }
    } catch (err: any) {
      setUploading(false);
      setProcessing(false);
      setError(err.message || 'Something went wrong');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Business Leads</h1>
            <nav className="flex gap-2 sm:gap-4 items-center">
              <Link
                href="/leads"
                className="text-muted-foreground hover:text-foreground font-medium text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Leads</span>
              </Link>
              <Link
                href="/usage"
                className="text-muted-foreground hover:text-foreground font-medium text-sm sm:text-base"
              >
                Usage
              </Link>
              <Link
                href="/compose"
                className="text-muted-foreground hover:text-foreground font-medium text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Compose</span>
                <span className="sm:hidden">Email</span>
              </Link>
              <ModeToggle />
              {user ? (
                <button
                  onClick={() => user.signOut()}
                  className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground font-medium text-sm sm:text-base"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              ) : (
                <Link
                  href="/auth/signin"
                  className="bg-primary text-primary-foreground px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-primary/90 font-medium text-sm sm:text-base"
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Capture Business Leads
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground px-2">
            Take a photo of any business and let AI extract contact information
          </p>
        </div>

        {/* Live Business Counter */}
        <div className="mb-6 sm:mb-8">
          <LiveBusinessCounter variant="compact" refreshInterval={30000} />
        </div>

        {/* Upload Area */}
        <div className="bg-card rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 border">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
              <strong>iPhone users:</strong> If you get an error, go to Settings → Camera → Formats and select "Most Compatible" to save photos as JPEG instead of HEIC.
            </p>
          </div>
          <div className="space-y-4 sm:space-y-6">
            {/* Mobile Camera Button */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading || processing}
                className="flex-1 flex items-center justify-center gap-2 sm:gap-3 bg-blue-600 text-white rounded-xl px-6 sm:px-8 py-3 sm:py-4 font-semibold text-base sm:text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                Take Photo
              </button>

              {/* File Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || processing}
                className="flex-1 flex items-center justify-center gap-2 sm:gap-3 bg-indigo-600 text-white rounded-xl px-6 sm:px-8 py-3 sm:py-4 font-semibold text-base sm:text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                Upload Photo
              </button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Status Messages */}
            {uploading && (
              <div className="flex items-center justify-center gap-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">Uploading photo...</span>
              </div>
            )}

            {processing && (
              <div className="flex items-center justify-center gap-3 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 rounded-lg p-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">Processing with AI...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg p-4">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {result?.success && (
              <div className="bg-green-50 dark:bg-green-950 border-2 border-green-200 dark:border-green-800 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">
                      {result.count > 1 ? `${result.count} Businesses Found!` : 'Business Found!'}
                    </h3>
                    {result.isMultiTenant && result.buildingName && (
                      <p className="text-foreground/90 mb-3">
                        <span className="font-semibold">Building:</span> {result.buildingName}
                      </p>
                    )}
                    <div className="space-y-4">
                      {result.businesses && result.businesses.map((business: any, index: number) => (
                        <div key={business.id} className="bg-card rounded-lg p-4 border border-green-200 dark:border-green-800">
                          <div className="space-y-2">
                            <p className="text-foreground font-semibold text-lg">
                              {business.name}
                              {business.suite && <span className="text-sm text-muted-foreground ml-2">(Suite {business.suite})</span>}
                            </p>
                            <p className="text-foreground/90 text-sm">
                              <span className="font-semibold">Type:</span>{' '}
                              {business.type || 'Unknown'}
                            </p>
                            <p className="text-foreground/90 text-sm">
                              <span className="font-semibold">Confidence:</span>{' '}
                              {Math.round((business.confidence || 0) * 100)}%
                            </p>
                          </div>
                          <Link
                            href={`/leads/${business.id}`}
                            className="inline-flex items-center justify-center bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-green-700 transition-colors mt-3"
                          >
                            View Details
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <Link
                  href="/leads"
                  className="inline-flex items-center justify-center bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-blue-700 transition-colors mt-4"
                >
                  View All Leads
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-md border">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Quick Capture</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Use your phone camera to instantly capture business information
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-md border">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 dark:bg-indigo-950 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">AI Processing</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Advanced AI extracts business name, address, and contact details
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-md border sm:col-span-2 md:col-span-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Review & Approve</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Verify extracted information before adding to your database
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
