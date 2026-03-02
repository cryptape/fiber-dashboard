export default function KeyIcon({ className = "" }: { className?: string }) {
  return (
    <svg 
      width="18" 
      height="18" 
      viewBox="0 0 18 18" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="18" height="18" rx="4" fill="currentColor" opacity="0.1" />
      <path 
        d="M13.25 2L6.47816 16H4.75L11.5218 2H13.25Z" 
        fill="currentColor"
      />
    </svg>
  );
}
