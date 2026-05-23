import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Shield,
  FileText,
  FileImage,
  FileVideo,
  File,
  Download,
  Lock,
  AlertCircle,
  Clock,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useFileStore } from '../store/fileStore';
import { supabase, supabaseConfigured } from '../lib/supabase';

const getFileIcon = (mimeType: string, size: 'sm' | 'lg' = 'lg') => {
  const sizeClass = size === 'lg' ? 'w-16 h-16' : 'w-8 h-8';
  if (mimeType.startsWith('image/')) return <FileImage className={`${sizeClass} text-pink-500`} />;
  if (mimeType.startsWith('video/')) return <FileVideo className={`${sizeClass} text-purple-500`} />;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className={`${sizeClass} text-red-500`} />;
  return <File className={`${sizeClass} text-slate-500`} />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

export const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { shares, getFileById } = useFileStore();

  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  // Fix #10: track the live access count so we can increment it on load
  const [liveAccessCount, setLiveAccessCount] = useState<number | null>(null);

  const share = shares.find(s => s.token === token);
  const file = share ? getFileById(share.fileId) : null;

  useEffect(() => {
    const init = async () => {
      setIsLoading(false);
      if (!share) return;

      // Fix #10: increment access_count in DB and update local display
      if (supabaseConfigured) {
        const { data } = await supabase
          .from('share_links')
          .update({ access_count: (share.accessCount ?? 0) + 1 })
          .eq('token', token)
          .select('access_count')
          .single();
        if (data) setLiveAccessCount(data.access_count);
      } else {
        setLiveAccessCount((share.accessCount ?? 0) + 1);
      }

      // Auto-unlock if no password required
      if (!share.password) {
        setIsUnlocked(true);
      }
    };
    init();
  }, [share?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fix #2: verify password server-side via a Supabase RPC call
  const handleUnlock = async () => {
    if (!share) return;

    if (!share.password) {
      setIsUnlocked(true);
      return;
    }

    if (!password) {
      setError('Please enter the password');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      if (supabaseConfigured) {
        // Call the server-side verify function — never exposes the hash to the client
        const { data, error: rpcError } = await supabase
          .rpc('verify_share_password', { p_token: token, p_password: password });

        if (rpcError) {
          setError('Unable to verify password. Please try again.');
          return;
        }

        if (!data) {
          setError('Incorrect password');
          return;
        }
      } else {
        // Local fallback: compare against in-memory share (dev only)
        if (share.password !== password) {
          setError('Incorrect password');
          return;
        }
      }

      setIsUnlocked(true);
    } catch {
      setError('Unable to verify password. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const isExpired = share?.expiresAt && new Date(share.expiresAt) < new Date();
  const displayAccessCount = liveAccessCount ?? share?.accessCount ?? 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!share || !file) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Link Not Found</h2>
            <p className="text-slate-500">
              This share link doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Clock className="w-16 h-16 text-amber-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Link Expired</h2>
            <p className="text-slate-500 mb-4">
              This share link expired on {format(new Date(share.expiresAt!), 'MMMM d, yyyy')}.
            </p>
            <p className="text-sm text-slate-400">
              Please contact the file owner for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (share.password && !isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-indigo-600" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">Password Protected</h2>
            <p className="text-slate-500 mb-6">
              Enter the password to access this file
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter password"
                />
              </div>

              <Button onClick={handleUnlock} className="w-full" isLoading={isVerifying}>
                Unlock File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Shared File</p>
              <h1 className="text-sm font-semibold text-slate-900">Office of the President - Reparations</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            {/* File Info */}
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-slate-100 rounded-xl">
                {getFileIcon(file.mimeType)}
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{file.name}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>{file.mimeType}</span>
                  <span>•</span>
                  <span>Uploaded {format(new Date(file.createdAt), 'MMMM d, yyyy')}</span>
                </div>

                {file.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {file.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Preview Area */}
            <div className="aspect-video bg-slate-100 rounded-xl flex items-center justify-center mb-8">
              {file.mimeType.startsWith('image/') ? (
                <div className="text-center">
                  <FileImage className="w-24 h-24 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Image Preview</p>
                </div>
              ) : (
                <div className="text-center">
                  {getFileIcon(file.mimeType)}
                  <p className="text-slate-500 mt-4">Preview not available</p>
                  <p className="text-sm text-slate-400">Download the file to view its contents</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-slate-400" />
                {/* Fix #10: show real persisted count */}
                <span className="text-sm text-slate-500">
                  {displayAccessCount} {displayAccessCount === 1 ? 'view' : 'views'}
                </span>
                {share.expiresAt && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-sm text-slate-500">
                      Expires {format(new Date(share.expiresAt), 'MMM d, yyyy')}
                    </span>
                  </>
                )}
              </div>

              <Button size="lg" leftIcon={<Download className="w-5 h-5" />}>
                Download File
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-slate-400 mt-8">
          Shared securely via Office of the President - Reparations File Management System
        </p>
      </main>
    </div>
  );
};
