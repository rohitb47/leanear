// The Leanear mark: a soft square with a round hole, symmetric on every axis.
export const MARK_PATH =
  "M6.4 1H17.6A5.4 5.4 0 0 1 23 6.4V17.6A5.4 5.4 0 0 1 17.6 23H6.4A5.4 5.4 0 0 1 1 17.6V6.4A5.4 5.4 0 0 1 6.4 1ZM12 3.5A8.5 8.5 0 1 0 12 20.5A8.5 8.5 0 1 0 12 3.5Z"

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={MARK_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}

export function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.34.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
    </svg>
  )
}
