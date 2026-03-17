import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";

import { ArrowUpRight } from "lucide-react";
import { FaDiscord } from "react-icons/fa6";
import { FaServer } from "react-icons/fa";

import bots from "@/data/bots";
import { getDiscordAvatar } from "@/utils/discordAvatar";

export default function Bots() {
    const [page, setPage] = useState(1);
    const [counts, setCounts] = useState({});
    const perPage = 6;

    useEffect(() => {
        async function loadCounts() {
            try {
                const res = await fetch("/api/bots");
                const data = await res.json();
                setCounts(data);
            } catch (err) {
                console.error("Failed to fetch bot counts:", err);
            }
        }

        loadCounts();
    }, []);

    const totalPages = Math.ceil(bots.length / perPage);
    const start = (page - 1) * perPage;
    const currentBots = bots.slice(start, start + perPage);

    return (
        <div className="bg-main min-h-screen flex flex-col justify-center items-center antialiased p-4 md:p-8">
            <div className="max-w-2xl w-full px-3 md:px-0 py-24 md:py-16 space-y-4">

                <Head>
                    <title>Bots | Snox</title>
                </Head>

                <div className="w-full max-w-3xl space-y-4">
                    {currentBots.map((bot, index) => (
                        <div key={bot.id} className="animate-blurred-fade-in duration-300">

                            {index !== 0 && (
                                <hr className="border-neutral-700/60 my-2" />
                            )}

                            <div className="flex justify-between items-center w-full py-1 group">

                                <div className="flex items-center gap-3">

                                    <Image
                                        src={getDiscordAvatar(bot.id, bot.avatar)}
                                        alt={bot.name}
                                        width={28}
                                        height={28}
                                        className="rounded-full"
                                    />

                                    <Link
                                        href={bot.invite}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-zinc-200 hover:text-zinc-100 text-base font-medium flex items-center duration-300"
                                    >
                                        {bot.name}
                                        <ArrowUpRight
                                            size={15}
                                            className="ml-0.5 group-hover:translate-x-[1.5px] text-stone-400/80 group-hover:text-zinc-100 duration-200"
                                        />
                                    </Link>

                                </div>

                                <div className="flex items-center gap-3 text-sm text-stone-400">

                                    {counts[bot.key] !== undefined && (
                                        <div className="flex items-center text-xs">
                                            <FaServer size={12} className="mr-1" />
                                            {counts[bot.key]}
                                        </div>
                                    )}

                                    <Link
                                        href={bot.invite}
                                        target="_blank"
                                        className="text-stone-400/80 hover:text-soft flex items-center duration-300"
                                        aria-label="Invite Bot"
                                    >
                                        <FaDiscord size={18} />
                                    </Link>

                                </div>

                            </div>

                            <div className="space-y-2">
                                <div className="text-stone-300 text-sm mb-2">
                                    {bot.description || "No description provided."}
                                </div>

                                {bot.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {bot.tags.map(tag => (
                                            <span key={tag} className="text-xs text-stone-400 font-mono">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                            </div>
                        </div>
                    ))}
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 pt-6 text-sm">

                        <button
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            className="text-stone-400 hover:text-white disabled:opacity-40"
                        >
                            Prev
                        </button>

                        <span className="text-stone-400">
                            Page {page} / {totalPages}
                        </span>

                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={page === totalPages}
                            className="text-stone-400 hover:text-white disabled:opacity-40"
                        >
                            Next
                        </button>

                    </div>
                )}

                <Navbar />

            </div>
        </div>
    );
}