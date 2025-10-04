import { Link } from 'react-router';
import { getTierName, type Tier } from '~/lib/permissions';

export interface LockedFeatureProps {
  feature: string;
  requiredTier: Tier;
  previewImageSrc?: string;
  upgradeHref?: string;
  upgradeTriggerFeature?: string;
  title?: string;
  description?: string;
}

/**
 * LockedFeature
 *
 * Displays an upgrade call-to-action for content gated behind a higher tier.
 */
export function LockedFeature({
  feature,
  requiredTier,
  previewImageSrc,
  upgradeHref,
  upgradeTriggerFeature,
  title,
  description,
}: LockedFeatureProps) {
  const tierName = getTierName(requiredTier);
  const encodedFeature = encodeURIComponent(upgradeTriggerFeature ?? feature);
  const upgradeUrl = upgradeHref ?? `/pricing?upgrade=${encodedFeature}`;
  const featureSlug = feature.includes(':') ? feature.split(':')[1] ?? feature : feature;
  const featureLabel = featureSlug
    .split(/[-_]/)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

  return (
    <div className="rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/60 p-8 text-center shadow-sm">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow">
        <svg className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 11c0-1.105-.895-2-2-2s-2 .895-2 2a2 2 0 104 0zm0 0v1m0 4h.01"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-900">
        {title ?? 'Unlock this feature'}
      </h2>
      <p className="mt-3 text-sm text-gray-600">
        {description ?? `Upgrade to the ${tierName} plan to access this feature.`}
      </p>

      {previewImageSrc && (
        <img
          src={previewImageSrc}
          alt={`${feature} preview`}
          className="mx-auto mt-6 w-full max-w-xl rounded-xl border border-indigo-100 shadow-sm"
        />
      )}

      <div className="mt-8">
        <Link
          to={upgradeUrl}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Upgrade to {tierName}
        </Link>
        <p className="mt-3 text-xs uppercase tracking-wide text-indigo-700">
          Feature: {featureLabel}
        </p>
      </div>
    </div>
  );
}
