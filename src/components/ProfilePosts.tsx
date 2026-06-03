import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchUserPosts, uploadPostImage, createPost, deletePost,
  toggleLike, fetchComments, addComment, deleteComment, toggleCommentLike, reportPost,
} from '../lib/posts'
import { fetchFriendships, fetchProfilesForIds } from '../lib/friends'
import type { Post, PostComment, PublicProfile } from '../types'
import { CloseIcon, HeartIcon, ChatIcon, PlusIcon, CameraIcon, MoreIcon } from './Icons'
import Portal from './Portal'
import RecapCard from './RecapCard'
import Skeleton from './Skeleton'
import { useToast } from './Toast'
import { useSwipeDownDismiss } from '../hooks/useGestures'
import { tapHaptic } from '../lib/native'

// Small drag-to-dismiss grabber shown at the top of mobile bottom sheets.
function Grabber() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 2px' }}>
      <div style={{ width: 38, height: 4, borderRadius: 999, background: '#C9C0A8' }} />
    </div>
  )
}

const REPORT_REASONS = [
  'Spam or misleading',
  'Nudity or sexual content',
  'Hate speech or symbols',
  'Harassment or bullying',
  'Violence or dangerous content',
  'False information',
  'Scam or fraud',
  'Intellectual property violation',
  'Something else',
]

