export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''

  if (q.trim().length < 3) {
    return new Response(JSON.stringify({ courses: [] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch(
    `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(q.trim())}`,
    { headers: { Authorization: `Key ${process.env.GOLF_COURSE_API_KEY}` } }
  )

  const data = res.ok ? await res.json() : { courses: [] }

  return new Response(JSON.stringify(data), {
    status: res.ok ? 200 : res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
