// Licensed versions are served through the `bible-versions` edge function (API.Bible).
// Their text is never bundled or stored permanently on the device.
export const LICENSED_VERSION_IDS = ['amp', 'niv', 'nkjv'] as const;

export function isLicensedVersion(id: string): boolean {
  return (LICENSED_VERSION_IDS as readonly string[]).includes(id);
}

/** Version used automatically when a licensed version cannot be loaded. Public domain. */
export const FALLBACK_VERSION = 'bsb';

export const BSB_NOTICE = 'Berean Standard Bible (BSB). Public domain.';

export function splitLockmanLink(notice: string): { before: string; link: string | null; after: string } {
  const i = notice.indexOf('www.Lockman.org');
  if (i === -1) return { before: notice, link: null, after: '' };
  return { before: notice.slice(0, i), link: 'www.Lockman.org', after: notice.slice(i + 'www.Lockman.org'.length) };
}
