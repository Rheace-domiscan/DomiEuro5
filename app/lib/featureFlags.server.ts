const DEFAULT_FLAGS = {
  usageAnalytics: false,
  integrationsHub: false,
  experimentalThemes: false,
  demoMode: false,
  onboardingWizard: false,
  apiKeys: false,
} as const;

type FeatureFlag = keyof typeof DEFAULT_FLAGS;

type FlagConfig = Record<FeatureFlag, boolean>;

function parseEnvOverrides(): Partial<FlagConfig> {
  const overrides: Partial<FlagConfig> = {};

  const list = process.env.FEATURE_FLAGS;
  if (list) {
    for (const key of list
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)) {
      if (key in DEFAULT_FLAGS) {
        overrides[key as FeatureFlag] = true;
      }
    }
  }

  for (const flag of Object.keys(DEFAULT_FLAGS) as FeatureFlag[]) {
    const envKey = `FF_${flag.toUpperCase()}`;
    const value = process.env[envKey];
    if (typeof value === 'string') {
      overrides[flag] = value === 'true' || value === '1';
    }
  }

  return overrides;
}

const envOverrides = parseEnvOverrides();

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  if (flag in envOverrides) {
    return envOverrides[flag as FeatureFlag] ?? false;
  }
  return DEFAULT_FLAGS[flag];
}

export function listFeatureFlags(): Array<{ key: FeatureFlag; enabled: boolean }> {
  return (Object.keys(DEFAULT_FLAGS) as FeatureFlag[]).map(key => ({
    key,
    enabled: isFeatureEnabled(key),
  }));
}

export type { FeatureFlag };
