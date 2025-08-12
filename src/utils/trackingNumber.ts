/**
 * Utility functions for handling tracking numbers with organization prefixes
 */

/**
 * Generate organization initials from organization name
 * Examples:
 * - "Reus Logistics" -> "RL"
 * - "ABC Transport Company" -> "ATC"
 * - "Swift Delivery" -> "SD"
 * - "Global Shipping Solutions Ltd" -> "GSSL"
 */
export function generateOrgInitials(organizationName: string): string {
  if (!organizationName || organizationName.trim().length === 0) {
    throw new Error('Organization name is required to generate initials');
  }

  // Clean the organization name and split into words
  const words = organizationName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '') // Remove non-alphabetic characters except spaces
    .split(/\s+/) // Split by whitespace
    .filter(word => word.length > 0); // Remove empty strings

  if (words.length === 0) {
    throw new Error('Organization name must contain at least one alphabetic character');
  }

  // Generate initials
  let initials = '';
  
  if (words.length === 1) {
    // Single word: take first 2-3 characters
    const word = words[0];
    initials = word.length >= 3 ? word.substring(0, 3) : word;
  } else if (words.length === 2) {
    // Two words: take first letter of each
    initials = words[0][0] + words[1][0];
  } else {
    // Three or more words: take first letter of each, max 4 characters
    initials = words.map(word => word[0]).join('').substring(0, 4);
  }

  return initials;
}

/**
 * Generate a prefixed tracking number
 */
export function generateTrackingNumber(organizationName: string, userInput: string): string {
  const initials = generateOrgInitials(organizationName);
  const cleanInput = userInput.trim();
  
  if (!cleanInput) {
    throw new Error('Tracking number input is required');
  }

  return `${initials}-${cleanInput}`;
}

/**
 * Parse a prefixed tracking number back to its components
 */
export function parseTrackingNumber(fullTrackingNumber: string): {
  orgInitials: string;
  userInput: string;
} {
  const parts = fullTrackingNumber.split('-');
  
  if (parts.length < 2) {
    throw new Error('Invalid tracking number format. Expected format: ORG-NUMBER');
  }

  return {
    orgInitials: parts[0],
    userInput: parts.slice(1).join('-') // In case user input contains dashes
  };
}

/**
 * Check if a tracking number belongs to a specific organization
 */
export function isTrackingNumberForOrg(trackingNumber: string, organizationName: string): boolean {
  try {
    const expectedInitials = generateOrgInitials(organizationName);
    const { orgInitials } = parseTrackingNumber(trackingNumber);
    return orgInitials === expectedInitials;
  } catch {
    return false;
  }
}