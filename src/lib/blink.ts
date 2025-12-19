import { createClient } from '@blinkdotnew/sdk';

// Get project ID from env, with fallback for deployment
const projectId = import.meta.env.VITE_BLINK_PROJECT_ID || 'smart-agriculture-support-system-m80q4b8r';
const publishableKey = import.meta.env.VITE_BLINK_PUBLISHABLE_KEY || '';

export const blink = createClient({
  projectId,
  publishableKey,
  authRequired: false,
  auth: {
    mode: 'headless' // Use headless mode for custom login/signup pages
  }
});
