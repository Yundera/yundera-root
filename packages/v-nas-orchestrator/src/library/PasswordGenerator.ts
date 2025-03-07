/**
 * Generates a random password with configurable options
 * @param length Length of the password (default: 12)
 * @param includeUppercase Include uppercase letters (default: true)
 * @param includeLowercase Include lowercase letters (default: true)
 * @param includeNumbers Include numbers (default: true)
 * @param includeSpecial Include special characters (default: true)
 * @returns A randomly generated password string
 */
export function generateRandomPassword(
  length: number = 12,
  includeUppercase: boolean = true,
  includeLowercase: boolean = true,
  includeNumbers: boolean = true,
  includeSpecial: boolean = true
): string {
  // Character sets
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*()-_=+[]{};:,.<>/?';

  // Combine selected character sets
  let chars = '';
  if (includeUppercase) chars += uppercaseChars;
  if (includeLowercase) chars += lowercaseChars;
  if (includeNumbers) chars += numberChars;
  if (includeSpecial) chars += specialChars;

  // Ensure at least one character set is selected
  if (chars.length === 0) {
    throw new Error('At least one character set must be included in the password');
  }

  // Generate password
  let password = '';
  const randomArray = new Uint32Array(length);

  // Use crypto.getRandomValues for cryptographically secure random numbers if available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomArray);

    for (let i = 0; i < length; i++) {
      password += chars.charAt(randomArray[i] % chars.length);
    }
  } else {
    // Fallback to Math.random (less secure)
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      password += chars.charAt(randomIndex);
    }
  }

  return password;
}

// Example usage
// const password = generateRandomPassword(); // Default 12-character password with all character types
// const customPassword = generateRandomPassword(16, true, true, true, false); // 16-character password without special chars