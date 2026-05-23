import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search as SearchIcon,
  Filter,
  FileText,
  FileImage,
  FileVideo,
  File,
  Star,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useFileStore } from '../store/fileStore';
import { cn } from '../utils/cn';

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <FileImage className="w-8 h-8 text-pink-500" />;
  if (mimeType.startsWith('video/')) return <FileVideo className="w-8 h-8 text-purple-500" />;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className="w-8 h-8 text-red-500" />;
  return <File className="w-8 h-8 text-slate-500" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const fileTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'application/pdf', label: 'PDF' },
  { value: 'image/', label: 'Images' },
  { value: 'video/', label: 'Videos' },
  { value: 'text/', label: 'Text Files' },
  { value: 'application/vnd', label: 'Documents' },
];

export const Search: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchFiles, tags, starFile, unstarFile } = useFileStore();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [starredOnly, setStarredOnly] = useState(false);
  
  const results = useMemo(() => {
    const filters: any = {};
    
    if (selectedType !== 'all') {
      filters.type = selectedType;
    }
    
    if (selectedTags.length > 0) {
      filters.tags = selectedTags;
    }
    
    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom);
    }
    
    if (dateTo) {
      filters.dateTo = new Date(dateTo);
    }
    
    let files = searchFiles(query, filters);
    
    if (starredOnly) {
      files = files.filter(f => f.starred);
    }
    
    return files;
  }, [query, selectedType, selectedTags, dateFrom, dateTo, starredOnly, searchFiles]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
  };
  
  const clearFilters = () => {
    setSelectedType('all');
    setSelectedTags([]);
    setDateFrom('');
    setDateTo('');
    setStarredOnly(false);
  };
  
  const hasActiveFilters = selectedType !== 'all' || selectedTags.length > 0 || dateFrom || dateTo || starredOnly;
  
  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Search Files</h1>
        <p className="text-slate-500 mt-1">
          Search by name, tag, type, or date range
        </p>
      </div>
      
      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files and folders..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <Button
          type="button"
          variant={showFilters ? 'secondary' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          leftIcon={<Filter className="w-4 h-4" />}
        >
          Filters
          {hasActiveFilters && (
            <span className="ml-1 w-5 h-5 bg-indigo-600 text-white rounded-full text-xs flex items-center justify-center">
              !
            </span>
          )}
        </Button>
        <Button type="submit">Search</Button>
      </form>
      
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* File Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  File Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {fileTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              {/* Starred Only */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Options
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={starredOnly}
                    onChange={(e) => setStarredOnly(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600">Starred only</span>
                </label>
              </div>
            </div>
            
            {/* Tags */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setSelectedTags(prev =>
                        prev.includes(tag.name)
                          ? prev.filter(t => t !== tag.name)
                          : [...prev, tag.name]
                      );
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                      selectedTags.includes(tag.name)
                        ? 'ring-2 ring-offset-1'
                        : 'opacity-60 hover:opacity-100'
                    )}
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                      boxShadow: selectedTags.includes(tag.name) ? `0 0 0 2px ${tag.color}` : 'none',
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
            
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<X className="w-4 h-4" />}>
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Results */}
      <div>
        <p className="text-sm text-slate-500 mb-4">
          {results.length} {results.length === 1 ? 'result' : 'results'} found
          {query && ` for "${query}"`}
        </p>
        
        {results.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <SearchIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No results found</h3>
              <p className="text-slate-500">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {results.map(file => (
                  <div
                    key={file.id}
                    onClick={() => navigate(`/file/${file.id}`)}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    {getFileIcon(file.mimeType)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">{file.name}</p>
                        {file.starred && (
                          <Star className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-slate-500">{formatFileSize(file.size)}</span>
                        <span className="text-sm text-slate-400">
                          {format(new Date(file.createdAt), 'MMM d, yyyy')}
                        </span>
                        {file.tags.length > 0 && (
                          <div className="flex gap-1">
                            {file.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} size="sm">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        file.starred ? unstarFile(file.id) : starFile(file.id);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Star
                        className={cn('w-5 h-5', file.starred ? 'text-amber-500' : 'text-slate-300')}
                        fill={file.starred ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
