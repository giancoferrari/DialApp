import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchUserPosts, uploadPostImage, createPost, deletePost,
  toggleLike, fetchComments, addComment, deleteComment, toggleCommentLike, reportPost,
} from '../lib/posts'
import { fetchFriendships, fetchProfilesForIds } from '../lib/friends'
import type { Post, PostComment, PublicProfile, RoundRecapMeta, MatchRecapMeta } from '../types'
import { CloseIcon, HeartIcon, ChatIcon, PlusIcon, CameraIcon, MoreIcon } from './Icons'
import Portal from './Portal'
import RecapCard from './RecapCard'
import Skeleton from './Skeleton'
import { useToast } from './Toast'
import { useSwipeDownDismiss } from '../hooks/useGestures'
import { tapHaptic } from '../lib/native'
import { timeAgo } from '../lib/format'
import { color, font, elevation, radius } from '../lib/tokens'

// Small drag-to-dismiss grabber shown at the top of mobile bottom sheets.
function Grabber() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 2px' }}>
      <div style={{ width: 36, height: 4, borderRadius: 999, background: color.borderStrong }} />
    </div>
  )
}

// Shared sheet chrome
const scrim: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 210,
  background: 'rgba(23,26,23,0.45)',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  display: 'flex', justifyContent: 'center',
  animation: 'fadeIn 0.2s ease',
}

