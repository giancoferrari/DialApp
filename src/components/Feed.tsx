import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { fetchFriendships } from '../lib/friends'
import { fetchFeedPosts, toggleLike, deletePost, toggleRepost } from '../lib/posts'
import type { Post, RoundRecapMeta, MatchRecapMeta } from '../types'
import { HeartIcon, ChatIcon, RepostIcon } from './Icons'
import Portal from './Portal'
import { PostDetail } from './ProfilePosts'
import RecapCard from './RecapCard'
import Skeleton from './Skeleton'
import Avatar from './Avatar'
import EmptyState from './EmptyState'
import { tapHaptic } from '../lib/native'
import { timeAgo, displayName as authorName } from '../lib/format'
import { card } from '../lib/surfaces'
import { color, font, type, radius, elevation, z } from '../lib/tokens'

interface Props {
  userId: string
  isMobile?: boolean
  onViewProfile?: (userId: string) => void
}

function FeedSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0, 1].map(i => (
        <div key={i} style={{ ...card, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
            <Skeleton width={36} height={36} radius={18} />
            <div style={{ flex: 1 }}>
              <Skeleton width={130} height={13} />
              <Skeleton width={58} height={10} style={{ marginTop: 7 }} />
            </div>
          </div>
          <Skeleton width="100%" height={isMobile ? 300 : 360} radius={0} />
          <div style={{ padding: '14px' }}><Skeleton width={150} height={14} /></div>
        </div>
      ))}
    </div>
  )
}

