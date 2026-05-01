const History = require('../models/historySchema');
const PH_TIME_OFFSET_MS = 8 * 60 * 60 * 1000; // Asia/Manila (UTC+8, no DST)

// Helper to parse boolean-like query params
function parseBool(val) {
  if (val === undefined) return undefined;
  return String(val).toLowerCase() === 'true';
}

/**
 * Parse date string to UTC boundaries for database queries
 * Converts date string (e.g., "2026-05-02") from Philippine time to UTC
 * @param {string} dateStr - Date in format "YYYY-MM-DD"
 * @param {string} boundaryType - "start" for midnight, "end" for 23:59:59
 * @returns {Date} UTC date for database query
 */
function parseDateStringToUTC(dateStr, boundaryType = "start") {
  if (!dateStr) return null;
  
  // Parse the date string: "2026-05-02" -> [2026, 5, 2]
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  
  // Create a date representing midnight in Philippine time
  if (boundaryType === "start") {
    // Start of day in PH time: 00:00:00
    const phDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    return new Date(phDate.getTime() - PH_TIME_OFFSET_MS);
  } else {
    // End of day in PH time: 23:59:59.999
    const phDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    return new Date(phDate.getTime() - PH_TIME_OFFSET_MS);
  }
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
      
      // ✅ FIX: Parse dates with Philippine timezone awareness
      if (startDate) {
        const parsedStart = parseDateStringToUTC(startDate, "start");
        if (parsedStart) {
          filter.scanTime.$gte = parsedStart;
        }
      }
      if (endDate) {
        const parsedEnd = parseDateStringToUTC(endDate, "end");
        if (parsedEnd) {
          filter.scanTime.$lte = parsedEnd;
        }
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
      
      // ✅ FIX: Parse dates with Philippine timezone awareness
      if (startDate) {
        const parsedStart = parseDateStringToUTC(startDate, "start");
        if (parsedStart) {
          match.scanTime.$gte = parsedStart;
        }
      }
      if (endDate) {
        const parsedEnd = parseDateStringToUTC(endDate, "end");
        if (parsedEnd) {
          match.scanTime.$lte = parsedEnd;
        }
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

