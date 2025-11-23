import { generateMetadata } from '@/lib/metadata';
import DashboardClient from './DashboardClient';

export const metadata = generateMetadata({
  title: 'Template',
  description: 'Template',
});

export default function Page() {
  // Server Component: just renders a client child
  return <DashboardClient />;
}