export default function Feed({ userId, isMobile = false, onViewProfile }: Props) {
  const qc = useQueryClient()
  const [active, setActive] = useState<Post | null>(null)
  const [burstId, setBurstId]   = useState<string | null>(null)
  const [poppingId, setPoppingId] = useState<string | null>(null)
  const tapRef = useRef<{ id: string; time: number; timer: ReturnType<typeof setTimeout> } | null>(null)
  const feedKey = ['feed', userId]

  const { data: posts = [], isLoading } = useQuery({
    queryKey: feedKey,
    queryFn: async (): Promise<Post[]> => {
      const fs = await fetchFriendships(userId)
      const friendIds = fs.filter(f => f.status === 'accepted')
        .map(f => f.requesterId === userId ? f.addresseeId : f.requesterId)
      return fetchFeedPosts([userId, ...friendIds], userId)
    },
  })

  // "New posts" pill — don't auto-refetch on a live insert (a mid-scroll jump
  // is hostile); just flag it and let the reader tap in when ready. RLS may
  // restrict which INSERTs are delivered — that's fine, the pill simply won't
  // fire for posts this user can't see.
  const [hasNew, setHasNew] = useState(false)
  useEffect(() => {
    const channel = supabase
      .channel(`feed-new-posts-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        if ((payload.new as { user_id: string }).user_id !== userId) setHasNew(true)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const handleNewPostsTap = () => {
    qc.invalidateQueries({ queryKey: feedKey })
    if (isMobile) document.getElementById('app-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
    setHasNew(false)
  }

  // Optimistic patches operate directly on the cached feed.
  const patch = (id: string, fn: (p: Post) => Post) =>
    qc.setQueryData<Post[]>(feedKey, (old = []) => old.map(p => (p.id === id ? fn(p) : p)))
  const refresh = () => qc.invalidateQueries({ queryKey: feedKey })

  const handleLike = async (post: Post) => {
    const was = post.likedByMe
    if (!was) { setPoppingId(post.id); setTimeout(() => setPoppingId(null), 420); tapHaptic() }
    patch(post.id, p => ({ ...p, likedByMe: !was, likeCount: p.likeCount + (was ? -1 : 1) }))
    try { await toggleLike(post.id, post.userId, userId, was) }
    catch { patch(post.id, p => ({ ...p, likedByMe: was, likeCount: p.likeCount + (was ? 1 : -1) })) }
  }

  // Distinguish single tap (open) from double tap (like + heart burst).
  // `now` comes from the click event's DOMHighResTimeStamp (pure, monotonic)
  // rather than Date.now() so the handler stays render-pure.
  const onMediaTap = (post: Post, now: number) => {
    if (tapRef.current && tapRef.current.id === post.id && now - tapRef.current.time < 280) {
      clearTimeout(tapRef.current.timer)
      tapRef.current = null
      if (!post.likedByMe) handleLike(post)
      setBurstId(post.id)
      setTimeout(() => setBurstId(null), 700)
    } else {
      const timer = setTimeout(() => { tapRef.current = null; setActive(post) }, 280)
      tapRef.current = { id: post.id, time: now, timer }
    }
  }

  const handleRepost = async (post: Post) => {
    const was = !!post.repostedByMe
    patch(post.id, p => ({ ...p, repostedByMe: !was }))
    try { await toggleRepost(post.id, post.userId, userId, was) }
    catch { patch(post.id, p => ({ ...p, repostedByMe: was })) }
  }

  const newPostsPill = hasNew && (
    <Portal>
      <button
        onClick={handleNewPostsTap}
        style={{
          position: 'fixed',
          top: isMobile ? 'calc(env(safe-area-inset-top) + 66px)' : 84,
          left: '50%', transform: 'translateX(-50%)', zIndex: z.nav + 1,
          background: color.green, color: color.onGreen, border: 'none',
          borderRadius: radius.pill, padding: '9px 18px', fontSize: 13, fontWeight: 600,
          fontFamily: font.body, boxShadow: elevation.md, cursor: 'pointer',
          animation: 'slideDown 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        New posts
      </button>
    </Portal>
  )

  if (isLoading) {
    return <>{newPostsPill}<FeedSkeleton isMobile={isMobile} /></>
  }

  if (posts.length === 0) {
    return (
      <>
        {newPostsPill}
        <EmptyState
          icon={<ChatIcon size={24} color={color.faint} />}
          title="The clubhouse is quiet"
          subtitle="Posts from you and your friends show up here. Add friends and share your first round."
        />
      </>
    )
  }

  // Shared card DNA — the header row and the action row are identical in both
  // the compact (caption + thumbnail) and full-width layouts.
  const actionBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }
  const countNum = (c: string): React.CSSProperties => ({ ...type.stat, fontSize: 14, color: c })

  const Header = (post: Post) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Avatar profile={post.author} size={38} onClick={onViewProfile ? () => onViewProfile(post.userId) : undefined} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          onClick={onViewProfile ? () => onViewProfile(post.userId) : undefined}
          style={{ fontFamily: font.body, fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: color.ink, cursor: onViewProfile ? 'pointer' : 'default', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {post.author?.firstName || authorName(post.author)}
        </div>
        <div style={{ fontSize: 12, color: color.muted, marginTop: 2 }}>{timeAgo(post.createdAt)}</div>
      </div>
    </div>
  )

  const Actions = (post: Post) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <button onClick={() => handleLike(post)} aria-label={post.likedByMe ? 'Unlike' : 'Like'} style={actionBtn}>
        <span style={{ display: 'inline-flex', animation: poppingId === post.id ? 'likePop 0.42s ease' : undefined }}>
          <HeartIcon size={20} color={post.likedByMe ? color.orange : color.ink} filled={post.likedByMe} />
        </span>
        <span style={countNum(post.likedByMe ? color.orange : color.ink)}>{post.likeCount}</span>
      </button>
      <button onClick={() => setActive(post)} aria-label="Comments" style={actionBtn}>
        <ChatIcon size={20} color={color.ink} />
        <span style={countNum(color.ink)}>{post.commentCount}</span>
      </button>
      <button onClick={() => handleRepost(post)} aria-label={post.repostedByMe ? 'Undo repost' : 'Repost'} style={{ ...actionBtn, marginLeft: 'auto' }}>
        <RepostIcon size={18} color={post.repostedByMe ? color.positive : color.inkSoft} />
        <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 500, color: post.repostedByMe ? color.positive : color.muted }}>{post.repostedByMe ? 'Reposted' : 'Repost'}</span>
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {newPostsPill}
      {posts.map(post => {
        const key = `${post.id}-${post.repostedBy?.userId ?? 'orig'}`

        // ── Compact clubhouse card (the reference layout): caption on the
        //    left, photo thumbnail on the right. Used for captioned photos.
        if (post.kind === 'photo' && post.caption && post.imageUrl) {
          return (
            <div key={key} style={{ ...card, padding: '13px 14px 14px' }}>
              {post.repostedBy && (
                <div style={{ paddingBottom: 9, fontSize: 12, color: color.muted, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                  <RepostIcon size={13} color={color.muted} /> {authorName(post.repostedBy)} reposted
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 116px', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  {Header(post)}
                  {/* Caption */}
                  <div
                    onClick={() => setActive(post)}
                    style={{ margin: '11px 0 0', cursor: 'pointer', fontSize: 15, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.3, color: color.ink, fontFamily: font.body, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as never, overflow: 'hidden' }}
                  >
                    {post.caption}
                  </div>
                  {/* Reactions */}
                  <div style={{ marginTop: 12 }}>{Actions(post)}</div>
                </div>
                {/* Thumbnail */}
                <button onClick={e => onMediaTap(post, e.timeStamp)} style={{ position: 'relative', alignSelf: 'start', marginTop: 5, width: 116, height: 86, borderRadius: radius.sm, overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer', background: color.sky }}>
                  <img src={post.imageUrl} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {burstId === post.id && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none', animation: 'heartBurst 0.7s ease-out forwards', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}>
                      <HeartIcon size={44} color="#FFFFFF" filled />
                    </div>
                  )}
                </button>
              </div>
            </div>
          )
        }

        // ── Full-width card: caption-less photos + round recaps ──
        return (
        <div key={key} style={{ ...card, overflow: 'hidden' }}>
          {post.repostedBy && (
            <div style={{ padding: '10px 14px 0', fontSize: 12, color: color.muted, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <RepostIcon size={13} color={color.muted} /> {authorName(post.repostedBy)} reposted
            </div>
          )}
          {/* Header */}
          <div style={{ padding: '12px 14px' }}>{Header(post)}</div>

          {/* Media — photo, round recap, or match recap (single tap opens, double tap likes) */}
          <button onClick={e => onMediaTap(post, e.timeStamp)} style={{ position: 'relative', display: 'block', width: '100%', padding: 0, border: 'none', background: post.kind === 'round' || post.kind === 'match' ? 'none' : '#000', cursor: 'pointer' }}>
            {post.kind === 'round' && post.meta
              ? <>
                  {post.imageUrl && <img src={post.imageUrl} alt="" loading="lazy" decoding="async" style={{ width: '100%', display: 'block', aspectRatio: '4 / 3', objectFit: 'cover' }} />}
                  <RecapCard kind="round" meta={post.meta as RoundRecapMeta} variant="feed" />
                </>
              : post.kind === 'match' && post.meta
              ? <RecapCard kind="match" meta={post.meta as MatchRecapMeta} variant="feed" />
              : <img src={post.imageUrl ?? ''} alt="" loading="lazy" decoding="async" style={{ width: '100%', display: 'block', aspectRatio: '4 / 5', objectFit: 'cover' }} />}
            {burstId === post.id && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none', animation: 'heartBurst 0.7s ease-out forwards', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.35))' }}>
                <HeartIcon size={96} color="#FFFFFF" filled />
              </div>
            )}
          </button>

          {/* Actions */}
          <div style={{ padding: '12px 14px 4px' }}>{Actions(post)}</div>

          {/* Caption */}
          {post.caption && (
            <div style={{ padding: '4px 14px 8px', fontSize: 14, color: color.ink, lineHeight: 1.5, fontFamily: font.body }}>
              <strong style={{ fontWeight: 600 }}>{authorName(post.author)}</strong> {post.caption}
            </div>
          )}
          {/* Inline comment preview — tap to open the comment sheet */}
          {post.commentCount > 0 && (
            <button onClick={() => setActive(post)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: `${post.caption ? 0 : 4}px 14px 14px`, fontFamily: font.body, fontSize: 13, color: color.muted }}>
              {post.commentCount === 1 ? 'View 1 comment' : `View all ${post.commentCount} comments`}
            </button>
          )}
          {!post.caption && post.commentCount === 0 && <div style={{ height: 10 }} />}
        </div>
        )
      })}

      {active && (
        <Portal>
          <PostDetail
            post={active}
            meId={userId}
            isMobile={isMobile}
            authorProfile={active.author}
            canDelete={active.userId === userId}
            onClose={() => setActive(null)}
            onChanged={refresh}
            onDelete={async () => { const id = active.id; setActive(null); try { await deletePost(id) } catch { /* ignore */ } refresh() }}
          />
        </Portal>
      )}
    </div>
  )
}
