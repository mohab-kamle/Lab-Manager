/**
 * Formats a date string or Date object to DD/MM/YYYY format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string or "-" if invalid
 */
export const formatDate = (date) => {
  if (!date) return "-";

  // Handle invalid date format "0000-00-00"
  if (date === "0000-00-00" || date === "0000-00-00 00:00:00") return "-";

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "-";

    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
};

/**
 * Formats a date for HTML date input (YYYY-MM-DD format)
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string or empty string if invalid
 */
export const formatDateForInput = (date) => {
  if (!date) return "";

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "";

    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.error("Error formatting date for input:", error);
    return "";
  }
}; 