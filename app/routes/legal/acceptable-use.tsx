import type { Route } from '../+types/legal.acceptable-use';

const LAST_UPDATED_PLACEHOLDER = 'Update this date before publishing';

const sections: Array<{
  title: string;
  paragraphs: string[];
  bullets?: string[];
}> = [
  {
    title: 'Purpose',
    paragraphs: [
      'Define the acceptable use standards for {{PRODUCT_NAME}} and outline how they protect the platform, other customers, and end-users.',
    ],
  },
  {
    title: 'You Agree To',
    paragraphs: [
      'Summarize customer obligations that promote responsible usage and compliance with law.',
    ],
    bullets: [
      'Maintain accurate account and contact information',
      'Comply with applicable laws, regulations, and industry standards',
      'Use the service within agreed subscription limits and fair use policies',
      'Respect privacy, intellectual property, and confidentiality obligations',
    ],
  },
  {
    title: 'You May Not',
    paragraphs: [
      'Detail prohibited activities. Tailor the list to your infrastructure, support capacity, and partner agreements.',
    ],
    bullets: [
      'Attempt unauthorized access, reverse engineering, or security testing without consent',
      'Transmit malware, spam, or content that is harassing, discriminatory, or illegal',
      'Resell, sublicense, or share credentials outside your organization without permission',
      'Overload the service with excessive API calls or resource consumption',
    ],
  },
  {
    title: 'Enforcement',
    paragraphs: [
      'Explain how violations are investigated, the escalating enforcement measures, and potential involvement of law enforcement.',
      'Reference related policies such as suspension procedures, refund rules, or SLA impacts.',
    ],
  },
  {
    title: 'Reporting Concerns',
    paragraphs: [
      'Provide an abuse or security desk contact and expected response timeline for reports.',
    ],
  },
];

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Acceptable Use Policy | Legal Center' },
    {
      name: 'description',
      content:
        'Template acceptable use policy defining customer obligations and prohibited activities.',
    },
  ];
}

export default function AcceptableUsePolicy() {
  return (
    <article className="space-y-10">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Acceptable Use Policy Template</h2>
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
        Ensure this policy stays consistent with product capabilities, security guidelines, and
        contractual commitments with resellers or partners.
      </footer>
    </article>
  );
}
