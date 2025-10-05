import type { ReactNode } from 'react';
import { LockedFeature } from './LockedFeature';
import { hasRole, hasTierAccess, ROLES, TIERS, type Role, type Tier } from '~/lib/permissions';

export interface FeatureGateProps {
  feature: string;
  requiredTier: Tier;
  children: ReactNode;
  currentTier?: string | null;
  currentRole?: string | null;
  allowedRoles?: Role[];
  previewImageSrc?: string;
  upgradeHref?: string;
  upgradeTriggerFeature?: string;
  title?: string;
  description?: string;
  fallback?: ReactNode;
}

/**
 * FeatureGate
 *
 * Wraps gated content and renders a locked state when the user does not
 * meet the required tier or role requirements.
 */
export function FeatureGate({
  feature,
  requiredTier,
  currentTier,
  currentRole,
  allowedRoles,
  previewImageSrc,
  upgradeHref,
  upgradeTriggerFeature,
  title,
  description,
  fallback,
  children,
}: FeatureGateProps) {
  const normalizedTier = (currentTier as Tier | undefined) ?? TIERS.FREE;
  const normalizedRole = (currentRole as Role | undefined) ?? ROLES.TEAM_MEMBER;

  const meetsRole = allowedRoles ? hasRole(normalizedRole, allowedRoles) : true;
  const meetsTier = hasTierAccess(normalizedTier, requiredTier);

  if (meetsRole && meetsTier) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <LockedFeature
      feature={feature}
      requiredTier={requiredTier}
      previewImageSrc={previewImageSrc}
      upgradeHref={upgradeHref}
      upgradeTriggerFeature={upgradeTriggerFeature ?? feature}
      title={title}
      description={description}
    />
  );
}
