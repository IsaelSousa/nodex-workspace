import React from 'react';

export const isImageIconValue = (value?: string | null): boolean =>
  !!value && /^(https?:\/\/|data:image\/)/i.test(value.trim());

interface NodeIconProps {
  value?: string | null;
  fallback: string;
  size?: number;
  className?: string;
}

export const NodeIcon: React.FC<NodeIconProps> = ({ value, fallback, size = 16, className = '' }) => {
  if (isImageIconValue(value)) {
    return (
      <img
        src={value!.trim()}
        alt=""
        className={`inline-block rounded object-cover align-middle shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return <span className={className}>{value || fallback}</span>;
};
