import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchFriendships } from '../lib/friends'
import { fetchFeedPosts, toggleLike, deletePost, toggleRepost } from '../lib/posts'
import type { Post, PublicProfile } from '../types'
import { HeartIcon, ChatIcon } from './Icons'
import Portal from './Portal'
import { PostDetail } from './ProfilePosts'
import RecapCard from './RecapCard'
import Skeleton from './Skeleton'

interface Props {
  userId: string
  isMobile?: boolean
  onViewProfile?: (userId: string) => void
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function authorName(p?: PublicProfile): string {
  if (!p) return 'Golfer'
  return p.username ? `@${p.username}` : (p.firstName ?? 'Golfer')
}

function Avatar({ profile, size = 38, onClick }: { profile?: PublicProfile; size?: number; onClick?: () => void }) {
  const initial = profile?.username?.[0]?.toUpperCase() ?? profile?.firstName?.[0]?.toUpperCase() ?? '?'
  return (
    <div onClick={onClick} style={{ width: size, height: size, borderRadius: size / 2, background: '#1F3A2A', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: onClick ? 'pointer' : 'default' }}>
      {profile?.avatarUrl
        ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: size * 0.4, color: '#D9824D' }}>{initial}</span>}
    </div>
  )
}

function FeedSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[0, 1].map(i => (
        <div key={i} style={{ background: 'rgba(250,246,234,0.82)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 22px rgba(31,29,23,0.06), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
            <Skeleton width={38} height={38} radius={19} />
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
    if (!was) { setPoppingId(post.id); setTimeout(() => setPoppingId(null), 420) }
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
      <div style={{ background: 'rgba(250,246,234,0.78)', border: '1px solid rgba(255,255,255,0.66)', borderRadius: 20, padding: '34px 24px', textAlign: 'center', boxShadow: '0 4px 24px rgba(31,29,23,0.08), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#1F1D17', marginBottom: 6 }}>The clubhouse is quiet</div>
        <div style={{ fontSize: 13, color: '#6B5F4E', lineHeight: 1.5 }}>Posts from you and your friends show up here. Add friends and share your first round.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {posts.map(post => (
        <div key={`${post.id}-${post.repostedBy?.userId ?? 'orig'}`} style={{ background: 'rgba(250,246,234,0.82)', backdropFilter: 'blur(28px) saturate(170%)', WebkitBackdropFilter: 'blur(28px) saturate(170%)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 22px rgba(31,29,23,0.09), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
          {post.repostedBy && (
            <div style={{ padding: '9px 14px 0', fontSize: 12, color: '#6B5F4E', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>↻</span> {authorName(post.repostedBy)} reposted
            </div>
          )}
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
            <Avatar profile={post.author} size={38} onClick={onViewProfile ? () => onViewProfile(post.userId) : undefined} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                onClick={onViewProfile ? () => onViewProfile(post.userId) : undefined}
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14.5, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em', cursor: onViewProfile ? 'pointer' : 'default' }}
              >
                {authorName(post.author)}
              </div>
              <div style={{ fontSize: 11.5, color: '#8B8272' }}>{timeAgo(post.createdAt)}</div>
            </div>
          </div>

          {/* Media — photo or round recap (single tap opens, double tap likes) */}
          <button onClick={() => onMediaTap(post)} style={{ position: 'relative', display: 'block', width: '100%', padding: 0, border: 'none', background: post.kind === 'round' ? 'none' : '#000', cursor: 'pointer' }}>
            {post.kind === 'round' && post.meta
              ? <RecapCard meta={post.meta} variant="feed" />
              : <img src={post.imageUrl ?? ''} alt="" loading="lazy" decoding="async" style={{ width: '100%', display: 'block', maxHeight: isMobile ? 440 : 520, objectFit: 'cover' }} />}
            {burstId === post.id && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none', animation: 'heartBurst 0.7s ease-out forwards', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.35))' }}>
                <HeartIcon size={96} color="#FAF6EA" filled />
              </div>
            )}
          </button>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '11px 14px 4px' }}>
            <button onClick={() => handleLike(post)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={{ display: 'inline-flex', animation: poppingId === post.id ? 'likePop 0.42s ease' : undefined }}>
                <HeartIcon size={23} color={post.likedByMe ? '#D9824D' : '#1F1D17'} filled={post.likedByMe} />
              </span>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700, color: '#1F1D17' }}>{post.likeCount}</span>
            </button>
            <button onClick={() => setActive(post)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <ChatIcon size={21} color="#1F1D17" />
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700, color: '#1F1D17' }}>{post.commentCount}</span>
            </button>
            <button onClick={() => handleRepost(post)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={{ fontSize: 19, lineHeight: 1, color: post.repostedByMe ? '#5C7A4D' : '#1F1D17' }}>↻</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, fontWeight: 600, color: post.repostedByMe ? '#5C7A4D' : '#6B5F4E' }}>{post.repostedByMe ? 'Reposted' : 'Repost'}</span>
            </button>
          </div>

          {/* Caption */}
          {post.caption && (
            <div style={{ padding: '4px 14px 14px', fontSize: 14, color: '#1F1D17', lineHeight: 1.45, fontFamily: "'DM Sans', sans-serif" }}>
              <strong style={{ fontWeight: 700 }}>{authorName(post.author)}</strong> {post.caption}
            </div>
          )}
          {!post.caption && <div style={{ height: 8 }} />}
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
