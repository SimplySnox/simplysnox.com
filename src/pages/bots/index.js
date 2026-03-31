import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import Navbar from "@/components/Navbar";

import { ArrowUpRight } from "lucide-react";
import { FaServer, FaDiscord } from "react-icons/fa6";

import bots from "@/data/bots";
import { getDiscordAvatar } from "@/utils/discordAvatar";

export default function BotsIndex() {
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTag, setSelectedTag] = useState(null);
    const [hoveredBot, setHoveredBot] = useState(null);
    const [currentPage, setCurrentPage] = useState(parseInt(router.query.page) || 1);
    const [counts, setCounts] = useState({});

    const botsPerPage = 6;

    // Filter out bots missing slug so build never breaks
    const validBots = bots.filter(
        (b) => typeof b.slug === "string" && b.slug.trim().length > 0
    );

    useEffect(() => {
        async function loadCounts() {
            try {
                const r = await fetch("/api/bots");
                const d = await r.json();
                setCounts(d);
            } catch (err) {
                console.error("Failed to fetch bot counts:", err);
            }
        }
        loadCounts();
    }, []);

    useEffect(() => {
        const { tag } = router.query;
        setSelectedTag(tag || null);
    }, [router.query]);

    const filteredBots = validBots.filter((bot) => {
        const q = searchQuery.toLowerCase();

        const nameMatch = bot.name.toLowerCase().includes(q);
        const tagMatch = bot.tags?.some((t) => t.toLowerCase().includes(q));
        const tagFilterMatch = selectedTag ? bot.tags?.includes(selectedTag) : true;

        return (nameMatch || tagMatch) && tagFilterMatch;
    });

    const sortedBots = filteredBots.sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    const indexOfLast = currentPage * botsPerPage;
    const indexOfFirst = indexOfLast - botsPerPage;
    const currentBots = sortedBots.slice(indexOfFirst, indexOfLast);

    const paginate = (pageNumber) => {
        router.push({
            pathname: "/bots",
            query: { ...router.query, page: pageNumber }
        });
        setCurrentPage(pageNumber);
    };

    const handleTagClick = (tag) => {
        router.push({
            pathname: "/bots",
            query: { tag }
        });
        setCurrentPage(1);
    };

    const clearTags = () => router.push("/bots");

    return (
        <div className="bg-main min-h-screen flex flex-col items-center antialiased p-5 md:p-8">
            <Head>
                <title>Bots | Snox</title>
            </Head>

            <div className="max-w-2xl w-full py-24 md:py-14 space-y-6">
                {/* Search */}
                <input
                    type="text"
                    placeholder="Search bots…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-lg placeholder:text-stone-400/80 text-soft bg-transparent border-b border-neutral-700/60 
                     focus:border-stone-400/70 py-1 outline-none w-full duration-300"
                />

                {/* Selected tag */}
                {selectedTag && (
                    <button
                        onClick={clearTags}
                        className="text-sm text-zinc-300 hover:text-zinc-300/80 flex items-center gap-1"
                    >
                        ← Back to all bots
                    </button>
                )}

                {currentBots.map((bot) => (
                    <div key={bot.slug} className="animate-blurred-fade-in duration-300">
                        <div
                            className="pb-3 border-b border-neutral-800 cursor-pointer group"
                            onMouseEnter={() => setHoveredBot(bot.slug)}
                            onMouseLeave={() => setHoveredBot(null)}
                        >
                            <div className="flex justify-between items-center py-1">
                                <Link href={`/bots/${bot.slug}`} className="flex items-center gap-3">
                                    <Image
                                        src={getDiscordAvatar(bot.id, bot.avatar)}
                                        width={28}
                                        height={28}
                                        className="rounded-full"
                                        alt={bot.name}
                                    />
                                    <span className="text-zinc-200 group-hover:text-zinc-100 font-medium flex items-center gap-1">
                                        {bot.name}
                                        <ArrowUpRight size={15} className="text-stone-400/80 group-hover:text-zinc-100" />
                                    </span>
                                </Link>

                                {/* Server count + invite */}
                                <div className="flex items-center gap-3 text-sm text-stone-400">
                                    {counts[bot.key] !== undefined && (
                                        <div className="flex items-center text-xs">
                                            <FaServer size={12} className="mr-1" />
                                            {counts[bot.key]}
                                        </div>
                                    )}

                                    <a href={bot.invite} target="_blank" className="hover:text-soft">
                                        <FaDiscord size={18} />
                                    </a>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="text-stone-300 text-sm mb-2">{bot.description}</div>

                            {/* Tags */}
                            {bot.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {bot.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            onClick={() => handleTagClick(tag)}
                                            className="text-xs text-stone-400 hover:text-zinc-300 font-mono cursor-pointer duration-200"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                <Pagination
                    total={filteredBots.length}
                    perPage={botsPerPage}
                    currentPage={currentPage}
                    paginate={paginate}
                />

                <Navbar />
            </div>
        </div>
    );
}

function Pagination({ total, perPage, paginate, currentPage }) {
    const pages = Array.from(
        { length: Math.ceil(total / perPage) },
        (_, i) => i + 1
    );

    if (pages.length <= 1) return null;

    return (
        <div className="flex gap-2 text-sm items-center pt-4">
            <span className="text-stone-400">Page</span>
            {pages.map((num) => (
                <button
                    key={num}
                    onClick={() => paginate(num)}
                    className={`px-2 py-0.5 rounded-md duration-300 border 
                        ${num === currentPage
                            ? "border-neutral-700 bg-neutral-600/60"
                            : "border-neutral-800 bg-neutral-800 hover:bg-neutral-700/60"
                        }`}
                >
                    {num}
                </button>
            ))}
        </div>
    );
}