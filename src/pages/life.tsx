import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const previewPhotos = [
    '/images/gallery/farm-5.jpg',
    '/images/gallery/farm-6.jpg',
    '/images/gallery/farm-8.jpg'
];

export default function Life() {
    return (
        <div className="bg-main min-h-screen flex flex-col items-center antialiased p-4 md:p-8">
            <Head>
                <title>Life | Snox</title>
                <meta
                    name="description"
                    content="Life between dairy farming and development."
                />
            </Head>

            <div className="max-w-2xl w-full px-3 md:px-0 py-20 md:py-16 space-y-8">
                {/* Header */}
                <div className="space-y-3 animate-blurred-fade-in duration-300">
                    <div className="text-[11px] uppercase tracking-[0.25em] text-stone-500">
                        life
                    </div>

                    <h1 className="text-zinc-100 text-xl md:text-3xl font-medium leading-snug max-w-xl">
                        I grew up where mornings started before sunrise.
                    </h1>

                    <div className="w-12 border-t border-neutral-800" />
                </div>

                {/* Story */}
                <div className="space-y-5 text-sm md:text-[15px] leading-7 md:leading-8 text-stone-300 animate-blurred-fade-in duration-300">
                    <p>
                        I grew up on an 80-acre dairy farm in rural western
                        Pennsylvania, where long days, quiet fields, and early
                        mornings were just part of everyday life before I ever
                        realized how different that life really was.
                    </p>

                    <p>
                        The farm taught patience.
                        The internet taught possibility.
                        Somewhere between old barns and old laptops,
                        I started building things of my own.
                    </p>

                    <p>
                        Websites, bots, servers, and late-night ideas slowly
                        became the other half of my life — one that exists
                        somewhere between open fields and glowing monitors.
                    </p>
                </div>

                {/* Preview gallery */}
                <div className="space-y-3 animate-blurred-fade-in duration-300">
                    <div className="grid grid-cols-3 gap-2">
                        {previewPhotos.map((photo, index) => (
                            <Link key={index} href="/gallery">
                                <div className="group overflow-hidden rounded-xl border border-neutral-800 cursor-pointer">
                                    <img
                                        src={photo}
                                        alt="Farm photography"
                                        className="w-full h-20 md:h-24 object-cover group-hover:scale-105 duration-500"
                                    />
                                </div>
                            </Link>
                        ))}
                    </div>

                    <Link
                        href="/gallery"
                        className="inline-block text-sm text-stone-400 hover:text-zinc-100 duration-300"
                    >
                        view gallery →
                    </Link>
                </div>

                <Navbar />
            </div>
        </div>
    );
}