import type { FC } from 'react';

type TestModeBannerProps = {
  isVisible: boolean;
  publishableKeyPreview: string | null;
};

/**
 * Surface a persistent banner in development when the app is using Stripe test keys.
 * Provides quick access to the Stripe CLI command developers need for webhook testing.
 */
export const TestModeBanner: FC<TestModeBannerProps> = ({ isVisible, publishableKeyPreview }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="bg-amber-100 text-amber-900 border-b border-amber-300"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
          Stripe Test Mode Active
        </p>
        <p className="text-sm leading-snug sm:w-auto sm:flex-1">
          {`Using Stripe test keys${publishableKeyPreview ? ` (${publishableKeyPreview})` : ''}. Remember to run the Stripe CLI listener before testing billing flows.`}
        </p>
        <code className="w-full truncate rounded bg-amber-200/60 px-2 py-1 text-xs font-mono text-amber-900 sm:w-auto">
          stripe listen --forward-to http://localhost:5173/webhooks/stripe
        </code>
      </div>
    </div>
  );
};
