'use client';

import { useState, useEffect } from 'react';
import ViewTeacherModal from '../teachers/components/ViewTeacherModal';
import AddTeacherModal from '../teachers/components/AddTeacherModal';
import EditTeacherModal from '../teachers/components/EditTeacherModal';
import { teacherService, Teacher } from '../../services/teacherService';



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

  // Fetch teachers from API
  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await teacherService.getAllTeachers({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        page: 1,
        limit: 50
      });

      setTeachers(response.teachers);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teachers');
      console.error('Error fetching teachers:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
  }, [searchQuery, statusFilter]);

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

  // Separate teachers into active and inactive
  const activeTeachers = teachers.filter(teacher => teacher.status === 'Active');
  const inactiveTeachers = teachers.filter(teacher => teacher.status === 'Inactive');

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Teachers</h1>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          + Add Teacher
        </button>
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

      <div className="bg-white rounded-lg shadow">
        <div className="p-4">
          <div className="mb-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search by name, username, or subject..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-600 mb-2">Status</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              {(searchQuery || statusFilter) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Active Teachers ({activeTeachers.length})
            </h2>
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                        Loading teachers...
                      </div>
                    </td>
                  </tr>
                ) : activeTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No active teachers found
                    </td>
                  </tr>
                ) : (
                  activeTeachers.map((teacher) => (
                    <tr key={teacher._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {teacher.profilePicture ? (
                            <img
                              src={teacher.profilePicture}
                              alt={`${teacher.name}'s profile`}
                              className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.subject}</td>
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
                            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Inactive Teachers Section */}
          {inactiveTeachers.length > 0 && (
            <div className="mt-8 overflow-x-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                Inactive Teachers ({inactiveTeachers.length})
              </h2>
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inactiveTeachers.map((teacher) => (
                    <tr key={teacher._id} className="hover:bg-gray-50 opacity-75">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {teacher.profilePicture ? (
                            <img
                              src={teacher.profilePicture}
                              alt={`${teacher.name}'s profile`}
                              className="h-10 w-10 rounded-full object-cover border-2 border-gray-200 grayscale"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.subject}</td>
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
                            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
