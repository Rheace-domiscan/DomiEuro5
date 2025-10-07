import { data, redirect, useLoaderData } from 'react-router';
import type { Route } from '../+types/legal.sla';
import { INTERNAL_CALLERS, INTERNAL_GUARD_HEADER } from '~/lib/internal-guards';

const LAST_UPDATED_PLACEHOLDER = 'Update this date before publishing';
const REQUIRED_TIER = 'professional' as const;

const sections: Array<{
  title: string;
  paragraphs: string[];
  bullets?: string[];
}> = [
  {
    title: 'Service Commitment',
    paragraphs: [
      'State promised uptime percentage (e.g., 99.9%) and clarify how availability is calculated (monthly, quarterly).',
      'Define covered services, exclusions (beta features, third-party dependencies), and maintenance windows.',
    ],
  },
  {
    title: 'Support Response Targets',
    paragraphs: [
      'List support tiers with response and resolution targets. Include working hours, escalation paths, and communication channels.',
    ],
    bullets: [
      'Severity 1 (critical outage): response within X minutes, updates every Y minutes',
      'Severity 2 (major degradation): response within X hours, updates every Y hours',
      'Severity 3 (general issue): response within one business day',
    ],
  },
  {
    title: 'SLA Credits',
    paragraphs: [
      'Explain how service credits are calculated, applied, and capped. Reference billing invoices where credits appear.',
      'Clarify eligibility requirements such as timely incident reporting or account standing in good faith.',
    ],
  },
  {
    title: 'Planned Maintenance',
    paragraphs: [
      'Describe notification timelines for scheduled maintenance, typical duration, and channels used for communication.',
    ],
  },
  {
    title: 'Incident Communication',
    paragraphs: [
      'Outline how customers will receive outage updates (status page, email, in-app) and where post-incident reports are published.',
    ],
  },
  {
    title: 'Escalation and Termination',
    paragraphs: [
      'Document escalation contacts for urgent incidents and conditions under which customers may terminate due to chronic failures.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      'Provide the customer success or account management contact for SLA-related inquiries.',
    ],
  },
];

async function requireProfessionalUser(request: Request) {
  const url = new URL('/api/internal/require-tier', request.url);
  url.searchParams.set('tier', REQUIRED_TIER);

  const response = await globalThis.fetch(url, {
    headers: {
      cookie: request.headers.get('cookie') ?? '',
      [INTERNAL_GUARD_HEADER]: INTERNAL_CALLERS.LEGAL_SLA,
    },
    redirect: 'manual',
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location') ?? '/pricing';
    throw redirect(location);
  }

  if (!response.ok) {
    throw new Response('Unable to verify subscription tier', {
      status: 500,
    });
  }

  const payload = (await response.json()) as { user: { email: string } };
  return payload.user;
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireProfessionalUser(request);
  return data({ user });
}

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Service Level Agreement | Legal Center' },
    {
      name: 'description',
      content: 'Professional tier SLA template covering uptime guarantees and support commitments.',
    },
  ];
}

type LoaderData = {
  user: {
    email: string;
  };
};

export default function ServiceLevelAgreement() {
  const { user } = useLoaderData<LoaderData>();

  return (
    <article className="space-y-10">
      <header className="space-y-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-gray-900">Service Level Agreement Template</h2>
          <p className="text-sm text-gray-600">
            Restricted to Professional plans. Signed in as {user.email}.
          </p>
        </div>
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
        Align SLA wording with actual operational capabilities, monitoring coverage, and incident
        response procedures before sharing externally.
      </footer>
    </article>
  );
}
