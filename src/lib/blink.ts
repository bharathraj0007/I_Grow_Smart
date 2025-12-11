import { createClient } from '@blinkdotnew/sdk';

export const blink = createClient({
  projectId: 'smart-agriculture-support-system-m80q4b8r',
  authRequired: false,
  auth: {
    mode: 'headless'
  }
});
