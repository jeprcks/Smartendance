'use client';

import { useState, useEffect } from 'react';
import AddStudentModal from './components/AddStudentModal';
import ViewStudentModal from './components/ViewStudentModal';
import PrintQRCodeModal from './components/PrintQRCodeModal';
import BulkPrintQRCodeModal from './components/BulkPrintQRCodeModal';
import BulkEditGradeModal, { type BulkEditUpdates } from './components/BulkEditGradeModal';
import EditStudentModal from './components/EditStudentModal';
import StudentScheduleModal from './components/StudentScheduleModal';
import AdvancedSearch, { SearchFilters } from '@/app/components/search/AdvancedSearch';
import BulkActions from '@/app/components/bulk/BulkActions';
import { API_BASE_URL } from '@/app/config/api';
import { studentService, Student } from '@/app/services/studentService';
import { exportStudentsToPDF } from './components/exportStudentsToPDF';
import toast from 'react-hot-toast';
import { Users, UserCircle, UserCircle2, UserCheck, UserX } from 'lucide-react';

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortGrade, setSortGrade] = useState('');
  const [sortSection, setSortSection] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isBulkPrintModalOpen, setIsBulkPrintModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [pendingBulkEditStudentIds, setPendingBulkEditStudentIds] = useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ query: '' });
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; filters: SearchFilters }>>([]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await studentService.getAllStudents();
      console.log('Fetched students:', data.length);
      data.forEach(student => {
        if (student.photo) {
          console.log(`Student ${student.studentId} photo:`, {
            hasPhoto: !!student.photo,
            startsWithData: student.photo.startsWith('data:image/'),
            length: student.photo.length,
            preview: student.photo.substring(0, 50) + '...'
          });
        }
      });
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
  }, []);

  const handleAddStudent = async (studentData: Partial<Student>) => {
    try {
      console.log('Attempting to add student with ID:', studentData.studentId);
      const newStudent = await studentService.addStudent(studentData);
      console.log('Student added successfully:', newStudent);
      setStudents(prevStudents => [...prevStudents, newStudent]);
      return newStudent; // Return the new student data
    } catch (error: any) {
      console.error('Error adding student:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add student';
      console.log('Error message:', errorMessage);
      // Let the modal component handle the error display
      throw new Error(errorMessage);
    }
  };

  const handleUpdateStudent = async (studentId: string, updatedData: Partial<Student>) => {
    try {
      // Find the student to get their MongoDB _id
      const student = students.find(s => s.studentId === studentId);
      if (!student || !student._id) {
        throw new Error('Student not found');
      }
      
      await studentService.updateStudent(student._id, updatedData);
      setStudents(prevStudents => 
        prevStudents.map(s => 
          s.studentId === studentId 
            ? { ...s, ...updatedData }
            : s
        )
      );
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  };

  // Loading skeleton UI
  const LoadingSkeleton = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 w-4 bg-gray-200 rounded"/>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-10 w-10 bg-gray-200 rounded-full"/>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-20"/>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-32"/>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-24"/>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-16"/>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-20"/>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-20"/>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-8 bg-gray-200 rounded w-24"/>
      </td>
    </tr>
  );

  const handleSearch = (filters: SearchFilters) => {
    setSearchFilters(filters);
    setSearchQuery(filters.query || '');
    // Set or clear grade filter
    setSortGrade(filters.gradeLevel || '');
    // Set or clear section filter
    setSortSection(filters.section || '');
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
    const allIds = new Set(sortedFilteredStudents.map(s => s.studentId));
    const allSelected = sortedFilteredStudents.length > 0 &&
      sortedFilteredStudents.every(s => selectedStudents.has(s.studentId));
    
    if (allSelected) {
      // Deselect all
      setSelectedStudents(new Set());
    } else {
      // Select all filtered students
      setSelectedStudents(allIds);
    }
  };

  const handleDeselectAll = () => {
    setSelectedStudents(new Set());
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      // Find students by studentId and get their _id
      const studentsToDelete = students.filter(s => ids.includes(s.studentId));
      const deletePromises = studentsToDelete.map(async (student) => {
        if (student._id) {
          const response = await fetch(`${API_BASE_URL}/api/students/${student._id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (!response.ok) {
            throw new Error(`Failed to delete ${student.studentId}`);
          }
          return response.json();
        }
        return Promise.resolve();
      });
      
      await Promise.all(deletePromises);
      setStudents(prev => prev.filter(s => !ids.includes(s.studentId)));
      setSelectedStudents(new Set());
      toast.success(`Successfully deleted ${ids.length} student(s)`);
      fetchStudents(); // Refresh the list
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete some students');
    }
  };

  const handleBulkExport = (ids: string[]) => {
    const selectedStudentsData = students.filter(s => ids.includes(s.studentId));
    if (selectedStudentsData.length === 0) {
      toast.error('No students selected');
      return;
    }
    // Export selected students to PDF
    const filename = selectedStudentsData.length === 1 
      ? `student_${selectedStudentsData[0].studentId}_export.pdf`
      : `selected_students_export_${new Date().toISOString().split('T')[0]}.pdf`;
    exportStudentsToPDF(selectedStudentsData, filename);
  };

  const handleBulkPrintQR = (ids: string[]) => {
    const selectedStudentsData = students.filter(s => ids.includes(s.studentId));
    if (selectedStudentsData.length === 0) {
      toast.error('No students selected');
      return;
    }
    setIsBulkPrintModalOpen(true);
  };

  const handleBulkEditGrade = (ids: string[]) => {
    setPendingBulkEditStudentIds(ids);
    setIsBulkEditModalOpen(true);
  };

  const handleBulkEditApply = async (updates: BulkEditUpdates) => {
    const studentsToUpdate = students.filter(s => pendingBulkEditStudentIds.includes(s.studentId));
    const mongoIds = studentsToUpdate.map(s => s._id).filter(Boolean) as string[];
    if (mongoIds.length === 0) {
      throw new Error('No valid students to update');
    }
    await studentService.bulkUpdateStudents(mongoIds, updates);
    setSelectedStudents(new Set());
    setPendingBulkEditStudentIds([]);
    await fetchStudents();
  };

  const filteredStudents = students.filter(student => {
    const query = (searchFilters.query || searchQuery).toLowerCase();
    const matchesSearch = !query || (
      student.fullName.toLowerCase().includes(query) ||
      student.studentId.toLowerCase().includes(query) ||
      student.gradeLevel.toLowerCase().includes(query) ||
      student.section.toLowerCase().includes(query) ||
      (student.shift?.toLowerCase() || '').includes(query)
    );
    
    const gradeFilter = searchFilters.gradeLevel || sortGrade;
    const sectionFilter = searchFilters.section || sortSection;
    const statusFilter = searchFilters.status;
    
    const matchesGrade = !gradeFilter || student.gradeLevel === gradeFilter;
    const matchesSection = !sectionFilter || student.section === sectionFilter;
    const matchesStatus = !statusFilter || (student.status ?? 'Active') === statusFilter;
    
    return matchesSearch && matchesGrade && matchesSection && matchesStatus;
  });

  // Graduated students always appear at the bottom of the table
  const sortedFilteredStudents = [...filteredStudents].sort((a, b) => {
    const aGraduated = (a.status ?? 'Active') === 'Graduated' ? 1 : 0;
    const bGraduated = (b.status ?? 'Active') === 'Graduated' ? 1 : 0;
    return aGraduated - bGraduated;
  });

  const quickFilterOptions = [
    { label: 'All Students', value: 'all', filters: { query: '', gradeLevel: '', section: '', status: '' } },
    { label: 'Active', value: 'active', filters: { query: '', gradeLevel: '', section: '', status: 'Active' } },
    { label: 'Inactive', value: 'inactive', filters: { query: '', gradeLevel: '', section: '', status: 'Inactive' } },
    { label: 'Graduated', value: 'graduated', filters: { query: '', gradeLevel: '', section: '', status: 'Graduated' } },
    { label: 'Grade 1', value: 'grade1', filters: { query: '', gradeLevel: 'Grade 1', section: '', status: '' } },
    { label: 'Grade 2', value: 'grade2', filters: { query: '', gradeLevel: 'Grade 2', section: '', status: '' } },
    { label: 'Grade 3', value: 'grade3', filters: { query: '', gradeLevel: 'Grade 3', section: '', status: '' } },
    { label: 'Grade 4', value: 'grade4', filters: { query: '', gradeLevel: 'Grade 4', section: '', status: '' } },
    { label: 'Grade 5', value: 'grade5', filters: { query: '', gradeLevel: 'Grade 5', section: '', status: '' } },
    { label: 'Grade 6', value: 'grade6', filters: { query: '', gradeLevel: 'Grade 6', section: '', status: '' } },
  ];

  // Get unique grades and sections for filter dropdowns
  const uniqueGrades = Array.from(new Set(students.map(s => s.gradeLevel))).sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    return numA - numB;
  });

  const uniqueSections = Array.from(new Set(students.map(s => s.section))).sort();

  const totalMale = students.filter(student => student.gender === 'Male').length;
  const totalFemale = students.filter(student => student.gender === 'Female').length;
  const totalActive = students.filter(student => (student.status ?? 'Active') === 'Active').length;
  const totalInactive = students.filter(student => student.status === 'Inactive').length;
  const totalGraduated = students.filter(student => student.status === 'Graduated').length;

  const studentStatCards = [
    { title: 'Total Students', value: students.length, icon: Users, color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
    { title: 'Active', value: totalActive, icon: UserCheck, color: 'bg-emerald-500', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' },
    { title: 'Inactive', value: totalInactive, icon: UserX, color: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
    { title: 'Graduated', value: totalGraduated, icon: Users, color: 'bg-indigo-500', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700' },
    { title: 'Male', value: totalMale, icon: UserCircle, color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
    { title: 'Female', value: totalFemale, icon: UserCircle2, color: 'bg-pink-500', bgColor: 'bg-pink-50', textColor: 'text-pink-700' },
  ];

  return (
    <div className="page-container">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-header-content">
            <h1>Students</h1>
            <p>Manage student records and enrollment</p>
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
              Add Student
            </button>
          </div>
        </div>
      </header>

      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddStudent}
      />

      {/* Stats cards – same style as dashboard */}
      <div className="dashboard-grid mb-8">
        {studentStatCards.map((stat, index) => {
          const IconComponent = stat.icon;
          const maxVal = Math.max(students.length, 1);
          const numericValue = stat.value;
          const barHeight = `${(numericValue / maxVal) * 100}%`;
          return (
            <div
              key={stat.title}
              className="stat-card"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 ${stat.bgColor} rounded-lg`}>
                  <IconComponent className={stat.textColor} size={24} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">{stat.title}</p>
                  <p className={`text-3xl font-bold ${stat.textColor}`}>
                    {stat.value.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${stat.color} h-2 rounded-full transition-all duration-500`}
                  style={{ width: barHeight }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[var(--surface)] rounded-xl shadow-md border-2 border-transparent hover:border-[var(--primary)] transition-colors duration-200 backdrop-blur-sm">
        <div className="p-6">
          {/* Advanced Search */}
          <AdvancedSearch
            onSearch={handleSearch}
            onSaveFilter={handleSaveFilter}
            savedFilters={savedFilters}
            onLoadFilter={handleLoadFilter}
            placeholder="Search by name, ID, grade, section..."
            showQuickFilters={true}
            quickFilterOptions={quickFilterOptions}
          />

          {/* Bulk Actions */}
          <BulkActions
            items={sortedFilteredStudents}
            selectedItems={selectedStudents}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBulkEditGrade={handleBulkEditGrade}
            onBulkExport={handleBulkExport}
            onBulkPrintQR={handleBulkPrintQR}
            getId={(student) => student.studentId}
            getLabel={(student) => student.fullName}
          />

          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--muted)]/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={selectedStudents.size === sortedFilteredStudents.length && sortedFilteredStudents.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Profile</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Full Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Grade Level</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Section</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Gender</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Shift</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
                {loading ? (
                  // Show loading skeletons
                  [...Array(5)].map((_, index) => <LoadingSkeleton key={index} />)
                ) : sortedFilteredStudents.length === 0 ? (
                  // Show empty state
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-[var(--muted-foreground)]">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p>No students found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Show student data
                  sortedFilteredStudents.map((student) => {
                    const isSelected = selectedStudents.has(student.studentId);
                    return (
                  <tr key={student.studentId} className={`hover:bg-[var(--secondary)] hover:shadow-[inset_4px_0_0_0_var(--primary)] transition-all duration-200 ${isSelected ? 'bg-[var(--secondary)]' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newSelected = new Set(selectedStudents);
                          if (e.target.checked) {
                            newSelected.add(student.studentId);
                          } else {
                            newSelected.delete(student.studentId);
                          }
                          setSelectedStudents(newSelected);
                        }}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {student.photo && student.photo.startsWith('data:image/') && !imageErrors.has(student.studentId) ? (
                          <img
                            src={student.photo}
                            alt={`${student.fullName}'s profile`}
                            className="h-10 w-10 rounded-full object-cover border-2 border-green-500"
                            onError={(e) => {
                              console.error('Image failed to load for student:', student.studentId);
                              setImageErrors(prev => new Set(prev).add(student.studentId));
                            }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 border-2 border-green-500 flex items-center justify-center">
                            <span className="text-sm font-bold text-[var(--foreground)]">
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
                      <span className="text-sm font-medium text-[var(--foreground)]">{student.fullName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${(student.status ?? '') === 'Graduated' ? 'text-indigo-700 font-medium' : 'text-[var(--foreground)]'}`}>
                        {(student.status ?? '') === 'Graduated' ? 'N/A' : student.gradeLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${(student.status ?? '') === 'Graduated' ? 'text-indigo-700 font-medium' : 'text-[var(--foreground)]'}`}>
                        {(student.status ?? '') === 'Graduated' ? 'N/A' : student.section}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ring-1 ${
                        (student.status ?? '') === 'Graduated'
                          ? 'bg-indigo-50 text-indigo-700 ring-indigo-200/50'
                          : student.gender === 'Male'
                            ? 'bg-blue-50 text-blue-700 ring-blue-200/50'
                            : 'bg-pink-50 text-pink-700 ring-pink-200/50'
                      } transition-colors duration-200`}>
                        {(student.status ?? '') === 'Graduated' ? 'N/A' : student.gender}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ring-1 ${
                        (student.status ?? '') === 'Graduated'
                          ? 'bg-indigo-50 text-indigo-700 ring-indigo-200/50'
                          : 'bg-green-50 text-green-700 ring-green-200/50'
                      } transition-colors duration-200`}>
                        {(student.status ?? '') === 'Graduated' ? 'N/A' : (student.shift || 'N/A')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ring-1 w-fit ${
                          (student.status ?? 'Active') === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/50'
                            : (student.status ?? '') === 'Graduated'
                              ? 'bg-indigo-50 text-indigo-700 ring-indigo-200/50'
                              : 'bg-amber-50 text-amber-700 ring-amber-200/50'
                        } transition-colors duration-200`}>
                          {student.status ?? 'Active'}
                        </span>
                        {(student.status ?? '') === 'Graduated' && (student.graduationSchoolYear || student.graduationDate) && (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            SY {student.graduationSchoolYear
                              ? student.graduationSchoolYear
                              : (() => {
                                  const year = typeof student.graduationDate === 'string'
                                    ? parseInt(student.graduationDate.slice(0, 4), 10)
                                    : new Date(student.graduationDate!).getFullYear();
                                  return `${year - 1}-${year}`;
                                })()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button 
                          className="inline-flex items-center px-3 py-2 bg-green-50 text-green-600 text-sm font-medium rounded-lg hover:bg-green-100 hover:text-green-700 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60 dark:hover:text-green-200 transition-all duration-200 shadow-sm hover:shadow-md"
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsViewModalOpen(true);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          View
                        </button>
                        <button 
                          className="inline-flex items-center px-3 py-2 bg-yellow-50 text-yellow-600 text-sm font-medium rounded-lg hover:bg-yellow-100 hover:text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 dark:hover:bg-yellow-900/60 dark:hover:text-yellow-200 transition-all duration-200 shadow-sm hover:shadow-md"
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                          </svg>
                          Edit
                        </button>
                        <button 
                          className="inline-flex items-center px-3 py-2 bg-green-50 text-green-600 text-sm font-medium rounded-lg hover:bg-green-100 hover:text-green-700 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60 dark:hover:text-green-200 transition-all duration-200 shadow-sm hover:shadow-md"
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsPrintModalOpen(true);
                          }}
                          title="Print QR Code"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                          </svg>
                          Print
                        </button>
                        <button 
                          className="inline-flex items-center px-3 py-2 bg-purple-50 text-purple-600 text-sm font-medium rounded-lg hover:bg-purple-100 hover:text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-900/60 dark:hover:text-purple-200 transition-all duration-200 shadow-sm hover:shadow-md"
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsScheduleModalOpen(true);
                          }}
                          title="View/Manage Schedule"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          Schedule
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

      <ViewStudentModal 
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />

      <PrintQRCodeModal 
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />

      <BulkPrintQRCodeModal
        isOpen={isBulkPrintModalOpen}
        onClose={() => setIsBulkPrintModalOpen(false)}
        students={students.filter(s => selectedStudents.has(s.studentId))}
      />

      <BulkEditGradeModal
        isOpen={isBulkEditModalOpen}
        onClose={() => {
          setIsBulkEditModalOpen(false);
          setPendingBulkEditStudentIds([]);
        }}
        count={pendingBulkEditStudentIds.length}
        onApply={handleBulkEditApply}
      />

      <EditStudentModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStudent(null);
        }}
        onUpdate={handleUpdateStudent}
        student={selectedStudent}
      />

      <StudentScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />
    </div>
  );
}
