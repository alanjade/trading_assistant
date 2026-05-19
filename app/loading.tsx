export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-5xl space-y-4">
        <div className="h-20 rounded-3xl bg-bg3 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="h-96 rounded-3xl bg-bg3 animate-pulse" />
          <div className="space-y-4">
            <div className="h-44 rounded-3xl bg-bg3 animate-pulse" />
            <div className="h-44 rounded-3xl bg-bg3 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
