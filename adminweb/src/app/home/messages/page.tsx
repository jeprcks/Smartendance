'use client';

import { useState, useEffect } from 'react';
import { studentService, Student } from '@/app/services/studentService';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortGrade, setSortGrade] = useState('');
  const [sortSection, setSortSection] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactFilter, setContactFilter] = useState<'all' | 'contact' | 'emergency'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isSendAllModalOpen, setIsSendAllModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [selectedContactType, setSelectedContactType] = useState<'contact' | 'emergency'>('contact');
  const [sendAllContactType, setSendAllContactType] = useState<'contact' | 'emergency' | 'both'>('contact');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await studentService.getAllStudents();
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const uniqueGrades = Array.from(new Set(students.map(s => s.gradeLevel))).sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    return numA - numB;
  });

  const uniqueSections = Array.from(new Set(students.map(s => s.section))).sort();

  const filteredStudents = students.filter(student => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      student.fullName.toLowerCase().includes(query) ||
      student.studentId.toLowerCase().includes(query) ||
      student.gradeLevel.toLowerCase().includes(query) ||
      student.section.toLowerCase().includes(query)
    );

    const matchesGrade = !sortGrade || student.gradeLevel === sortGrade;
    const matchesSection = !sortSection || student.section === sortSection;

    // Filter by contact type
    let matchesContactFilter = true;
    if (contactFilter === 'contact') {
      matchesContactFilter = !!student.phoneNumber || !!student.parentContact;
    } else if (contactFilter === 'emergency') {
      matchesContactFilter = !!(student.emergencyContact?.contactNumber);
    }

    return matchesSearch && matchesGrade && matchesSection && matchesContactFilter;
  });

  const getContactNumbers = (student: Student) => {
    return {
      contact: student.phoneNumber || student.parentContact || null,
      emergency: student.emergencyContact?.contactNumber || null,
    };
  };

  const LoadingSkeleton = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-24"/></td>
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-32"/></td>
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-24"/></td>
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-16"/></td>
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-28"/></td>
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-28"/></td>
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-8 bg-gray-200 rounded w-24"/></td>
    </tr>
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      toast.error('Please enter a message');
      return;
    }

    const contactNumbers = getContactNumbers(selectedStudent!);
    const selectedNumber = selectedContactType === 'contact' ? contactNumbers.contact : contactNumbers.emergency;

    if (!selectedNumber) {
      toast.error('Selected contact number is not available');
      return;
    }

    setMessageLoading(true);
    try {
      // TODO: Integrate with SMS service
      console.log('Sending message to student:', selectedStudent?.studentId);
      console.log('Contact type:', selectedContactType);
      console.log('Contact number:', selectedNumber);
      console.log('Message:', messageText);
      toast.success(`Message sent to ${selectedNumber} successfully!`);
      setMessageText('');
      setIsSendModalOpen(false);
      setSelectedStudent(null);
      setSelectedContactType('contact');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setMessageLoading(false);
    }
  };

  const handleSendToAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setMessageLoading(true);
    try {
      // TODO: Integrate with SMS service
      let recipientCount = 0;
      let contactInfo = '';

      if (sendAllContactType === 'contact') {
        recipientCount = filteredStudents.filter(s => getContactNumbers(s).contact).length;
        contactInfo = 'contact numbers';
      } else if (sendAllContactType === 'emergency') {
        recipientCount = filteredStudents.filter(s => getContactNumbers(s).emergency).length;
        contactInfo = 'emergency contacts';
      } else {
        recipientCount = filteredStudents.length;
        contactInfo = 'contact numbers and emergency contacts';
      }

      console.log('Sending message to all students');
      console.log('Contact type:', sendAllContactType);
      console.log('Number of recipients:', recipientCount);
      console.log('Message:', messageText);
      toast.success(`Message sent to ${recipientCount} students (${contactInfo})!`);
      setMessageText('');
      setIsSendAllModalOpen(false);
      setSendAllContactType('contact');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setMessageLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50/30 p-8">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Student Contacts</h1>
          <p className="text-gray-600 mt-1">Manage and send messages to students</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200/80 backdrop-blur-sm">
        <div className="p-6">
          
          {/* Filters Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              <label className="text-sm font-semibold text-gray-700">Filter by:</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Grade Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Grade Level</label>
                <select
                  value={sortGrade}
                  onChange={(e) => setSortGrade(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-300 text-sm"
                >
                  <option value="">All Grades</option>
                  {uniqueGrades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
              
              {/* Section Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
                <select
                  value={sortSection}
                  onChange={(e) => setSortSection(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-300 text-sm"
                >
                  <option value="">All Sections</option>
                  {uniqueSections.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>

              {/* Send to All Button */}
              <div className="flex items-end">
                <button
                  onClick={() => setIsSendAllModalOpen(true)}
                  className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
                    <path fillRule="evenodd" d="M15.5 8.5a.5.5 0 01.5.5v1a2 2 0 11-4 0V9a.5.5 0 01.5-.5h3z" clipRule="evenodd" />
                  </svg>
                  Send to All
                </button>
              </div>

              {/* Clear Filters Button */}
              {(sortGrade || sortSection || contactFilter !== 'all') && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSortGrade('');
                      setSortSection('');
                      setContactFilter('all');
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors duration-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, student ID, grade, or section..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Results Counter */}
          <div className="mb-4 text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredStudents.length}</span> of <span className="font-semibold text-gray-900">{students.length}</span> students
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200/80">
            <table className="min-w-full divide-y divide-gray-200/80">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Full Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Grade Level</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Section</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact Number</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Emergency Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200/80">
                {loading ? (
                  [...Array(5)].map((_, index) => <LoadingSkeleton key={index} />)
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p>No students found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const contacts = getContactNumbers(student);
                    return (
                      <tr key={student.studentId} className="hover:bg-gray-50/50 transition-colors duration-200">
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
                          {contacts.contact ? (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-green-200/50">
                                {contacts.contact}
                              </span>
                              <button
                                className="inline-flex items-center p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                title="Copy contact number"
                                onClick={() => {
                                  navigator.clipboard.writeText(contacts.contact || '');
                                  toast.success('Copied to clipboard');
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M8 3a1 1 0 011-1h2a1 1 0 011 1v1h2V4a2 2 0 10-4 0v1H8V3z" />
                                  <path fillRule="evenodd" d="M16 16V8a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2zm-5.5-1a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No contact</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {contacts.emergency ? (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200/50">
                                {contacts.emergency}
                              </span>
                              <button
                                className="inline-flex items-center p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Copy emergency contact"
                                onClick={() => {
                                  navigator.clipboard.writeText(contacts.emergency || '');
                                  toast.success('Copied to clipboard');
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M8 3a1 1 0 011-1h2a1 1 0 011 1v1h2V4a2 2 0 10-4 0v1H8V3z" />
                                  <path fillRule="evenodd" d="M16 16V8a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2zm-5.5-1a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No contact</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              className="inline-flex items-center px-4 py-2 bg-green-50 text-green-600 text-sm font-medium rounded-lg hover:bg-green-100 hover:text-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Send Message"
                              onClick={() => {
                                setSelectedStudent(student);
                                setIsSendModalOpen(true);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
                                <path fillRule="evenodd" d="M15.5 8.5a.5.5 0 01.5.5v1a2 2 0 11-4 0V9a.5.5 0 01.5-.5h3z" clipRule="evenodd" />
                              </svg>
                              Send
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
      </div>

      {/* Send Message Modal - Single Student */}
      {isSendModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-96 overflow-y-auto border border-gray-100">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Send Message</h2>
                <button
                  onClick={() => {
                    setIsSendModalOpen(false);
                    setSelectedStudent(null);
                    setMessageText('');
                    setSelectedContactType('contact');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">To: <span className="font-semibold text-gray-900">{selectedStudent.fullName}</span></p>
                <p className="text-xs text-gray-500 mt-1">Student ID: {selectedStudent.studentId}</p>
              </div>

              {/* Contact Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Select Contact Type</label>
                <div className="space-y-2">
                  {getContactNumbers(selectedStudent).contact && (
                    <button
                      type="button"
                      onClick={() => setSelectedContactType('contact')}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        selectedContactType === 'contact'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`h-4 w-4 rounded border-2 mr-3 flex items-center justify-center ${
                          selectedContactType === 'contact'
                            ? 'border-green-500 bg-green-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedContactType === 'contact' && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Contact Number</p>
                          <p className="text-sm text-green-600 font-semibold">{getContactNumbers(selectedStudent).contact}</p>
                        </div>
                      </div>
                    </button>
                  )}
                  {getContactNumbers(selectedStudent).emergency && (
                    <button
                      type="button"
                      onClick={() => setSelectedContactType('emergency')}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        selectedContactType === 'emergency'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`h-4 w-4 rounded border-2 mr-3 flex items-center justify-center ${
                          selectedContactType === 'emergency'
                            ? 'border-red-500 bg-red-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedContactType === 'emergency' && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Emergency Contact</p>
                          <p className="text-sm text-red-600 font-semibold">{getContactNumbers(selectedStudent).emergency}</p>
                        </div>
                      </div>
                    </button>
                  )}
                  {!getContactNumbers(selectedStudent).contact && !getContactNumbers(selectedStudent).emergency && (
                    <p className="text-sm text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">
                      No contact information available for this student
                    </p>
                  )}
                </div>
              </div>

              <form onSubmit={handleSendMessage}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">{messageText.length} characters</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSendModalOpen(false);
                      setSelectedStudent(null);
                      setMessageText('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={messageLoading || !messageText.trim() || (!getContactNumbers(selectedStudent).contact && !getContactNumbers(selectedStudent).emergency)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {messageLoading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal - All Students */}
      {isSendAllModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-96 overflow-y-auto border border-gray-100">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Send Message to All</h2>
                <button
                  onClick={() => {
                    setIsSendAllModalOpen(false);
                    setMessageText('');
                    setSendAllContactType('contact');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700">
                  <span className="font-semibold">{filteredStudents.length}</span> parents will receive this message
                </p>
              </div>

              {/* Contact Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Select Recipient Type</label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSendAllContactType('contact')}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      sendAllContactType === 'contact'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`h-4 w-4 rounded border-2 mr-3 flex items-center justify-center ${
                        sendAllContactType === 'contact'
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300'
                      }`}>
                        {sendAllContactType === 'contact' && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Parent Contact Numbers</p>
                        <p className="text-xs text-gray-500">{filteredStudents.filter(s => getContactNumbers(s).contact).length} parents</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendAllContactType('emergency')}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      sendAllContactType === 'emergency'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`h-4 w-4 rounded border-2 mr-3 flex items-center justify-center ${
                        sendAllContactType === 'emergency'
                          ? 'border-red-500 bg-red-500'
                          : 'border-gray-300'
                      }`}>
                        {sendAllContactType === 'emergency' && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Emergency Contact Numbers</p>
                        <p className="text-xs text-gray-500">{filteredStudents.filter(s => getContactNumbers(s).emergency).length} parents</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendAllContactType('both')}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      sendAllContactType === 'both'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`h-4 w-4 rounded border-2 mr-3 flex items-center justify-center ${
                        sendAllContactType === 'both'
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300'
                      }`}>
                        {sendAllContactType === 'both' && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">All Contact Types</p>
                        <p className="text-xs text-gray-500">All parents</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSendToAll}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">{messageText.length} characters</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSendAllModalOpen(false);
                      setMessageText('');
                      setSendAllContactType('contact');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={messageLoading || !messageText.trim()}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {messageLoading ? 'Sending...' : 'Send to All'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
