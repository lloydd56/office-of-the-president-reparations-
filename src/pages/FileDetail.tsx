import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Share2,
  Star,
  Trash2,
  Edit2,
  Clock,
  User,
  Tag,
  FileText,
  FileImage,
  FileVideo,
  File,
  Copy,
  ExternalLink,
  Lock,
  X,
  Check,
  History,
  Volume2,
  Save,
  Eye,
  Table,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useFileStore } from '../store/fileStore';
import { useAuthStore } from '../store/authStore';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { cn } from '../utils/cn';

// ─── helpers ────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

const isTextType = (mime: string) =>
  mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml';

const isTextEditable = (mime: string) =>
  mime === 'text/plain' || mime === 'text/csv' || mime === 'text/markdown' || mime === 'application/json';

const isDocument = (mime: string) =>
  mime.includes('pdf') || mime.includes('document') || mime.includes('wordprocessing');

const isSpreadsheet = (mime: string) =>
  mime.includes('spreadsheet') || mime === 'text/csv';

const isImage = (mime: string) => mime.startsWith('image/');
const isVideo = (mime: string) => mime.startsWith('video/');
const isAudio = (mime: string) => mime.startsWith('audio/');
const isArchive = (mime: string) => mime.includes('zip') || mime.includes('archive') || mime.includes('tar') || mime.includes('rar');

// ─── get storage URL from Supabase ──────────────────────────────────────────

const getStorageUrl = async (path: string): Promise<string | null> => {
  if (!supabaseConfigured || !path) return null;
  try {
    const { data } = await supabase.storage.from('files').createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  } catch {
    return null;
  }
};

const fetchTextContent = async (path: string): Promise<string | null> => {
  if (!supabaseConfigured || !path) return null;
  try {
    const { data } = await supabase.storage.from('files').download(path);
    if (data) return await data.text();
    return null;
  } catch {
    return null;
  }
};

// ─── sub-components ─────────────────────────────────────────────────────────

const LoadingPreview: React.FC = () => (
  <div className="bg-white border border-slate-200 rounded-xl p-16 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
      <p className="text-slate-500">Loading preview...</p>
    </div>
  </div>
);

const DocumentViewer: React.FC<{ content: string; title: string }> = ({ content, title }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div className="bg-slate-800 text-white px-6 py-3 text-sm font-medium flex items-center gap-2">
      <FileText className="w-4 h-4" /> {title}
    </div>
    <div className="p-8 max-h-[600px] overflow-y-auto bg-white font-serif text-[15px] leading-7 text-slate-800 whitespace-pre-wrap">
      {content}
    </div>
  </div>
);

const PdfViewer: React.FC<{ url: string; title: string }> = ({ url, title }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div className="bg-red-700 text-white px-6 py-3 text-sm font-medium flex items-center gap-2">
      <FileText className="w-4 h-4" /> {title}
    </div>
    <iframe src={url} className="w-full h-[700px] border-0" title={title} />
  </div>
);