const closeBtn: React.CSSProperties = {
  background: color.sand, border: 'none', borderRadius: 15,
  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
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
      <div onClick={onClose} style={{ ...scrim, zIndex: 240, alignItems: isMobile ? 'flex-end' : 'center', padding: isMobile ? 0 : 24 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: isMobile ? '80vh' : '70vh', background: color.white, borderRadius: isMobile ? '28px 28px 0 0' : radius.sheet, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: elevation.lg, animation: isMobile ? 'slideUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)' : 'scaleIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 12px', borderBottom: `1px solid ${color.border}` }}>
            <div style={{ fontFamily: font.body, fontSize: 16, fontWeight: 650, color: color.ink }}>{done ? 'Report received' : 'Report post'}</div>
            <button onClick={onClose} aria-label="Close" style={closeBtn}>
              <CloseIcon size={13} color={color.inkSoft} />
            </button>
          </div>
          {done ? (
            <div style={{ padding: '28px 24px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, color: color.ink, fontWeight: 600, marginBottom: 8, fontFamily: font.body }}>Thanks for letting us know.</div>
              <div style={{ fontSize: 13, color: color.muted, lineHeight: 1.55, marginBottom: 20 }}>Our team will review this post against our Community Guidelines. We won't notify the person you reported.</div>
              <button onClick={onClose} style={{ background: color.green, color: color.onGreen, border: 'none', borderRadius: radius.md, padding: '11px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: font.body }}>Done</button>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 16px' }}>
              <div style={{ fontSize: 13, color: color.muted, padding: '6px 12px 10px' }}>Why are you reporting this post?</div>
              {REPORT_REASONS.map(r => (
                <button key={r} onClick={() => submit(r)} disabled={busy}
                  style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: radius.sm, padding: '13px 12px', cursor: busy ? 'default' : 'pointer', fontFamily: font.body, fontSize: 14, color: color.ink, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  onMouseEnter={e => { if (!busy) e.currentTarget.style.background = color.sand }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  {r}<span style={{ color: color.faint, fontSize: 16 }}>›</span>
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
    <div onClick={onClose} style={{ ...scrim, alignItems: isMobile ? 'flex-end' : 'center', padding: isMobile ? 0 : 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: color.white, borderRadius: isMobile ? '28px 28px 0 0' : radius.sheet, overflow: 'hidden', boxShadow: elevation.lg, animation: isMobile ? 'slideUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)' : 'scaleIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)', ...(isMobile ? dragStyle : {}) }}>
        {isMobile && <div {...dragHandlers}><Grabber /></div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: `1px solid ${color.border}` }}>
          <div style={{ fontFamily: font.body, fontSize: 16, fontWeight: 650, color: color.ink }}>New post</div>
          <button onClick={onClose} aria-label="Close" style={closeBtn}>
            <CloseIcon size={13} color={color.inkSoft} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{ width: '100%', aspectRatio: '1', borderRadius: radius.card, border: preview ? 'none' : `1.5px dashed ${color.borderStrong}`, background: preview ? '#000' : color.sand, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, padding: 0 }}
          >
            {preview
              ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: color.muted }}>
                  <CameraIcon size={28} color={color.faint} />
                  <span style={{ fontSize: 13, fontWeight: 500, fontFamily: font.body }}>Choose a photo</span>
                </div>}
          </button>
          <textarea
            value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="Write a caption…"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', background: color.white, border: `1px solid ${color.borderStrong}`, borderRadius: radius.sm, padding: '11px 14px', fontSize: 16, color: color.ink, outline: 'none', resize: 'none', fontFamily: font.body, lineHeight: 1.5, marginBottom: 14 }}
            onFocus={e => { e.currentTarget.style.borderColor = color.green }}
            onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
          />

          {friends.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: color.inkSoft, marginBottom: 8, fontFamily: font.body }}>
                Tag players{tagged.length > 0 ? ` (${tagged.length})` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {friends.map(f => {
                  const sel = tagged.includes(f.userId)
                  const nm = f.username ? `@${f.username}` : (f.firstName ?? 'Golfer')
                  return (
                    <button key={f.userId} onClick={() => toggleTag(f.userId)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, background: sel ? color.green : color.white, color: sel ? color.onGreen : color.ink, border: `1px solid ${sel ? color.green : color.borderStrong}`, borderRadius: 999, padding: '5px 12px 5px 5px', cursor: 'pointer', fontFamily: font.body, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                      <span style={{ width: 22, height: 22, borderRadius: 11, overflow: 'hidden', background: sel ? 'rgba(255,255,255,0.15)' : color.greenTint, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {f.avatarUrl ? <img src={f.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: font.body, fontWeight: 600, fontSize: 10, color: sel ? color.onGreen : color.green }}>{nm[0]?.replace('@', '').toUpperCase()}</span>}
                      </span>
                      {nm}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {error && <div style={{ background: '#FBEDEB', border: '1px solid #EFCBC5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: color.dangerDeep, marginBottom: 14 }}>{error}</div>}
          <button
            onClick={share} disabled={busy}
            style={{ width: '100%', background: busy ? color.borderStrong : color.green, color: busy ? color.inkSoft : color.onGreen, border: 'none', borderRadius: radius.md, padding: '14px', fontSize: 15, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: font.body, transition: 'background 0.15s' }}
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
    <div onClick={onClose} style={{ ...scrim, alignItems: isMobile ? 'flex-end' : 'center', padding: isMobile ? 0 : 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: isMobile ? '94vh' : '90vh', background: color.white, borderRadius: isMobile ? '28px 28px 0 0' : radius.sheet, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: elevation.lg, animation: isMobile ? 'slideUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)' : 'scaleIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)', ...(isMobile ? dragStyle : {}) }}>
        {isMobile && <div {...dragHandlers}><Grabber /></div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${color.border}`, flexShrink: 0 }}>
          <div style={{ fontFamily: font.body, fontSize: 15, fontWeight: 600, color: color.ink }}>{authorName}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(v => !v)} aria-label="More options" style={closeBtn}>
                <MoreIcon size={16} color={color.inkSoft} />
              </button>
              {menuOpen && (
                <>
                  <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: color.white, border: `1px solid ${color.border}`, borderRadius: radius.card, padding: 6, boxShadow: elevation.md, minWidth: 170, zIndex: 10 }}>
                    {canDelete && onDelete && (
                      <button onClick={() => { setMenuOpen(false); onDelete() }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: radius.sm, padding: '10px 12px', cursor: 'pointer', fontFamily: font.body, fontSize: 14, fontWeight: 500, color: color.danger }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FBEDEB' }} onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                        Delete post
                      </button>
                    )}
                    {!isMine && (
                      <button onClick={() => { setMenuOpen(false); setReporting(true) }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: radius.sm, padding: '10px 12px', cursor: 'pointer', fontFamily: font.body, fontSize: 14, fontWeight: 500, color: color.ink }}
                        onMouseEnter={e => { e.currentTarget.style.background = color.sand }} onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                        Report post
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <button onClick={onClose} aria-label="Close" style={closeBtn}>
              <CloseIcon size={13} color={color.inkSoft} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {post.kind === 'round' && post.meta
            ? <>
                {post.imageUrl && <img src={post.imageUrl} alt="" decoding="async" style={{ width: '100%', display: 'block', aspectRatio: '4 / 3', objectFit: 'cover' }} />}
                <RecapCard kind="round" meta={post.meta as RoundRecapMeta} variant="detail" />
              </>
            : post.kind === 'match' && post.meta
            ? <RecapCard kind="match" meta={post.meta as MatchRecapMeta} variant="detail" />
            : <img src={post.imageUrl ?? ''} alt="" decoding="async" style={{ width: '100%', display: 'block', background: '#000' }} />}

          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
              <button onClick={onLike} aria-label={liked ? 'Unlike' : 'Like'} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <HeartIcon size={22} color={liked ? color.orange : color.ink} filled={liked} />
                <span style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: liked ? color.orange : color.ink, fontVariantNumeric: 'tabular-nums' }}>{likeCount}</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ChatIcon size={20} color={color.ink} />
                <span style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: color.ink, fontVariantNumeric: 'tabular-nums' }}>{comments.length}</span>
              </div>
            </div>

            {post.caption && (
              <div style={{ fontSize: 14, color: color.ink, lineHeight: 1.5, marginBottom: 6, fontFamily: font.body }}>
                <strong style={{ fontWeight: 600 }}>{authorName}</strong> {post.caption}
              </div>
            )}
            <div style={{ fontSize: 12, color: color.faint, marginBottom: 12 }}>{timeAgo(post.createdAt)}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
              {comments.map(c => {
                const cn = c.author?.username ? `@${c.author.username}` : (c.author?.firstName ?? 'Golfer')
                const mine = c.userId === meId
                const linkBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 600, color: color.muted, fontFamily: font.body }
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: color.ink, lineHeight: 1.45, fontFamily: font.body }}>
                        <strong style={{ fontWeight: 600 }}>{cn}</strong> {c.body}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                        <span style={{ fontSize: 12, color: color.faint }}>{timeAgo(c.createdAt)}</span>
                        {c.likeCount > 0 && <span style={{ fontSize: 12, color: color.faint, fontVariantNumeric: 'tabular-nums' }}>{c.likeCount} like{c.likeCount > 1 ? 's' : ''}</span>}
                        <button onClick={() => startReply(c)} style={linkBtn}>Reply</button>
                        {mine && (
                          <button onClick={async () => { await deleteComment(c.id); setComments(await fetchComments(post.id, meId)); onChanged() }} style={{ ...linkBtn, color: color.danger }}>Delete</button>
                        )}
                      </div>
                    </div>
                    <button onClick={() => onCommentLike(c)} aria-label="Like comment" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', flexShrink: 0 }}>
                      <HeartIcon size={15} color={c.likedByMe ? color.orange : color.faint} filled={c.likedByMe} />
                    </button>
                  </div>
                )
              })}
              {comments.length === 0 && (
                <div style={{ fontSize: 13, color: color.faint }}>No comments yet. Be the first.</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: `12px 12px ${isMobile ? 'calc(env(safe-area-inset-bottom) + 12px)' : '12px'}`, borderTop: `1px solid ${color.border}`, background: color.white, flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="Add a comment…"
            style={{ flex: 1, background: color.sand, border: `1px solid ${color.border}`, borderRadius: 999, padding: '10px 16px', fontSize: 16, color: color.ink, outline: 'none', fontFamily: font.body }}
            onFocus={e => { e.currentTarget.style.borderColor = color.green }}
            onBlur={e => { e.currentTarget.style.borderColor = color.border }}
          />
          <button onClick={submit} disabled={!text.trim() || busy} style={{ background: 'none', border: 'none', cursor: text.trim() ? 'pointer' : 'default', color: text.trim() ? color.green : color.faint, fontFamily: font.body, fontSize: 14, fontWeight: 600, padding: '0 8px' }}>
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
        <div style={{ fontFamily: font.body, fontSize: 16, fontWeight: 650, letterSpacing: '-0.01em', color: color.ink }}>
          Posts{posts.length > 0 && <span style={{ color: color.muted, fontWeight: 500 }}> · {posts.length}</span>}
        </div>
        {canPost && (
          <button onClick={() => setComposer(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: color.white, color: color.ink, border: `1px solid ${color.borderStrong}`, borderRadius: radius.sm, padding: '7px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font.body, transition: 'background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
            onMouseLeave={e => { e.currentTarget.style.background = color.white }}>
            <PlusIcon size={13} color={color.inkSoft} />
            New post
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="auto" radius={6} style={{ aspectRatio: '1' }} />)}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ background: color.white, border: `1px solid ${color.border}`, borderRadius: radius.card, padding: '36px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: color.sand, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <CameraIcon size={22} color={color.faint} />
          </div>
          <div style={{ fontSize: 14, color: color.muted, marginBottom: canPost ? 16 : 0, fontFamily: font.body, lineHeight: 1.5 }}>
            {canPost ? 'Share your first round, your bag, or a great shot.' : 'No posts yet.'}
          </div>
          {canPost && (
            <button onClick={() => setComposer(true)} style={{ background: color.green, color: color.onGreen, border: 'none', borderRadius: radius.md, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: font.body }}>Create a post</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {posts.map(p => (
            <button key={p.id} onClick={() => setActive(p)} style={{ aspectRatio: '1', padding: 0, border: 'none', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', background: '#000', position: 'relative' }}>
              {p.kind === 'round' && p.meta
                ? <RecapCard kind="round" meta={p.meta as RoundRecapMeta} variant="tile" imageUrl={p.imageUrl} />
                : p.kind === 'match' && p.meta
                ? <RecapCard kind="match" meta={p.meta as MatchRecapMeta} variant="tile" />
                : <img src={p.imageUrl ?? ''} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              {(p.likeCount > 0 || p.commentCount > 0) && (
                <div style={{ position: 'absolute', bottom: 5, left: 6, display: 'flex', gap: 8, fontSize: 11, fontWeight: 600, color: '#FFF', textShadow: '0 1px 3px rgba(0,0,0,0.6)', fontVariantNumeric: 'tabular-nums' }}>
                  {p.likeCount > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><HeartIcon size={11} color="#FFF" filled /> {p.likeCount}</span>}
                  {p.commentCount > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><ChatIcon size={11} color="#FFF" /> {p.commentCount}</span>}
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
