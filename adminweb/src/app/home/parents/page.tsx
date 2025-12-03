'use client';

import { useState, useEffect } from 'react';
import AddParentModal from './components/AddParentModal';
import ViewParentModal from './components/ViewParentModal';
import EditParentModal from './components/EditParentModal';
import { parentService, Parent } from '@/app/services/parentService';
import toast from 'react-hot-toast';

export default function ParentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const fetchParents = async () => {
    try {
      setLoading(true);
      const data = await parentService.getAllParents();
      console.log('Fetched parents:', data.length);
      setParents(data);
    } catch (error) {
      console.error('Error fetching parents:', error);
      toast.error('Failed to load parents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParents();
  }, []);

  const handleAddParent = async (parentData: Omit<Parent, '_id'>) => {
    try {
      await parentService.createParent(parentData);
      toast.success('Parent added successfully');
      setIsAddModalOpen(false);
      fetchParents();
    } catch (error) {
      console.error('Error adding parent:', error);
      toast.error('Failed to add parent');
    }
  };

  const handleUpdateParent = async (parentData: Parent) => {
    try {
      if (selectedParent?._id) {
        await parentService.updateParent(selectedParent._id, parentData);
        toast.success('Parent updated successfully');
        setIsEditModalOpen(false);
        fetchParents();
      }
    } catch (error) {
      console.error('Error updating parent:', error);
      toast.error('Failed to update parent');
    }
  };

  const handleDeleteParent = async (parentId: string) => {
    if (confirm('Are you sure you want to delete this parent?')) {
      try {
        await parentService.deleteParent(parentId);
        toast.success('Parent deleted successfully');
        fetchParents();
      } catch (error) {
        console.error('Error deleting parent:', error);
        toast.error('Failed to delete parent');
      }
    }
  };

  const filteredParents = parents.filter(parent =>
    parent.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parent.phoneNumber.includes(searchQuery)
  );

  const handleImageError = (parentId: string) => {
    setImageErrors(prev => new Set(prev).add(parentId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading parents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Parents Management</h1>
          <p className="mt-2 text-gray-600">Manage and view all parents information</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex-1 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              + Add Parent
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium">Total Parents</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{parents.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium">Active Parents</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {parents.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium">Search Results</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{filteredParents.length}</p>
          </div>
        </div>

        {/* Parents Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredParents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No parents found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relationship</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParents.map((parent) => (
                    <tr key={parent._id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {parent.photo && !imageErrors.has(parent._id) ? (
                          <img
                            src={parent.photo}
                            alt={parent.fullName}
                            className="h-10 w-10 rounded-full object-cover"
                            onError={() => handleImageError(parent._id)}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-semibold text-gray-600">
                              {parent.fullName.charAt(0)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {parent.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {parent.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {parent.phoneNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {parent.relationship}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedParent(parent);
                              setIsViewModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              setSelectedParent(parent);
                              setIsEditModalOpen(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteParent(parent._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
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

        {/* Modals */}
        {isAddModalOpen && (
          <AddParentModal
            onClose={() => setIsAddModalOpen(false)}
            onSubmit={handleAddParent}
          />
        )}

        {isViewModalOpen && selectedParent && (
          <ViewParentModal
            parent={selectedParent}
            onClose={() => setIsViewModalOpen(false)}
          />
        )}

        {isEditModalOpen && selectedParent && (
          <EditParentModal
            parent={selectedParent}
            onClose={() => setIsEditModalOpen(false)}
            onSubmit={handleUpdateParent}
          />
        )}
      </div>
    </div>
  );
}
