import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { live_id, pageToken } = req.query

  const endpoint = process.env.CUSTOM_ENDPOINT
  if (!endpoint) {
    return res.status(500).json({ error: 'CUSTOM_ENDPOINT is not set' })
  }

  const url = new URL(endpoint)
  url.searchParams.set('live_id', String(live_id))

  try {
    const mirrativRes = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    const text = await mirrativRes.text()

    res.status(mirrativRes.status)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.send(text)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to fetch from endpoint' })
  }
}
