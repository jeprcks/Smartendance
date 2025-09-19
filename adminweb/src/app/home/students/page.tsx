'use client';

import { useState } from 'react';
import AddStudentModal from './components/AddStudentModal';
import ViewStudentModal from './components/ViewStudentModal';
import StatusCounter from './components/StatusCounter';

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const students = [
    { 
      studentId: 'STU-001', 
      fullName: 'Alice Johnson', 
      profilePicture: null,
      gradeLevel: 'Grade 4', 
      section: 'A', 
      gender: 'Female',
      shift: 'Morning',
      email: 'alice.j@school.edu',
      phoneNumber: '123-456-7890',
      age: '16',
      birthDate: '2009-05-15',
      address: '123 Main St',
      city: 'Springfield',
      province: 'State',
      zipCode: '12345',
      parentName: 'Mary Johnson',
      parentContact: '123-456-7891',
      emergencyContactName: 'John Johnson',
      emergencyContact: '123-456-7892',
      relationship: 'Father'
    },
    { 
      studentId: 'STU-002', 
      fullName: 'Brian Chen', 
      profilePicture: null,
      gradeLevel: 'Grade 2', 
      section: 'A', 
      gender: 'Male',
      shift: 'Afternoon',
      email: 'brian.c@school.edu',
      phoneNumber: '123-456-7893',
      age: '16',
      birthDate: '2009-03-20',
      address: '456 Oak St',
      city: 'Springfield',
      province: 'State',
      zipCode: '12345',
      parentName: 'Wei Chen',
      parentContact: '123-456-7894',
      emergencyContactName: 'Li Chen',
      emergencyContact: '123-456-7895',
      relationship: 'Mother'
    },
  ];

  const filteredStudents = students.filter(student =>
    student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.gradeLevel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.shift && student.shift.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalMale = students.filter(student => student.gender === 'Male').length;
  const totalFemale = students.filter(student => student.gender === 'Female').length;

  return (
    <div className="min-h-screen bg-green-50/30 p-8">
      <StatusCounter 
        totalStudents={students.length}
        totalMale={totalMale}
        totalFemale={totalFemale}
      />
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Students</h1>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center px-5 py-2.5 bg-green-600 text-sm font-semibold text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Student
        </button>
        
        <AddStudentModal 
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={(studentData) => {
            console.log('New student data:', studentData);
            // Here you would typically make an API call to add the student
          }}
        />
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200/80 backdrop-blur-sm">
        <div className="p-6">
          <div className="mb-6">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors duration-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search students..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200/80">
            <table className="min-w-full divide-y divide-gray-200/80">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Profile</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Full Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Grade Level</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Section</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Gender</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Shift</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200/80">
                {filteredStudents.map((student) => (
                  <tr key={student.studentId} className="hover:bg-gray-50/50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {student.profilePicture ? (
                          <div className="relative group">
                            <img
                              src={student.profilePicture}
                              alt={`${student.fullName}'s profile`}
                              className="h-10 w-10 rounded-full object-cover border border-gray-200/50 group-hover:border-blue-500/50 shadow-sm group-hover:shadow-md transition-all duration-200 transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-opacity duration-200" />
                          </div>
                        ) : (
                          <div className="relative group">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 shadow-sm
                              ${student.gender === 'Male' 
                                ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200' 
                                : 'border-pink-200 bg-gradient-to-br from-pink-50 to-pink-100 group-hover:from-pink-100 group-hover:to-pink-200'
                              } 
                              transform transition-all duration-200 ease-in-out group-hover:scale-105 group-hover:shadow-md`}
                            >
                              <span className={`text-sm font-bold 
                                ${student.gender === 'Male' 
                                  ? 'text-blue-600 group-hover:text-blue-700' 
                                  : 'text-pink-600 group-hover:text-pink-700'
                                }`}
                              >
                                {student.fullName.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-opacity duration-200" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-800">{student.studentId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-800">{student.fullName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{student.gradeLevel}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{student.section}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ring-1 ${
                        student.gender === 'Male' 
                          ? 'bg-blue-50 text-blue-700 ring-blue-200/50' 
                          : 'bg-pink-50 text-pink-700 ring-pink-200/50'
                      } transition-colors duration-200`}>
                        {student.gender}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ring-1 bg-green-50 text-green-700 ring-green-200/50 transition-colors duration-200">
                        {student.shift || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        onClick={() => {
                          setSelectedStudent(student);
                          setIsViewModalOpen(true);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ViewStudentModal 
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />
    </div>
  );
}