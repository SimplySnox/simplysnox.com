import React from 'react';
import Head from 'next/head';
import Navbar from '@/components/Navbar';

const currentItems = [
    'Maintaining a few Discord bots',
    'Working around the farm most days',
    'Improving this website little by little',
    'Taking more photos when I remember to'
];

const recentItems = [
    'Reorganized part of my setup',
    'Cleaned up a few older projects',
    'Started documenting more of life offline'
];

export default function Now() {
    return (
        <div className="bg-main min-h-screen flex flex-col items-center antialiased p-4 md:p-8">
            <Head>
                <title>Now | Snox</title>
                <meta
                    name="description"
                    content="A quiet snapshot of what life looks like lately."
                />
            </Head>

            <div className="max-w-2xl w-full px-3 md:px-0 py-20 md:py-16 space-y-10">
                {/* Header */}
                <div className="space-y-3 animate-blurred-fade-in duration-300">
                    <div className="text-[11px] uppercase tracking-[0.25em] text-stone-500">
                        now
                    </div>

                    <h1 className="text-zinc-100 text-xl md:text-3xl font-medium leading-snug max-w-xl">
                        A quiet snapshot of what life looks like lately.
                    </h1>

                    <div className="w-12 border-t border-neutral-800" />
                </div>

                {/* Intro */}
                <p className="text-sm md:text-[15px] leading-7 md:leading-8 text-stone-300 animate-blurred-fade-in duration-300">
                    This page changes every so often whenever life shifts a little.
                    Nothing polished — just what has my attention right now.
                </p>

                {/* Current */}
                <section className="space-y-4 animate-blurred-fade-in duration-300">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                        currently
                    </div>

                    <div className="space-y-3">
                        {currentItems.map((item, index) => (
                            <div
                                key={index}
                                className="text-sm md:text-[15px] text-stone-300 border-b border-neutral-800 pb-3"
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Recent */}
                <section className="space-y-4 animate-blurred-fade-in duration-300">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                        recently
                    </div>

                    <div className="space-y-3">
                        {recentItems.map((item, index) => (
                            <div
                                key={index}
                                className="text-sm md:text-[15px] text-stone-300 border-b border-neutral-800 pb-3"
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Footer note */}
                <div className="text-xs text-stone-500 animate-blurred-fade-in duration-300">
                    Last updated · April 2026
                </div>

                <Navbar />
            </div>
        </div>
    );
}