import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock, Calendar, ArrowUpRight } from "lucide-react";
import { api } from "../lib/api";
import type { BlogPostSummary } from "../lib/api";

const CATEGORIES = ["All", "Events", "Programs", "Umum", "Announcement"];

export function BlogPage() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchPosts = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .getPosts(page, 9, category === "All" ? undefined : category)
      .then((result) => {
        setPosts(result.data);
        setTotalPages(result.totalPages);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [page, category]);

  useEffect(() => {
    window.scrollTo(0, 0);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchPosts();
  }, [fetchPosts]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPage(1);
  };

  return (
    <div
      className="min-h-screen bg-[#080808] text-white"
      style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
    >
      {/* Header bar */}
      <div className="border-b border-white/8 sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors duration-200 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <img
            src="/LOGO_OSKADUSI.png"
            alt="OSKADUSI"
            className="h-7 opacity-80"
          />
        </div>
      </div>

      {/* Hero area */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-20 pb-12">
        <p className="text-xs text-white/20 font-mono tracking-[0.25em] uppercase mb-4">
          Blog & Berita
        </p>
        <h1 className="text-5xl lg:text-7xl font-semibold text-white mb-6 leading-tight">
          News &<br />
          <span className="text-[#ea0000]">Updates</span>
        </h1>
        <p className="text-white/50 text-lg max-w-xl">
          Informasi terkini dari OSKADUSI — kegiatan, program, dan pengumuman
          resmi.
        </p>
      </div>

      {/* Category filter */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pb-10">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 text-sm font-medium transition-all duration-200 border ${
                category === cat
                  ? "bg-[#ea0000] border-[#ea0000] text-white"
                  : "border-white/15 text-white/50 hover:text-white hover:border-white/30 bg-transparent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pb-24">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-white/5 mb-4" />
                <div className="h-4 bg-white/5 mb-2 w-2/3" />
                <div className="h-6 bg-white/5 mb-2" />
                <div className="h-4 bg-white/5 w-3/4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <p className="text-white/30 text-lg mb-2">Gagal memuat artikel</p>
            <p className="text-white/20 text-sm">{error}</p>
            <p className="text-white/20 text-sm mt-2">
              Pastikan backend server berjalan di port 3001.
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-white/30 text-lg">
              Belum ada artikel di kategori ini.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group block"
                >
                  {/* Image */}
                  <div className="aspect-video overflow-hidden mb-5 relative">
                    {post.image ? (
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#111111] flex items-center justify-center">
                        <span className="text-white/10 text-4xl font-bold">
                          {post.category[0]}
                        </span>
                      </div>
                    )}
                    {/* Category badge */}
                    <div className="absolute top-3 left-3 px-3 py-1 bg-[#ea0000] text-white text-xs font-medium">
                      {post.category}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-white/30 mb-3">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {post.read_time} min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "short", year: "numeric" },
                          )
                        : "—"}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-[#ea0000] transition-colors duration-200 leading-snug">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-white/40 text-sm leading-relaxed line-clamp-3 mb-4">
                    {post.excerpt}
                  </p>

                  {/* Read more */}
                  <div className="flex items-center gap-1.5 text-xs text-white/30 group-hover:text-[#ea0000] transition-colors duration-200">
                    Baca selengkapnya
                    <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-16">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-white/15 text-white/50 hover:text-white hover:border-white/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 text-sm"
                >
                  ← Prev
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-10 h-10 text-sm font-medium transition-all duration-200 ${
                      page === i + 1
                        ? "bg-[#ea0000] text-white"
                        : "border border-white/15 text-white/50 hover:text-white hover:border-white/30"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-white/15 text-white/50 hover:text-white hover:border-white/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 text-sm"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