// ── Report a post (reason picker) ──────────────────────────────────────
function ReportSheet({ postId, meId, isMobile, onClose }: {
  postId: string; meId: string; isMobile: boolean; onClose: () => void
}) {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (reason: string) => {
    if (busy) return
    setBusy(true)
    try { await reportPost(postId, meId, reason) } catch { /* still acknowledge */ }
    setBusy(false)
    setDone(true)
  }

  return (
    <Portal>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 240, background: 'rgba(31,29,23,0.55)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: isMobile ? '80vh' : '70vh', background: '#F5F0E6', borderRadius: isMobile ? '24px 24px 0 0' : 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(31,29,23,0.24)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 12px', borderBottom: '1px solid #E0D8C5' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#1F1D17' }}>{done ? 'Report received' : 'Report post'}</div>
            <button onClick={onClose} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CloseIcon size={13} color="#4A4235" />
            </button>
          </div>
          {done ? (
            <div style={{ padding: '28px 24px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, color: '#1F1D17', fontWeight: 600, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Thanks for letting us know.</div>
              <div style={{ fontSize: 13.5, color: '#6B5F4E', lineHeight: 1.5, marginBottom: 20 }}>Our team will review this post against our Community Guidelines. We won't notify the person you reported.</div>
              <button onClick={onClose} style={{ background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '11px 26px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Done</button>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 16px' }}>
              <div style={{ fontSize: 12.5, color: '#6B5F4E', padding: '6px 12px 10px' }}>Why are you reporting this post?</div>
              {REPORT_REASONS.map(r => (
                <button key={r} onClick={() => submit(r)} disabled={busy}
                  style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 10, padding: '13px 12px', cursor: busy ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: '#1F1D17', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  onMouseEnter={e => { if (!busy) e.currentTarget.style.background = '#EDE6D6' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  {r}<span style={{ color: '#8B8272', fontSize: 16 }}>›</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Portal>
  )
}

interface Props {
  targetUserId: string
  meId: string
  isMobile?: boolean
  canPost?: boolean
  authorProfile?: PublicProfile | null   // used to label posts in the detail view
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Composer ─────────────────────────────────────────────────────────────
export function Composer({ meId, isMobile, onClose, onCreated }: {
  meId: string; isMobile: boolean; onClose: () => void; onCreated: () => void
}) {
  const [file, setFile]       = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [caption, setCaption] = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [friends, setFriends] = useState<PublicProfile[]>([])
  const [tagged, setTagged]   = useState<string[]>([])
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const { dragStyle, dragHandlers } = useSwipeDownDismiss(onClose)

  useEffect(() => {
    (async () => {
      try {
        const fs = await fetchFriendships(meId)
        const ids = fs.filter(f => f.status === 'accepted').map(f => f.requesterId === meId ? f.addresseeId : f.requesterId)
        setFriends(await fetchProfilesForIds(ids))
      } catch { /* ignore */ }
    })()
  }, [meId])

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError(null)
  }

  const toggleTag = (id: string) => setTagged(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const share = async () => {
    if (!file) { fileRef.current?.click(); return }
    setBusy(true); setError(null)
    try {
      const url = await uploadPostImage(meId, file)
      await createPost(meId, url, caption, tagged)
      onCreated()
      onClose()
      tapHaptic()
      toast('Shared to your feed')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to share post.')
    } finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(31,29,23,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: '#F5F0E6', borderRadius: isMobile ? '24px 24px 0 0' : 24, overflow: 'hidden', boxShadow: '0 24px 64px rgba(31,29,23,0.24)', ...(isMobile ? dragStyle : {}) }}>
        {isMobile && <div {...dragHandlers}><Grabber /></div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid #E0D8C5' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>New post</div>
          <button onClick={onClose} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <CloseIcon size={14} color="#4A4235" />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{ width: '100%', aspectRatio: '1', borderRadius: 18, border: preview ? 'none' : '2px dashed #C9C0A8', background: preview ? '#000' : '#FAF6EA', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, padding: 0 }}
          >
            {preview
              ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#6B5F4E' }}>
                  <CameraIcon size={30} color="#8B8272" />
                  <span style={{ fontSize: 13.5, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>Choose a photo</span>
                </div>}
          </button>
          <textarea
            value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="Write a caption… (e.g. New personal best at Santa Maria 🏌️)"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', background: '#FFFFFF', border: '1px solid #E0D8C5', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#1F1D17', outline: 'none', resize: 'none', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, marginBottom: 14 }}
            onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
          />

          {friends.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 8 }}>
                Tag players {tagged.length > 0 && `(${tagged.length})`}
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {friends.map(f => {
                  const sel = tagged.includes(f.userId)
                  const nm = f.username ? `@${f.username}` : (f.firstName ?? 'Golfer')
                  return (
                    <button key={f.userId} onClick={() => toggleTag(f.userId)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, background: sel ? '#1F3A2A' : '#FAF6EA', color: sel ? '#FAF6EA' : '#1F1D17', border: `1px solid ${sel ? '#1F3A2A' : '#E0D8C5'}`, borderRadius: 999, padding: '6px 12px 6px 6px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      <span style={{ width: 22, height: 22, borderRadius: 11, overflow: 'hidden', background: sel ? '#2A4D39' : '#F0EBDD', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {f.avatarUrl ? <img src={f.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 10, color: '#D9824D' }}>{nm[0]?.replace('@', '').toUpperCase()}</span>}
                      </span>
                      {nm}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {error && <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#D9824D', marginBottom: 14 }}>{error}</div>}
          <button
            onClick={share} disabled={busy}
            style={{ width: '100%', background: busy ? '#8B8272' : '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            {busy ? 'Sharing…' : file ? 'Share post' : 'Choose a photo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Post detail (likes + comments) ────────────────────────────────────────
export function PostDetail({ post, meId, isMobile, authorProfile, canDelete, onClose, onChanged, onDelete }: {
  post: Post; meId: string; isMobile: boolean; authorProfile?: PublicProfile | null
  canDelete?: boolean; onClose: () => void; onChanged: () => void; onDelete?: () => void
}) {
  const [liked, setLiked]       = useState(post.likedByMe)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [comments, setComments] = useState<PostComment[]>([])
  const [text, setText]         = useState('')
  const [busy, setBusy]         = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reporting, setReporting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMine = post.userId === meId
  const { dragStyle, dragHandlers } = useSwipeDownDismiss(onClose)

  useEffect(() => { fetchComments(post.id, meId).then(setComments).catch(() => {}) }, [post.id, meId])

  const onLike = async () => {
    const wasLiked = liked
    if (!wasLiked) tapHaptic()
    setLiked(!wasLiked); setLikeCount(c => c + (wasLiked ? -1 : 1))
    try { await toggleLike(post.id, post.userId, meId, wasLiked); onChanged() }
    catch { setLiked(wasLiked); setLikeCount(c => c + (wasLiked ? 1 : -1)) }
  }

  const onCommentLike = async (c: PostComment) => {
    const wasLiked = c.likedByMe
    setComments(prev => prev.map(x => x.id === c.id ? { ...x, likedByMe: !wasLiked, likeCount: x.likeCount + (wasLiked ? -1 : 1) } : x))
    try { await toggleCommentLike(c.id, meId, wasLiked) }
    catch { setComments(prev => prev.map(x => x.id === c.id ? { ...x, likedByMe: wasLiked, likeCount: x.likeCount + (wasLiked ? 1 : -1) } : x)) }
  }

  const startReply = (c: PostComment) => {
    const mention = c.author?.username ? `@${c.author.username} ` : ''
    setText(mention)
    requestAnimationFrame(() => { inputRef.current?.focus() })
  }

  const submit = async () => {
    const body = text.trim()
    if (!body || busy) return
    setBusy(true); setText('')
    try { await addComment(post.id, post.userId, meId, body); setComments(await fetchComments(post.id, meId)); onChanged() }
    catch { setText(body) }
    finally { setBusy(false) }
  }

  const authorName = authorProfile?.username ? `@${authorProfile.username}` : (authorProfile?.firstName ?? 'Golfer')

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(31,29,23,0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, maxHeight: isMobile ? '94vh' : '90vh', background: '#F5F0E6', borderRadius: isMobile ? '24px 24px 0 0' : 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(31,29,23,0.24)', ...(isMobile ? dragStyle : {}) }}>
        {isMobile && <div {...dragHandlers}><Grabber /></div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #E0D8C5', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>{authorName}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(v => !v)} aria-label="More options" style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <MoreIcon size={16} color="#4A4235" />
              </button>
              {menuOpen && (
                <>
                  <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 14, padding: 6, boxShadow: '0 12px 32px rgba(31,58,42,0.18)', minWidth: 170, zIndex: 10 }}>
                    {canDelete && onDelete && (
                      <button onClick={() => { setMenuOpen(false); onDelete() }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 600, color: '#C0392B' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F6E9E5' }} onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                        Delete post
                      </button>
                    )}
                    {!isMine && (
                      <button onClick={() => { setMenuOpen(false); setReporting(true) }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 500, color: '#1F1D17' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F0EBDD' }} onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                        Report post
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <button onClick={onClose} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CloseIcon size={13} color="#4A4235" />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {post.kind === 'round' && post.meta
            ? <RecapCard meta={post.meta} variant="detail" />
            : <img src={post.imageUrl ?? ''} alt="" decoding="async" style={{ width: '100%', display: 'block', background: '#000' }} />}

          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
              <button onClick={onLike} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <HeartIcon size={24} color={liked ? '#D9824D' : '#1F1D17'} filled={liked} />
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17' }}>{likeCount}</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ChatIcon size={22} color="#1F1D17" />
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17' }}>{comments.length}</span>
              </div>
            </div>

            {post.caption && (
              <div style={{ fontSize: 14, color: '#1F1D17', lineHeight: 1.5, marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
                <strong style={{ fontWeight: 700 }}>{authorName}</strong> {post.caption}
              </div>
            )}
            <div style={{ fontSize: 11.5, color: '#8B8272', marginBottom: 12 }}>{timeAgo(post.createdAt)}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
              {comments.map(c => {
                const cn = c.author?.username ? `@${c.author.username}` : (c.author?.firstName ?? 'Golfer')
                const mine = c.userId === meId
                const linkBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11.5, fontWeight: 600, color: '#6B5F4E', fontFamily: "'DM Sans', sans-serif" }
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: '#1F1D17', lineHeight: 1.45, fontFamily: "'DM Sans', sans-serif" }}>
                        <strong style={{ fontWeight: 700 }}>{cn}</strong> {c.body}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: '#8B8272' }}>{timeAgo(c.createdAt)}</span>
                        {c.likeCount > 0 && <span style={{ fontSize: 11, color: '#8B8272' }}>{c.likeCount} like{c.likeCount > 1 ? 's' : ''}</span>}
                        <button onClick={() => startReply(c)} style={linkBtn}>Reply</button>
                        {mine && (
                          <button onClick={async () => { await deleteComment(c.id); setComments(await fetchComments(post.id, meId)); onChanged() }} style={{ ...linkBtn, color: '#C0603A' }}>Delete</button>
                        )}
                      </div>
                    </div>
                    <button onClick={() => onCommentLike(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', flexShrink: 0 }}>
                      <HeartIcon size={15} color={c.likedByMe ? '#D9824D' : '#A89F8C'} filled={c.likedByMe} />
                    </button>
                  </div>
                )
              })}
              {comments.length === 0 && (
                <div style={{ fontSize: 13, color: '#8B8272', fontStyle: 'italic' }}>No comments yet. Be the first.</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: `12px 12px ${isMobile ? 'calc(env(safe-area-inset-bottom) + 12px)' : '12px'}`, borderTop: '1px solid #E0D8C5', background: '#F5F0E6', flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="Add a comment…"
            style={{ flex: 1, background: '#FFFFFF', border: '1px solid #E0D8C5', borderRadius: 20, padding: '10px 16px', fontSize: 16, color: '#1F1D17', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
            onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
          />
          <button onClick={submit} disabled={!text.trim() || busy} style={{ background: 'none', border: 'none', cursor: text.trim() ? 'pointer' : 'default', color: text.trim() ? '#1F3A2A' : '#C9C0A8', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, padding: '0 8px' }}>
            Post
          </button>
        </div>
      </div>
      {reporting && <ReportSheet postId={post.id} meId={meId} isMobile={isMobile} onClose={() => setReporting(false)} />}
    </div>
  )
}

// ── Posts grid ─────────────────────────────────────────────────────────────
export default function ProfilePosts({ targetUserId, meId, isMobile = false, canPost = false, authorProfile = null }: Props) {
  const qc = useQueryClient()
  const [composer, setComposer] = useState(false)
  const [active, setActive]   = useState<Post | null>(null)
  const postsKey = ['userPosts', targetUserId, meId]

  const { data: posts = [], isLoading: loading } = useQuery({
    queryKey: postsKey,
    queryFn: () => fetchUserPosts(targetUserId, meId),
  })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: postsKey })
    qc.invalidateQueries({ queryKey: ['feed'] })
  }

  const removePost = async (p: Post) => {
    setActive(null)
    qc.setQueryData<Post[]>(postsKey, (old = []) => old.filter(x => x.id !== p.id))
    try { await deletePost(p.id) } catch { refresh() }
    qc.invalidateQueries({ queryKey: ['feed'] })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#5C7A4D', textTransform: 'uppercase' }}>
          Posts{posts.length > 0 ? ` · ${posts.length}` : ''}
        </div>
        {canPost && (
          <button onClick={() => setComposer(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '7px 14px 7px 12px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <span style={{ width: 18, height: 18, borderRadius: 9, background: '#D9824D', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlusIcon size={12} color="#FAF6EA" />
            </span>
            New post
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="auto" radius={4} style={{ aspectRatio: '1' }} />)}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 18, padding: '36px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: '#F0EBDD', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <CameraIcon size={22} color="#8B8272" />
          </div>
          <div style={{ fontSize: 14, color: '#6B5F4E', marginBottom: canPost ? 16 : 0, fontFamily: "'DM Sans', sans-serif" }}>
            {canPost ? 'Share your first round, your bag, or a great shot.' : 'No posts yet.'}
          </div>
          {canPost && (
            <button onClick={() => setComposer(true)} style={{ background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '10px 22px', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Create a post</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {posts.map(p => (
            <button key={p.id} onClick={() => setActive(p)} style={{ aspectRatio: '1', padding: 0, border: 'none', borderRadius: 4, overflow: 'hidden', cursor: 'pointer', background: '#000', position: 'relative' }}>
              {p.kind === 'round' && p.meta
                ? <RecapCard meta={p.meta} variant="tile" />
                : <img src={p.imageUrl ?? ''} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              {(p.likeCount > 0 || p.commentCount > 0) && (
                <div style={{ position: 'absolute', bottom: 4, left: 4, display: 'flex', gap: 8, fontSize: 10.5, fontWeight: 700, color: '#FFF', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                  {p.likeCount > 0 && <span>♥ {p.likeCount}</span>}
                  {p.commentCount > 0 && <span>💬 {p.commentCount}</span>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {composer && <Portal><Composer meId={meId} isMobile={isMobile} onClose={() => setComposer(false)} onCreated={refresh} /></Portal>}
      {active && (
        <Portal>
          <PostDetail
            post={active} meId={meId} isMobile={isMobile} authorProfile={authorProfile}
            canDelete={canPost && active.userId === meId}
            onClose={() => setActive(null)}
            onChanged={refresh}
            onDelete={() => removePost(active)}
          />
        </Portal>
      )}
    </div>
  )
}
