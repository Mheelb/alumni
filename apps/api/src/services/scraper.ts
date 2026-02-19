// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ScrapedProfile {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  company?: string;
  city?: string;
  avatarUrl?: string;
  diploma?: string;
}

interface ApifyLinkedInResult {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  headline?: string;
  city?: string;
  profile_pic_url?: string;
  company_name?: string;
}

// ─── Entrypoint ───────────────────────────────────────────────────────────────

export async function extractProfileData(url: string): Promise<ScrapedProfile> {
  const token = process.env.APIFY_TOKEN;

  if (!token) {
    throw new Error('APIFY_TOKEN missing');
  }

  console.log(`[Scraper] Fetching ${url} via Apify...`);

  const response = await fetch(
    `https://api.apify.com/v2/acts/anchor~linkedin-profile-enrichment/run-sync-get-dataset-items?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startUrls: [{ url }] }),
      signal: AbortSignal.timeout(120000),
    }
  );

  if (!response.ok) {
    throw new Error(`Apify HTTP ${response.status} — ${await response.text()}`);
  }

  const items = (await response.json()) as ApifyLinkedInResult[];
  const item = items[0];

  if (!item) {
    throw new Error('No results returned by Apify for this URL');
  }

  let firstName = item.first_name;
  let lastName = item.last_name;

  if (!firstName && item.full_name) {
    const parts = item.full_name.trim().split(' ');
    firstName = parts[0] ?? undefined;
    lastName = parts.slice(1).join(' ') || undefined;
  }

  const profile: ScrapedProfile = {
    firstName,
    lastName,
    jobTitle: item.headline,
    company: item.company_name,
    city: item.city,
    avatarUrl: item.profile_pic_url,
  };

  console.log('[Scraper] Extracted:', JSON.stringify(profile));
  return profile;
}
