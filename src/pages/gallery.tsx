import React from 'react';
import Head from 'next/head';
import Navbar from '@/components/Navbar';

const photos = [
    { src: '/images/gallery/farm-1.jpg', title: '8/15/25 — Morning fog' },
    { src: '/images/gallery/farm-2.jpg', title: '5/25/23 — Summer mowing' },
    { src: '/images/gallery/farm-3.jpg', title: '12/3/23 — Sky after rainstorm' },
    { src: '/images/gallery/farm-4.jpg', title: '11/25/23 — Old barn' },
    { src: '/images/gallery/farm-5.jpg', title: '10/22/23 — Herford herd in pasture' },
    { src: '/images/gallery/farm-6.jpg', title: '10/22/23 — Quiet road' }
];

export default function Gallery() {
    return (
        <div className="bg-main min-h-screen flex flex-col items-center antialiased p-4 md:p-8">
            <Head>
                <title>Gallery | Snox</title>
            </Head>

            <div className="max-w-3xl w-full px-3 md:px-0 py-20 md:py-16 space-y-8">
                <div className="space-y-3 animate-blurred-fade-in duration-300">
                    <div className="text-[11px] uppercase tracking-[0.25em] text-stone-500">
                        gallery
                    </div>

                    <h1 className="text-zinc-100 text-xl md:text-2xl font-medium">
                        Moments away from the screen.
                    </h1>

                    <div className="w-12 border-t border-neutral-800" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {photos.map((photo, index) => (
                        <div
                            key={index}
                            className="group overflow-hidden rounded-2xl border border-neutral-800 animate-blurred-fade-in duration-300"
                        >
                            <img
                                src={photo.src}
                                alt={photo.title}
                                className="w-full h-64 md:h-72 object-cover group-hover:scale-[1.02] duration-500"
                            />
                            <div className="px-4 py-3 text-sm text-stone-400">
                                {photo.title}
                            </div>
                        </div>
                    ))}
                </div>

                <Navbar />
            </div>
        </div>
    );
}