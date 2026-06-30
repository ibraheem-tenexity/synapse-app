export default function LibraryPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-heading-lg font-semibold text-foreground">Library</h1>
          <button
            className="px-4 py-2 rounded-md bg-brand text-brand-foreground text-body-md font-medium hover:opacity-90 transition-opacity"
            data-testid="add-source"
          >
            Add source
          </button>
        </div>
        <p className="text-body-md text-secondary">
          Your sources will appear here. Add a source to get started.
        </p>
      </div>
    </main>
  );
}
