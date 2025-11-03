/**
 * Fuzzy matching utilities for contact deduplication
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity percentage between two strings (0-100)
 */
function stringSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  if (longer.length === 0) return 100;
  
  const distance = levenshteinDistance(longer, shorter);
  return ((longer.length - distance) / longer.length) * 100;
}

/**
 * Normalize string for comparison
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Check if two phone numbers match (handles formatting differences)
 */
export function phoneNumbersMatch(phone1?: string | null, phone2?: string | null): boolean {
  if (!phone1 || !phone2) return false;
  
  const cleaned1 = phone1.replace(/\D/g, '');
  const cleaned2 = phone2.replace(/\D/g, '');
  
  // Compare last 10 digits (for US numbers)
  const last10_1 = cleaned1.slice(-10);
  const last10_2 = cleaned2.slice(-10);
  
  return last10_1 === last10_2 && last10_1.length === 10;
}

/**
 * Check if two emails match
 */
export function emailsMatch(email1?: string | null, email2?: string | null): boolean {
  if (!email1 || !email2) return false;
  return email1.toLowerCase().trim() === email2.toLowerCase().trim();
}

/**
 * Check if two names are similar enough to be considered duplicates
 */
export function namesAreSimilar(name1?: string | null, name2?: string | null, threshold = 80): boolean {
  if (!name1 || !name2) return false;
  
  const normalized1 = normalize(name1);
  const normalized2 = normalize(name2);
  
  if (normalized1 === normalized2) return true;
  
  const similarity = stringSimilarity(normalized1, normalized2);
  return similarity >= threshold;
}

/**
 * Find potential duplicate contacts
 */
export interface ContactMatch {
  contact: any;
  matchScore: number;
  matchReasons: string[];
}

export function findPotentialDuplicates(
  newContact: { name?: string | null; phone?: string | null; email?: string | null },
  existingContacts: any[]
): ContactMatch[] {
  const matches: ContactMatch[] = [];

  for (const contact of existingContacts) {
    let matchScore = 0;
    const matchReasons: string[] = [];

    // Exact phone match = high confidence
    if (phoneNumbersMatch(newContact.phone, contact.phone)) {
      matchScore += 50;
      matchReasons.push('Phone number match');
    }

    if (phoneNumbersMatch(newContact.phone, contact.whatsapp)) {
      matchScore += 40;
      matchReasons.push('Phone matches WhatsApp');
    }

    // Exact email match = high confidence
    if (emailsMatch(newContact.email, contact.email)) {
      matchScore += 50;
      matchReasons.push('Email match');
    }

    // Similar name = moderate confidence
    if (namesAreSimilar(newContact.name, contact.name, 85)) {
      matchScore += 30;
      matchReasons.push('Similar name');
    }

    // If we have at least some match, add to results
    if (matchScore >= 50) {
      matches.push({
        contact,
        matchScore,
        matchReasons,
      });
    }
  }

  // Sort by match score (highest first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Auto-merge two contacts
 */
export function mergeContactData(primary: any, duplicate: any): any {
  return {
    name: primary.name || duplicate.name,
    phone: primary.phone || duplicate.phone,
    whatsapp: primary.whatsapp || duplicate.whatsapp,
    email: primary.email || duplicate.email,
    socialHandles: {
      ...(duplicate.socialHandles || {}),
      ...(primary.socialHandles || {}),
    },
    tags: [...new Set([...(primary.tags || []), ...(duplicate.tags || [])])],
  };
}
