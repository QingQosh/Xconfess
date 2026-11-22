export const CANONICAL_PRIVATE_FIELDS = [
  'password',
  'salt',
  'encryptionKey',
  'aesKey',
  'resetToken',
  'twoFactorSecret',
  'otpSecret',
  'jwtToken',
  'accessToken',
  'refreshToken',
  'authSecret',
  'apiKey',
  'privateKey',
  'internalIp',
  'rawSecret',
];

export function findLeakedPrivateKeys(
  target: any,
  forbiddenKeys: string[] = CANONICAL_PRIVATE_FIELDS,
  currentPath = '',
): string[] {
  if (target === null || target === undefined) return [];
  if (typeof target !== 'object') return [];

  const leaks: string[] = [];
  const normalizedForbidden = new Set(forbiddenKeys.map((k) => k.toLowerCase()));

  if (Array.isArray(target)) {
    target.forEach((item, index) => {
      leaks.push(...findLeakedPrivateKeys(item, forbiddenKeys, `${currentPath}[${index}]`));
    });
    return leaks;
  }

  for (const [key, value] of Object.entries(target)) {
    const fullPath = currentPath ? `${currentPath}.${key}` : key;
    if (normalizedForbidden.has(key.toLowerCase()) && value !== undefined && value !== null) {
      leaks.push(fullPath);
    }
    if (value && typeof value === 'object') {
      leaks.push(...findLeakedPrivateKeys(value, forbiddenKeys, fullPath));
    }
  }

  return leaks;
}

export function assertNoPrivateFieldsLeaked(
  responsePayload: any,
  additionalForbiddenKeys: string[] = [],
): void {
  const allForbidden = [...CANONICAL_PRIVATE_FIELDS, ...additionalForbiddenKeys];
  const leaks = findLeakedPrivateKeys(responsePayload, allForbidden);

  if (leaks.length > 0) {
    throw new Error(
      `SECURITY VIOLATION: Private field(s) leaked in API response: ${leaks.join(', ')}`,
    );
  }
}
