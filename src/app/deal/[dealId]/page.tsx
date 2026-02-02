import { Metadata } from 'next'
import DealClient from './DealClient'

type Props = {
  params: Promise<{ dealId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dealId } = await params
  const appUrl = 'https://roninotc-app.vercel.app'
  const imageUrl = `${appUrl}/branding_otc_final.jpg`
  const dealUrl = `${appUrl}/deal/${dealId}`

  return {
    title: `Deal ${dealId} | RoninOTC`,
    description: 'View trustless escrow deal details',
    other: {
      'fc:frame': 'vNext',
      'fc:frame:image': imageUrl,
      'fc:frame:image:aspect_ratio': '1:1',
      'fc:frame:button:1': 'Launch Deal',
      'fc:frame:button:1:action': 'launch_frame',
      'fc:frame:button:1:target': dealUrl,
      'fc:frame:post_url': `${appUrl}/api/frame`,

      'fc:frame:v2': JSON.stringify({
        version: 'next',
        imageUrl: imageUrl,
        button: {
          title: 'Launch Deal',
          action: {
            type: 'launch_app',
            name: 'RoninOTC',
            url: dealUrl,
            splashImageUrl: imageUrl,
            splashBackgroundColor: '#000000',
          },
        },
      }),

      'towns:miniapp': JSON.stringify({
        name: 'RoninOTC',
        description: 'Trustless Escrow OTC on Base',
        version: '1.0',
        imageUrl: imageUrl,
        button: {
          title: 'Launch Deal',
          action: {
            type: 'launch_app',
            name: 'RoninOTC',
            url: dealUrl,
          },
        },
      }),

      'fc:miniapp': JSON.stringify({
        version: '1',
        imageUrl: imageUrl,
        button: {
          title: 'Launch Deal',
          action: {
            type: 'launch_app',
            name: 'RoninOTC',
            url: dealUrl,
          },
        },
      }),
    },
    openGraph: {
      title: `Deal ${dealId} | RoninOTC`,
      description: 'View trustless escrow deal details',
      images: [imageUrl],
      url: dealUrl,
    },
  }
}

export default async function DealPage({ params }: Props) {
  const { dealId } = await params
  return <DealClient dealId={dealId} />
}
