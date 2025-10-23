// src/app/modules/Order/order.utils.ts

/**
 * Generates a unique tracking number.
 * e.g., BEL-1678886400-ABCD
 */
export const generateTrackingNumber = (): string => {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString()
    .slice(-8); // Last 8 digits of timestamp
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random chars
  return `BEL-${timestamp}-${randomChars}`;
};
