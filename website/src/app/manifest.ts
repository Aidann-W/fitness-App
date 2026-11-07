import type { MetadataRoute } from 'next';

// Lets people install CumulusFit to their home screen and open it full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CumulusFit',
    short_name: 'CumulusFit',
    description: 'AI-planned strength workouts, synced to the cloud.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f1f5fa',
    theme_color: '#f1f5fa',
    categories: ['health', 'fitness'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
