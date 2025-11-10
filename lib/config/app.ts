// App configuration for cross-linking
export const APP_CONFIG = {
  // Landing page URL - update this based on environment
  landingUrl: process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:5173',
  
  // Routes
  routes: {
    home: '/',
    features: '/#features',
    pricing: '/#pricing',
    testimonials: '/#testimonials',
  },
  
  // Helper to get full URL
  getLandingUrl: (path: string = '') => {
    const baseUrl = process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:5173';
    return `${baseUrl}${path}`;
  }
};
