import {
  assertNoPrivateFieldsLeaked,
  findLeakedPrivateKeys,
} from '../../src/common/security/redaction-assertions';

describe('API Response Redaction Assertions (Issue #400)', () => {
  it('passes on clean public list and detail responses', () => {
    const cleanPublicConfession = {
      id: 'confession-uuid-1',
      message: 'Hello world',
      viewCount: 42,
      createdAt: '2026-11-20T10:00:00Z',
      reactions: [{ id: 'r1', emoji: '❤️' }],
    };

    expect(() => assertNoPrivateFieldsLeaked(cleanPublicConfession)).not.toThrow();
  });

  it('fails deterministically when password, salt or encryption keys leak in payload', () => {
    const leakedPayload = {
      id: 'user-1',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'argon2id$hashedpassword',
    };

    expect(() => assertNoPrivateFieldsLeaked(leakedPayload)).toThrow(
      /SECURITY VIOLATION.*password/,
    );
  });

  it('detects nested private secrets inside error details and cross-account entities', () => {
    const errorWithLeakedSecret = {
      statusCode: 500,
      message: 'Database connection failed',
      details: {
        connection: {
          internalIp: '10.0.0.4',
          authSecret: 'super-secret-db-pass',
        },
      },
    };

    const leaks = findLeakedPrivateKeys(errorWithLeakedSecret);
    expect(leaks).toContain('details.connection.internalIp');
    expect(leaks).toContain('details.connection.authSecret');
  });

  it('verifies arrays of items in list responses recursively', () => {
    const listResponse = [
      { id: '1', title: 'Clean Item' },
      { id: '2', title: 'Compromised Item', twoFactorSecret: 'BASE32SECRET' },
    ];

    expect(() => assertNoPrivateFieldsLeaked(listResponse)).toThrow(
      /SECURITY VIOLATION.*twoFactorSecret/,
    );
  });
});
