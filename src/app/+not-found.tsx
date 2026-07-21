import { NotFound } from '@/components/NotFound';
import { useT } from '@/lib/i18n';

// Catch-all for bad deep links (carstudio://…) and stale routes — reuses the
// shared dead-end so every "missing" screen looks and behaves the same.
export default function NotFoundScreen() {
  const t = useT();
  return <NotFound title={t('notFound.title')} subtitle={t('notFound.subtitle')} />;
}
