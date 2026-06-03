import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { fetchFriendships, fetchProfilesForIds, searchUsers } from '../lib/friends'
import {
  fetchConversations, getOrCreateConversation, fetchMessages,
  sendMessage, markConversationRead,
} from '../lib/messages'
import type { Conversation, DirectMessage, PublicProfile } from '../types'
import { CloseIcon, SendIcon, PlusIcon, ChatIcon } from './Icons'
import Portal from './Portal'
import Skeleton from './Skeleton'
import Avatar from './Avatar'
import EmptyState from './EmptyState'
import Button from './Button'
import { tapHaptic } from '../lib/native'
import { timeAgo, displayName } from '../lib/format'
import { useEdgeSwipeBack, useSwipeDownDismiss } from '../hooks/useGestures'

// Drag-to-dismiss grabber for mobile bottom sheets.
function Grabber() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 2px' }}>
      <div style={{ width: 38, height: 4, borderRadius: 999, background: '#C9C0A8' }} />
    </div>
  )
}

interface Props {
  userId: string
  isMobile?: boolean
  startUserId?: string | null
  onUnreadChange?: () => void
  onViewProfile?: (userId: string) => void
}

function msgTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function dayLabel(ts: string): string {
  const d = new Date(ts)
  const today = new Date()
  const yest = new Date(); yest.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

const relTime = (ts: string | null): string => (ts ? timeAgo(ts) : '')
const name = displayName

// ── Chat thread (full-screen overlay) ──────────────────────────────────
function Thread({ conversation, userId, isMobile, onClose, onActivity, onViewProfile }: {
  conversation: Conversation
  userId: string
  isMobile: boolean
  onClose: () => void
  onActivity: () => void
  onViewProfile?: (userId: string) => void
}) {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [sendError, setSendError] = useState<string | null>(null)
  useEdgeSwipeBack(onClose)
  const [vp, setVp] = useState<{ h: number; top: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Instagram-style keyboard behaviour: pin the overlay to the *visual*
  // viewport so the header stays put and only the chat area shrinks when the
  // keyboard opens. Tracking offsetTop keeps it aligned if the page nudges.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      setVp({ h: vv.height, top: vv.offsetTop })
      requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight })
    }
    onResize()
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => { vv.removeEventListener('resize', onResize); vv.removeEventListener('scroll', onResize) }
  }, [])

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    })
  }

  useEffect(() => {
    let alive = true
    fetchMessages(conversation.id)
      .then(m => { if (alive) { setMessages(m); setLoading(false); scrollToBottom() } })
      .catch(() => { if (alive) setLoading(false) })
    markConversationRead(conversation.id, userId).then(onActivity).catch(() => {})

    const ch = supabase
      .channel(`thread-${conversation.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        payload => {
          const r = payload.new as Record<string, unknown>
          setMessages(prev => {
            if (prev.some(m => m.id === r.id)) return prev
            return [...prev, {
              id: r.id as string, conversationId: r.conversation_id as string,
              senderId: r.sender_id as string, body: r.body as string,
              createdAt: r.created_at as string, readAt: (r.read_at as string) ?? null,
            }]
          })
          scrollToBottom()
          if (r.sender_id !== userId) markConversationRead(conversation.id, userId).then(onActivity).catch(() => {})
        })
      .subscribe()
    return () => { alive = false; supabase.removeChannel(ch) }
  }, [conversation.id, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    setSendError(null)
    tapHaptic()
    // Optimistic
    const optimistic: DirectMessage = {
      id: `tmp-${Date.now()}`, conversationId: conversation.id, senderId: userId,
      body: text, createdAt: new Date().toISOString(), readAt: null,
    }
    setMessages(prev => [...prev, optimistic])
    scrollToBottom()
    try {
      const saved = await sendMessage(conversation.id, userId, text)
      setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m))
      onActivity()
    } catch (e: unknown) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setInput(text)
      setSendError(e instanceof Error ? e.message : "Couldn't send. Check your connection and try again.")
    } finally { setSending(false) }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: vp != null ? `${vp.h}px` : '100%', transform: vp != null ? `translateY(${vp.top}px)` : undefined, zIndex: 200, background: '#F0EBDD', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 560, height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(245,240,230,0.96)', boxShadow: isMobile ? 'none' : '0 0 60px rgba(31,29,23,0.18)' }}>

        {/* Header (stays pinned when keyboard opens) */}
        <div style={{ background: '#1F3A2A', color: '#FAF6EA', padding: `${isMobile ? 'calc(env(safe-area-inset-top) + 12px)' : '14px'} 16px 12px`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'rgba(250,246,234,0.14)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <span style={{ fontSize: 22, color: '#FAF6EA', lineHeight: 1 }}>‹</span>
          </button>
          <button
            onClick={() => onViewProfile?.(conversation.otherUserId)}
            style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: onViewProfile ? 'pointer' : 'default', padding: 0, textAlign: 'left' }}
          >
            <Avatar profile={conversation.otherProfile} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name(conversation.otherProfile)}
              </div>
              <div style={{ fontSize: 11.5, color: '#B5C29A' }}>
                {conversation.otherProfile?.handicapIndex != null ? `HCP ${conversation.otherProfile.handicapIndex.toFixed(1)} · ` : ''}View profile
              </div>
            </div>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as never, padding: '16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#6B5F4E', fontSize: 13, marginTop: 24 }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6B5F4E', fontSize: 13, marginTop: 40 }}>
              Say hello to {name(conversation.otherProfile)}
            </div>
          ) : messages.map((m, i) => {
            const mine = m.senderId === userId
            const prev = messages[i - 1]
            const next = messages[i + 1]
            const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
            const startGroup = newDay || !prev || prev.senderId !== m.senderId
            const endGroup   = !next || next.senderId !== m.senderId || new Date(next.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
            return (
              <div key={m.id}>
                {newDay && (
                  <div style={{ textAlign: 'center', margin: '14px 0 10px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#8B8272', background: 'rgba(224,216,197,0.5)', borderRadius: 999, padding: '4px 12px', letterSpacing: '0.02em' }}>{dayLabel(m.createdAt)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: startGroup ? 8 : 2 }}>
                  <div style={{
                    maxWidth: '80%', padding: '8px 13px 6px', borderRadius: 20,
                    borderBottomRightRadius: mine && endGroup ? 5 : 20,
                    borderBottomLeftRadius: !mine && endGroup ? 5 : 20,
                    background: mine ? '#1F3A2A' : '#FFFFFF',
                    color: mine ? '#FAF6EA' : '#1F1D17',
                    border: mine ? 'none' : '1px solid #E0D8C5',
                    fontSize: 14.5, lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif",
                    boxShadow: '0 1px 2px rgba(31,29,23,0.06)', wordBreak: 'break-word',
                    display: 'flex', flexDirection: 'column',
                  }}>
                    <span>{m.body}</span>
                    <span style={{ fontSize: 9.5, alignSelf: 'flex-end', marginTop: 2, color: mine ? 'rgba(250,246,234,0.55)' : '#A89F8C' }}>
                      {msgTime(m.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {sendError && (
          <div style={{ flexShrink: 0, padding: '8px 16px', background: 'rgba(192,57,43,0.10)', borderTop: '1px solid rgba(192,57,43,0.25)', fontSize: 12.5, color: '#C0392B', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>
            {sendError}
          </div>
        )}

        {/* Composer */}
        <div style={{ padding: `12px 12px ${isMobile ? 'calc(env(safe-area-inset-bottom) + 12px)' : '12px'}`, borderTop: '1px solid #E0D8C5', background: '#F5F0E6', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Message…"
            rows={1}
            style={{ flex: 1, resize: 'none', maxHeight: 120, background: '#FFFFFF', border: '1px solid #E0D8C5', borderRadius: 20, padding: '11px 16px', fontSize: 16, color: '#1F1D17', outline: 'none', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}
            onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, background: input.trim() ? '#1F3A2A' : '#C9C0A8', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'default', transition: 'background 0.15s' }}
          >
            <SendIcon size={18} color="#FAF6EA" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New conversation picker ─────────────────────────────────────────────
function NewMessageSheet({ userId, isMobile, onPick, onClose }: {
  userId: string
  isMobile: boolean
  onPick: (otherId: string) => void
  onClose: () => void
}) {
  const [friends, setFriends] = useState<PublicProfile[]>([])
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<PublicProfile[]>([])
  const [searching, setSearching] = useState(false)
  const { dragStyle, dragHandlers } = useSwipeDownDismiss(onClose)

  useEffect(() => {
    (async () => {
      const fs = await fetchFriendships(userId)
      const accepted = fs.filter(f => f.status === 'accepted')
      const ids = accepted.map(f => f.requesterId === userId ? f.addresseeId : f.requesterId)
      setFriends(await fetchProfilesForIds(ids))
    })().catch(() => {})
  }, [userId])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    let alive = true
    setSearching(true)
    const t = setTimeout(async () => {
      try { const r = await searchUsers(query, userId); if (alive) setResults(r) }
      catch { /* ignore */ }
      finally { if (alive) setSearching(false) }
    }, 280)
    return () => { alive = false; clearTimeout(t) }
  }, [query, userId])

  const list = query.trim() ? results : friends

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(31,29,23,0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24, animation: 'fadeIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: isMobile ? '85vh' : '80vh', background: '#F5F0E6', borderRadius: isMobile ? '24px 24px 0 0' : 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(31,29,23,0.24)', animation: isMobile ? 'slideUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)' : 'scaleIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)', ...(isMobile ? dragStyle : {}) }}>
        {isMobile && <div {...dragHandlers}><Grabber /></div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid #E0D8C5', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>New message</div>
          <button onClick={onClose} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <CloseIcon size={14} color="#4A4235" />
          </button>
        </div>
        <div style={{ padding: '14px 20px 8px', flexShrink: 0 }}>
          <input
            value={query} onChange={e => setQuery(e.target.value)} autoFocus
            placeholder="Search players by username…"
            style={{ width: '100%', boxSizing: 'border-box', background: '#FFFFFF', border: '1px solid #E0D8C5', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#1F1D17', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
            onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px 16px' }}>
          {!query.trim() && (
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B5F4E', textTransform: 'uppercase', padding: '8px 8px 6px' }}>Friends</div>
          )}
          {searching && <div style={{ textAlign: 'center', color: '#6B5F4E', fontSize: 13, padding: 16 }}>Searching…</div>}
          {!searching && list.length === 0 && (
            <div style={{ textAlign: 'center', color: '#6B5F4E', fontSize: 13, padding: 24 }}>
              {query.trim() ? 'No players found.' : 'Add friends to start chatting, or search above.'}
            </div>
          )}
          {list.map(p => (
            <button key={p.userId} onClick={() => onPick(p.userId)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', borderRadius: 12, padding: '10px 8px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EDE6D6' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <Avatar profile={p} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>{name(p)}</div>
                {p.handicapIndex != null && <div style={{ fontSize: 12, color: '#6B5F4E' }}>HCP {p.handicapIndex.toFixed(1)}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main view ────────────────────────────────────────────────────────────
export default function MessagesView({ userId, isMobile = false, startUserId = null, onUnreadChange, onViewProfile }: Props) {
  const qc = useQueryClient()
  const [active, setActive]   = useState<Conversation | null>(null)
  const [showNew, setShowNew] = useState(false)

  const { data: conversations = [], isLoading: loading } = useQuery({
    queryKey: ['conversations', userId],
    queryFn: () => fetchConversations(userId),
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['conversations', userId] })

  // Open a conversation directly (e.g. tapped "Message" on someone's profile)
  useEffect(() => {
    if (!startUserId) return
    (async () => {
      const convId = await getOrCreateConversation(userId, startUserId)
      const profiles = await fetchProfilesForIds([startUserId])
      setActive({ id: convId, otherUserId: startUserId, otherProfile: profiles[0], lastMessage: null, lastMessageAt: null, unread: 0 })
    })().catch(() => {})
  }, [startUserId, userId])

  // Refresh list when a new message lands in any of my conversations
  useEffect(() => {
    const inval = () => qc.invalidateQueries({ queryKey: ['conversations', userId] })
    const ch = supabase
      .channel(`convs-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => { inval(); onUnreadChange?.() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, inval)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId, qc, onUnreadChange])

  const openWith = async (otherId: string) => {
    setShowNew(false)
    const existing = conversations.find(c => c.otherUserId === otherId)
    if (existing) { setActive(existing); return }
    const convId = await getOrCreateConversation(userId, otherId)
    const profiles = await fetchProfilesForIds([otherId])
    setActive({ id: convId, otherUserId: otherId, otherProfile: profiles[0], lastMessage: null, lastMessageAt: null, unread: 0 })
  }

  const closeThread = () => { setActive(null); refresh(); onUnreadChange?.() }

  const px = isMobile ? 20 : 40

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 28 : 48}px ${px}px ${isMobile ? 120 : 80}px` }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#8B8272', textTransform: 'uppercase', marginBottom: 8 }}>Inbox</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 32 : 44, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.035em', margin: 0, lineHeight: 1 }}>Messages</h1>
        </div>
        <button onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '10px 16px 10px 18px', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(31,58,42,0.20)' }}>
          New
          <span style={{ width: 20, height: 20, borderRadius: 10, background: '#D9824D', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlusIcon size={13} color="#FAF6EA" />
          </span>
        </button>
      </div>

      {loading ? (
        <div style={{ background: 'rgba(250,246,234,0.78)', border: '1px solid rgba(255,255,255,0.66)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 6px 28px rgba(31,29,23,0.09), inset 0 1px 0 rgba(255,255,255,0.82)' }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderTop: i === 0 ? 'none' : '1px solid rgba(224,216,197,0.5)' }}>
              <Skeleton width={48} height={48} radius={24} />
              <div style={{ flex: 1 }}>
                <Skeleton width="42%" height={13} />
                <Skeleton width="68%" height={11} style={{ marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={<ChatIcon size={24} color="#8B8272" />}
          title="No messages yet"
          subtitle="Start a conversation with a friend or any player."
          action={<Button onClick={() => setShowNew(true)}>Start a chat</Button>}
        />
      ) : (
        <div style={{ background: '#FFFDF8', border: '1px solid #E0D8C5', borderRadius: 18, overflow: 'hidden' }}>
          {conversations.map((c, i) => (
            <button key={c.id} onClick={() => setActive(c)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, background: 'transparent', border: 'none', borderTop: i === 0 ? 'none' : '1px solid rgba(224,216,197,0.5)', padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(240,235,221,0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <Avatar profile={c.otherProfile} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(c.otherProfile)}</span>
                  <span style={{ fontSize: 11, color: '#8B8272', flexShrink: 0 }}>{relTime(c.lastMessageAt)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 3 }}>
                  <span style={{ fontSize: 13, color: c.unread > 0 ? '#1F1D17' : '#6B5F4E', fontWeight: c.unread > 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.lastMessage ?? 'No messages yet'}
                  </span>
                  {c.unread > 0 && (
                    <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 9, background: '#D9824D', color: '#FAF6EA', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', fontFamily: "'DM Sans', sans-serif" }}>
                      {c.unread > 9 ? '9+' : c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {active && <Portal><Thread conversation={active} userId={userId} isMobile={isMobile} onClose={closeThread} onActivity={() => { refresh(); onUnreadChange?.() }} onViewProfile={onViewProfile} /></Portal>}
      {showNew && <Portal><NewMessageSheet userId={userId} isMobile={isMobile} onPick={openWith} onClose={() => setShowNew(false)} /></Portal>}
    </div>
  )
}
