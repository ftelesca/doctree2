import { AppHeader } from "./AppHeader";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <AppHeader />
      <main className="flex-1 p-6 bg-background max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
