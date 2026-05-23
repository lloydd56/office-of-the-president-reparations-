import React, { useState, useMemo } from 'react';
import {
  Activity as ActivityIcon,
  Calendar,
  Search,
  Download,
  Upload,
  Trash2,
  Share2,
  Star,
  FolderPlus,
  LogIn,
  UserPlus,
  Edit,
  Eye,
} from 'lucide-react';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useFileStore } from '../store/fileStore';
import { cn } from '../utils/cn';
import { ActivityLog } from '../types';

const getActivityIcon = (action: string) => {
  switch (action) {
    case 'upload': return <Upload className="w-4 h-4 text-green-500" />;
    case 'download': return <Download className="w-4 h-4 text-blue-500" />;
    case 'delete': return <Trash2 className="w-4 h-4 text-red-500" />;
    case 'restore': return <Trash2 className="w-4 h-4 text-green-500" />;
    case 'share': return <Share2 className="w-4 h-4 text-purple-500" />;
    case 'star': return <Star className="w-4 h-4 text-amber-500" />;
    case 'unstar': return <Star className="w-4 h-4 text-slate-400" />;
    case 'create_folder': return <FolderPlus className="w-4 h-4 text-indigo-500" />;
    case 'login': return <LogIn className="w-4 h-4 text-cyan-500" />;
    case 'register': return <UserPlus className="w-4 h-4 text-pink-500" />;
    case 'rename': return <Edit className="w-4 h-4 text-orange-500" />;
    case 'view': return <Eye className="w-4 h-4 text-slate-500" />;
    default: return <ActivityIcon className="w-4 h-4 text-slate-400" />;
  }
};

const getActionDescription = (activity: ActivityLog) => {
  const { action, resourceName, resourceType } = activity;
  
  switch (action) {
    case 'upload': return `uploaded ${resourceName}`;
    case 'download': return `downloaded ${resourceName}`;
    case 'delete': return `deleted ${resourceName}`;
    case 'restore': return `restored ${resourceName}`;
    case 'share': return `shared ${resourceName}`;
    case 'star': return `starred ${resourceName}`;
    case 'unstar': return `unstarred ${resourceName}`;
    case 'create_folder': return `created folder ${resourceName}`;
    case 'login': return `logged in`;
    case 'register': return `registered`;
    case 'rename': return `renamed to ${resourceName}`;
    case 'view': return `viewed ${resourceName}`;
    case 'move': return `moved ${resourceName}`;
    case 'tag': return `tagged ${resourceName}`;
    default: return `${action.replace('_', ' ')} ${resourceType} ${resourceName}`;
  }
};

export const Activity: React.FC = () => {
  const { activities } = useFileStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  const actionTypes = [
    { value: 'upload', label: 'Uploads' },
    { value: 'download', label: 'Downloads' },
    { value: 'delete', label: 'Deletions' },
    { value: 'share', label: 'Shares' },
    { value: 'star', label: 'Stars' },
    { value: 'create_folder', label: 'Folders' },
    { value: 'login', label: 'Logins' },
  ];
  
  const filteredActivities = useMemo(() => {
    let filtered = [...activities];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.userName.toLowerCase().includes(query) ||
        a.resourceName.toLowerCase().includes(query) ||
        a.action.includes(query)
      );
    }
    
    // Action filter
    if (selectedActions.length > 0) {
      filtered = filtered.filter(a => selectedActions.includes(a.action));
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(a => {
        const date = new Date(a.createdAt);
        switch (dateFilter) {
          case 'today':
            return isToday(date);
          case 'week':
            return (now.getTime() - date.getTime()) <= 7 * 24 * 60 * 60 * 1000;
          case 'month':
            return (now.getTime() - date.getTime()) <= 30 * 24 * 60 * 60 * 1000;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [activities, searchQuery, selectedActions, dateFilter]);
  
  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: { [key: string]: ActivityLog[] } = {};
    
    filteredActivities.forEach(activity => {
      const date = startOfDay(new Date(activity.createdAt));
      const key = date.toISOString();
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(activity);
    });
    
    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([dateStr, items]) => ({
        date: new Date(dateStr),
        activities: items,
      }));
  }, [filteredActivities]);
  
  const formatGroupDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d, yyyy');
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <ActivityIcon className="w-7 h-7 text-indigo-600" />
            Activity Log
          </h1>
          <p className="text-slate-500 mt-1">
            Track all file and system activities
          </p>
        </div>
        
        <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>
          Export Log
        </Button>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search activities..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            {/* Date Filter */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
              {(['all', 'today', 'week', 'month'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => setDateFilter(option)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    dateFilter === option
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Action Type Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {actionTypes.map(type => (
              <button
                key={type.value}
                onClick={() => {
                  setSelectedActions(prev =>
                    prev.includes(type.value)
                      ? prev.filter(a => a !== type.value)
                      : [...prev, type.value]
                  );
                }}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-full border transition-colors',
                  selectedActions.includes(type.value)
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                {type.label}
              </button>
            ))}
            {selectedActions.length > 0 && (
              <button
                onClick={() => setSelectedActions([])}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700"
              >
                Clear filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Activity List */}
      {groupedActivities.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ActivityIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No activities found</h3>
            <p className="text-slate-500">
              {searchQuery || selectedActions.length > 0 || dateFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Activity will appear here as you use the system'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedActivities.map(group => (
            <div key={group.date.toISOString()}>
              <div className="flex items-center gap-4 mb-4">
                <Calendar className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  {formatGroupDate(group.date)}
                </h3>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {group.activities.map(activity => (
                      <div key={activity.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          {getActivityIcon(activity.action)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-900">
                            <span className="font-medium">{activity.userName}</span>
                            {' '}
                            <span className="text-slate-600">{getActionDescription(activity)}</span>
                          </p>
                          <p className="text-sm text-slate-400 mt-0.5">
                            {format(new Date(activity.createdAt), 'h:mm a')}
                          </p>
                        </div>
                        
                        <span className={cn(
                          'px-2 py-1 text-xs font-medium rounded-full',
                          activity.resourceType === 'file' && 'bg-blue-100 text-blue-700',
                          activity.resourceType === 'folder' && 'bg-purple-100 text-purple-700',
                          activity.resourceType === 'user' && 'bg-green-100 text-green-700',
                          activity.resourceType === 'share' && 'bg-amber-100 text-amber-700',
                          activity.resourceType === 'system' && 'bg-slate-100 text-slate-700'
                        )}>
                          {activity.resourceType}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
