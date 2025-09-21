import { format } from 'date-fns';
import { AttendanceRecord } from '../../../services/historyService';

interface ExportDataProps {
  records: AttendanceRecord[];
  onExport: (format: 'csv') => Promise<void>;
}

export default function ExportData({ records, onExport }: ExportDataProps) {
  const handleExport = (format: 'csv') => {
    onExport(format);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleExport('csv')}
        className="inline-flex items-center px-4 py-2.5 bg-green-600 text-sm font-semibold text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export CSV
      </button>
    </div>
  );
}