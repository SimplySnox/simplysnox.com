import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Head from "next/head";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FaGithub, FaStar } from "react-icons/fa6";
import colors from "github-language-colors";

export default function Work() {
  const [repos, setRepos] = useState([]);
  const [page, setPage] = useState(1);

  const perPage = 6;

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await fetch(
          "https://api.github.com/users/simplysnox/repos?per_page=100&sort=updated"
        );

        const data = await res.json();

        const filtered = data
          .filter((repo) => !repo.fork && !repo.archived)
          .sort((a, b) => b.stargazers_count - a.stargazers_count);

        setRepos(filtered);
      } catch (err) {
        console.error("Failed to fetch repos:", err);
      }
    };

    fetchRepos();
  }, []);

  const totalPages = Math.ceil(repos.length / perPage);
  const start = (page - 1) * perPage;
  const currentRepos = repos.slice(start, start + perPage);

  return (
    <div className="bg-main min-h-screen flex flex-col justify-center items-center antialiased p-4 md:p-8">
      <div className="max-w-2xl w-full px-3 md:px-0 py-24 md:py-16 space-y-4">
        <Head>
          <title>Work | Snox</title>
        </Head>

        <div className="w-full max-w-3xl space-y-4">
          {currentRepos.map((repo, index) => {
            const languageColor =
              colors[repo.language]?.color || "#6b7280";

            return (
              <div
                key={repo.id}
                className="animate-blurred-fade-in duration-300"
              >
                {index !== 0 && (
                  <hr className="border-neutral-700/60 my-2" />
                )}

                <div className="flex justify-between items-center w-full py-1 group">
                  <div className="flex items-center gap-1">
                    <Link
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-200 hover:text-zinc-100 text-base font-medium flex items-center duration-300"
                    >
                      {repo.name}
                      <ArrowUpRight
                        size={15}
                        className="ml-0.5 group-hover:translate-x-[1.5px] text-stone-400/80 group-hover:text-zinc-100 duration-200"
                      />
                    </Link>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-stone-400">
                    {/* Language */}
                    {repo.language && (
                      <div className="flex items-center gap-1 text-xs">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: languageColor }}
                        />
                        {repo.language}
                      </div>
                    )}

                    {/* Stars */}
                    <div className="text-xs flex items-center">
                      <FaStar
                        size={13}
                        className="mr-0.5 text-yellow-400"
                      />
                      {repo.stargazers_count}
                    </div>

                    {/* GitHub */}
                    <Link
                      href={repo.html_url}
                      target="_blank"
                      className="text-stone-400/80 hover:text-soft flex items-center duration-300"
                      aria-label="GitHub Repository"
                    >
                      <FaGithub size={18} />
                    </Link>
                  </div>
                </div>

                <div className="space-y-2 animate-blurred-fade-in duration-300">
                  <div className="text-stone-300 text-sm mb-2">
                    {repo.description ||
                      "No description provided."}
                  </div>

                  {repo.topics && repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {repo.topics.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="text-xs text-stone-400 font-mono"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
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