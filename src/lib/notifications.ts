import { supabase } from './supabase'
import { fetchProfilesForIds } from './friends'
import type { AppNotification } from '../types'

export async function createNotification(
  recipientId: string,
  actorId: string,
  type: 'post_tag' | 'repost' | 'like' | 'comment',
  postId: string | null,
): Promise<void> {
  if (recipientId === actorId) return // don't notify yourself
  await supabase.from('notifications').insert({ user_id: recipientId, actor_id: actorId, type, post_id: postId })
}

export async function fetchNotifications(meId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', meId)
    .order('created_at', { ascending: false })
    .limit(40)
  if (error) throw error
  const rows = data ?? []
  if (!rows.length) return []

  const actors = await fetchProfilesForIds([...new Set(rows.map(r => r.actor_id as string))])
  const postIds = [...new Set(rows.map(r => r.post_id as string).filter(Boolean))]
  const thumbs: Record<string, string> = {}
  if (postIds.length) {
    const { data: posts } = await supabase.from('posts').select('id, image_url').in('id', postIds)
    for (const p of posts ?? []) thumbs[p.id as string] = p.image_url as string
  }

  return rows.map(r => ({
    id:           r.id as string,
    type:         r.type as AppNotification['type'],
    actorId:      r.actor_id as string,
    postId:       (r.post_id as string) ?? null,
    createdAt:    r.created_at as string,
    readAt:       (r.read_at as string) ?? null,
    actor:        actors.find(a => a.userId === r.actor_id),
    postImageUrl: r.post_id ? (thumbs[r.post_id as string] ?? null) : null,
  }))
}

export async function fetchNotificationUnread(meId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', meId)
    .is('read_at', null)
  return count ?? 0
}

export async function markNotificationsRead(meId: string): Promise<void> {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', meId).is('read_at', null)
}
