import { v4 as uuidv4 } from 'uuid';

// Counter for uniqueness - increments for each ID generated in the same millisecond
let idCounter = 0;
let lastTimestamp = 0;

/**
 * Generates a unique Shipora ID with format: SHP + 12 numeric digits
 * Format: SHP000000000000
 *
 * Ensures uniqueness through:
 * 1. Timestamp component (10 digits from milliseconds, covers ~300+ years)
 * 2. Counter component (2 digits, handles up to 99 IDs per millisecond)
 *
 * @returns Unique Shipora ID (e.g., "SHP743951627408")
 */
const generateShiporaId = (): string => {
  const timestamp = Date.now();

  // Reset counter on new millisecond
  if (timestamp !== lastTimestamp) {
    idCounter = 0;
    lastTimestamp = timestamp;
  }

  // Increment counter for uniqueness in same millisecond
  idCounter += 1;

  // Get last 10 digits of timestamp (0-9999999999)
  const timestampDigits = (timestamp % 10000000000)
    .toString()
    .padStart(10, '0');

  // Get last 2 digits of counter (0-99, cycles back after 99)
  const counterDigits = (idCounter % 100).toString().padStart(2, '0');

  // Combine: 10 timestamp digits + 2 counter digits = 12 digits total
  const uniqueNumber = timestampDigits + counterDigits;

  return `SHP${uniqueNumber}`;
};

const getVolumen = (volumetric: number, weight: number): number => {
  return volumetric > weight ? volumetric : weight;
};

const getPMMVolumentric = (
  width: number,
  height: number,
  long: number,
): number => {
  return (width * height * long) / 4000;
};

const getLimitGuide = (volumetric: number): number => {
  if (volumetric <= 5) {
    return 5;
  }
  if (volumetric > 5 && volumetric <= 15) {
    return 15;
  }
  if (volumetric > 15 && volumetric <= 35) {
    return 35;
  }
  if (volumetric > 35 && volumetric <= 60) {
    return 60;
  }
  if (volumetric > 60 && volumetric <= 90) {
    return 90;
  }
  if (volumetric > 90 && volumetric <= 150) {
    return 150;
  }
  if (volumetric > 150 && volumetric <= 220) {
    return 220;
  }
  if (volumetric > 220 && volumetric <= 350) {
    return 350;
  }
  return 0;
};

const getPqExpressGuideCredentials = (): {
  user: string;
  password: string;
  passwordQuotation: string;
  client: string;
  token: string;
} => {
  return {
    user: process.env.PQX_QUOTATION_USER as string,
    password: process.env.PQX_QUOTATION_TOKEN_PASSWORD as string,
    passwordQuotation: process.env.PQX_QUOTATION_PASSWORD as string,
    client: process.env.PQX_QUOTATION_CLIENT as string,
    token: process.env.PQX_QUOTATION_TOKEN as string,
  };
};

const getRandomUUIDPart = (): string => {
  return uuidv4().split('-')[0];
};

const getGuideReference = (reference: string, limit: number): string => {
  return reference.length > limit ? reference.substring(0, limit) : reference;
};

export default {
  generateShiporaId,
  getRandomUUIDPart,
  getVolumen,
  getPMMVolumentric,
  getLimitGuide,
  getPqExpressGuideCredentials,
  getGuideReference,
};
