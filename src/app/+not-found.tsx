import { NotFound } from '@/components/NotFound';

// Catch-all for bad deep links (carstudio://…) and stale routes — reuses the
// shared dead-end so every "missing" screen looks and behaves the same.
export default function NotFoundScreen() {
  return (
    <NotFound title="Page not found" subtitle="This link doesn't match anything in CarStudio." />
  );
}
