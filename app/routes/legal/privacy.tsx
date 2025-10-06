import type { Route } from '../+types/legal.privacy';

const LAST_UPDATED_PLACEHOLDER = 'Update this date before publishing';

const sections: Array<{
  title: string;
  paragraphs: string[];
  bullets?: string[];
}> = [
  {
    title: 'Information We Collect',
    paragraphs: [
      'Outline the categories of personal data collected directly from users, indirectly through integrations, and via automatic tracking (e.g., cookies, analytics).',
      'Reference any sensitive data or special categories and note requirements for explicit consent.',
    ],
    bullets: [
      'Account details (name, email, organization metadata)',
      'Billing information processed through Stripe or another provider',
      'Product telemetry or usage analytics (describe tools used)',
    ],
  },
  {
    title: 'How We Use Information',
    paragraphs: [
      'Describe core processing purposes such as providing the service, customer support, billing, and service improvements.',
      'List optional purposes like marketing communications or product announcements and how users can opt out.',
    ],
  },
  {
    title: 'Data Sharing and Transfers',
    paragraphs: [
      'Document subprocessors (e.g., hosting, analytics, WorkOS, Convex, Stripe) and link to a living subprocessors list if available.',
      'Explain cross-border transfer mechanisms (Standard Contractual Clauses, DPF participation, etc.).',
    ],
  },
  {
    title: 'Security and Retention',
    paragraphs: [
      'Summarize security safeguards (encryption, access controls, monitoring) without disclosing sensitive details.',
      'State retention periods for customer content, backups, and log data. Outline criteria for removal when accounts close.',
    ],
  },
  {
    title: 'Your Rights and Choices',
    paragraphs: [
      'Explain data subject rights (access, rectification, deletion, portability, objection) and how to submit requests.',
      'Describe consent withdrawal, marketing preferences, and cookie controls.',
    ],
  },
  {
    title: 'Children’s Privacy',
    paragraphs: [
      'Clarify whether the service is directed at minors and what happens if child data is discovered.',
    ],
  },
  {
    title: 'Updates to this Policy',
    paragraphs: [
      'Explain how changes will be communicated (email, in-app notifications, changelog) and give advance notice for material updates.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      'Provide privacy contact email, mailing address, and optionally a DPO contact channel if required.',
    ],
  },
];

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Privacy Policy | Legal Center' },
    {
      name: 'description',
      content: 'Template Privacy Policy outlining data collection, use, and rights.',
    },
  ];
}

export default function PrivacyPolicy() {
  return (
    <article className="space-y-10">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Privacy Policy Template</h2>
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
        Tailor this privacy policy to reflect your processing activities, lawful bases, and regional
        requirements before publication.
      </footer>
    </article>
  );
}
