// App configuration for cross-linking
export const APP_CONFIG = {
  // Landing page URL - update this based on environment
  landingUrl: process.env.NEXT_PUBLIC_LANDING_URL || 'https://landing-page-1o2uohv-sudeeps-projects-605fda3a.vercel.app',
  
  // Routes
  routes: {
    home: '/',
    features: '/#features',
    pricing: '/#pricing',
    testimonials: '/#testimonials',
  },
  
  // Helper to get full URL
  getLandingUrl: (path: string = '') => {
    const baseUrl = process.env.NEXT_PUBLIC_LANDING_URL || 'https://landing-page-1o2uohv-sudeeps-projects-605fda3a.vercel.app';
    return `${baseUrl}${path}`;
  }
};
