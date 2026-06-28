"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
import { PanelLeftOpen, X } from "lucide-react";
import { useState } from "react";

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className={cn(
          "fixed left-4 top-20 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full",
          "border border-zinc-200 bg-white/90 text-zinc-600 shadow-sm backdrop-blur",
          "transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950",
          "dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-white"
        )}
        aria-label="打开课程目录"
        title="课程目录"
      >
        <PanelLeftOpen size={18} />
      </button>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/28 backdrop-blur-[1px] dark:bg-black/45"
            aria-label="关闭课程目录"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(22rem,calc(100vw-2rem))] flex-col border-r border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                课程目录
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                aria-label="关闭课程目录"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="min-w-0">{children}</div>
    </div>
  );
}
