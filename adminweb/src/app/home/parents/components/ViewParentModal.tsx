'use client';

import { Parent } from '@/app/services/parentService';

interface ViewParentModalProps {
  parent: Parent;
  onClose: () => void;
}

export default function ViewParentModal({ parent, onClose }: ViewParentModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Parent Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Photo and Basic Info */}
          <div className="flex items-center gap-6">
            {parent.photo ? (
              <img
                src={parent.photo}
                alt={parent.fullName}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-2xl font-semibold text-gray-600">
                  {parent.fullName.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{parent.fullName}</h3>
              <p className="text-gray-600">{parent.relationship}</p>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-gray-900 font-medium">{parent.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone Number</p>
                <p className="text-gray-900 font-medium">{parent.phoneNumber}</p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Gender</p>
                <p className="text-gray-900 font-medium">{parent.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Occupation</p>
                <p className="text-gray-900 font-medium">{parent.occupation || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Address */}
          {parent.address && (Object.values(parent.address).some(v => v)) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parent.address.street && (
                  <div>
                    <p className="text-sm text-gray-600">Street</p>
                    <p className="text-gray-900">{parent.address.street}</p>
                  </div>
                )}
                {parent.address.city && (
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="text-gray-900">{parent.address.city}</p>
                  </div>
                )}
                {parent.address.province && (
                  <div>
                    <p className="text-sm text-gray-600">Province</p>
                    <p className="text-gray-900">{parent.address.province}</p>
                  </div>
                )}
                {parent.address.zipCode && (
                  <div>
                    <p className="text-sm text-gray-600">Zip Code</p>
                    <p className="text-gray-900">{parent.address.zipCode}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {parent.emergencyContact && (Object.values(parent.emergencyContact).some(v => v)) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {parent.emergencyContact.name && (
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="text-gray-900">{parent.emergencyContact.name}</p>
                  </div>
                )}
                {parent.emergencyContact.phoneNumber && (
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="text-gray-900">{parent.emergencyContact.phoneNumber}</p>
                  </div>
                )}
                {parent.emergencyContact.relationship && (
                  <div>
                    <p className="text-sm text-gray-600">Relationship</p>
                    <p className="text-gray-900">{parent.emergencyContact.relationship}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Children Information */}
          {parent.childrenIds && parent.childrenIds.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Children</h3>
              <div className="flex flex-wrap gap-2">
                {parent.childrenIds.map((childId) => (
                  <span
                    key={childId}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {childId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          {(parent.createdAt || parent.updatedAt) && (
            <div className="border-t pt-4 text-sm text-gray-600">
              {parent.createdAt && (
                <p>Created: {new Date(parent.createdAt).toLocaleDateString()}</p>
              )}
              {parent.updatedAt && (
                <p>Last Updated: {new Date(parent.updatedAt).toLocaleDateString()}</p>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
