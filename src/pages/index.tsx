import React from 'react';
import SocialLink from '@/components/SocialLink';
import Lanyard from '@/components/Lanyard';
import Navbar from '@/components/Navbar';

export default function Home() {
  return (
    <div className="bg-main min-h-screen flex flex-col justify-center items-center antialiased scroll-smooth p-4 md:p-8">
      <div className="max-w-2xl w-full px-3 md:px-0 py-24 md:py-16 space-y-4">
        <div className="flex items-center justify-start">
          <Lanyard showAlbumArt={false} />
        </div>
        <div className="flex justify-start space-x-3 px-0 md:px-1">
          <SocialLink href="https://simplysnox.com/discord" social="Discord" tooltipText="" />
          <SocialLink href="https://github.com/simplysnox" social="GitHub" tooltipText="@simplysnox" />
          <SocialLink href="https://steamcommunity.com/id/simplysnox" social="Steam" tooltipText="@simplysnox" />
          <SocialLink href="https://twitter.com/simplysnox" social="Twitter" tooltipText="@simplysnox" />
          {/* <SocialLink href="https://osu.ppy.sh/users/19054376" social="osu!" tooltipText="@simplysnox" />
          <SocialLink href="https://anilist.co/user/simplysnox" social="AniList" tooltipText="@simplysnox" />
          <SocialLink href="https://www.last.fm/user/simplysnox" social="Last.fm" tooltipText="@simplysnox" /> */}
        </div>
        <Navbar />
        <Lanyard showUsername={false} showStatusDot={false} showAlbumArt={true} />
      </div>
    </div>
  );
}