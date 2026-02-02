import { Metadata } from 'next'
import DealClient from './DealClient'

type Props = {
  params: Promise<{ dealId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dealId } = await params
  const appUrl = 'https://roninotc-app.vercel.app'
  const imageUrl = `${appUrl}/logo.png`
  const dealUrl = `${appUrl}/deal/${dealId}`

  return {
    title: `Deal ${dealId} | RoninOTC`,
    description: 'View trustless escrow deal details',
    openGraph: {
      title: `Deal ${dealId} | RoninOTC`,
      description: 'View trustless escrow deal details',
      images: [imageUrl],
    },
    other: {
      'fc:frame': 'vNext',
      'fc:frame:image': imageUrl,
      'fc:frame:image:aspect_ratio': '1:1',
      'fc:frame:button:1': 'Launch Deal',
      'fc:frame:button:1:action': 'launch_frame',
      'fc:frame:button:1:target': dealUrl,
      'fc:frame:post_url': `${appUrl}/api/frame`,
    },
  }
}

export default function DealPage() {
  return <DealClient />
}
