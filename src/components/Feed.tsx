import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchFriendships } from '../lib/friends'
import { fetchFeedPosts, toggleLike, deletePost, toggleRepost } from '../lib/posts'
import type { Post } from '../types'
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
import { color, font, radius, elevation } from '../lib/tokens'

// Warm clubhouse card: rounded 22, warm-white border, soft pine/brown shadow.
const feedCard: React.CSSProperties = {
  ...card,
  borderRadius: radius.lg,
  border: '1px solid rgba(255,255,255,0.76)',
  boxShadow: elevation.sm,
}

interface Props {
  userId: string
  isMobile?: boolean
  onViewProfile?: (userId: string) => void
}

function FeedSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0, 1].map(i => (
        <div key={i} style={{ ...feedCard, overflow: 'hidden' }}>
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
  const onMediaTap = (post: Post) => {
    const now = Date.now()
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

  if (isLoading) {
    return <FeedSkeleton isMobile={isMobile} />
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<ChatIcon size={24} color={color.faint} />}
        title="The clubhouse is quiet"
        subtitle="Posts from you and your friends show up here. Add friends and share your first round."
      />
    )
  }

  const countText: React.CSSProperties = { fontFamily: font.body, fontSize: 14, fontWeight: 600, color: color.ink, fontVariantNumeric: 'tabular-nums' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {posts.map(post => (
        <div key={`${post.id}-${post.repostedBy?.userId ?? 'orig'}`} style={{ ...feedCard, overflow: 'hidden' }}>
          {post.repostedBy && (
            <div style={{ padding: '10px 14px 0', fontSize: 12, color: color.muted, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <RepostIcon size={13} color={color.muted} /> {authorName(post.repostedBy)} reposted
            </div>
          )}
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
            <Avatar profile={post.author} size={36} onClick={onViewProfile ? () => onViewProfile(post.userId) : undefined} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                onClick={onViewProfile ? () => onViewProfile(post.userId) : undefined}
                style={{ fontFamily: font.body, fontSize: 15, fontWeight: 700, letterSpacing: '-0.03em', color: color.ink, cursor: onViewProfile ? 'pointer' : 'default' }}
              >
                {authorName(post.author)}
              </div>
              <div style={{ fontSize: 12, color: color.muted, marginTop: 1 }}>{timeAgo(post.createdAt)}</div>
            </div>
          </div>

          {/* Media — photo or round recap (single tap opens, double tap likes) */}
          <button onClick={() => onMediaTap(post)} style={{ position: 'relative', display: 'block', width: '100%', padding: 0, border: 'none', background: post.kind === 'round' ? 'none' : '#000', cursor: 'pointer' }}>
            {post.kind === 'round' && post.meta
              ? <RecapCard meta={post.meta} variant="feed" />
              : <img src={post.imageUrl ?? ''} alt="" loading="lazy" decoding="async" style={{ width: '100%', display: 'block', aspectRatio: '4 / 5', objectFit: 'cover' }} />}
            {burstId === post.id && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none', animation: 'heartBurst 0.7s ease-out forwards', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.35))' }}>
                <HeartIcon size={96} color="#FFFFFF" filled />
              </div>
            )}
          </button>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 14px 4px' }}>
            <button onClick={() => handleLike(post)} aria-label={post.likedByMe ? 'Unlike' : 'Like'} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={{ display: 'inline-flex', animation: poppingId === post.id ? 'likePop 0.42s ease' : undefined }}>
                <HeartIcon size={22} color={post.likedByMe ? color.orange : color.ink} filled={post.likedByMe} />
              </span>
              <span style={{ ...countText, color: post.likedByMe ? color.orange : color.ink }}>{post.likeCount}</span>
            </button>
            <button onClick={() => setActive(post)} aria-label="Comments" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <ChatIcon size={20} color={color.ink} />
              <span style={countText}>{post.commentCount}</span>
            </button>
            <button onClick={() => handleRepost(post)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <RepostIcon size={18} color={post.repostedByMe ? color.positive : color.inkSoft} />
              <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 500, color: post.repostedByMe ? color.positive : color.muted }}>{post.repostedByMe ? 'Reposted' : 'Repost'}</span>
            </button>
          </div>

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
      ))}

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
