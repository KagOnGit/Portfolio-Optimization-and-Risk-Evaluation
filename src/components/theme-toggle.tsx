'use client';

export function ThemeToggle() {
  return (
    <button
      onClick={() => document.documentElement.classList.toggle('dark')}
      className="ml-4 px-3 py-1 border rounded text-xs"
    >
      Toggle Theme
    </button>
  );
}
