// Demo corpus: five overlapping themes (identity, reporting, notifications, integrations, mobile) with
// deliberate near-duplicates so dedupe, merge and clustering have something real to find.
export type SeedRequest = {
  key: number;
  title: string;
  description: string;
  authorName: string;
  voters: number;
};

export const SEED_REQUESTS: readonly SeedRequest[] = [
  {
    key: 1,
    title: 'SSO via Okta',
    description:
      'Our IT team requires every SaaS tool to authenticate through Okta. Please support SAML single sign-on with Okta so employees stop managing a separate password.',
    authorName: 'Priya Raman',
    voters: 14,
  },
  {
    key: 2,
    title: 'Okta login',
    description:
      'We cannot roll the product out company-wide until people can log in with their Okta account. Password logins are blocked by our security policy.',
    authorName: 'Marcus Lee',
    voters: 9,
  },
  {
    key: 3,
    title: 'Enforce two-factor authentication for admins',
    description:
      'Workspace owners should be able to require two-factor authentication for every admin account, with an authenticator app as the second factor.',
    authorName: 'Elena Petrova',
    voters: 6,
  },
  {
    key: 4,
    title: 'Google Workspace single sign-on',
    description:
      'Allow users to sign in with their Google Workspace account and automatically join the workspace that matches their company domain.',
    authorName: 'Tom Becker',
    voters: 5,
  },
  {
    key: 5,
    title: 'Export reports to CSV',
    description:
      'Finance needs to download the monthly usage report as a CSV file so they can reconcile it in spreadsheets without copying tables by hand.',
    authorName: 'Aisha Khan',
    voters: 11,
  },
  {
    key: 6,
    title: 'Download dashboard data as spreadsheet',
    description:
      'Add a button on every dashboard to export the underlying data to Excel or CSV. Today we take screenshots and retype the numbers.',
    authorName: 'Diego Alvarez',
    voters: 7,
  },
  {
    key: 7,
    title: 'Scheduled email reports',
    description:
      'Let managers schedule a weekly report that is emailed as a PDF every Monday morning with the key metrics for their team.',
    authorName: 'Hannah Schmidt',
    voters: 4,
  },
  {
    key: 8,
    title: 'Custom date ranges in analytics',
    description:
      'The analytics page only offers the last 7 or 30 days. We need a custom date range picker to compare quarters and campaign periods.',
    authorName: 'Kenji Watanabe',
    voters: 8,
  },
  {
    key: 9,
    title: 'Slack notifications for new comments',
    description:
      'Post a message to a chosen Slack channel whenever someone comments on a project, so the team does not have to keep the app open.',
    authorName: 'Olivia Brown',
    voters: 12,
  },
  {
    key: 10,
    title: 'Send alerts to Slack channel',
    description:
      'We want status changes and mentions delivered to Slack. Email notifications get lost; a Slack integration would make alerts visible to the whole team.',
    authorName: 'Samuel Okafor',
    voters: 6,
  },
  {
    key: 11,
    title: 'Daily digest email instead of instant notifications',
    description:
      'Instant emails for every update are overwhelming. Offer a once-a-day digest that summarises all activity in a single notification email.',
    authorName: 'Laura Rossi',
    voters: 5,
  },
  {
    key: 12,
    title: 'Mute notifications per project',
    description:
      'Allow users to mute notifications for specific projects they follow only loosely, while keeping alerts on for their main projects.',
    authorName: 'Ahmed Hassan',
    voters: 3,
  },
  {
    key: 13,
    title: 'Two-way Jira sync',
    description:
      'Link tasks to Jira issues and keep status, assignee and comments synchronised in both directions so engineering can stay in Jira.',
    authorName: 'Grace Kim',
    voters: 10,
  },
  {
    key: 14,
    title: 'Public REST API with webhooks',
    description:
      'Expose a documented REST API and outgoing webhooks so we can connect our internal tools and automate project creation from our CRM.',
    authorName: 'Victor Dubois',
    voters: 7,
  },
  {
    key: 15,
    title: 'Zapier integration',
    description:
      'A Zapier app would let non-developers connect the product to hundreds of tools, for example creating a task from a new form submission.',
    authorName: 'Nina Johansson',
    voters: 4,
  },
  {
    key: 16,
    title: 'Offline mode for the mobile app',
    description:
      'Field technicians often have no signal. The mobile app should let them view and update tasks offline and sync when they reconnect.',
    authorName: 'Carlos Mendes',
    voters: 9,
  },
  {
    key: 17,
    title: 'Work without internet on phone',
    description:
      'On construction sites we lose connectivity for hours. Please cache projects on the phone so checklists can be completed without internet.',
    authorName: 'Fatima Zahra',
    voters: 5,
  },
  {
    key: 18,
    title: 'Dark mode for the mobile app',
    description:
      'Add a dark theme to the iOS and Android apps that follows the system setting, to reduce eye strain for people working night shifts.',
    authorName: 'Liam O Connor',
    voters: 6,
  },
];

// Fixed ids and timestamps make re-running the seed a no-op instead of a second copy of the corpus.
export const SEED_BASE_TIME = Date.parse('2026-09-01T09:00:00.000Z');
export const SEED_INTERVAL_MS = 26 * 60 * 60 * 1000;
export const SEED_VOTER_POOL_SIZE = 20;

const KEY_PAD = 12;
const VOTER_PAD = 2;

export function seedRequestId(key: number): string {
  return `5eed0000-0000-4000-8000-${String(key).padStart(KEY_PAD, '0')}`;
}

export function seedVoteId(requestKey: number, voterIndex: number): string {
  const suffix = `${String(requestKey).padStart(KEY_PAD / 2, '0')}${String(voterIndex).padStart(KEY_PAD / 2, '0')}`;
  return `5eed0001-0000-4000-8000-${suffix}`;
}

export function seedVoterKey(voterIndex: number): string {
  return `seed-voter-${String(voterIndex).padStart(VOTER_PAD, '0')}`;
}
