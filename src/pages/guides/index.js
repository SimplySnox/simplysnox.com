import React, { useState } from 'react';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function Guides({ guides }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const guidesPerPage = 7;

    const filteredGuides = guides.filter(guide => {
        const query = searchQuery.toLowerCase();
        return guide.frontmatter.title.toLowerCase().includes(query) ||
            guide.frontmatter.tags?.some(tag => tag.toLowerCase().includes(query));
    });

    const indexOfLast = currentPage * guidesPerPage;
    const indexOfFirst = indexOfLast - guidesPerPage;
    const currentGuides = filteredGuides.slice(indexOfFirst, indexOfLast);

    const paginate = (page) => setCurrentPage(page);

    return (
        <div className="bg-main min-h-screen flex flex-col items-center p-4 md:p-8">
            <Head>
                <title>Guides | Snox</title>
            </Head>
            <div className="max-w-2xl w-full px-3 md:px-0 py-20 space-y-6">
                <div className="space-y-3">
                    <div className="text-[11px] uppercase tracking-[0.25em] text-stone-500">guides</div>
                    <h1 className="text-zinc-100 text-xl md:text-3xl font-medium leading-snug">
                        Step-by-step tutorials and how-tos.
                    </h1>
                    <div className="w-12 border-t border-neutral-800" />
                </div>

                <input
                    type="text"
                    placeholder="Search guides..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="text-lg placeholder:text-stone-400/80 text-soft bg-transparent border-b border-neutral-700/60 py-1 w-full outline-none rounded-none"
                />

                {currentGuides.length === 0 ? (
                    <div className="text-stone-400 mt-4">No guides found.</div>
                ) : (
                    currentGuides.map(guide => (
                        <div key={guide.slug} className="border-b border-neutral-800 py-2">
                            <Link href={`/guides/${guide.slug}`}>
                                <span className="text-zinc-300 hover:text-zinc-100 font-medium cursor-pointer">
                                    {guide.frontmatter.title}
                                </span>
                            </Link>
                            {guide.frontmatter.tags && (
                                <div className="flex flex-wrap gap-2 text-xs text-stone-400 mt-1">
                                    {guide.frontmatter.tags.map((tag, i) => <span key={i}>#{tag}</span>)}
                                </div>
                            )}
                        </div>
                    ))
                )}

                {/* Pagination */}
                <div className="flex space-x-2 mt-4">
                    {Array.from({ length: Math.ceil(filteredGuides.length / guidesPerPage) }, (_, i) => i + 1).map(page => (
                        <button
                            key={page}
                            onClick={() => paginate(page)}
                            className={`px-2 py-1 rounded-md ${currentPage === page ? 'bg-neutral-600 text-zinc-100' : 'bg-neutral-800 text-stone-400'}`}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                <Navbar />
            </div>
        </div>
    );
}

export async function getStaticProps() {
    const dir = path.join(process.cwd(), 'content/guides'); // ✅ Updated
    let files = [];
    try {
        files = fs.readdirSync(dir);
    } catch {
        files = [];
    }

    const guides = files.map(file => {
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        const { data } = matter(content);
        return { slug: file.replace(/\.md$/, ''), frontmatter: data };
    });

    return { props: { guides } };
}