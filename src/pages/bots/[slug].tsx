import React from "react";
import Head from "next/head";
import fs from "fs";
import path from "path";

import Navbar from "@/components/Navbar";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";

import bots from "@/data/bots";
import { getDiscordAvatar } from "@/utils/discordAvatar";

export default function BotPage({ bot }) {
    const router = useRouter();

    return (
        <div className="bg-main min-h-screen flex flex-col items-center antialiased p-5 md:p-8">
            <Head>
                <title>{bot.name} | Snox Bots</title>
                <meta name="description" content={bot.description} />
            </Head>

            <div className="max-w-2xl w-full py-24 space-y-6">
                {/* Back Button */}
                <button
                    onClick={() => router.push("/bots")}
                    className="flex items-center text-sm text-zinc-300 hover:text-zinc-100 gap-1"
                >
                    <ArrowLeft size={15} /> Back to all bots
                </button>

                {/* Heading */}
                <div className="flex items-center gap-3">
                    <img
                        src={getDiscordAvatar(bot.id, bot.avatar)}
                        className="w-12 h-12 rounded-full"
                        alt={bot.name}
                    />
                    <div>
                        <div className="text-zinc-100 text-xl font-medium">{bot.name}</div>
                        <a href={bot.invite} target="_blank" className="text-soft text-sm hover:underline">
                            Invite bot →
                        </a>
                    </div>
                </div>

                {/* Description */}
                <div className="text-stone-300">{bot.description}</div>

                {/* Tags */}
                {bot.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {bot.tags.map((tag) => (
                            <span key={tag} className="text-xs text-stone-400 font-mono">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                <Navbar />
            </div>
        </div>
    );
}

export async function getStaticPaths() {
    // Filter invalid slugs to prevent Vercel build errors
    const paths = bots
        .filter((b) => typeof b.slug === "string" && b.slug.trim().length > 0)
        .map((b) => ({
            params: { slug: b.slug }
        }));

    return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
    const bot = bots.find((b) => b.slug === params.slug);

    if (!bot) {
        return {
            notFound: true
        };
    }

    return {
        props: {
            bot
        }
    };
}