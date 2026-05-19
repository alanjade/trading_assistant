import dynamicImport from 'next/dynamic';
import Loading from './loading';

export const dynamic = 'force-static';
export const revalidate = 60;

const DashboardShell = dynamicImport(
  () => import('@/features/dashboard/components/DashboardShell'),
  {
    loading: () => <Loading />,
  }
);

export default function Home() {
  return <DashboardShell />;
}
