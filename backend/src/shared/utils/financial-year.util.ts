export const calculateFY = (date: string | Date = new Date()): string => {
  const current = new Date(date);
  const year = current.getFullYear();
  const month = current.getMonth(); // 0-indexed (0 = Jan, 3 = Apr)

  if (month >= 3) {
    // April to December
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    // January to March
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
};

export const getFYDateRange = (fy: string): { start: Date; end: Date } => {
  // fy format: "2023-24" or "23-24"
  let startYearStr = fy.split('-')[0];
  if (startYearStr.length === 2) {
    startYearStr = `20${startYearStr}`;
  }
  const startYear = parseInt(startYearStr, 10);

  return {
    start: new Date(Date.UTC(startYear, 3, 1, 0, 0, 0)), // April 1st
    end: new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999)) // March 31st end of next year
  };
};
