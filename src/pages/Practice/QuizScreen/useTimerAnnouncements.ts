import { useEffect, useRef, useState } from 'react';

const THRESHOLDS = [10, 30, 60, 300];

function describeThreshold(seconds: number): string {
  if (seconds >= 60) {
    const minutes = seconds / 60;
    return `${minutes} minute${minutes === 1 ? '' : 's'} remaining`;
  }
  return `${seconds} seconds remaining`;
}

/** Announces countdown thresholds for screen readers as the timer crosses them. */
export function useTimerAnnouncements(timeLeft: number | null): string {
  const [announcement, setAnnouncement] = useState('');
  const prevRef = useRef<number | null>(timeLeft);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = timeLeft;

    if (timeLeft === null || prev === null) return;

    if (timeLeft > prev) {
      setAnnouncement('');
      return;
    }

    const crossed = THRESHOLDS.find(
      (threshold) => prev > threshold && timeLeft <= threshold,
    );
    if (crossed === undefined) return;

    setAnnouncement(describeThreshold(crossed));
  }, [timeLeft]);

  return announcement;
}
