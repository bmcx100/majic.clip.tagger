import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const DEFAULT_SETTINGS = {
  teamName: 'U13A Wildcats',
  roster: [
    'Adria', 'Allie', 'Ava', 'Beatrice', 'Izzy', 'Grace',
    'Haddy', 'Hailey', 'Isla', 'Jayda', 'Kaylee', 'Laila',
    'Mia', 'Monica', 'Sophie', 'Holmes', 'Tessa T',
  ],
  lines: ['White', 'Red', 'Gold'],
  adjectives: ['Nice', 'Great', 'Awesome', 'Super'],
  tags: ['Goal', 'Save', 'Try', 'Close', 'Play', 'Pass', 'Penalty'],
  callupLabel: 'Our Awesome Callup',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const settings = await redis.get('settings')
    return res.status(200).json(settings || DEFAULT_SETTINGS)
  }

  if (req.method === 'POST') {
    await redis.set('settings', req.body)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
