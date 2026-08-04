import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Image,
  Article,
  Star,
  X,
  Warning,
  Sparkle,
  Funnel,
  ArrowRight,
} from "@phosphor-icons/react";

interface ContentPost {
  id: string;
  title: string;
  description: string | null;
  body: string | null;
  type: "video" | "image" | "article";
  category: string | null;
  featured: boolean;
  publishDate: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
}

const TYPE_ICONS = {
  video: <Play size={12} weight="fill" />,
  image: <Image size={12} weight="fill" />,
  article: <Article size={12} weight="fill" />,
};

const TYPE_LABELS = { video: "Video", image: "Image", article: "Article" };

function mediaUrl(path: string | null) {
  if (!path) return null;
  return `/api/storage${path}`;
}

function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Video Modal ─────────────────────────────────────────────────────────────
function VideoModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-3xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-white font-semibold truncate">{title}</p>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors shrink-0 ml-3"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
          <video
            src={url}
            controls
            autoPlay
            className="w-full rounded-xl bg-black"
            style={{ maxHeight: "70vh" }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Image Modal ──────────────────────────────────────────────────────────────
function ImageModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-3xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-white font-semibold truncate">{title}</p>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors shrink-0 ml-3"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
          <img
            src={url}
            alt={title}
            className="w-full rounded-xl object-contain"
            style={{ maxHeight: "75vh" }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Article Modal ────────────────────────────────────────────────────────────
function ArticleModal({
  post,
  onClose,
}: {
  post: ContentPost;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 p-0 md:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full md:max-w-2xl bg-[#0D0D0D] rounded-t-2xl md:rounded-2xl max-h-[90dvh] overflow-y-auto"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
        >
          {post.thumbnailUrl && (
            <div className="relative w-full aspect-video">
              <img
                src={mediaUrl(post.thumbnailUrl)!}
                alt={post.title}
                className="w-full h-full object-cover rounded-t-2xl md:rounded-t-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-transparent rounded-t-2xl" />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {post.category && (
                  <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
                    {post.category}
                  </span>
                )}
                <span className="text-[10px] text-white/30">
                  {formatDate(post.publishDate || post.createdAt)}
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-colors"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white mb-3">
              {post.title}
            </h2>
            {post.description && (
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                {post.description}
              </p>
            )}
            {post.body && (
              <div className="prose prose-invert max-w-none text-white/80 text-sm leading-relaxed whitespace-pre-wrap border-t border-white/8 pt-4">
                {post.body}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Featured Card ────────────────────────────────────────────────────────────
function FeaturedCard({
  post,
  onClick,
}: {
  post: ContentPost;
  onClick: () => void;
}) {
  const thumb = mediaUrl(post.thumbnailUrl);
  return (
    <motion.button
      onClick={onClick}
      className="w-full rounded-2xl overflow-hidden text-left group bg-[#111]"
      whileTap={{ scale: 0.99 }}
    >
      {/* Image / thumbnail */}
      <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
        {thumb ? (
          <img
            src={thumb}
            alt={post.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Featured badge */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-primary/90 backdrop-blur-sm text-black text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full">
          <Star size={10} weight="fill" />
          Featured
        </div>

        {/* Type badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white/80 text-[10px] font-bold px-2 py-1 rounded-full">
          {TYPE_ICONS[post.type]}
          {TYPE_LABELS[post.type]}
        </div>

        {/* Play overlay for video */}
        {post.type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:bg-white/30 transition-colors">
              <Play size={28} weight="fill" className="text-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Content below image */}
      <div className="p-4">
        {post.category && (
          <p className="text-primary text-[10px] font-black tracking-widest uppercase mb-1">
            {post.category}
          </p>
        )}
        <h2 className="text-white text-xl font-black tracking-tight leading-tight line-clamp-2 mb-1">
          {post.title}
        </h2>
        {post.description && (
          <p className="text-white/60 text-sm line-clamp-2 mt-1">
            {post.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-white/40 text-[10px]">
            {formatDate(post.publishDate || post.createdAt)}
          </span>
          <span className="text-white/20 text-[10px]">·</span>
          <span className="flex items-center gap-1 text-white/60 text-[10px] font-semibold">
            {post.type === "article" ? "Read" : "Watch"}
            <ArrowRight size={10} weight="bold" />
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Content Card ─────────────────────────────────────────────────────────────
function ContentCard({
  post,
  onClick,
}: {
  post: ContentPost;
  onClick: () => void;
}) {
  const thumb = mediaUrl(post.thumbnailUrl);
  return (
    <motion.button
      onClick={onClick}
      className="w-full text-left bg-[#111] border border-white/6 rounded-xl overflow-hidden group hover:border-white/15 transition-colors"
      whileTap={{ scale: 0.98 }}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-[#1a1a1a] overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/10">{TYPE_ICONS[post.type]}</div>
          </div>
        )}
        {post.type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Play size={16} weight="fill" className="text-white ml-0.5" />
            </div>
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 text-white/70 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          {TYPE_ICONS[post.type]}
          {TYPE_LABELS[post.type]}
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5">
        {post.category && (
          <p className="text-primary text-[9px] font-black tracking-widest uppercase mb-1">
            {post.category}
          </p>
        )}
        <h3 className="text-white text-sm font-bold leading-snug line-clamp-2 mb-1">
          {post.title}
        </h3>
        {post.description && (
          <p className="text-white/45 text-xs leading-relaxed line-clamp-2">
            {post.description}
          </p>
        )}
        <p className="text-white/25 text-[10px] mt-2">
          {formatDate(post.publishDate || post.createdAt)}
        </p>
      </div>
    </motion.button>
  );
}

// ─── Main Feed Component ──────────────────────────────────────────────────────
export function Feed() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [modal, setModal] = useState<{
    type: "video" | "image" | "article";
    post: ContentPost;
  } | null>(null);

  const fetchPosts = useCallback(async (category: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = category !== "all" ? `?category=${encodeURIComponent(category)}` : "";
      const res = await fetch(`/api/content${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load feed");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {
      setError("Couldn't load the feed. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(activeCategory);
  }, [activeCategory, fetchPosts]);

  // Derive categories from all fetched (unfiltered) posts — fetch all first time
  const [allPosts, setAllPosts] = useState<ContentPost[]>([]);
  useEffect(() => {
    fetch("/api/content", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAllPosts(d.posts ?? []))
      .catch(() => {});
  }, []);

  const categories = Array.from(
    new Set(allPosts.map((p) => p.category).filter(Boolean) as string[]),
  ).sort();

  const featured = posts.find((p) => p.featured);
  const rest = posts.filter((p) => !p.featured || posts.indexOf(p) !== 0);
  // If multiple featured, show only first as hero; rest go into grid
  const grid = featured ? rest : posts;

  function openPost(post: ContentPost) {
    if (post.type === "video" && post.mediaUrl) {
      setModal({ type: "video", post });
    } else if (post.type === "image" && post.mediaUrl) {
      setModal({ type: "image", post });
    } else {
      setModal({ type: "article", post });
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-24">
      {/* TEST FEATURE banner */}
      <div className="bg-orange-500/15 border-b border-orange-500/20 px-4 py-2.5 flex items-center gap-2">
        <Sparkle size={14} weight="fill" className="text-orange-400 shrink-0" />
        <p className="text-orange-300 text-xs font-semibold">
          <span className="font-black uppercase tracking-wider">Beta Feature</span>
          {" "}— Content Feed is experimental. Quality and behaviour may change.
        </p>
      </div>

      <div className="px-4 pt-6 pb-2">
        <p className="text-[10px] font-bold tracking-[0.25em] text-white/30 uppercase mb-1">
          From Marcus
        </p>
        <h1 className="text-2xl font-black tracking-tight text-white">Feed</h1>
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="px-4 pt-3 pb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {["all", ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeCategory === cat
                  ? "bg-primary text-black"
                  : "bg-white/8 text-white/60 hover:bg-white/15"
              }`}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      )}

      <div className="px-4">
        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="w-full rounded-2xl bg-white/5 animate-pulse" style={{ aspectRatio: "16/9" }} />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl bg-white/5 animate-pulse" style={{ height: 200 }} />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Warning size={36} className="text-white/20 mb-3" />
            <p className="text-white/40 text-sm">{error}</p>
            <button
              onClick={() => fetchPosts(activeCategory)}
              className="mt-4 text-primary text-sm font-bold"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Article size={28} className="text-white/20" />
            </div>
            <p className="text-white font-bold mb-1">Nothing here yet</p>
            <p className="text-white/40 text-sm">
              {activeCategory !== "all"
                ? `No ${activeCategory} posts published yet.`
                : "Marcus hasn't published any content yet. Check back soon."}
            </p>
          </div>
        )}

        {/* Content */}
        {!loading && !error && posts.length > 0 && (
          <div className="space-y-4">
            {/* Featured hero */}
            {featured && (
              <FeaturedCard post={featured} onClick={() => openPost(featured)} />
            )}

            {/* Grid */}
            {grid.length > 0 && (
              <>
                {featured && (
                  <div className="flex items-center gap-3 pt-2">
                    <p className="text-[10px] font-black tracking-widest text-white/30 uppercase">
                      More
                    </p>
                    <div className="flex-1 h-px bg-white/6" />
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {grid.map((post) => (
                    <ContentCard
                      key={post.id}
                      post={post}
                      onClick={() => openPost(post)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === "video" && modal.post.mediaUrl && (
        <VideoModal
          url={mediaUrl(modal.post.mediaUrl)!}
          title={modal.post.title}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "image" && modal.post.mediaUrl && (
        <ImageModal
          url={mediaUrl(modal.post.mediaUrl)!}
          title={modal.post.title}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "article" && (
        <ArticleModal post={modal.post} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
