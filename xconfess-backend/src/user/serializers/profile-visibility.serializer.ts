export enum ProfileVisibilityRole {
  OWNER = 'OWNER',
  MODERATOR = 'MODERATOR',
  AUTHENTICATED_PEER = 'AUTHENTICATED_PEER',
  ANONYMOUS = 'ANONYMOUS',
}

export interface ViewerContext {
  viewerId?: number | string | null;
  viewerRole?: string | null;
}

export interface RawUserProfile {
  id: number | string;
  username?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  stellarWallet?: string;
  reputationScore?: number;
  roles?: string[];
  privacy_settings?: Record<string, any>;
  twoFactorEnabled?: boolean;
  createdAt?: Date | string;
  password?: string;
  resetToken?: string;
  encryptionKey?: string;
}

export function determineViewerRole(
  profileOwnerId: number | string,
  viewer: ViewerContext,
): ProfileVisibilityRole {
  if (!viewer || viewer.viewerId === null || viewer.viewerId === undefined) {
    return ProfileVisibilityRole.ANONYMOUS;
  }

  if (String(viewer.viewerId) === String(profileOwnerId)) {
    return ProfileVisibilityRole.OWNER;
  }

  const role = String(viewer.viewerRole || '').toLowerCase();
  if (role === 'admin' || role === 'moderator') {
    return ProfileVisibilityRole.MODERATOR;
  }

  return ProfileVisibilityRole.AUTHENTICATED_PEER;
}

export function serializeProfile(
  profile: RawUserProfile,
  viewer: ViewerContext,
): Record<string, any> {
  const role = determineViewerRole(profile.id, viewer);
  const privacy = profile.privacy_settings || {};
  const isDiscoverable = privacy.isDiscoverable !== false;

  const base: Record<string, any> = {
    id: profile.id,
    username: profile.username || `user-${profile.id}`,
    displayName: profile.displayName || profile.username,
    avatarUrl: profile.avatarUrl,
  };

  switch (role) {
    case ProfileVisibilityRole.OWNER:
      return {
        ...base,
        email: profile.email,
        stellarWallet: profile.stellarWallet,
        reputationScore: profile.reputationScore ?? 0,
        roles: profile.roles || ['user'],
        privacySettings: profile.privacy_settings || {},
        twoFactorEnabled: Boolean(profile.twoFactorEnabled),
        createdAt: profile.createdAt,
      };

    case ProfileVisibilityRole.MODERATOR:
      return {
        ...base,
        roles: profile.roles || ['user'],
        reputationScore: profile.reputationScore ?? 0,
        createdAt: profile.createdAt,
        stellarWallet: profile.stellarWallet, // Auditable for AML/compliance
      };

    case ProfileVisibilityRole.AUTHENTICATED_PEER:
      return {
        ...base,
        reputationScore: isDiscoverable ? profile.reputationScore ?? 0 : undefined,
      };

    case ProfileVisibilityRole.ANONYMOUS:
    default:
      return {
        ...base,
        reputationScore: isDiscoverable ? profile.reputationScore ?? 0 : undefined,
      };
  }
}
