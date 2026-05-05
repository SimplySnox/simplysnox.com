// src/pages/guides/[slug].tsx
import React from 'react';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkUnwrapImages from 'remark-unwrap-images';
import remarkGemoji from 'remark-gemoji';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeExternalLinks from 'rehype-external-links';
import { rehypeGithubAlerts } from 'rehype-github-alerts';
import Head from 'next/head';
import Navbar from '@/components/Navbar';
import BackToTop from '@/components/BackToTop';
import markdownStyles from '@/components/markdownStyles';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

export default function Guide({ guide }) {
    const router = useRouter();
    if (!guide) return null;

    const handleTagClick = (tag) => {
        router.push({ pathname: '/guides', query: { tag } });
    };

    // Estimate reading time
    const readingTime = (text: string) => {
        const wordsPerMinute = 200;
        const words = text.split(/\s+/).length;
        return `${Math.ceil(words / wordsPerMinute)} min read`;
    };

    return (
        <div className="bg-main min-h-screen flex flex-col items-center antialiased scroll-smooth p-4 md:p-8">
            <Head>
                <title>{`${guide.frontmatter.title} | Guides`}</title>
                <meta name="description" content={guide.frontmatter.description} />
            </Head>

            <div className="max-w-2xl w-full px-3 md:px-1 py-20 md:py-16">
                <div className="flex items-center gap-x-2 animate-blurred-fade-in duration-300 mb-1">
                    <div className="text-stone-300/80 text-sm font-medium">{guide.frontmatter.date}</div>
                    <div className="h-3 border-l border-neutral-600" />
                    <div className="text-stone-300/80 text-sm font-medium">{readingTime(guide.content)}</div>
                </div>

                <h1 className="text-zinc-100 text-xl md:text-3xl font-medium leading-snug animate-blurred-fade-in duration-300">
                    {guide.frontmatter.title}
                </h1>

                <motion.div className="text-soft text-[15px] md:text-base leading-7 md:leading-8 mt-4 animate-blurred-fade-in duration-300">
                    <ReactMarkdown
                        components={markdownStyles}
                        remarkPlugins={[remarkGfm, remarkUnwrapImages, remarkGemoji]}
                        rehypePlugins={[
                            rehypeRaw,
                            rehypeAutolinkHeadings,
                            rehypeSlug,
                            [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
                            [rehypeGithubAlerts, {
                                alerts: [
                                    { keyword: 'NOTE', icon: '🛈', title: 'Note' },
                                    { keyword: 'TIP', icon: '💡', title: 'Tip' },
                                    { keyword: 'IMPORTANT', icon: '⭐', title: 'Important' },
                                    { keyword: 'WARNING', icon: '⚠️', title: 'Warning' },
                                    { keyword: 'CAUTION', icon: '❗', title: 'Caution' },
                                ]
                            }],
                        ]}
                    >
                        {guide.content}
                    </ReactMarkdown>
                </motion.div>

                <div className="mt-6">
                    <BackToTop />
                </div>

                {guide.frontmatter.tags && (
                    <div className="flex flex-wrap gap-2 mt-6 text-xs text-stone-400">
                        {guide.frontmatter.tags.map((tag, i) => (
                            <span
                                key={i}
                                onClick={() => handleTagClick(tag)}
                                className="cursor-pointer hover:text-zinc-100 font-mono duration-300"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-6">
                    <hr className="border-neutral-800" />
                </div>

                <Navbar />
            </div>
        </div>
    );
}

// Generate paths for all guides
export async function getStaticPaths() {
    const dir = path.join(process.cwd(), 'content', 'guides');
    const files = fs.readdirSync(dir);
    const paths = files.map(file => ({ params: { slug: file.replace(/\.md$/, '') } }));
    return { paths, fallback: false };
}

// Fetch content for a single guide
export async function getStaticProps({ params }) {
    const { slug } = params;
    const filePath = path.join(process.cwd(), 'content/guides', `${slug}.md`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    return {
        props: {
            guide: {
                slug,
                frontmatter: data,
                content,
            },
        },
    };
}