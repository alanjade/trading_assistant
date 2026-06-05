import { PanelSkeleton, Skeleton } from './components/ui';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-5xl space-y-4">
        <Skeleton className="h-20" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
          <PanelSkeleton className="h-96" />
          <div className="space-y-4">
            <PanelSkeleton className="h-44" />
            <PanelSkeleton className="h-44" />
          </div>
        </div>
      </div>
    </div>
  );
}
