'use strict';

/**
 * Async handler wrapper to prevent try/catch blocks in every controller
 * @param {Function} fn - The asynchronous function to wrap
 * @returns {Function} - The wrapped middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
