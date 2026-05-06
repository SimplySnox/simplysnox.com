import React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Navbar from '@/components/Navbar';

const devices = {
    phones: [
        {
            name: 'iPhone 17 Pro Max',
            link: 'https://www.apple.com/iphone-17-pro/',
            image: '/images/gear/iphone17promax.png',
            description: 'my trusty daily driver, handles daily life and random chaos with ease.',
        },
        {
            name: 'iPhone 15',
            link: 'https://www.apple.com/iphone-15/',
            image: '/images/gear/iphone15.png',
            description: 'backup phone, sometimes gets a little love for testing stuff.',
        },
        {
            name: 'Samsung Galaxy S23+',
            link: 'https://www.samsung.com/us/smartphones/galaxy-s23/',
            image: '/images/gear/galaxys23plus.png',
            description: 'mostly hanging out in termux, running scripts and doing android things.',
        },
        {
            name: 'iPhone 8',
            link: 'https://support.apple.com/kb/SP767',
            image: '/images/gear/iphone8.png',
            description: 'oldie but goodie, keeps me nostalgic and reminds me of simpler times.',
        },
        {
            name: 'Samsung Galaxy S20 FE 5G',
            link: 'https://www.samsung.com/us/smartphones/galaxy-s20-5g/',
            image: '/images/gear/galaxys20fe.png',
            description: 'broken screen but still fun to tinker with when i feel adventurous.',
        },
        {
            name: 'Samsung Galaxy S9',
            link: 'https://www.samsung.com/global/galaxy/galaxy-s9/',
            image: '/images/gear/galaxys9.png',
            description: 'broken to pieces, holds sentimental value (and dust).',
        },
        {
            name: 'Samsung Galaxy S10e',
            link: 'https://www.samsung.com/global/galaxy/galaxy-s10/',
            image: '/images/gear/galaxys10e.png',
            description: 'covid-era phone, used for streaming experiments and boredom.',
        },
    ],

    computers: [
        {
            name: 'Dell Latitude 3410',
            link: 'https://www.dell.com/support/product-details/en-us/product/latitude-14-3410-laptop/overview',
            image: '/images/gear/dell3410.png',
            specs: 'Intel Core i5 • 8GB RAM • 256GB SSD',
            description: 'school laptop, surprisingly loyal for dev tasks.',
        },
        {
            name: 'HP Laptop 15-bs212wm',
            link: 'https://support.hp.com/us-en/product/details/hp-15-bs200-laptop-pc/model/20395838',
            image: '/images/gear/hp15.png',
            specs: 'Intel Celeron N4000 • 8GB RAM • 480G SSD',
            description: 'older laptop for small projects, still puts up a fight.',
        },
        {
            name: 'HP Laptop 17-p121wm',
            link: 'https://support.hp.com/us-en/product/details/hp-17-p100-notebook-pc-series/model/8499311',
            image: '/images/gear/hp17.png',
            specs: 'AMD A8 • 8GB RAM • 500G HDD',
            description: 'runs the family\'s jellyfin server and pretends it\'s fast.',
        },
    ],

    consoles: [
        {
            name: 'Xbox One S',
            link: 'https://www.xbox.com/en-US/consoles/xbox-one-s',
            image: '/images/gear/xbox.png',
            description: 'gaming and streaming testing, sometimes just for fun.',
        },
        {
            name: 'Nintendo Switch (1st gen)',
            link: 'https://www.nintendo.com/us/store/products/nintendo-switch-neon-blue-neon-red-joy-con-117972/',
            image: '/images/gear/switch.png',
            count: 1,
            description: 'casual gaming and occasional chaos with friends.',
        },
        {
            name: 'Nintendo Wii',
            link: 'https://www.nintendo.com/wii/',
            image: '/images/gear/wii.png',
            count: 2,
            description: 'retro fun, still gets the job done. ps, mario party 8 is a classic!',
        },
        {
            name: 'Nintendo DS Lite',
            link: 'https://www.nintendo.com/en-gb/Hardware/Nintendo-History/Nintendo-DS-Lite/Nintendo-DS-Lite-627004.html',
            image: '/images/gear/dslite.png',
            count: 3,
            description: 'ds games and a lot of nostalgia-packed button mashing.',
        },
        {
            name: 'Nintendo 2DS',
            link: 'https://www.nintendo.com/3ds/2ds/',
            image: '/images/gear/2ds.png',
            count: 2,
            description: 'testing ds/3ds games, looks cute doing it.',
        },
        {
            name: 'Nintendo 3DS',
            link: 'https://www.nintendo.com/3ds/',
            image: '/images/gear/3ds.png',
            count: 1,
            description: 'main handheld for 3ds adventures and classics.',
        },
        {
            name: 'Nintendo DSi XL — Super Mario Bros. 25th Anniversary Edition',
            link: 'https://www.nintendo.com/en-za/Nintendo-DS/Nintendo-DSi-XL/Nintendo-DSi-XL-Nintendo-s-official-site-116442.html',
            image: '/images/gear/dsixl.png',
            count: 1,
            description: 'large dual-screen DSi XL limited Mario edition — a chunky handheld built for classic DS-era nostalgia.',
        },
    ],

    software: [
        {
            name: 'Visual Studio Code',
            link: 'https://code.visualstudio.com/',
            image: '/images/gear/vscode.svg',
            description: 'my daily coding companion, lightweight and forgiving.',
        },
        {
            name: 'IntelliJ IDEA 2025.2.1',
            link: 'https://www.jetbrains.com/idea/',
            image: '/images/gear/intellij.svg',
            description: 'for minecraft plugin chaos and java shenanigans.',
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
                                <div className="flex items-center gap-2 text-sm md:text-[15px] text-zinc-200 font-medium">
                                    {item.name}
                                    {item.count && (
                                        <span className="text-xs text-stone-500 bg-neutral-800 px-2 py-0.5 rounded-full font-mono">
                                            x{item.count}
                                        </span>
                                    )}
                                </div>
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
                    content="a curated list of my phones, computers, consoles, and development tools for streaming, gaming, and programming."
                />
            </Head>

            <div className="max-w-2xl w-full px-3 md:px-0 py-20 md:py-16 space-y-10">
                {/* Header */}
                <div className="space-y-3 animate-blurred-fade-in duration-300">
                    <div className="text-[11px] uppercase tracking-[0.25em] text-stone-500">gear</div>
                    <h1 className="text-zinc-100 text-xl md:text-3xl font-medium leading-snug max-w-xl">
                        my gear
                    </h1>
                    <div className="w-12 border-t border-neutral-800" />
                </div>

                {/* Intro */}
                <p className="text-sm md:text-[15px] leading-7 md:leading-8 text-stone-300 animate-blurred-fade-in duration-300">
                    a curated list of all my phones, computers, consoles, and software tools i use for development, streaming, gaming, and everyday life.
                </p>

                {/* Gear Sections */}
                <GearSection title="Phones" items={devices.phones} />
                <GearSection title="Computers" items={devices.computers} showSpecs />
                <GearSection title="Consoles" items={devices.consoles} />
                <GearSection title="Software" items={devices.software} />

                {/* Footer note */}
                <div className="text-xs text-stone-500 animate-blurred-fade-in duration-300">
                    updated occasionally as my setup evolves.
                </div>

                <Navbar />
            </div>
        </div>
    );
}