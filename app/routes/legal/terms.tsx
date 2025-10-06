import type { Route } from '../+types/legal.terms';

const LAST_UPDATED_PLACEHOLDER = 'Update this date before publishing';

const sections: Array<{ title: string; paragraphs: string[]; bullets?: string[] }> = [
  {
    title: 'Acceptance of Terms',
    paragraphs: [
      'By accessing or using {{PRODUCT_NAME}}, you agree to be bound by this Terms of Service template. Update company, product, and jurisdiction details before publishing.',
    ],
  },
  {
    title: 'Eligibility and Account Responsibilities',
    paragraphs: [
      'Only individuals who can form a binding contract may use the service. Specify additional industry or geography requirements if needed.',
      'You are responsible for keeping account credentials secure and for all activity occurring under your account.',
    ],
  },
  {
    title: 'Subscriptions and Billing',
    paragraphs: [
      'Describe your subscription tiers, billing cycles, and renewal cadence. Include pricing currency, invoicing schedules, and pro-rating rules.',
      'Explain how upgrades, downgrades, add-ons, and seat changes are handled. Mention any trial periods and what happens when a trial ends.',
    ],
    bullets: [
      'Accepted payment methods',
      'Billing contact requirements',
      'Late payment process and suspension rules',
    ],
  },
  {
    title: 'Acceptable Use',
    paragraphs: [
      'Link to the Acceptable Use Policy or summarize prohibited activities such as security violations, spam, or illegal content.',
      'Clarify consequences for violations, including suspension or termination.',
    ],
  },
  {
    title: 'Intellectual Property',
    paragraphs: [
      'State that all service content, trademarks, and technology remain the property of the company or its licensors.',
      'Detail customer rights to use the service (e.g., non-exclusive, revocable, limited license). Include user feedback licensing language if desired.',
    ],
  },
  {
    title: 'Termination',
    paragraphs: [
      'Outline circumstances under which either party may terminate the agreement and any required notice period.',
      'Explain data export procedures, post-termination access, and outstanding payment obligations.',
    ],
  },
  {
    title: 'Disclaimers and Liability',
    paragraphs: [
      'Add standard warranty disclaimers (service provided “as is”) and limitation of liability language tailored to your risk posture.',
      'If you operate under specific regulations (e.g., HIPAA, SOC 2), document assurances or exclusions appropriately.',
    ],
  },
  {
    title: 'Governing Law and Venue',
    paragraphs: [
      'Specify governing law, jurisdiction, and venue for disputes. Include arbitration or mediation requirements if applicable.',
    ],
  },
  {
    title: 'Contact Information',
    paragraphs: [
      'Provide the legal entity name, registered address, and preferred contact email for legal notices.',
    ],
  },
];

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Terms of Service | Legal Center' },
    {
      name: 'description',
      content: 'Template Terms of Service for configuring {{PRODUCT_NAME}} legal policies.',
    },
  ];
}

export default function TermsOfService() {
  return (
    <article className="space-y-10">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Terms of Service Template</h2>
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
        Customize this template to reflect your actual policies before publishing. Remove
        placeholder tokens like {'{{PRODUCT_NAME}}'} and confirm with counsel.
      </footer>
    </article>
  );
}
