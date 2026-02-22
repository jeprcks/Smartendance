'use client';

import { useState, useEffect } from 'react';
import { studentService, Student } from '@/app/services/studentService';
import { telegramService } from '@/app/services/telegramService';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortGrade, setSortGrade] = useState('');
  const [sortSection, setSortSection] = useState('');
  const [sortShift, setSortShift] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [contactFilter, setContactFilter] = useState<'all' | 'contact' | 'emergency'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isSendAllModalOpen, setIsSendAllModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);

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
  const uniqueShifts = Array.from(new Set(students.map(s => s.shift).filter(Boolean))).sort() as string[];

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
    const matchesShift = !sortShift || student.shift === sortShift;

    // Filter by contact type
    let matchesContactFilter = true;
    if (contactFilter === 'contact') {
      matchesContactFilter = !!student.phoneNumber || !!student.parentContact;
    } else if (contactFilter === 'emergency') {
      matchesContactFilter = !!(student.emergencyContact?.contactNumber);
    }

    return matchesSearch && matchesGrade && matchesSection && matchesShift && matchesContactFilter;
  });

  const getContactNumbers = (student: Student) => {
    return {
      contact: student.phoneNumber || student.parentContact || null,
      emergency: student.emergencyContact?.contactNumber || null,
    };
  };

  const getTelegramChatIds = (student: Student) => {
    return {
      contact: (student as any).parentInfo?.telegramChatId || (student as any).parentTelegramChatId || (student as any).telegramChatId || null,
      emergencyPhone: student.emergencyContact?.contactNumber || null,
    };
  };

  const LoadingSkeleton = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-10 w-10 bg-[var(--muted)] rounded-full"/></td>
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-[var(--muted)] rounded w-24"/></td>
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-[var(--muted)] rounded w-32"/></td>
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-[var(--muted)] rounded w-24"/></td>
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-[var(--muted)] rounded w-16"/></td>
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-[var(--muted)] rounded w-28"/></td>
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-[var(--muted)] rounded w-28"/></td>
      <td className="px-6 py-4 whitespace-nowrap"><div className="h-8 bg-[var(--muted)] rounded w-24"/></td>
    </tr>
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      toast.error('Please enter a message');
      return;
    }

    const telegramChatIds = getTelegramChatIds(selectedStudent!);
    const selectedChatId = telegramChatIds.contact;

    if (!selectedChatId) {
      toast.error('No Telegram chat ID found for parent contact');
      return;
    }
    const chatIdValue = String(selectedChatId).trim();
    if (!/^-?\d+$/.test(chatIdValue)) {
      toast.error('Invalid Telegram chat ID. It should be numeric (e.g., 123456789).');
      return;
    }

    setMessageLoading(true);
    try {
      const result = await telegramService.sendToStudent(
        selectedStudent!.studentId,
        messageText,
        'contact'
      );

      if (result.success) {
        toast.success(`Message sent to parent via Telegram!`);
        setMessageText('');
        setIsSendModalOpen(false);
        setSelectedStudent(null);
      } else {
        const errorMessage = result.error || '';
        if (/chat not found|chat_id_invalid|bad request/i.test(errorMessage)) {
          toast.error('Parent Telegram chat ID is invalid. Ask the parent to /start the bot and provide the correct Chat ID.');
        } else {
          toast.error(errorMessage || 'Failed to send message');
        }
      }
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
      const filters: any = {};
      if (sortGrade) filters.gradeLevel = sortGrade;
      if (sortSection) filters.section = sortSection;

      const result = await telegramService.sendToAllStudents(
        messageText,
        'contact',
        filters
      );

      if (result.success && result.data) {
        const { successCount, total } = result.data;
        toast.success(`Message sent to ${successCount} out of ${total} parents via Telegram!`);
        setMessageText('');
        setIsSendAllModalOpen(false);
      } else {
        toast.error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setMessageLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-header-content">
            <h1>Student Contacts</h1>
            <p>Send Telegram messages to students&apos; parents</p>
          </div>
        </div>
      </header>

      <div className="content-section">
        <div className="p-6">
          
          {/* Filters Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--muted-foreground)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              <label className="text-sm font-semibold text-[var(--foreground)]">Filter by:</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Grade Filter */}
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Grade Level</label>
                <select
                  value={sortGrade}
                  onChange={(e) => setSortGrade(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all duration-300 text-sm text-[var(--foreground)]"
                >
                  <option value="">All Grades</option>
                  {uniqueGrades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
              
              {/* Section Filter */}
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Section</label>
                <select
                  value={sortSection}
                  onChange={(e) => setSortSection(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all duration-300 text-sm text-[var(--foreground)]"
                >
                  <option value="">All Sections</option>
                  {uniqueSections.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>

              {/* Shift Filter */}
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Shift</label>
                <select
                  value={sortShift}
                  onChange={(e) => setSortShift(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all duration-300 text-sm text-[var(--foreground)]"
                >
                  <option value="">All Shifts</option>
                  {uniqueShifts.map(shift => (
                    <option key={shift} value={shift}>{shift}</option>
                  ))}
                </select>
              </div>

              {/* Send to All Button */}
              <div className="flex items-end">
                <button
                  onClick={() => setIsSendAllModalOpen(true)}
                  className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-[var(--radius)] hover:bg-purple-700 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
                    <path fillRule="evenodd" d="M15.5 8.5a.5.5 0 01.5.5v1a2 2 0 11-4 0V9a.5.5 0 01.5-.5h3z" clipRule="evenodd" />
                  </svg>
                  Send to All
                </button>
              </div>

              {/* Clear Filters Button */}
              {(sortGrade || sortSection || sortShift || contactFilter !== 'all') && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSortGrade('');
                      setSortSection('');
                      setSortShift('');
                      setContactFilter('all');
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] bg-[var(--muted)] rounded-[var(--radius)] hover:bg-[var(--muted)]/80 transition-colors"
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
                <svg className="h-5 w-5 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors duration-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, student ID, grade, or section..."
                className="w-full pl-12 pr-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-all duration-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Results Counter */}
          <div className="mb-4 text-sm text-[var(--muted-foreground)]">
            Showing <span className="font-semibold text-[var(--foreground)]">{filteredStudents.length}</span> of <span className="font-semibold text-[var(--foreground)]">{students.length}</span> students
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Grade Level</th>
                  <th>Section</th>
                  <th>Shift</th>
                  <th>Telegram (Parent)</th>
                  <th>Emergency Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, index) => <LoadingSkeleton key={index} />)
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-[var(--muted-foreground)]">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p>No students found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const chatIds = getTelegramChatIds(student);
                    return (
                      <tr key={student.studentId} className="hover:bg-[var(--secondary)] transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            {student.photo && student.photo.startsWith('data:image/') && !imageErrors.has(student.studentId) ? (
                              <img
                                src={student.photo}
                                alt={`${student.fullName}'s profile`}
                                className="h-10 w-10 rounded-full object-cover border-2 border-green-500"
                                onError={() => {
                                  setImageErrors(prev => new Set(prev).add(student.studentId));
                                }}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-[var(--muted)] border-2 border-green-500 flex items-center justify-center">
                                <span className="text-sm font-bold text-[var(--muted-foreground)]">
                                  {student.fullName.split(' ').map((name: string) => name[0]).join('')}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-[var(--foreground)]">{student.studentId}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--foreground)]">{student.fullName}</span>
                            {student.gender && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${
                                  student.gender === 'Male'
                                    ? 'bg-blue-50 text-blue-700 ring-blue-200/50'
                                    : student.gender === 'Female'
                                      ? 'bg-pink-50 text-pink-700 ring-pink-200/50'
                                      : 'bg-gray-50 text-gray-700 ring-gray-200/50'
                                }`}
                              >
                                {student.gender}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-[var(--foreground)]">{student.gradeLevel}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-[var(--foreground)]">{student.section}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-[var(--foreground)]">{student.shift || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {chatIds.contact ? (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200/50">
                                {chatIds.contact}
                              </span>
                              <button
                                className="inline-flex items-center p-1.5 text-[var(--muted-foreground)] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Copy Telegram Chat ID"
                                onClick={() => {
                                  navigator.clipboard.writeText(chatIds.contact || '');
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
                            <span className="text-xs text-[var(--muted-foreground)]">No Chat ID</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {chatIds.emergencyPhone ? (
                            <div className="flex items-center space-x-2">
                              <a 
                                href={`tel:${chatIds.emergencyPhone}`}
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200/50 hover:bg-red-100 transition-colors"
                                title="Click to call"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                </svg>
                                {chatIds.emergencyPhone}
                              </a>
                              <button
                                className="inline-flex items-center p-1.5 text-[var(--muted-foreground)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Copy Emergency Phone"
                                onClick={() => {
                                  navigator.clipboard.writeText(chatIds.emergencyPhone || '');
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
                            <span className="text-xs text-[var(--muted-foreground)]">No Phone</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Send Telegram Message"
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
          <div className="bg-[var(--card)] rounded-xl shadow-2xl max-w-md w-full max-h-96 overflow-y-auto border border-[var(--border)]">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[var(--foreground)]">Send Telegram Message</h2>
                <button
                  onClick={() => {
                    setIsSendModalOpen(false);
                    setSelectedStudent(null);
                    setMessageText('');
                  }}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-3 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
                <p className="text-sm text-[var(--muted-foreground)]">
                  To:{' '}
                  <span className="font-semibold text-[var(--foreground)]">
                    {selectedStudent.fullName}
                  </span>
                  {selectedStudent.gender && (
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${
                        selectedStudent.gender === 'Male'
                          ? 'bg-blue-50 text-blue-700 ring-blue-200/50'
                          : selectedStudent.gender === 'Female'
                            ? 'bg-pink-50 text-pink-700 ring-pink-200/50'
                            : 'bg-gray-50 text-gray-700 ring-gray-200/50'
                      }`}
                    >
                      {selectedStudent.gender}
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">Student ID: {selectedStudent.studentId}</p>
              </div>

              {/* Contact Info Display */}
              <div className="mb-4">
                {getTelegramChatIds(selectedStudent).contact ? (
                  <div className="p-3 rounded-lg bg-blue-50 border-2 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[var(--foreground)] text-sm">Parent Telegram</p>
                        <p className="text-sm text-blue-600 font-semibold">{getTelegramChatIds(selectedStudent).contact}</p>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">
                    No Telegram chat ID available for this student's parent
                  </p>
                )}
                {getTelegramChatIds(selectedStudent).emergencyPhone && (
                  <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[var(--foreground)] text-sm">Emergency Contact (Call)</p>
                        <a href={`tel:${getTelegramChatIds(selectedStudent).emergencyPhone}`} className="text-sm text-red-600 font-semibold hover:underline">
                          {getTelegramChatIds(selectedStudent).emergencyPhone}
                        </a>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Message</label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] resize-none bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    rows={4}
                  />
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{messageText.length} characters</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSendModalOpen(false);
                      setSelectedStudent(null);
                      setMessageText('');
                    }}
                    className="flex-1 px-4 py-2 border border-[var(--border)] text-[var(--foreground)] rounded-[var(--radius)] hover:bg-[var(--muted)] transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={messageLoading || !messageText.trim() || !getTelegramChatIds(selectedStudent).contact}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-[var(--radius)] hover:bg-blue-700 disabled:bg-[var(--muted)] disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {messageLoading ? 'Sending...' : 'Send to Parent'}
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
          <div className="bg-[var(--card)] rounded-xl shadow-2xl max-w-md w-full max-h-96 overflow-y-auto border border-[var(--border)]">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[var(--foreground)]">Broadcast Telegram Message</h2>
                <button
                  onClick={() => {
                    setIsSendAllModalOpen(false);
                    setMessageText('');
                  }}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
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

              {/* Recipients Info */}
              <div className="mb-4">
                <div className="p-3 rounded-lg bg-purple-50 border-2 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[var(--foreground)] text-sm">Send to All Parents</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {filteredStudents.filter(s => getTelegramChatIds(s).contact).length} parents will receive this message via Telegram
                      </p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
                      <path fillRule="evenodd" d="M15.5 8.5a.5.5 0 01.5.5v1a2 2 0 11-4 0V9a.5.5 0 01.5-.5h3z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                {filteredStudents.filter(s => !getTelegramChatIds(s).contact).length > 0 && (
                  <p className="text-xs text-amber-600 mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                    ⚠️ {filteredStudents.filter(s => !getTelegramChatIds(s).contact).length} students don't have parent Telegram IDs and will be skipped
                  </p>
                )}
              </div>

              <form onSubmit={handleSendToAll}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Message</label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] resize-none bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    rows={4}
                  />
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{messageText.length} characters</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSendAllModalOpen(false);
                      setMessageText('');
                    }}
                    className="flex-1 px-4 py-2 border border-[var(--border)] text-[var(--foreground)] rounded-[var(--radius)] hover:bg-[var(--muted)] transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={messageLoading || !messageText.trim()}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-[var(--radius)] hover:bg-purple-700 disabled:bg-[var(--muted)] disabled:cursor-not-allowed transition-colors font-medium"
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
