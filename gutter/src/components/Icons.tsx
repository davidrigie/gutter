import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const defaults = (size = 16): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function ChevronRight({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function ChevronDown({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function X({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function Check({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function Plus({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function FolderIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

export function FileIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

export function FileTextIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export function Circle({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props} fill="currentColor" stroke="none">
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

export function MessageSquare({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

export function Pencil({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export function Trash({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

export function Search({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function FolderPlus({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

export function FilePlus({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

export function FolderOpen({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M5 19a2 2 0 01-2-2V5a2 2 0 012-2h4l2 3h9a2 2 0 012 2v1" />
      <path d="M5 19h14a2 2 0 002-2l1-7H8l-1 7a2 2 0 01-2 2z" />
    </svg>
  );
}

export function CheckCircle({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function AlertCircle({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function Info({ size = 16, ...props }: IconProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
