import {
  serializeProfile,
  RawUserProfile,
} from './profile-visibility.serializer';

describe('ProfileVisibilitySerializer - Field-Level Authorization Matrix', () => {
  const mockUser: RawUserProfile = {
    id: 42,
    username: 'alice_crypto',
    displayName: 'Alice Crypto',
    email: 'alice@example.com',
    avatarUrl: 'https://example.com/avatar.png',
    stellarWallet: 'GDNX...WALLET',
    reputationScore: 98,
    roles: ['user'],
    privacy_settings: { isDiscoverable: true, enableEmailDigests: true },
    twoFactorEnabled: true,
    createdAt: new Date('2026-01-01'),
    password: 'argon2$hashed_secret',
    resetToken: 'sensitive_token_123',
    encryptionKey: '0xdeadbeef',
  };

  it('Owner receives all private fields and settings, omitting raw secrets', () => {
    const serialized = serializeProfile(mockUser, { viewerId: 42 });

    expect(serialized.email).toBe('alice@example.com');
    expect(serialized.stellarWallet).toBe('GDNX...WALLET');
    expect(serialized.privacySettings).toBeDefined();
    expect(serialized.twoFactorEnabled).toBe(true);

    // Critical: credentials must never leak
    expect(serialized).not.toHaveProperty('password');
    expect(serialized).not.toHaveProperty('resetToken');
    expect(serialized).not.toHaveProperty('encryptionKey');
  });

  it('Moderator receives audit fields but NOT private user email or raw secrets', () => {
    const serialized = serializeProfile(mockUser, { viewerId: 999, viewerRole: 'moderator' });

    expect(serialized.id).toBe(42);
    expect(serialized.reputationScore).toBe(98);
    expect(serialized.stellarWallet).toBe('GDNX...WALLET');
    expect(serialized.roles).toEqual(['user']);

    expect(serialized).not.toHaveProperty('email');
    expect(serialized).not.toHaveProperty('password');
    expect(serialized).not.toHaveProperty('privacySettings');
  });

  it('Authenticated peer receives public fields only, omitting email, wallet, and settings', () => {
    const serialized = serializeProfile(mockUser, { viewerId: 88, viewerRole: 'user' });

    expect(serialized.id).toBe(42);
    expect(serialized.username).toBe('alice_crypto');
    expect(serialized.reputationScore).toBe(98);

    expect(serialized).not.toHaveProperty('email');
    expect(serialized).not.toHaveProperty('stellarWallet');
    expect(serialized).not.toHaveProperty('roles');
    expect(serialized).not.toHaveProperty('privacySettings');
  });

  it('Anonymous viewer cannot view reputation if user disabled isDiscoverable', () => {
    const privateUser: RawUserProfile = {
      ...mockUser,
      privacy_settings: { isDiscoverable: false },
    };

    const serialized = serializeProfile(privateUser, { viewerId: null });

    expect(serialized.id).toBe(42);
    expect(serialized.username).toBe('alice_crypto');
    expect(serialized.reputationScore).toBeUndefined();
    expect(serialized).not.toHaveProperty('email');
  });
});
