const History = require('../models/historySchema');

// Helper to parse boolean-like query params
function parseBool(val) {
  if (val === undefined) return undefined;
  return String(val).toLowerCase() === 'true';
}

exports.getRecords = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      gradeLevel,
      section,
      subject,
      teacher,
      shift,
      status,
      studentId,
      page = 1,
      limit = 50,
      sortBy = 'scanTime',
      sortDir = 'desc'
    } = req.query;

    const filter = {};

    if (startDate || endDate) {
      filter.scanTime = {};
      if (startDate) filter.scanTime.$gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23,59,59,999);
        filter.scanTime.$lte = d;
      }
    }

    if (gradeLevel) filter.gradeLevel = gradeLevel;
    if (section) filter.section = section;
    if (subject) filter.subject = subject;
    if (shift) filter.shift = shift;
    if (status) filter.status = status;
    if (studentId) filter.studentId = studentId;
    // teacher is stored on schedule, but history may contain verifiedBy or notes; skip teacher filter for now

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(1000, parseInt(limit, 10) || 50);

    const sortOrder = sortDir === 'asc' ? 1 : -1;
    const sort = {};
    sort[sortBy] = sortOrder;

    const total = await History.countDocuments(filter);
    const records = await History.find(filter)
      .sort(sort)
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean()
      .exec();

    res.status(200).json({
      success: true,
      count: records.length,
      total,
      page: pageNum,
      limit: pageSize,
      records
    });
  } catch (error) {
    console.error('Error in getRecords:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch records' });
  }
};

exports.getOverview = async (req, res) => {
  try {
    const { startDate, endDate, gradeLevel, section, subject, shift } = req.query;

    const match = {};
    if (startDate || endDate) {
      match.scanTime = {};
      if (startDate) match.scanTime.$gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23,59,59,999);
        match.scanTime.$lte = d;
      }
    }
    if (gradeLevel) match.gradeLevel = gradeLevel;
    if (section) match.section = section;
    if (subject) match.subject = subject;
    if (shift) match.shift = shift;

    const aggregation = [
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ];

    const results = await History.aggregate(aggregation);
    const overview = {
      present: 0,
      absent: 0,
      late: 0,
      cutting: 0,
      out: 0,
      total: 0
    };

    results.forEach(r => {
      const key = (r._id || '').toString().toLowerCase();
      overview[key] = r.count;
      overview.total += r.count;
    });

    res.status(200).json({
      success: true,
      overview,
      raw: results
    });
  } catch (error) {
    console.error('Error in getOverview:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch overview' });
  }
};

