import React from 'react';
import Head from 'next/head';
import Navbar from '@/components/Navbar';

const devices = {
    phones: [
        {
            name: 'iPhone 17 Pro Max',
            description: 'My main device for streaming, development, and daily use. Excellent camera and performance.',
        },
        {
            name: 'iPhone 15',
            description: 'Previous main device; reliable for casual use and backup for content creation.',
        },
        {
            name: 'Samsung Galaxy S23+',
            description: 'Used mostly for running Termux and testing Android apps.',
        },
        {
            name: 'iPhone 8',
            description: 'Older device, mainly for testing or occasional backups.',
        },
        {
            name: 'Samsung Galaxy S20 FE 5G',
            description: 'Broken screen, kept for parts or experimentation.',
        },
        {
            name: 'Samsung Galaxy S9',
            description: 'Broken, but still holds sentimental value as my first modern Android.',
        },
        {
            name: 'Samsung Galaxy S10e',
            description: 'Used during COVID for remote work and streaming experiments.',
        },
    ],
    computers: [
        {
            name: 'Dell Latitude 3410',
            specs: 'Intel Core i5 • 8GB RAM • 256GB SSD',
            description: 'School-issued laptop during online classes. Compact and reliable for lightweight dev work.',
        },
        {
            name: 'HP Laptop 15-bs2xx',
            specs: 'Intel Core i3 • 8GB RAM • HDD',
            description: 'Used for casual development and older projects; not ideal for modern workloads.',
        },
        {
            name: 'HP Laptop 17-p121wm',
            specs: 'AMD A8 • 8GB RAM • HDD',
            description: 'Oldest laptop I still own. Mainly nostalgic and for testing very lightweight software.',
        },
    ],
    consoles: [
        {
            name: 'Xbox One S',
            description: 'Still used occasionally for gaming and testing streaming setups.',
        },
    ],
};

function GearSection({ title, items, showSpecs = false }: { title: string; items: any[]; showSpecs?: boolean }) {
    return (
        <section className="space-y-6 animate-blurred-fade-in duration-300">
            <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">{title}</div>

            <div className="space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="border-b border-neutral-800 pb-4">
                        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                            <div>
                                <div className="text-sm md:text-[15px] text-zinc-200 font-medium">{item.name}</div>
                                {showSpecs && item.specs && (
                                    <div className="text-xs md:text-sm text-stone-400 mt-1">{item.specs}</div>
                                )}
                                <div className="text-xs md:text-sm text-stone-400 mt-1">{item.description}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default function Gear() {
    return (
        <div className="bg-main min-h-screen flex flex-col items-center antialiased p-4 md:p-8">
            <Head>
                <title>Gear | Snox</title>
                <meta
                    name="description"
                    content="A curated list of my phones, computers, consoles, and other devices I use for streaming, development, and everyday life."
                />
            </Head>

            <div className="max-w-2xl w-full px-3 md:px-0 py-20 md:py-16 space-y-10">
                {/* Header */}
                <div className="space-y-3 animate-blurred-fade-in duration-300">
                    <div className="text-[11px] uppercase tracking-[0.25em] text-stone-500">gear</div>
                    <h1 className="text-zinc-100 text-xl md:text-3xl font-medium leading-snug max-w-xl">
                        The devices behind everything I do.
                    </h1>
                    <div className="w-12 border-t border-neutral-800" />
                </div>

                {/* Intro */}
                <p className="text-sm md:text-[15px] leading-7 md:leading-8 text-stone-300 animate-blurred-fade-in duration-300">
                    A curated list of my phones, computers, consoles, and tools that I use for development, streaming, gaming, and everyday life.
                </p>

                {/* Gear Sections */}
                <GearSection title="Phones" items={devices.phones} />
                <GearSection title="Computers" items={devices.computers} showSpecs />
                <GearSection title="Consoles" items={devices.consoles} />

                {/* Footer note */}
                <div className="text-xs text-stone-500 animate-blurred-fade-in duration-300">
                    Updated occasionally as my setup evolves.
                </div>

                <Navbar />
            </div>
        </div>
    );
}