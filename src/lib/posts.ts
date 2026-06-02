import { supabase } from './supabase'
import { fetchProfilesForIds } from './friends'
import { compressImage } from './imageCompress'
import { createNotification } from './notifications'
import type { Post, PostComment } from '../types'

function toPost(r: Record<string, unknown>): Omit<Post, 'likeCount' | 'commentCount' | 'likedByMe'> {
  return {
    id:        r.id as string,
    userId:    r.user_id as string,
    imageUrl:  r.image_url as string,
    caption:   (r.caption as string) ?? null,
    createdAt: r.created_at as string,
  }
}

export async function uploadPostImage(userId: string, file: File): Promise<string> {
  const compressed = await compressImage(file)
  const ext  = (compressed.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('post-images')
    .upload(path, compressed, { upsert: false, contentType: compressed.type })
  if (error) throw error
  const { data } = supabase.storage.from('post-images').getPublicUrl(path)
  return data.publicUrl
}

export async function createPost(userId: string, imageUrl: string, caption: string, taggedIds: string[] = []): Promise<void> {
  const { data, error } = await supabase
    .from('posts')
    .insert({ user_id: userId, image_url: imageUrl, caption: caption.trim() || null })
    .select('id')
    .single()
  if (error) throw error
  const postId = data.id as string
  const tags = taggedIds.filter(id => id && id !== userId)
  if (tags.length) {
    await supabase.from('post_tags').insert(tags.map(uid => ({ post_id: postId, user_id: uid })))
    await Promise.all(tags.map(uid => createNotification(uid, userId, 'post_tag', postId)))
  }
}

export async function toggleRepost(postId: string, ownerId: string, meId: string, reposted: boolean): Promise<void> {
  if (reposted) {
    const { error } = await supabase.from('reposts').delete().eq('post_id', postId).eq('user_id', meId)
    if (error) throw error
  } else {
    const { error } = await supabase.from('reposts').insert({ post_id: postId, user_id: meId })
    if (error) throw error
    await createNotification(ownerId, meId, 'repost', postId)
  }
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId)
  if (error) throw error
}

// Hydrate a set of post rows with like/comment counts + whether I liked them.
async function hydratePosts(rows: Record<string, unknown>[], meId: string): Promise<Post[]> {
  if (!rows.length) return []
  const ids = rows.map(r => r.id as string)

  const [{ data: likes }, { data: comments }] = await Promise.all([
    supabase.from('post_likes').select('post_id, user_id').in('post_id', ids),
    supabase.from('post_comments').select('post_id').in('post_id', ids),
  ])

  const likeCount: Record<string, number>    = {}
  const likedByMe: Record<string, boolean>   = {}
  for (const l of likes ?? []) {
    const pid = l.post_id as string
    likeCount[pid] = (likeCount[pid] ?? 0) + 1
    if (l.user_id === meId) likedByMe[pid] = true
  }
  const commentCount: Record<string, number> = {}
  for (const c of comments ?? []) {
    const pid = c.post_id as string
    commentCount[pid] = (commentCount[pid] ?? 0) + 1
  }

  return rows.map(r => {
    const base = toPost(r)
    return {
      ...base,
      likeCount:    likeCount[base.id] ?? 0,
      commentCount: commentCount[base.id] ?? 0,
      likedByMe:    likedByMe[base.id] ?? false,
    }
  })
}

export async function fetchUserPosts(targetUserId: string, meId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return hydratePosts(data ?? [], meId)
}

