import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV_ITEMS = [
  { href: '/', label: '/home' },
  { href: '/work', label: '/work' },
  { href: '/notes', label: '/notes' },
  { href: '/guides', label: '/guides' },
  { href: '/gear', label: '/gear' },
  { href: '/bots', label: '/bots' },
  { href: '/status', label: '/status' },
];

const Navbar = () => {
  const router = useRouter();
  const isNotesPostPage = /^\/notes\/[^/]+$/.test(router.pathname);

  const renderNavItems = () =>
    NAV_ITEMS.map(({ href, label }) => (
      <Link
        key={href}
        href={href}
        className={`text-soft hover:text-stone-400 duration-300 flex items-center px-1 -ml-1 ${router.pathname === href ? 'text-zinc-100 underline underline-offset-2 decoration-neutral-700' : ''
          }`}
      >
        {label}
      </Link>
    )
    );

  // Only shows up when on the /notes/[slug] page
  const backButton = (
    <Link
      href="/notes"
      className="flex items-center text-stone-400/85 hover:text-stone-500 duration-300"
    >
      Back
    </Link>
  );

  return (
    <div className="absolute top-13.5">
      <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
        {isNotesPostPage && (
          <>
            {backButton}
            <div className="h-4 border-l border-neutral-700/60" />
          </>
        )}
        {renderNavItems()}
      </div>
    </div>
  );
};

export default Navbar;
