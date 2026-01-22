'use client';

export default function DashboardPage() {
  const stats = [
    { title: 'Total Students', value: 1234, icon: '👥' },
    { title: 'Present Today', value: 1180, icon: '✅' },
    { title: 'Absent Today', value: 54, icon: '❌' },
    { title: 'Total Classes', value: 32, icon: '📚' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of school attendance statistics</p>
      </div>

      {/* Bar Chart Section */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200/80 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">School Statistics</h2>
        <div className="overflow-x-auto">
          <div style={{ minWidth: '600px', height: '400px' }} className="flex items-end justify-around gap-6 p-4">
            {stats.map((stat, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                {/* Bar */}
                <div className="flex flex-col items-center w-full">
                  <div className="flex items-end justify-center h-80 mb-4">
                    <div
                      style={{
                        height: `${(stat.value / 1234) * 100}%`,
                        width: '60px',
                      }}
                      className={`rounded-t-lg transition-all duration-300 hover:opacity-80 cursor-pointer ${
                        index === 0
                          ? 'bg-blue-500'
                          : index === 1
                          ? 'bg-green-500'
                          : index === 2
                          ? 'bg-red-500'
                          : 'bg-purple-500'
                      }`}
                      title={`${stat.title}: ${stat.value}`}
                    />
                  </div>
                  {/* Label */}
                  <div className="text-center">
                    <div className="text-2xl mb-2">{stat.icon}</div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="content-section">
        <h2 className="text-xl font-semibold mb-4 text-primary-dark">Recent Activity</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Student</th>
                <th>Class</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>09:00 AM</td>
                <td>John Doe</td>
                <td>Mathematics</td>
                <td><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-semibold">IN</span></td>
                <td>-</td>
                <td><span className="text-green-600">Present</span></td>
              </tr>
              <tr>
                <td>04:45 PM</td>
                <td>John Doe</td>
                <td>Mathematics</td>
                <td><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-semibold">OUT</span></td>
                <td>480 min</td>
                <td><span className="text-green-600">Present</span></td>
              </tr>
              <tr>
                <td>08:45 AM</td>
                <td>Jane Smith</td>
                <td>Physics</td>
                <td><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-semibold">IN</span></td>
                <td>-</td>
                <td><span className="text-yellow-600">Late</span></td>
              </tr>
              {/* Add more rows as needed */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
