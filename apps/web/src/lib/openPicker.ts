import type { MouseEvent } from 'react';

export function openPicker(e: MouseEvent<HTMLInputElement>) {
  const target = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
  target.showPicker?.();
}
