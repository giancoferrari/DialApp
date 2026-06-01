import { supabase } from './supabase'
import { fetchProfilesForIds } from './friends'
import type { Conversation, DirectMessage } from '../types'

function toMessage(r: Record<string, unknown>): DirectMessage {
  return {
    id:             r.id as string,
    conversationId: r.conversation_id as string,
    senderId:       r.sender_id as string,
    body:           r.body as string,
    createdAt:      r.created_at as string,
    readAt:         (r.read_at as string) ?? null,
  }
}

// Conversations always store the lexicographically-smaller id as user_a so a
// given pair maps to exactly one row regardless of who starts the chat.
function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

export async function getOrCreateConversation(meId: string, otherId: string): Promise<string> {
  const [ua, ub] = pair(meId, otherId)

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_a', ua)
    .eq('user_b', ub)
    .maybeSingle()
  if (existing) return existing.id as string

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_a: ua, user_b: ub })
    .select('id')
    .single()
  if (error) {
    // Lost a create race — fetch the row the other side made.
    const { data: row } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_a', ua)
      .eq('user_b', ub)
      .maybeSingle()
    if (row) return row.id as string
    throw error
  }
  return data.id as string
}

export async function fetchConversations(meId: string): Promise<Conversation[]> {
  const { data: convs, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user_a.eq.${meId},user_b.eq.${meId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  const rows = convs ?? []
  if (!rows.length) return []

  const otherIds = rows.map(c => (c.user_a === meId ? c.user_b : c.user_a) as string)
  const profiles = await fetchProfilesForIds(otherIds)

  // Unread counts: messages in these conversations not sent by me and unread.
  const convIds = rows.map(c => c.id as string)
  const { data: unreadRows } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', convIds)
    .neq('sender_id', meId)
    .is('read_at', null)
  const unreadMap: Record<string, number> = {}
  for (const u of unreadRows ?? []) {
    const cid = u.conversation_id as string
    unreadMap[cid] = (unreadMap[cid] ?? 0) + 1
  }

  return rows.map(c => {
    const otherUserId = (c.user_a === meId ? c.user_b : c.user_a) as string
    return {
      id:            c.id as string,
      otherUserId,
      otherProfile:  profiles.find(p => p.userId === otherUserId),
      lastMessage:   (c.last_message as string) ?? null,
      lastMessageAt: (c.last_message_at as string) ?? null,
      unread:        unreadMap[c.id as string] ?? 0,
    }
  })
}

export async function fetchMessages(conversationId: string): Promise<DirectMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(toMessage)
}

export async function sendMessage(conversationId: string, senderId: string, body: string): Promise<DirectMessage> {
  const text = body.trim()
  if (!text) throw new Error('Message is empty.')

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: text })
    .select()
    .single()
  if (error) throw error

  // Bump the conversation so it sorts to the top and shows a preview.
  await supabase
    .from('conversations')
    .update({ last_message: text.slice(0, 120), last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  return toMessage(data)
}

export async function markConversationRead(conversationId: string, meId: string): Promise<void> {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', meId)
    .is('read_at', null)
}

export async function fetchUnreadTotal(meId: string): Promise<number> {
  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .or(`user_a.eq.${meId},user_b.eq.${meId}`)
  const ids = (convs ?? []).map(c => c.id as string)
  if (!ids.length) return 0
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', ids)
    .neq('sender_id', meId)
    .is('read_at', null)
  return count ?? 0
}
