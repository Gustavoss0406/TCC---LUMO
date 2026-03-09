import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => {
  return (
    <div className={`animate-pulse bg-background-neutral/50 rounded-2xl ${className}`} />
  );
};
