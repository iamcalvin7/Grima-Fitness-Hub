import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  PencilSimple,
  Trash,
  X,
  Sparkle,
  Play,
  Image,
  Article,
  Star,
  Eye,
  EyeSlash,
  UploadSimple,
  CheckCircle,
  Warning,
  ArrowLeft,
  SpinnerGap,
} from "@phosphor-icons/react";
import { useUpload } from "@/hooks/useUpload";

interface ContentPost {
  id: string;
  title: string;
  description: string | null;
  body: string | null;
  type: "video" | "image" | "article";
  category: string | null;
  status: "draft" | "published";
  featured: boolean;
  publishDate: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

type FormState = {
  title: string;
  description: string;
  body: string;
  type: "video" | "image" | "article";
  category: string;
  status: "draft" | "published";
  featured: boolean;
  mediaUrl: string;
  thumbnailUrl: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  body: "",
  type: "article",
  category: "",
  status: "draft",
  featured: false,
  mediaUrl: "",
  thumbnailUrl: "",
};

const CATEGORIES = [
  "Training",
  "Nutrition",
  "Mindset",
  "Recovery",
  "Announcements",
  "Lifestyle",
];

const TYPE_CONFIG = {
  article: { icon: <Article size={20} weight="fill" />, label: "Article", hint: "Blog-style written post" },
  image: { icon: <Image size={20} weight="fill" />, label: "Image", hint: "Photo with caption" },
  video: { icon: <Play size={20} weight="fill" />, label: "Video", hint: "Uploaded video clip" },
};

function mediaUrl(path: string | null) {
  if (!path) return null;
  return `/api/storage${path}`;
}

// ─── File Upload Zone ─────────────────────────────────────────────────────────
function UploadZone({
  label,
  accept,
  currentPath,
  onUploaded,
  onClear,
}: {
  label: string;
  accept: string;
  currentPath: string;
  onUploaded: (path: string) => void;
  onClear: () => void;
}) {
  const { upload, uploading, progress, error } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    const result = await upload(file);
    if (result) onUploaded(result.objectPath);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const serving = mediaUrl(currentPath);
  const isImage = currentPath && (accept.includes("image") || currentPath.match(/\.(jpg|jpeg|png|gif|webp)$/i));
  const isVideo = currentPath && accept.includes("video");

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black tracking-widest text-white/40 uppercase">
        {label}
      </label>

      {currentPath ? (
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#141414]">
          {isImage && serving && (
            <img src={serving} alt="Preview" className="w-full h-32 object-cover" />
          )}
          {isVideo && serving && (
            <video src={serving} className="w-full h-32 object-cover" muted />
          )}
          {!isImage && !isVideo && (
            <div className="h-16 flex items-center justify-center">
              <CheckCircle size={20} className="text-primary mr-2" />
              <span className="text-white/60 text-xs font-medium">File uploaded</span>
            </div>
          )}
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X size={12} weight="bold" />
          </button>
        </div>
      ) : (
        <div
          className={`relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors ${
            dragOver
              ? "border-primary/60 bg-primary/5"
              : "border-white/10 bg-[#0D0D0D] hover:border-white/20"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {uploading ? (
            <>
              <SpinnerGap size={20} className="text-primary animate-spin" />
              <p className="text-primary text-xs font-bold">{progress}%</p>
            </>
          ) : (
            <>
              <UploadSimple size={20} className="text-white/30" />
              <p className="text-white/50 text-xs text-center">
                Tap to upload · or drag & drop
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <Warning size={12} /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Post Form ────────────────────────────────────────────────────────────────
function PostForm({
  editing,
  onSaved,
  onCancel,
}: {
  editing: ContentPost | null;
  onSaved: (post: ContentPost) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    editing
      ? {
          title: editing.title,
          description: editing.description ?? "",
          body: editing.body ?? "",
          type: editing.type,
          category: editing.category ?? "",
          status: editing.status,
          featured: editing.featured,
          mediaUrl: editing.mediaUrl ?? "",
          thumbnailUrl: editing.thumbnailUrl ?? "",
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    setSaving(true);
    setFormError(null);

    const payload = {
      ...form,
      mediaUrl: form.mediaUrl || null,
      thumbnailUrl: form.thumbnailUrl || null,
      category: form.category || null,
      description: form.description || null,
      body: form.body || null,
      publishDate: new Date().toISOString(),
    };

    try {
      const res = await fetch(
        editing ? `/api/content/${editing.id}` : "/api/content",
        {
          method: editing ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Save failed");
      }
      const { post } = await res.json();
      onSaved(post);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 bg-[#0A0A0A] overflow-y-auto md:relative md:inset-auto md:bg-transparent"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-5 max-w-lg mx-auto pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} weight="bold" />
          </button>
          <h2 className="text-lg font-black tracking-tight text-white">
            {editing ? "Edit Post" : "New Post"}
          </h2>
        </div>

        {/* Type selector */}
        <div>
          <label className="text-[10px] font-black tracking-widest text-white/40 uppercase block mb-2">
            Content Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["article", "image", "video"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("type", t)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  form.type === t
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-white/8 bg-[#141414] text-white/40 hover:border-white/20"
                }`}
              >
                {TYPE_CONFIG[t].icon}
                <span className="text-[10px] font-bold">{TYPE_CONFIG[t].label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-[10px] font-black tracking-widest text-white/40 uppercase block mb-2">
            Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Post title"
            className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] font-black tracking-widest text-white/40 uppercase block mb-2">
            Short Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="One-line summary shown in the feed card"
            rows={2}
            className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
        </div>

        {/* Body (articles only) */}
        {form.type === "article" && (
          <div>
            <label className="text-[10px] font-black tracking-widest text-white/40 uppercase block mb-2">
              Body Text
            </label>
            <textarea
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
              placeholder="Full article content (plain text or markdown)"
              rows={8}
              className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors resize-none leading-relaxed"
            />
          </div>
        )}

        {/* Category */}
        <div>
          <label className="text-[10px] font-black tracking-widest text-white/40 uppercase block mb-2">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("category", form.category === c ? "" : c)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  form.category === c
                    ? "bg-primary text-black"
                    : "bg-white/8 text-white/50 hover:bg-white/15"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Media upload */}
        {(form.type === "video" || form.type === "image") && (
          <UploadZone
            label={form.type === "video" ? "Video File" : "Image File"}
            accept={form.type === "video" ? "video/*" : "image/*"}
            currentPath={form.mediaUrl}
            onUploaded={(p) => set("mediaUrl", p)}
            onClear={() => set("mediaUrl", "")}
          />
        )}

        {/* Thumbnail */}
        <UploadZone
          label="Thumbnail Image"
          accept="image/*"
          currentPath={form.thumbnailUrl}
          onUploaded={(p) => set("thumbnailUrl", p)}
          onClear={() => set("thumbnailUrl", "")}
        />

        {/* Featured + Status toggles */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => set("featured", !form.featured)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
              form.featured
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-white/8 bg-[#141414] text-white/40"
            }`}
          >
            <Star size={16} weight={form.featured ? "fill" : "regular"} />
            Featured
          </button>
          <button
            type="button"
            onClick={() =>
              set("status", form.status === "published" ? "draft" : "published")
            }
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
              form.status === "published"
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-white/8 bg-[#141414] text-white/40"
            }`}
          >
            {form.status === "published" ? (
              <Eye size={16} weight="fill" />
            ) : (
              <EyeSlash size={16} />
            )}
            {form.status === "published" ? "Published" : "Draft"}
          </button>
        </div>

        {formError && (
          <p className="text-red-400 text-sm flex items-center gap-1.5">
            <Warning size={14} /> {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 rounded-xl bg-primary text-black font-black tracking-widest uppercase text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <SpinnerGap size={16} className="animate-spin" />
          ) : (
            editing ? "Save Changes" : "Publish Post"
          )}
        </button>
      </form>
    </motion.div>
  );
}

// ─── Post Row ─────────────────────────────────────────────────────────────────
function PostRow({
  post,
  onEdit,
  onDelete,
}: {
  post: ContentPost;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const thumb = post.thumbnailUrl ? `/api/storage${post.thumbnailUrl}` : null;
  return (
    <div className="flex items-center gap-3 p-3.5 bg-[#111] border border-white/6 rounded-xl hover:border-white/12 transition-colors">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg bg-[#1a1a1a] shrink-0 overflow-hidden">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/15">
            {TYPE_CONFIG[post.type].icon}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-bold truncate">{post.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-white/30 uppercase font-bold">
            {post.type}
          </span>
          {post.category && (
            <>
              <span className="text-white/15 text-[9px]">·</span>
              <span className="text-[9px] text-white/30">{post.category}</span>
            </>
          )}
          {post.featured && (
            <>
              <span className="text-white/15 text-[9px]">·</span>
              <Star size={9} className="text-primary" weight="fill" />
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span
        className={`shrink-0 text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full ${
          post.status === "published"
            ? "bg-primary/15 text-primary"
            : "bg-white/8 text-white/30"
        }`}
      >
        {post.status}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/15 transition-colors"
        >
          <PencilSimple size={13} weight="bold" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash size={13} weight="bold" />
        </button>
      </div>
    </div>
  );
}

// ─── Main ContentAdmin Component ──────────────────────────────────────────────
export function ContentAdmin() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ContentPost | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/admin", { credentials: "include" });
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(post: ContentPost) {
    setEditing(post);
    setShowForm(true);
  }

  function handleSaved(post: ContentPost) {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === post.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = post;
        return next;
      }
      return [post, ...prev];
    });
    setShowForm(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/content/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeleting(null);
    }
  }

  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.filter((p) => p.status === "draft").length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-24 relative">
      {/* TEST FEATURE banner */}
      <div className="bg-orange-500/15 border-b border-orange-500/20 px-4 py-2.5 flex items-center gap-2">
        <Sparkle size={14} weight="fill" className="text-orange-400 shrink-0" />
        <p className="text-orange-300 text-xs font-semibold">
          <span className="font-black uppercase tracking-wider">Beta Feature</span>
          {" "}— Content Admin. Create posts that appear in the member feed.
        </p>
      </div>

      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] text-white/30 uppercase mb-1">
              Admin
            </p>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Content
            </h1>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary text-black font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl"
          >
            <Plus size={14} weight="bold" />
            New Post
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Total", value: posts.length },
            { label: "Published", value: published },
            { label: "Drafts", value: drafts },
          ].map((s) => (
            <div key={s.label} className="bg-[#111] border border-white/6 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-white">{s.value}</p>
              <p className="text-[9px] font-bold tracking-widest uppercase text-white/30 mt-0.5">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Post list */}
      <div className="px-4 space-y-2">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
              <Article size={24} className="text-white/20" />
            </div>
            <p className="text-white font-bold mb-1">No posts yet</p>
            <p className="text-white/40 text-sm">
              Hit "New Post" to create your first piece of content.
            </p>
          </div>
        )}

        {!loading &&
          posts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              onEdit={() => openEdit(post)}
              onDelete={() => handleDelete(post.id)}
            />
          ))}
      </div>

      {/* Form panel */}
      <AnimatePresence>
        {showForm && (
          <PostForm
            editing={editing}
            onSaved={handleSaved}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
