interface StatusCounterProps {
  totalStudents: number;
  totalMale: number;
  totalFemale: number;
}

export default function StatusCounter({ totalStudents, totalMale, totalFemale }: StatusCounterProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="relative group bg-gradient-to-br from-white to-gray-50 rounded-lg shadow hover:shadow-md transition-all duration-300 p-5 border border-gray-200 outline outline-1 outline-gray-200 outline-offset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 transform group-hover:rotate-6 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Students</p>
          <div className="relative">
            <p className="text-3xl font-bold text-gray-800 group-hover:text-green-600 transition-colors duration-300">{totalStudents}</p>
          </div>
        </div>
      </div>
      <div className="relative group bg-gradient-to-br from-white to-gray-50 rounded-lg shadow hover:shadow-md transition-all duration-300 p-5 border border-gray-200 outline outline-1 outline-gray-200 outline-offset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 transform group-hover:rotate-6 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Male Students</p>
          <div className="relative">
            <p className="text-3xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">{totalMale}</p>
          </div>
        </div>
      </div>
      <div className="relative group bg-gradient-to-br from-white to-gray-50 rounded-lg shadow hover:shadow-md transition-all duration-300 p-5 border border-gray-200 outline outline-1 outline-gray-200 outline-offset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-pink-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-600 transform group-hover:rotate-6 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Female Students</p>
          <div className="relative">
            <p className="text-3xl font-bold text-gray-800 group-hover:text-pink-600 transition-colors duration-300">{totalFemale}</p>
          </div>
        </div>
      </div>
    </div>
  );
}