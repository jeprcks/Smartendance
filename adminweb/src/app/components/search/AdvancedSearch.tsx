'use client';

import { useState, useEffect } from 'react';
import { Search, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export interface SearchFilters {
  query: string;
  gradeLevel?: string;
  section?: string;
  status?: string;
  [key: string]: string | undefined;
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onSaveFilter?: (filterName: string, filters: SearchFilters) => void;
  savedFilters?: Array<{ name: string; filters: SearchFilters }>;
  onLoadFilter?: (filters: SearchFilters) => void;
  placeholder?: string;
  showQuickFilters?: boolean;
  quickFilterOptions?: Array<{ label: string; value: string; filters: Partial<SearchFilters> }>;
}

export default function AdvancedSearch({
  onSearch,
  onSaveFilter,
  savedFilters = [],
  onLoadFilter,
  placeholder = 'Search...',
  showQuickFilters = true,
  quickFilterOptions = [],
}: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({ query: '' });
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  useEffect(() => {
    // Load saved filters from localStorage
    const saved = localStorage.getItem('savedFilters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Note: Saved filters are managed by parent component
        // This effect just ensures localStorage is checked
      } catch (e) {
        console.error('Error loading saved filters:', e);
      }
    }
  }, []);

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast.error('Please enter a filter name');
      return;
    }
    if (onSaveFilter) {
      onSaveFilter(filterName, filters);
      const updated = [...savedFilters, { name: filterName, filters }];
      localStorage.setItem('savedFilters', JSON.stringify(updated));
      toast.success('Filter saved successfully');
      setFilterName('');
      setShowSaveDialog(false);
    }
  };

  const handleLoadFilter = (savedFilter: { name: string; filters: SearchFilters }) => {
    setFilters(savedFilter.filters);
    if (onLoadFilter) {
      onLoadFilter(savedFilter.filters);
    }
    toast.success(`Loaded filter: ${savedFilter.name}`);
  };

  const handleQuickFilter = (quickFilter: Partial<SearchFilters>) => {
    const newFilters = { ...filters, ...quickFilter };
    setFilters(newFilters);
    onSearch(newFilters);
  };

  const clearFilters = () => {
    const cleared = { query: '', gradeLevel: '', section: '', status: '' };
    setFilters(cleared);
    onSearch(cleared);
  };

  return (
    <div className="mb-6">
      {/* Main Search Bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={placeholder}
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Search
        </button>
        {(filters.query || filters.gradeLevel || filters.section || filters.status) && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <X size={18} />
            Clear
          </button>
        )}
      </div>

      {/* Quick Filter Chips */}
      {showQuickFilters && quickFilterOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {quickFilterOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => handleQuickFilter(option.filters)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Saved Filters:</p>
          <div className="flex flex-wrap gap-2">
            {savedFilters.map((saved, index) => (
              <button
                key={index}
                onClick={() => handleLoadFilter(saved)}
                className="px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-200 rounded-full hover:bg-green-100 transition-colors"
              >
                {saved.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Filter</h3>
            <input
              type="text"
              placeholder="Filter name..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveFilter}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setFilterName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
