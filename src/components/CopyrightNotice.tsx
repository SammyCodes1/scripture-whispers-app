import { splitLockmanLink } from '@/lib/bibleVersions';

interface Props {
  notice: string;
  label?: string;
}

/** Copyright notice shown under every passage of a licensed (or attributed) Bible version. */
export default function CopyrightNotice({ notice, label }: Props) {
  const { before, link, after } = splitLockmanLink(notice);
  return (
    <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground" data-testid="copyright-notice">
      {label && <span className="font-semibold">{label}: </span>}
      {before}
      {link && (
        <a href="https://www.lockman.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
          {link}
        </a>
      )}
      {after}
    </p>
  );
}
