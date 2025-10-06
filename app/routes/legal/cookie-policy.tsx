import type { Route } from '../+types/legal.cookie-policy';

const LAST_UPDATED_PLACEHOLDER = 'Update this date before publishing';

const sections: Array<{
  title: string;
  paragraphs: string[];
  bullets?: string[];
}> = [
  {
    title: 'What Are Cookies',
    paragraphs: [
      'Define cookies, local storage, and similar tracking technologies. Note why they are used in your product experience.',
    ],
  },
  {
    title: 'Types of Cookies We Use',
    paragraphs: [
      'Group cookies by purpose and provide clear examples with service providers when possible.',
    ],
    bullets: [
      'Essential cookies for authentication and security',
      'Analytics cookies (e.g., Plausible, Google Analytics) with retention periods',
      'Preference cookies that remember language or UI settings',
      'Marketing or retargeting cookies (list ad platforms if applicable)',
    ],
  },
  {
    title: 'Managing Preferences',
    paragraphs: [
      'Explain how users can manage cookie preferences within the product and through browser settings.',
      'Include instructions for disabling cookies while acknowledging potential service limitations.',
    ],
  },
  {
    title: 'Third-Party Technologies',
    paragraphs: [
      'Identify third-party scripts, pixels, or SDKs integrated into the product and link to their notices.',
    ],
  },
  {
    title: 'Changes to This Policy',
    paragraphs: ['Describe how updates will be announced and when new versions take effect.'],
  },
  {
    title: 'Contact',
    paragraphs: ['Share the contact method for privacy or cookie-related questions.'],
  },
];

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Cookie Policy | Legal Center' },
    {
      name: 'description',
      content: 'Template cookie policy covering tracking technologies and preference management.',
    },
  ];
}

export default function CookiePolicy() {
  return (
    <article className="space-y-10">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Cookie Policy Template</h2>
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
        Synchronize this cookie policy with your consent banner and document proof of user choices
        for compliance.
      </footer>
    </article>
  );
}