// Feed: recent original posts + reposts from a set of users (me + friends).
export async function fetchFeedPosts(userIds: string[], meId: string): Promise<Post[]> {
  if (!userIds.length) return []

  const [{ data: orig }, { data: rrows }] = await Promise.all([
    supabase.from('posts').select('*').in('user_id', userIds).order('created_at', { ascending: false }).limit(40),
    supabase.from('reposts').select('post_id, user_id, created_at').in('user_id', userIds).order('created_at', { ascending: false }).limit(40),
  ])

  // Load the posts referenced by reposts (their authors may be anyone).
  const repostIds = [...new Set((rrows ?? []).map(r => r.post_id as string))]
  let repostRows: Record<string, unknown>[] = []
  if (repostIds.length) {
    const { data } = await supabase.from('posts').select('*').in('id', repostIds)
    repostRows = data ?? []
  }

  const uniqueRows = Array.from(new Map([...(orig ?? []), ...repostRows].map(r => [r.id as string, r])).values())
  const hydrated = await hydratePosts(uniqueRows, meId)
  const byId = new Map(hydrated.map(p => [p.id, p]))

  // Which of these have I reposted (for button state)?
  const { data: mine } = byId.size
    ? await supabase.from('reposts').select('post_id').eq('user_id', meId).in('post_id', [...byId.keys()])
    : { data: [] as { post_id: string }[] }
  const myReposts = new Set((mine ?? []).map(r => r.post_id as string))

  // Build feed entries (original + repost), sorted by their effective time.
  const entries: { ts: number; postId: string; reposterId: string | null }[] = []
  for (const p of (orig ?? [])) entries.push({ ts: new Date(p.created_at as string).getTime(), postId: p.id as string, reposterId: null })
  for (const r of (rrows ?? [])) entries.push({ ts: new Date(r.created_at as string).getTime(), postId: r.post_id as string, reposterId: r.user_id as string })
  entries.sort((a, b) => b.ts - a.ts)
  const top = entries.slice(0, 40)

  const profileIds = new Set<string>()
  top.forEach(e => { const hp = byId.get(e.postId); if (hp) profileIds.add(hp.userId); if (e.reposterId) profileIds.add(e.reposterId) })
  const profiles = await fetchProfilesForIds([...profileIds])

  return top.flatMap(e => {
    const hp = byId.get(e.postId)
    if (!hp) return []
    return [{
      ...hp,
      author: profiles.find(a => a.userId === hp.userId),
      repostedBy: e.reposterId ? (profiles.find(a => a.userId === e.reposterId) ?? null) : null,
      repostedByMe: myReposts.has(hp.id),
    }]
  })
}

export async function toggleLike(postId: string, meId: string, liked: boolean): Promise<void> {
  if (liked) {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', meId)
    if (error) throw error
  } else {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: meId })
    if (error) throw error
  }
}

export async function fetchComments(postId: string, meId: string): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error) throw error
  const rows = data ?? []
  const ids  = rows.map(r => r.id as string)

  const [authors, likesRes] = await Promise.all([
    fetchProfilesForIds([...new Set(rows.map(r => r.user_id as string))]),
    ids.length
      ? supabase.from('post_comment_likes').select('comment_id, user_id').in('comment_id', ids)
      : Promise.resolve({ data: [] as { comment_id: string; user_id: string }[] }),
  ])
  const likeCount: Record<string, number>  = {}
  const likedByMe: Record<string, boolean> = {}
  for (const l of likesRes.data ?? []) {
    const cid = l.comment_id as string
    likeCount[cid] = (likeCount[cid] ?? 0) + 1
    if (l.user_id === meId) likedByMe[cid] = true
  }

  return rows.map(r => ({
    id:        r.id as string,
    postId:    r.post_id as string,
    userId:    r.user_id as string,
    body:      r.body as string,
    createdAt: r.created_at as string,
    author:    authors.find(a => a.userId === r.user_id),
    likeCount: likeCount[r.id as string] ?? 0,
    likedByMe: likedByMe[r.id as string] ?? false,
  }))
}

export async function toggleCommentLike(commentId: string, meId: string, liked: boolean): Promise<void> {
  if (liked) {
    const { error } = await supabase.from('post_comment_likes').delete().eq('comment_id', commentId).eq('user_id', meId)
    if (error) throw error
  } else {
    const { error } = await supabase.from('post_comment_likes').insert({ comment_id: commentId, user_id: meId })
    if (error) throw error
  }
}

export async function addComment(postId: string, meId: string, body: string): Promise<void> {
  const text = body.trim()
  if (!text) return
  const { error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: meId, body: text })
  if (error) throw error
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId)
  if (error) throw error
}
