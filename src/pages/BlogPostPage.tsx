import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Calendar, User } from "lucide-react";
import { api } from "../lib/api";
import type { BlogPost } from "../lib/api";

// Very simple markdown renderer (no external dependency)
function renderMarkdown(content: string): string {
  return (
    content
      // H1
      .replace(
        /^# (.+)$/gm,
        '<h1 class="text-3xl lg:text-4xl font-semibold text-white mt-10 mb-4 leading-tight">$1</h1>',
      )
      // H2
      .replace(
        /^## (.+)$/gm,
        '<h2 class="text-2xl font-semibold text-white mt-8 mb-3">$1</h2>',
      )
      // H3
      .replace(
        /^### (.+)$/gm,
        '<h3 class="text-xl font-medium text-white mt-6 mb-2">$1</h3>',
      )
      // Bold
      .replace(
        /\*\*(.+?)\*\*/g,
        '<strong class="text-white font-semibold">$1</strong>',
      )
      // Italic
      .replace(/\*(.+?)\*/g, '<em class="italic text-white/80">$1</em>')
      // List items
      .replace(
        /^- (.+)$/gm,
        '<li class="text-white/70 leading-relaxed mb-1 ml-4 list-disc">$1</li>',
      )
      // Wrap consecutive <li> in <ul>
      .replace(
        /(<li[^>]*>.*?<\/li>\n?)+/gs,
        (match) => `<ul class="my-4 space-y-1">${match}</ul>`,
      )
      // Horizontal rule
      .replace(/^---$/gm, '<hr class="border-white/10 my-8" />')
      // Double newline = paragraph break
      .replace(
        /\n\n([^<])/g,
        '</p><p class="text-white/65 leading-relaxed mb-4">$1',
      )
      // Wrap in paragraph if not already wrapped
      .replace(/^([^<\n].+)$/gm, (line) => {
        if (line.startsWith("<")) return line;
        return `<p class="text-white/65 leading-relaxed mb-4">${line}</p>`;
      })
  );
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!slug) return;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    setLoading(true);
    api
      .getPost(slug)
      .then((p) => {
        setPost(p);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border border-[#ea0000]/30 border-t-[#ea0000] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center gap-6">
        <p className="text-white/40 text-lg">Artikel tidak ditemukan</p>
        <button
          onClick={() => navigate("/blog")}
          className="text-sm text-[#ea0000] hover:underline"
        >
          ← Kembali ke Blog
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#080808] text-white"
      style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
    >
      {/* Top bar */}
      <div className="border-b border-white/8 sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <Link
            to="/blog"
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors duration-200 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Semua Artikel
          </Link>
          <img
            src="/LOGO_OSKADUSI.png"
            alt="OSKADUSI"
            className="h-7 opacity-60"
          />
        </div>
      </div>

      {/* Hero image */}
      {post.image && (
        <div className="w-full aspect-[21/9] overflow-hidden">
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover opacity-70"
          />
        </div>
      )}

      {/* Article */}
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-14">
        {/* Category */}
        <div className="mb-5">
          <span className="inline-block px-3 py-1 bg-[#ea0000] text-white text-xs font-medium tracking-wider uppercase">
            {post.category}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl lg:text-5xl font-semibold text-white leading-tight mb-6">
          {post.title}
        </h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-lg text-white/50 leading-relaxed mb-8 border-l-2 border-[#ea0000]/40 pl-4">
            {post.excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-white/30 pb-8 mb-10 border-b border-white/8">
          <span className="flex items-center gap-2">
            <User className="w-4 h-4" />
            {post.author}
          </span>
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {post.published_at
              ? new Date(post.published_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—"}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {post.read_time} menit membaca
          </span>
        </div>

        {/* Content */}
        <div
          className="prose-custom"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/8 flex items-center justify-between">
          <Link
            to="/blog"
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Semua Artikel
          </Link>
          <Link
            to="/"
            className="text-sm text-white/40 hover:text-white transition-colors duration-200"
          >
            Beranda →
          </Link>
        </div>
      </div>
    </div>
  );
}
