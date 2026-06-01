import { useState, useEffect, useCallback } from 'react'
import { fetchFriendships } from '../lib/friends'
import { fetchFeedPosts, toggleLike, deletePost } from '../lib/posts'
import type { Post, PublicProfile } from '../types'
import { HeartIcon, ChatIcon } from './Icons'
import Portal from './Portal'
import { PostDetail } from './ProfilePosts'

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

export default function Feed({ userId, isMobile = false, onViewProfile }: Props) {
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive]   = useState<Post | null>(null)

  const load = useCallback(async () => {
    try {
      const fs = await fetchFriendships(userId)
      const friendIds = fs.filter(f => f.status === 'accepted')
        .map(f => f.requesterId === userId ? f.addresseeId : f.requesterId)
      setPosts(await fetchFeedPosts([userId, ...friendIds], userId))
    } catch { /* tables may not exist yet */ }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { load() }, [load])

  const handleLike = async (post: Post) => {
    const wasLiked = post.likedByMe
    setPosts(prev => prev.map(p => p.id === post.id
      ? { ...p, likedByMe: !wasLiked, likeCount: p.likeCount + (wasLiked ? -1 : 1) }
      : p))
    try { await toggleLike(post.id, userId, wasLiked) }
    catch {
      setPosts(prev => prev.map(p => p.id === post.id
        ? { ...p, likedByMe: wasLiked, likeCount: p.likeCount + (wasLiked ? 1 : -1) }
        : p))
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 28, fontSize: 13, color: '#6B5F4E' }}>Loading the clubhouse…</div>
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
        <div key={post.id} style={{ background: 'rgba(250,246,234,0.82)', backdropFilter: 'blur(28px) saturate(170%)', WebkitBackdropFilter: 'blur(28px) saturate(170%)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 22px rgba(31,29,23,0.09), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
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

          {/* Image */}
          <button onClick={() => setActive(post)} style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: '#000', cursor: 'pointer' }}>
            <img src={post.imageUrl} alt="" loading="lazy" decoding="async" style={{ width: '100%', display: 'block', maxHeight: isMobile ? 440 : 520, objectFit: 'cover' }} />
          </button>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '11px 14px 4px' }}>
            <button onClick={() => handleLike(post)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <HeartIcon size={23} color={post.likedByMe ? '#D9824D' : '#1F1D17'} filled={post.likedByMe} />
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700, color: '#1F1D17' }}>{post.likeCount}</span>
            </button>
            <button onClick={() => setActive(post)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <ChatIcon size={21} color="#1F1D17" />
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700, color: '#1F1D17' }}>{post.commentCount}</span>
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
            onChanged={load}
            onDelete={async () => { const id = active.id; setActive(null); try { await deletePost(id) } catch { /* ignore */ } load() }}
          />
        </Portal>
      )}
    </div>
  )
}
