import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  LogOut,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import type { BlogPost, BlogPostSummary } from "../lib/api";

type View = "list" | "create" | "edit";

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  image: "",
  category: "Umum",
  author: "OSKADUSI",
  published: false,
};

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function AdminPage() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("oskadusi_admin_token"),
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [view, setView] = useState<View>("list");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    if (token) loadPosts();
  }, [token]);

  async function loadPosts() {
    if (!token) return;
    setPostsLoading(true);
    try {
      const data = await api.getAllPosts(token);
      setPosts(data);
    } catch {
      setToken(null);
      localStorage.removeItem("oskadusi_admin_token");
    } finally {
      setPostsLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const { token: t } = await api.login(username, password);
      localStorage.setItem("oskadusi_admin_token", t);
      setToken(t);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("oskadusi_admin_token");
    setToken(null);
    setView("list");
  }

  function startCreate() {
    setForm(emptyForm);
    setEditingPost(null);
    setSaveError("");
    setView("create");
  }

  function startEdit(post: BlogPostSummary) {
    setPostsLoading(true);
    api
      .getPost(post.slug)
      .then((full) => {
        setEditingPost(full);
        setForm({
          title: full.title,
          slug: full.slug,
          excerpt: full.excerpt,
          content: full.content,
          image: full.image,
          category: full.category,
          author: full.author,
          published: full.published,
        });
        setSaveError("");
        setView("edit");
      })
      .catch(() => {
        setEditingPost(null);
        setForm({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: "",
          image: post.image,
          category: post.category,
          author: post.author,
          published: post.published,
        });
        setView("edit");
      })
      .finally(() => setPostsLoading(false));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSaveError("");
    try {
      if (view === "create") {
        await api.createPost(token, form);
      } else if (editingPost) {
        await api.updatePost(token, editingPost.id, form);
      }
      await loadPosts();
      setView("list");
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    try {
      await api.deletePost(token, id);
      setPosts(posts.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus");
    }
  }

  // ── Login Screen ──────────────────────────────────────────────
  if (!token) {
    return (
      <div
        className="min-h-screen bg-[#080808] flex items-center justify-center px-6"
        style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
      >
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <img
              src="/LOGO_OSKADUSI.png"
              alt="OSKADUSI"
              className="h-10 mb-6 opacity-80"
            />
            <h1 className="text-2xl font-semibold text-white">Admin Login</h1>
            <p className="text-white/30 text-sm mt-1">
              OSKADUSI Content Management
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#ea0000] transition-colors duration-200"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#ea0000] transition-colors duration-200"
                required
              />
            </div>
            {loginError && (
              <p className="text-[#ea0000] text-sm">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#ea0000] text-white py-3 text-sm font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
            >
              {loginLoading ? "Masuk..." : "Masuk"}
            </button>
          </form>
          <div className="mt-6">
            <Link
              to="/"
              className="flex items-center gap-2 text-white/30 hover:text-white text-xs transition-colors duration-200"
            >
              <ArrowLeft className="w-3 h-3" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Post Form (Create / Edit) ─────────────────────────────────
  if (view === "create" || view === "edit") {
    return (
      <div
        className="min-h-screen bg-[#080808] text-white"
        style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
      >
        <div className="border-b border-white/8 sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              {view === "create" ? "Batal" : "Kembali"}
            </button>
            <span className="text-sm text-white/50">
              {view === "create" ? "Artikel Baru" : "Edit Artikel"}
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="max-w-4xl mx-auto px-6 py-10 space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Title */}
            <div className="lg:col-span-2">
              <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                Judul *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => {
                  const t = e.target.value;
                  setForm((f) => ({
                    ...f,
                    title: t,
                    slug: view === "create" ? slugify(t) : f.slug,
                  }));
                }}
                placeholder="Judul artikel..."
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-lg focus:outline-none focus:border-[#ea0000] transition-colors duration-200"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                Slug
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                placeholder="url-artikel"
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#ea0000] transition-colors duration-200 font-mono"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                Kategori
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                className="w-full bg-[#111] border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#ea0000] transition-colors duration-200"
              >
                {["Umum", "Events", "Programs", "Announcement"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Author */}
            <div>
              <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                Penulis
              </label>
              <input
                type="text"
                value={form.author}
                onChange={(e) =>
                  setForm((f) => ({ ...f, author: e.target.value }))
                }
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#ea0000] transition-colors duration-200"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                URL Gambar
              </label>
              <input
                type="text"
                value={form.image}
                onChange={(e) =>
                  setForm((f) => ({ ...f, image: e.target.value }))
                }
                placeholder="/blog-1.jpg atau URL lengkap"
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#ea0000] transition-colors duration-200"
              />
            </div>

            {/* Excerpt */}
            <div className="lg:col-span-2">
              <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                Ringkasan
              </label>
              <textarea
                value={form.excerpt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, excerpt: e.target.value }))
                }
                placeholder="Deskripsi singkat artikel..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#ea0000] transition-colors duration-200 resize-none"
              />
            </div>

            {/* Content */}
            <div className="lg:col-span-2">
              <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                Konten (Markdown didukung)
              </label>
              <textarea
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                placeholder={
                  "# Judul\n\nIsi artikel di sini...\n\n## Sub-judul\n\nParagraf kedua."
                }
                rows={16}
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#ea0000] transition-colors duration-200 resize-y font-mono"
                required
              />
            </div>
          </div>

          {/* Published toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, published: !f.published }))
              }
              className={`w-12 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 ${
                form.published ? "bg-[#ea0000]" : "bg-white/15"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                  form.published ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-white/60">
              {form.published ? "Dipublikasikan" : "Draft"}
            </span>
          </div>

          {saveError && <p className="text-[#ea0000] text-sm">{saveError}</p>}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-[#ea0000] text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors duration-200"
            >
              <Check className="w-4 h-4" />
              {saving ? "Menyimpan..." : "Simpan Artikel"}
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className="flex items-center gap-2 px-6 py-3 border border-white/15 text-white/50 hover:text-white text-sm transition-colors duration-200"
            >
              <X className="w-4 h-4" />
              Batal
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Post List ─────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#080808] text-white"
      style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
    >
      {/* Header */}
      <div className="border-b border-white/8 sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/LOGO_OSKADUSI.png"
              alt="OSKADUSI"
              className="h-8 opacity-80"
            />
            <span className="text-white/20">|</span>
            <span className="text-sm text-white/50">Admin Panel</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-white/30 hover:text-white text-xs transition-colors duration-200"
            >
              Lihat Site
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-white/30 hover:text-white text-xs transition-colors duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Kelola Artikel
            </h1>
            <p className="text-white/30 text-sm mt-1">
              {posts.length} artikel total
            </p>
          </div>
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#ea0000] text-white text-sm font-medium hover:bg-red-700 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            Artikel Baru
          </button>
        </div>

        {/* Posts table */}
        {postsLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border border-[#ea0000]/30 border-t-[#ea0000] rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-white/20 mb-4">Belum ada artikel.</p>
            <button
              onClick={startCreate}
              className="text-[#ea0000] text-sm hover:underline"
            >
              Buat artikel pertama →
            </button>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs text-white/25 uppercase tracking-wider border-b border-white/8">
              <div className="col-span-5">Judul</div>
              <div className="col-span-2">Kategori</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Tanggal</div>
              <div className="col-span-1"></div>
            </div>

            {posts.map((post) => (
              <div
                key={post.id}
                className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-white/5 hover:bg-white/[0.03] transition-colors duration-200 group items-center"
              >
                <div className="col-span-5">
                  <p className="text-white text-sm font-medium truncate">
                    {post.title}
                  </p>
                  <p className="text-white/25 text-xs font-mono mt-0.5">
                    {post.slug}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-white/40">{post.category}</span>
                </div>
                <div className="col-span-2">
                  {post.published ? (
                    <span className="flex items-center gap-1.5 text-xs text-green-400/70">
                      <Eye className="w-3 h-3" /> Published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-white/25">
                      <EyeOff className="w-3 h-3" /> Draft
                    </span>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-white/25">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "—"}
                  </span>
                </div>
                <div className="col-span-1 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => startEdit(post)}
                    className="text-white/30 hover:text-white transition-colors duration-200"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {deleteConfirm === post.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-[#ea0000] hover:text-red-400 transition-colors duration-200"
                        title="Konfirmasi hapus"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-white/30 hover:text-white transition-colors duration-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(post.id)}
                      className="text-white/30 hover:text-[#ea0000] transition-colors duration-200"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
