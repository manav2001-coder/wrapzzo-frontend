/** A headed list of row-level problems (a roster the backend refused), in the destructive tint. */
export function ErrorList({ title, errors }: { title: string; errors: string[] }) {
  return (
    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <p className="mb-2 text-sm font-medium text-destructive">{title}</p>
      <ul className="ml-4 list-disc space-y-1 text-xs text-destructive">
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  )
}
