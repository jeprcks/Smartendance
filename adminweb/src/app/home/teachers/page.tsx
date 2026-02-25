'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ViewTeacherModal from '../teachers/components/ViewTeacherModal';
import AddTeacherModal from '../teachers/components/AddTeacherModal';
import EditTeacherModal from '../teachers/components/EditTeacherModal';
import AdvancedSearch, { SearchFilters } from '@/app/components/search/AdvancedSearch';
import BulkActions from '@/app/components/bulk/BulkActions';
import { teacherService, Teacher } from '../../services/teacherService';
import toast from 'react-hot-toast';
import { Users, CheckCircle, XCircle } from 'lucide-react';



export default function TeachersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  
  // State for API data
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTeachers: 0,
    hasNext: false,
    hasPrev: false
  });

  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ query: '' });
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; filters: SearchFilters }>>([]);

  // Fetch teachers from API with request cancellation
  const fetchTeachers = useCallback(async () => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);
      
      // Build params object, only including defined values
      const params: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
      } = {
        page: 1,
        limit: 50
      };
      
      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      if (statusFilter && statusFilter.trim()) {
        params.status = statusFilter.trim();
      }
      
      const response = await teacherService.getAllTeachers(params);

      // Only update state if request wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setTeachers(response.teachers);
        setPagination(response.pagination);
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (err instanceof Error && err.name !== 'AbortError' && !abortControllerRef.current?.signal.aborted) {
        setError(err.message || 'Failed to fetch teachers');
        console.error('Error fetching teachers:', err);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [searchQuery, statusFilter]);

  // Handle updating teacher status
  const handleStatusUpdate = async (teacherId: string, newStatus: 'Active' | 'Inactive') => {
    try {
      setStatusUpdating(teacherId);
      await teacherService.updateTeacher(teacherId, { status: newStatus });
      await fetchTeachers(); // Refresh the list
    } catch (err) {
      console.error('Error updating teacher status:', err);
      setError('Failed to update teacher status');
    } finally {
      setStatusUpdating(null);
    }
  };

  // Load teachers on component mount and when search or filter changes
  useEffect(() => {
    fetchTeachers();
    
    // Load saved filters from localStorage
    const saved = localStorage.getItem('savedFilters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedFilters(parsed);
      } catch (e) {
        console.error('Error loading saved filters:', e);
      }
    }
    
    // Cleanup: abort request on unmount or when dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTeachers]);

  const handleSearch = (filters: SearchFilters) => {
    setSearchFilters(filters);
    setSearchQuery(filters.query || '');
    setStatusFilter(filters.status ?? '');
  };

  const handleSaveFilter = (filterName: string, filters: SearchFilters) => {
    const newSaved = [...savedFilters, { name: filterName, filters }];
    setSavedFilters(newSaved);
    localStorage.setItem('savedFilters', JSON.stringify(newSaved));
  };

  const handleLoadFilter = (filters: SearchFilters) => {
    setSearchFilters(filters);
    handleSearch(filters);
  };

  const handleSelectAll = () => {
    const allIds = new Set(teachers.map(t => t._id));
    setSelectedTeachers(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedTeachers(new Set());
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      const deletePromises = ids.map(id => teacherService.deleteTeacher(id));
      await Promise.all(deletePromises);
      setTeachers(prev => prev.filter(t => !ids.includes(t._id)));
      setSelectedTeachers(new Set());
      toast.success(`Successfully deleted ${ids.length} teacher(s)`);
      fetchTeachers(); // Refresh the list
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete some teachers');
    }
  };

  const handleBulkUpdate = async (ids: string[], updates: Partial<Teacher>) => {
    try {
      const updatePromises = ids.map(id => teacherService.updateTeacher(id, updates));
      await Promise.all(updatePromises);
      setSelectedTeachers(new Set());
      toast.success(`Successfully updated ${ids.length} teacher(s)`);
      fetchTeachers(); // Refresh the list
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error('Failed to update some teachers');
    }
  };

  const quickFilterOptions = [
    { label: 'All Teachers', value: 'all', filters: { query: '', status: '' } },
    { label: 'Active', value: 'active', filters: { query: '', status: 'Active' } },
    { label: 'Inactive', value: 'inactive', filters: { query: '', status: 'Inactive' } },
  ];

  // Separate teachers into active and inactive (before filtering)
  const allActiveTeachers = teachers.filter(teacher => teacher.status === 'Active');
  const allInactiveTeachers = teachers.filter(teacher => teacher.status === 'Inactive');

  // Filter teachers based on search filters
  const getTeacherSubjects = (t: Teacher) =>
    Array.isArray(t.subjects) ? t.subjects : ((t as any).subject ? [(t as any).subject] : []);

  const filteredActiveTeachers = allActiveTeachers.filter(teacher => {
    const query = (searchFilters.query || searchQuery).toLowerCase();
    const subjects = getTeacherSubjects(teacher);
    const matchesSearch = !query || (
      teacher.name.toLowerCase().includes(query) ||
      teacher.teacherId.toLowerCase().includes(query) ||
      teacher.username.toLowerCase().includes(query) ||
      subjects.some(s => s.toLowerCase().includes(query))
    );
    const statusFilterValue = searchFilters.status || statusFilter;
    const matchesStatus = !statusFilterValue || teacher.status === statusFilterValue;
    return matchesSearch && matchesStatus;
  });

  const filteredInactiveTeachers = allInactiveTeachers.filter(teacher => {
    const query = (searchFilters.query || searchQuery).toLowerCase();
    const subjects = getTeacherSubjects(teacher);
    const matchesSearch = !query || (
      teacher.name.toLowerCase().includes(query) ||
      teacher.teacherId.toLowerCase().includes(query) ||
      teacher.username.toLowerCase().includes(query) ||
      subjects.some(s => s.toLowerCase().includes(query))
    );
    const statusFilterValue = searchFilters.status || statusFilter;
    const matchesStatus = !statusFilterValue || teacher.status === statusFilterValue;
    return matchesSearch && matchesStatus;
  });

  // Handle adding new teacher
  const handleAddTeacher = async (teacherData: any) => {
    try {
      await teacherService.createTeacher(teacherData);
      await fetchTeachers(); // Refresh the list
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Error adding teacher:', err);
      // Re-throw the error so the modal can handle it
      throw err;
    }
  };

  // Handle editing teacher
  const handleEditTeacher = async (teacherData: any) => {
    try {
      if (selectedTeacher) {
        await teacherService.updateTeacher(selectedTeacher._id, teacherData);
        await fetchTeachers(); // Refresh the list
        setIsEditModalOpen(false);
        setSelectedTeacher(null);
      }
    } catch (err) {
      console.error('Error editing teacher:', err);
      // Re-throw the error so the modal can handle it
      throw err;
    }
  };

  const teacherStatCards = [
    { title: 'Total Teachers', value: teachers.length, icon: Users, color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
    { title: 'Active Teachers', value: allActiveTeachers.length, icon: CheckCircle, color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
    { title: 'Inactive Teachers', value: allInactiveTeachers.length, icon: XCircle, color: 'bg-gray-500', bgColor: 'bg-gray-50', textColor: 'text-gray-700' },
  ];

  return (
    <div className="page-container">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-header-content">
            <h1>Teachers</h1>
            <p>Manage teacher information and status</p>
          </div>
          <div className="dashboard-header-refresh-box">
            <button
              onClick={() => setIsAddModalOpen(true)}
              type="button"
              className="inline-flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Teacher
            </button>
          </div>
        </div>
      </header>

      {/* Stats cards – theme-aware gradients */}
      <div className="dashboard-grid mb-8">
        {teacherStatCards.map((stat, index) => {
          const IconComponent = stat.icon;
          const maxVal = Math.max(teachers.length, 1);
          const barHeight = `${(stat.value / maxVal) * 100}%`;
          
          // Map stat types to theme-aware gradient styles
          const getStatStyle = (title: string) => {
            const styleMap: Record<string, string> = {
              'Total Teachers': 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, var(--primary) 5%) 0%, color-mix(in srgb, var(--surface) 90%, var(--primary) 10%) 100%)',
              'Active Teachers': 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, var(--primary) 5%) 0%, color-mix(in srgb, var(--surface) 90%, var(--primary) 10%) 100%)',
              'Inactive Teachers': 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, var(--muted-foreground) 5%) 0%, color-mix(in srgb, var(--surface) 90%, var(--muted-foreground) 10%) 100%)',
            };
            return styleMap[title] || styleMap['Total Teachers'];
          };

          const getTextColor = (title: string) => {
            const colorMap: Record<string, string> = {
              'Total Teachers': 'text-[var(--primary)]',
              'Active Teachers': 'text-[var(--primary)]',
              'Inactive Teachers': 'text-[var(--muted-foreground)]',
            };
            return colorMap[title] || colorMap['Total Teachers'];
          };

          return (
            <div
              key={stat.title}
              className="stat-card"
              style={{
                animationDelay: `${index * 80}ms`,
                backgroundImage: getStatStyle(stat.title)
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--surface) 90%, var(--primary) 10%)`
                  }}
                >
                  <IconComponent className={`${getTextColor(stat.title)} transition-colors`} size={24} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--muted-foreground)] dark:text-white/90 mb-1">{stat.title}</p>
                  <p className={`text-3xl font-bold ${getTextColor(stat.title)} transition-colors`}>
                    {stat.value.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="w-full bg-[var(--muted)] rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: barHeight,
                    backgroundColor: 'var(--primary)'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading teachers</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchTeachers}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="content-section">
        {/* Advanced Search */}
        <AdvancedSearch
          onSearch={handleSearch}
          onSaveFilter={handleSaveFilter}
          savedFilters={savedFilters}
          onLoadFilter={handleLoadFilter}
          placeholder="Search by name, username, subject, or ID..."
          showQuickFilters={true}
          quickFilterOptions={quickFilterOptions}
        />

        {/* Bulk Actions */}
        <BulkActions
          items={[...filteredActiveTeachers, ...filteredInactiveTeachers]}
          selectedItems={selectedTeachers}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onBulkDelete={handleBulkDelete}
          onBulkUpdate={handleBulkUpdate}
          getId={(teacher) => teacher._id}
          getLabel={(teacher) => teacher.name}
        />

        <div className="table-container">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Active Teachers ({filteredActiveTeachers.length})
          </h2>
          <table className="data-table">
            <thead>
                <tr>
                  <th className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedTeachers.size === filteredActiveTeachers.length && filteredActiveTeachers.length > 0}
                      onChange={() => {
                        const newSelected = new Set(selectedTeachers);
                        if (selectedTeachers.size === filteredActiveTeachers.length) {
                          filteredActiveTeachers.forEach(t => newSelected.delete(t._id));
                        } else {
                          filteredActiveTeachers.forEach(t => newSelected.add(t._id));
                        }
                        setSelectedTeachers(newSelected);
                      }}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </th>
                  <th>Profile</th>
                  <th>Teacher ID</th>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mr-3"></div>
                        Loading teachers...
                      </div>
                    </td>
                  </tr>
                ) : filteredActiveTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      No active teachers found
                    </td>
                  </tr>
                ) : (
                  filteredActiveTeachers.map((teacher) => {
                    const isSelected = selectedTeachers.has(teacher._id);
                    return (
                    <tr key={teacher._id} className={`hover:bg-gray-50 ${isSelected ? 'bg-green-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelected = new Set(selectedTeachers);
                            if (e.target.checked) {
                              newSelected.add(teacher._id);
                            } else {
                              newSelected.delete(teacher._id);
                            }
                            setSelectedTeachers(newSelected);
                          }}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {teacher.profilePicture ? (
                            <img
                              src={teacher.profilePicture}
                              alt={`${teacher.name}'s profile`}
                              className="h-10 w-10 rounded-full object-cover border-2 border-green-500"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 border-2 border-green-500 flex items-center justify-center">
                              <span className="text-sm font-bold text-gray-600">
                                {teacher.name.split(' ').map((name: string) => name[0]).join('')}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.teacherId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.role}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {getTeacherSubjects(teacher).map((sub) => (
                            <span key={sub} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            const newStatus = teacher.status === 'Active' ? 'Inactive' : 'Active';
                            handleStatusUpdate(teacher._id, newStatus);
                          }}
                          disabled={statusUpdating === teacher._id}
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${
                            teacher.status === 'Active' 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : teacher.status === 'Inactive'
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                          title={`Click to mark teacher as ${teacher.status === 'Active' ? 'Inactive' : 'Active'}`}
                        >
                          {statusUpdating === teacher._id ? (
                            <span className="flex items-center gap-1">
                              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Updating...
                            </span>
                          ) : (
                            teacher.status
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button 
                            className="bg-gray-900 text-white px-3 py-1 rounded-md hover:bg-gray-700 transition-colors"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setIsViewModalOpen(true);
                            }}
                          >
                            View
                          </button>
                          <button 
                            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setIsEditModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inactive Teachers Section */}
        {filteredInactiveTeachers.length > 0 && (
          <div className="content-section mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
              Inactive Teachers ({filteredInactiveTeachers.length})
            </h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-12">
                      <input
                        type="checkbox"
                        checked={filteredInactiveTeachers.every(t => selectedTeachers.has(t._id)) && filteredInactiveTeachers.length > 0}
                        onChange={() => {
                          const newSelected = new Set(selectedTeachers);
                          if (filteredInactiveTeachers.every(t => selectedTeachers.has(t._id))) {
                            filteredInactiveTeachers.forEach(t => newSelected.delete(t._id));
                          } else {
                            filteredInactiveTeachers.forEach(t => newSelected.add(t._id));
                          }
                          setSelectedTeachers(newSelected);
                        }}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </th>
                    <th>Profile</th>
                    <th>Teacher ID</th>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInactiveTeachers.map((teacher) => {
                    const isSelected = selectedTeachers.has(teacher._id);
                    return (
                    <tr key={teacher._id} className={`hover:bg-gray-50 opacity-75 ${isSelected ? 'bg-green-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelected = new Set(selectedTeachers);
                            if (e.target.checked) {
                              newSelected.add(teacher._id);
                            } else {
                              newSelected.delete(teacher._id);
                            }
                            setSelectedTeachers(newSelected);
                          }}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {teacher.profilePicture ? (
                            <img
                              src={teacher.profilePicture}
                              alt={`${teacher.name}'s profile`}
                              className="h-10 w-10 rounded-full object-cover border-2 border-green-500 grayscale"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 border-2 border-green-500 flex items-center justify-center">
                              <span className="text-sm font-bold text-gray-600">
                                {teacher.name.split(' ').map((name: string) => name[0]).join('')}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.teacherId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.role}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {getTeacherSubjects(teacher).map((sub) => (
                            <span key={sub} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            const newStatus = teacher.status === 'Active' ? 'Inactive' : 'Active';
                            handleStatusUpdate(teacher._id, newStatus);
                          }}
                          disabled={statusUpdating === teacher._id}
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${
                            teacher.status === 'Active' 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : teacher.status === 'Inactive'
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                          title={`Click to mark teacher as ${teacher.status === 'Active' ? 'Inactive' : 'Active'}`}
                        >
                          {statusUpdating === teacher._id ? (
                            <span className="flex items-center gap-1">
                              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Updating...
                            </span>
                          ) : (
                            teacher.status
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button 
                            className="bg-gray-900 text-white px-3 py-1 rounded-md hover:bg-gray-700 transition-colors"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setIsViewModalOpen(true);
                            }}
                          >
                            View
                          </button>
                          <button 
                            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setIsEditModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      <ViewTeacherModal 
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedTeacher(null);
        }}
        teacher={selectedTeacher}
      />

      <AddTeacherModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTeacher}
      />

      <EditTeacherModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTeacher(null);
        }}
        onEdit={handleEditTeacher}
        teacher={selectedTeacher}
      />
    </div>
  );
}
