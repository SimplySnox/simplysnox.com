import React from 'react';
import Head from 'next/head';
import Navbar from '@/components/Navbar';

const devices = {
    phones: [
        {
            name: 'iPhone 17 Pro Max',
            note: 'Main device'
        },
        {
            name: 'iPhone 15',
            note: 'Previous main'
        },
        {
            name: 'iPhone 8',
            note: 'Older device'
        },
        {
            name: 'Samsung Galaxy S23+',
            note: 'Used for Termux'
        },
        {
            name: 'Samsung Galaxy S20 FE 5G',
            note: 'Broken screen'
        },
        {
            name: 'Samsung Galaxy S9',
            note: 'Broken'
        },
        {
            name: 'Samsung Galaxy S10e',
            note: 'Used during covid'
        }
    ],
    computers: [
        {
            name: 'Dell Latitude 3410',
            specs: 'Intel Core i5 • 8GB RAM • 256GB SSD',
            note: 'School-issued during online classes'
        },
        {
            name: 'HP Laptop 15-bs2xx',
            specs: 'Intel Core i3 • 8GB RAM • HDD',
            note: '2019'
        },
        {
            name: 'HP Laptop 17-p121wm',
            specs: 'AMD A8 • 8GB RAM • HDD',
            note: '2015'
        }
    ],
    consoles: [
        {
            name: 'Xbox One S',
            note: 'Still around'
        }
    ]
};

function SetupSection({ title, items, showSpecs = false }) {
    return (
        <section className="space-y-4 animate-blurred-fade-in duration-300">
            <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                {title}
            </div>

            <div className="space-y-4">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className="border-b border-neutral-800 pb-4"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-sm md:text-[15px] text-zinc-200">
                                    {item.name}
                                </div>

                                {showSpecs && item.specs && (
                                    <div className="text-xs md:text-sm text-stone-500 mt-1">
                                        {item.specs}
                                    </div>
                                )}
                            </div>

                            <div className="text-xs md:text-sm text-stone-500 text-right">
                                {item.note}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default function Setup() {
    return (
        <div className="bg-main min-h-screen flex flex-col items-center antialiased p-4 md:p-8">
            <Head>
                <title>Setup | Snox</title>
                <meta
                    name="description"
                    content="The devices and hardware I currently use."
                />
            </Head>

            <div className="max-w-2xl w-full px-3 md:px-0 py-20 md:py-16 space-y-10">
                {/* Header */}
                <div className="space-y-3 animate-blurred-fade-in duration-300">
                    <div className="text-[11px] uppercase tracking-[0.25em] text-stone-500">
                        setup
                    </div>

                    <h1 className="text-zinc-100 text-xl md:text-3xl font-medium leading-snug max-w-xl">
                        The hardware behind everything.
                    </h1>

                    <div className="w-12 border-t border-neutral-800" />
                </div>

                {/* Intro */}
                <p className="text-sm md:text-[15px] leading-7 md:leading-8 text-stone-300 animate-blurred-fade-in duration-300">
                    A few of the devices that have been part of development,
                    streaming, gaming, and everyday life over the years.
                </p>

                <SetupSection title="Phones" items={devices.phones} />
                <SetupSection title="Computers" items={devices.computers} showSpecs />
                <SetupSection title="Consoles" items={devices.consoles} />

                <div className="text-xs text-stone-500 animate-blurred-fade-in duration-300">
                    Updated occasionally as things change.
                </div>

                <Navbar />
            </div>
        </div>
    );
}