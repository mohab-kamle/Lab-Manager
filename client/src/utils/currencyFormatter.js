/**
 * Formats a number as a currency string.
 * @param {number|string} amount - The amount to format.
 * @param {string} currency - The currency code (default: 'EGP').
 * @param {string} locale - The locale to use for formatting (default: 'en-EG').
 * @returns {string} The formatted currency string.
 */
export const formatCurrency = (amount, currency = 'EGP', locale = 'en-EG') => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(value)) {
    return `- ${currency}`;
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'symbol',
  }).format(value);
};
