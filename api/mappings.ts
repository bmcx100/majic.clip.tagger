import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const index: string[] = (await redis.get('games:index')) || []
    const all = req.query.all === 'true'
    const games = []
    for (const id of index) {
      const game = await redis.get(`game:${id}`)
      if (game && (all || !(game as any).processed)) games.push(game)
    }
    return res.status(200).json(games)
  }

  if (req.method === 'POST') {
    const game = req.body
    if (!game?.id) return res.status(400).json({ error: 'Missing game id' })

    await redis.set(`game:${game.id}`, game)

    const index: string[] = (await redis.get('games:index')) || []
    if (!index.includes(game.id)) {
      index.unshift(game.id)
      await redis.set('games:index', index)
    }

    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const id = req.query.id as string
    if (!id) return res.status(400).json({ error: 'Missing game id' })

    await redis.del(`game:${id}`)

    const index: string[] = (await redis.get('games:index')) || []
    const updated = index.filter(i => i !== id)
    await redis.set('games:index', updated)

    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
