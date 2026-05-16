import { SocialLinks } from './SocialLinks';

const PROJECT_SOCIALS: Record<string, string> = {
  twitter: 'https://x.com/slopboptv',
};

export function Footer() {
  return (
    <footer className="flex flex-col gap-md">
      <hr className="border-white/15" />
      <div className="flex items-center justify-between">
        <span className="text-md">Follow us</span>
        <SocialLinks socials={PROJECT_SOCIALS} />
      </div>
      <p className="text-center text-sm text-white/60">SlopBop © 2026</p>
    </footer>
  );
}