const SpreadsheetViewer: React.FC<{ content: string }> = ({ content }) => {
  const rows = content.trim().split('\n').map((r) => r.split(',').map((c) => c.replace(/^"|"$/g, '').trim()));
  const headers = rows[0] || [];
  const data = rows.slice(1);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-green-700 text-white px-6 py-3 text-sm font-medium flex items-center gap-2">
        <Table className="w-4 h-4" /> Spreadsheet View
      </div>
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 border border-slate-200 text-left text-xs font-semibold text-slate-500 w-8">#</th>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 border border-slate-200 text-left text-xs font-semibold text-slate-700 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri} className="hover:bg-blue-50/50">
                <td className="px-3 py-1.5 border border-slate-200 text-xs text-slate-400">{ri + 1}</td>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 border border-slate-200 text-slate-700 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const RealImageViewer: React.FC<{ url: string; name: string }> = ({ url, name }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div className="bg-pink-700 text-white px-6 py-3 text-sm font-medium flex items-center gap-2">
      <FileImage className="w-4 h-4" /> {name}
    </div>
    <div className="bg-slate-100 p-4 flex items-center justify-center min-h-[300px]">
      <img src={url} alt={name} className="max-w-full max-h-[600px] rounded-lg shadow-lg object-contain" />
    </div>
  </div>
);

const RealVideoPlayer: React.FC<{ url: string; name: string }> = ({ url, name }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div className="bg-slate-900 text-white px-6 py-3 text-sm font-medium flex items-center gap-2">
      <FileVideo className="w-4 h-4" /> {name}
    </div>
    <div className="bg-black">
      <video controls className="w-full max-h-[600px]" preload="metadata">
        <source src={url} />
        Your browser does not support the video tag.
      </video>
    </div>
  </div>
);

const RealAudioPlayer: React.FC<{ url: string; name: string }> = ({ url, name }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div className="bg-purple-700 text-white px-6 py-3 text-sm font-medium flex items-center gap-2">
      <Volume2 className="w-4 h-4" /> {name}
    </div>
    <div className="p-8 bg-slate-50 flex items-center justify-center">
      <audio controls className="w-full max-w-lg" preload="metadata">
        <source src={url} />
        Your browser does not support the audio tag.
      </audio>
    </div>
  </div>
);

const TextEditor: React.FC<{ content: string; onSave: (c: string) => void }> = ({ content, onSave }) => {
  const [text, setText] = useState(content);
  const [saved, setSaved] = useState(false);

  const lineCount = text.split('\n').length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const handleSave = () => {
    onSave(text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Edit2 className="w-4 h-4" /> Text Editor
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{lineCount} lines · {wordCount} words</span>
          {saved && <span className="text-xs text-green-400 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>}
          <Button size="sm" onClick={handleSave} leftIcon={<Save className="w-3 h-3" />}
            className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1">
            Save
          </Button>
        </div>
      </div>
      <div className="flex max-h-[600px]">
        <div className="bg-slate-50 border-r border-slate-200 px-3 py-4 text-right select-none overflow-hidden">
          {text.split('\n').map((_, i) => (
            <div key={i} className="text-xs text-slate-400 leading-6 font-mono">{i + 1}</div>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 p-4 font-mono text-sm text-slate-800 leading-6 resize-none focus:outline-none overflow-auto"
          spellCheck={false}
        />
      </div>
    </div>
  );
};

const ArchiveViewer: React.FC<{ name: string }> = ({ name }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div className="bg-amber-700 text-white px-6 py-3 text-sm font-medium flex items-center gap-2">
      <File className="w-4 h-4" /> Archive — {name}
    </div>
    <div className="p-12 text-center bg-slate-50">
      <File className="w-16 h-16 text-amber-400 mx-auto mb-4" />
      <p className="text-slate-700 font-medium mb-1">{name}</p>
      <p className="text-sm text-slate-500">Download the archive to view its contents</p>
    </div>
  </div>
);

// ─── main component ─────────────────────────────────────────────────────────

export const FileDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const files = useFileStore((s) => s.files);
  const tags = useFileStore((s) => s.tags);
  const shares = useFileStore((s) => s.shares);
  const starFile = useFileStore((s) => s.starFile);
  const unstarFile = useFileStore((s) => s.unstarFile);
  const deleteFile = useFileStore((s) => s.deleteFile);
  const updateFileTags = useFileStore((s) => s.updateFileTags);
  const updateFileContent = useFileStore((s) => s.updateFileContent);
  const createShareLink = useFileStore((s) => s.createShareLink);
  const renameFile = useFileStore((s) => s.renameFile);

  const file = files.find((f) => f.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(file?.name || '');
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiry, setShareExpiry] = useState('');
  const [generatedShareLink, setGeneratedShareLink] = useState('');
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(file?.tags || []);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');

  // Storage URL and content loading
  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const [loadedContent, setLoadedContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);

  useEffect(() => {
    if (!file) { setPreviewLoading(false); return; }

    let cancelled = false;
    setPreviewLoading(true);

    const load = async () => {
      // If we already have content in the store, use it
      if (file.content) {
        setLoadedContent(file.content);
        setPreviewLoading(false);
        return;
      }

      const path = file.path;
      if (!path) { setPreviewLoading(false); return; }

      // For text-like files, download and read content
      if (isTextType(file.mimeType) || isSpreadsheet(file.mimeType)) {
        const text = await fetchTextContent(path);
        if (!cancelled) {
          setLoadedContent(text);
          setPreviewLoading(false);
        }
        return;
      }

      // For binary files (images, videos, audio, PDFs), get a signed URL
      if (isImage(file.mimeType) || isVideo(file.mimeType) || isAudio(file.mimeType) || file.mimeType.includes('pdf')) {
        const url = await getStorageUrl(path);
        if (!cancelled) {
          setStorageUrl(url);
          setPreviewLoading(false);
        }
        return;
      }

      if (!cancelled) setPreviewLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [file?.id, file?.content, file?.path, file?.mimeType]);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <FileText className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">File not found</h2>
        <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  const fileShares = shares.filter((s) => s.fileId === file.id);
  const canEdit = isTextEditable(file.mimeType);
  const displayContent = file.content || loadedContent || '';

  const handleToggleStar = () => file.starred ? unstarFile(file.id) : starFile(file.id);

  const handleDelete = () => {
    deleteFile(file.id);
    navigate('/dashboard');
  };

  const handleCreateShare = async () => {
    if (!user) return;
    const share = await createShareLink(file.id, user.id, sharePassword || undefined, shareExpiry ? new Date(shareExpiry) : undefined);
    setGeneratedShareLink(`${window.location.origin}/#/share/${share.token}`);
  };

  const handleSaveTags = () => {
    updateFileTags(file.id, selectedTags);
    setShowTagEditor(false);
  };

  const handleDownload = async () => {
    if (storageUrl) {
      window.open(storageUrl, '_blank');
      return;
    }
    const url = await getStorageUrl(file.path);
    if (url) window.open(url, '_blank');
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  // ─── render preview ─────────────────────────────────────────────────────
  const renderPreview = () => {
    if (previewLoading) return <LoadingPreview />;

    // Editable text mode
    if (canEdit && viewMode === 'edit') {
      return <TextEditor content={displayContent} onSave={(c) => updateFileContent(file.id, c)} />;
    }

    // Image with real URL
    if (isImage(file.mimeType) && storageUrl) {
      return <RealImageViewer url={storageUrl} name={file.name} />;
    }

    // Video with real URL
    if (isVideo(file.mimeType) && storageUrl) {
      return <RealVideoPlayer url={storageUrl} name={file.name} />;
    }

    // Audio with real URL
    if (isAudio(file.mimeType) && storageUrl) {
      return <RealAudioPlayer url={storageUrl} name={file.name} />;
    }

    // PDF with real URL
    if (file.mimeType.includes('pdf') && storageUrl) {
      return <PdfViewer url={storageUrl} title={file.name} />;
    }

    // CSV / Spreadsheet with text content
    if (isSpreadsheet(file.mimeType) && displayContent.includes(',')) {
      return <SpreadsheetViewer content={displayContent} />;
    }

    // Archive files
    if (isArchive(file.mimeType)) {
      return <ArchiveViewer name={file.name} />;
    }

    // Text / Document with content
    if (displayContent && (isDocument(file.mimeType) || isTextType(file.mimeType))) {
      return <DocumentViewer content={displayContent} title={file.name} />;
    }

    // Fallback — no preview
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <File className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-700 font-medium mb-1">{file.name}</p>
        <p className="text-sm text-slate-500 mb-4">{file.mimeType} · {formatFileSize(file.size)}</p>
        <Button onClick={handleDownload} leftIcon={<Download className="w-4 h-4" />}>
          Download to View
        </Button>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="text-xl font-bold text-slate-900 border-b-2 border-indigo-500 focus:outline-none bg-transparent" autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') { renameFile(file.id, editName); setIsEditing(false); } if (e.key === 'Escape') { setEditName(file.name); setIsEditing(false); } }} />
                <button onClick={() => { renameFile(file.id, editName); setIsEditing(false); }} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-5 h-5" /></button>
                <button onClick={() => { setEditName(file.name); setIsEditing(false); }} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                {file.name}
                {file.starred && <Star className="w-5 h-5 text-amber-500" fill="currentColor" />}
              </h1>
            )}
            <p className="text-sm text-slate-500">{formatFileSize(file.size)} · {file.mimeType}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <div className="flex border border-slate-200 rounded-lg overflow-hidden mr-2">
              <button onClick={() => setViewMode('preview')} className={cn('px-3 py-1.5 text-sm flex items-center gap-1.5', viewMode === 'preview' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50')}>
                <Eye className="w-4 h-4" /> View
              </button>
              <button onClick={() => setViewMode('edit')} className={cn('px-3 py-1.5 text-sm flex items-center gap-1.5', viewMode === 'edit' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50')}>
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleToggleStar} leftIcon={<Star className="w-4 h-4" fill={file.starred ? 'currentColor' : 'none'} />}
            className={file.starred ? 'text-amber-600 border-amber-200 bg-amber-50' : ''}>
            {file.starred ? 'Starred' : 'Star'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} leftIcon={<Download className="w-4 h-4" />}>Download</Button>
          <Button size="sm" onClick={() => setShowShareModal(true)} leftIcon={<Share2 className="w-4 h-4" />}>Share</Button>
          <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-slate-100 rounded-lg"><Edit2 className="w-4 h-4 text-slate-400" /></button>
          <button onClick={handleDelete} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview */}
        <div className="lg:col-span-2 space-y-6">
          {renderPreview()}

          {/* Version History */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><History className="w-5 h-5 text-slate-400" /><h3 className="font-semibold text-slate-900">Version History</h3></div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {file.versions.length > 0 ? file.versions.map((version, index) => (
                  <div key={version.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium', index === 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500')}>
                        v{version.version}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{index === 0 ? 'Current Version' : `Version ${version.version}`}</p>
                        <p className="text-xs text-slate-500">{format(new Date(version.createdAt), 'MMM d, yyyy · h:mm a')} · {formatFileSize(version.size)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleDownload} leftIcon={<Download className="w-4 h-4" />}>Download</Button>
                  </div>
                )) : (
                  <div className="px-6 py-4 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-indigo-100 text-indigo-600">v1</div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Current Version</p>
                      <p className="text-xs text-slate-500">{format(new Date(file.createdAt), 'MMM d, yyyy · h:mm a')} · {formatFileSize(file.size)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><h3 className="font-semibold text-slate-900">File Information</h3></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3"><User className="w-5 h-5 text-slate-400 mt-0.5" /><div><p className="text-sm text-slate-500">Uploaded by</p><p className="font-medium text-slate-900">{file.uploaderName}</p></div></div>
              <div className="flex items-start gap-3"><Clock className="w-5 h-5 text-slate-400 mt-0.5" /><div><p className="text-sm text-slate-500">Created</p><p className="font-medium text-slate-900">{format(new Date(file.createdAt), 'MMMM d, yyyy')}</p></div></div>
              <div className="flex items-start gap-3"><Clock className="w-5 h-5 text-slate-400 mt-0.5" /><div><p className="text-sm text-slate-500">Last modified</p><p className="font-medium text-slate-900">{format(new Date(file.updatedAt), 'MMMM d, yyyy')}</p></div></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Tag className="w-5 h-5 text-slate-400" /><h3 className="font-semibold text-slate-900">Tags</h3></div>
                <button onClick={() => { setSelectedTags(file.tags); setShowTagEditor(true); }} className="text-sm text-indigo-600 hover:text-indigo-700">Edit</button>
              </div>
            </CardHeader>
            <CardContent>
              {file.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {file.tags.map((tag) => {
                    const td = tags.find((t) => t.name === tag);
                    return (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-full" style={{ backgroundColor: `${td?.color}20`, color: td?.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: td?.color }} />{tag}
                      </span>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-slate-500">No tags added</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><div className="flex items-center gap-2"><Share2 className="w-5 h-5 text-slate-400" /><h3 className="font-semibold text-slate-900">Sharing</h3></div></CardHeader>
            <CardContent>
              {fileShares.length > 0 ? (
                <div className="space-y-3">
                  {fileShares.map((share) => (
                    <div key={share.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {share.password && <Lock className="w-4 h-4 text-slate-400" />}
                        <span className="text-sm font-mono text-slate-600">...{share.token.slice(-8)}</span>
                      </div>
                      <button onClick={() => copyToClipboard(`${window.location.origin}/#/share/${share.token}`)} className="p-1 hover:bg-slate-200 rounded"><Copy className="w-4 h-4 text-slate-400" /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500 mb-3">Not shared yet</p>
                  <Button size="sm" onClick={() => setShowShareModal(true)}>Create Share Link</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Share Modal */}
      <Modal isOpen={showShareModal} onClose={() => { setShowShareModal(false); setGeneratedShareLink(''); setSharePassword(''); setShareExpiry(''); }} title="Share File" size="md">
        {generatedShareLink ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-2"><Check className="w-5 h-5" /><span className="font-medium">Share link created!</span></div>
              <div className="flex items-center gap-2">
                <input type="text" value={generatedShareLink} readOnly className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-lg text-sm font-mono" />
                <Button size="sm" onClick={() => copyToClipboard(generatedShareLink)} leftIcon={<Copy className="w-4 h-4" />}>Copy</Button>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setShowShareModal(false); setGeneratedShareLink(''); }}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Password (optional)</label>
              <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="password" value={sharePassword} onChange={(e) => setSharePassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Leave empty for no password" />
              </div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Expires (optional)</label>
              <input type="datetime-local" value={shareExpiry} onChange={(e) => setShareExpiry(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowShareModal(false)}>Cancel</Button>
              <Button onClick={handleCreateShare} leftIcon={<ExternalLink className="w-4 h-4" />}>Create Link</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Tag Editor Modal */}
      <Modal isOpen={showTagEditor} onClose={() => setShowTagEditor(false)} title="Edit Tags" size="sm">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button key={tag.id}
                onClick={() => setSelectedTags((prev) => prev.includes(tag.name) ? prev.filter((t) => t !== tag.name) : [...prev, tag.name])}
                className={cn('px-3 py-1.5 rounded-full text-sm font-medium transition-all', selectedTags.includes(tag.name) ? 'ring-2 ring-offset-1' : 'opacity-60 hover:opacity-100')}
                style={{ backgroundColor: `${tag.color}20`, color: tag.color, boxShadow: selectedTags.includes(tag.name) ? `0 0 0 2px ${tag.color}` : 'none' }}>
                {tag.name}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowTagEditor(false)}>Cancel</Button>
            <Button onClick={handleSaveTags}>Save Tags</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
