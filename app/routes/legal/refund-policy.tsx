import type { Route } from '../+types/legal.refund-policy';

const LAST_UPDATED_PLACEHOLDER = 'Update this date before publishing';

const sections: Array<{
  title: string;
  paragraphs: string[];
  bullets?: string[];
}> = [
  {
    title: 'Overview',
    paragraphs: [
      'Clarify that this refund policy governs purchases made through {{PRODUCT_NAME}}. Modify the scope to match your business model and currency.',
      'State whether the policy applies globally or if regional variations (e.g., EU, UK, California) require separate disclosures.',
    ],
  },
  {
    title: 'Subscription Plans',
    paragraphs: [
      'Detail refund eligibility for monthly and annual plans, including any cooling-off periods or legal guarantees.',
      'Explain prorated refunds for plan downgrades, cancellations mid-cycle, or seat reductions, if applicable.',
    ],
    bullets: [
      'Trials and conversions to paid plans',
      'Automatic renewals and cancellation deadlines',
      'Refund handling for billing errors or duplicate charges',
    ],
  },
  {
    title: 'Non-Refundable Items',
    paragraphs: [
      'List add-ons, one-time professional services, or usage-based charges that do not qualify for refunds.',
      'Include logic for prepaid credits, overages, or third-party marketplace purchases.',
    ],
  },
  {
    title: 'How to Request a Refund',
    paragraphs: [
      'Describe the support channel (email, ticketing portal) and required information (account owner, invoice number, reason).',
      'Set expectations for response times and documentation review.',
    ],
  },
  {
    title: 'Processing Refunds',
    paragraphs: [
      'Specify timelines for approvals, processing, and when users can expect funds to appear on statements.',
      'Clarify whether refunds are issued to original payment methods or as account credits.',
    ],
  },
  {
    title: 'Chargebacks and Disputes',
    paragraphs: [
      'Explain how you handle payment disputes with card networks and how customers should collaborate during investigations.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      'Provide billing support contact details and escalation paths for unresolved issues.',
    ],
  },
];

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Refund Policy | Legal Center' },
    {
      name: 'description',
      content: 'Template refund policy for describing subscription and payment refund rules.',
    },
  ];
}

export default function RefundPolicy() {
  return (
    <article className="space-y-10">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Refund Policy Template</h2>
        <p className="text-sm text-gray-600">Last updated: {LAST_UPDATED_PLACEHOLDER}</p>
      </header>

      {sections.map(section => (
        <section key={section.title} className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-gray-900">{section.title}</h3>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className="text-sm leading-6 text-gray-700">
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
                {section.bullets.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ))}

      <footer className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Align this policy with Stripe dispute workflows and any jurisdiction-specific refund
        requirements before sharing with customers.
      </footer>
    </article>
  );
}
