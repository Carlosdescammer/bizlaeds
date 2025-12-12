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
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setProcessing(false);
    setResult(null);
    setError('');
    setErrorDetails(null);

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

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setUploading(false);
        setError(uploadData.error || 'Upload failed');
        setErrorDetails(uploadData.debug);
        return;
      }

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
        setErrorDetails(processData.debug);
      }
    } catch (err: any) {
      setUploading(false);
      setProcessing(false);
      setError(err.message || 'Something went wrong');
      console.error('Upload error:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                BizLeads
              </h1>
            </div>
            <nav className="flex gap-2 sm:gap-4 items-center">
              <Link
                href="/leads"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm sm:text-base transition-colors"
              >
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Leads</span>
              </Link>
              <Link
                href="/usage"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm sm:text-base transition-colors"
              >
                Usage
              </Link>
              <Link
                href="/compose"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm sm:text-base transition-colors"
              >
                <span className="hidden sm:inline">Compose</span>
                <span className="sm:hidden">Email</span>
              </Link>
              <ModeToggle />
              {user ? (
                <button
                  onClick={() => user.signOut()}
                  className="flex items-center gap-1 sm:gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm sm:text-base transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              ) : (
                <Link
                  href="/auth/signin"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium text-sm sm:text-base transition-all shadow-md hover:shadow-lg"
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Camera className="w-4 h-4" />
            AI-Powered Lead Capture
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
            Capture Business Leads
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mt-2">
              In Seconds
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-4">
            Take a photo of any business card, storefront, or directory and let AI extract contact information automatically
          </p>
        </div>

        {/* Live Business Counter */}
        <div className="mb-8 sm:mb-12">
          <LiveBusinessCounter variant="compact" refreshInterval={30000} />
        </div>

        {/* Upload Area */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 md:p-10 mb-8 sm:mb-12">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500 rounded-lg flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-blue-900 dark:text-blue-100 flex-1">
                <strong className="font-semibold">iPhone users:</strong> If you get an error, go to Settings → Camera → Formats and select "Most Compatible" to save photos as JPEG instead of HEIC.
              </p>
            </div>
          </div>
          <div className="space-y-6">
            {/* Upload Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading || processing}
                className="group relative flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl px-8 py-5 font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:hover:shadow-lg transform hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                <div className="p-2 bg-white/10 rounded-lg">
                  <Camera className="w-6 h-6" />
                </div>
                <span>Take Photo</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || processing}
                className="group relative flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl px-8 py-5 font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:hover:shadow-lg transform hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                <div className="p-2 bg-white/10 rounded-lg">
                  <Upload className="w-6 h-6" />
                </div>
                <span>Upload Photo</span>
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
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500 rounded-lg">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100 text-lg">Uploading photo...</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Please wait while we process your image</p>
                  </div>
                </div>
              </div>
            )}

            {processing && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                  <div>
                    <p className="font-semibold text-indigo-900 dark:text-indigo-100 text-lg">Processing with AI...</p>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">Extracting business information from your photo</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-red-900 dark:text-red-100">{error}</p>

                    {errorDetails?.suggestion && (
                      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-2 text-sm">
                        <p className="text-yellow-900 dark:text-yellow-100">
                          💡 <strong>Tip:</strong> {errorDetails.suggestion}
                        </p>
                      </div>
                    )}

                    {errorDetails?.aiNotes && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-red-800 dark:text-red-200 font-medium">
                          AI Analysis
                        </summary>
                        <p className="mt-2 text-red-700 dark:text-red-300">{errorDetails.aiNotes}</p>
                      </details>
                    )}

                    {errorDetails?.textFound && errorDetails.textFound.length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-red-800 dark:text-red-200 font-medium">
                          Text Found ({errorDetails.textFound.length} items)
                        </summary>
                        <div className="mt-2 bg-red-100 dark:bg-red-900 rounded p-2 max-h-32 overflow-y-auto">
                          <p className="text-red-800 dark:text-red-200 font-mono text-xs">
                            {errorDetails.textFound.join(', ')}
                          </p>
                        </div>
                      </details>
                    )}

                    {process.env.NODE_ENV === 'development' && errorDetails && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-red-700 dark:text-red-300">
                          Debug Info
                        </summary>
                        <pre className="mt-2 bg-red-100 dark:bg-red-900 rounded p-2 overflow-x-auto text-red-800 dark:text-red-200">
                          {JSON.stringify(errorDetails, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}

            {result?.success && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-green-500 rounded-lg flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
                      {result.count > 1 ? `${result.count} Businesses Found!` : 'Business Found!'}
                    </h3>
                    {result.isMultiTenant && result.buildingName && (
                      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full mb-4">
                        <svg className="w-4 h-4 text-green-700 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          Building: {result.buildingName}
                        </span>
                      </div>
                    )}
                    <div className="space-y-3">
                      {result.businesses && result.businesses.map((business: any) => (
                        <div key={business.id} className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-green-200 dark:border-green-700 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <h4 className="text-gray-900 dark:text-white font-semibold text-lg">
                                {business.name}
                                {business.suite && (
                                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                    Suite {business.suite}
                                  </span>
                                )}
                              </h4>
                              <div className="flex flex-wrap gap-3 text-sm">
                                <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                  <span className="font-medium">Type:</span>
                                  {business.type || 'Unknown'}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <span className="font-medium text-gray-600 dark:text-gray-300">Confidence:</span>
                                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-semibold">
                                    {Math.round((business.confidence || 0) * 100)}%
                                  </span>
                                </span>
                              </div>
                            </div>
                            <Link
                              href={`/leads/${business.id}`}
                              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                            >
                              View Details
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <Link
                  href="/leads"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg px-6 py-3 font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  View All Leads
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Quick Capture</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Use your phone camera to instantly capture business information from cards, storefronts, or directories
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-white"
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
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">AI Processing</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Advanced GPT-4o Vision extracts business name, address, contact details, and enriches with additional data
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Auto-Enrichment</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Automatically enriched with Google Maps data, verified emails, and business insights for immediate outreach
            </p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-16 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl p-8 border border-blue-200 dark:border-blue-800">
          <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                1
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Capture</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Take a photo of any business information
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                2
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Extract</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                AI extracts all business details from the photo
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                3
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Enrich</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Auto-enriched with verified emails and data
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                4
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Engage</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Start reaching out to qualified leads immediately
              </p>
            </div>
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
