package tenant

import "context"

type workerKey struct{}

// WithWorker marks context as a background worker (bypasses tenant-scoped RLS reads).
func WithWorker(ctx context.Context) context.Context {
	return context.WithValue(ctx, workerKey{}, true)
}

// IsWorker reports whether the context is for a background worker.
func IsWorker(ctx context.Context) bool {
	v, ok := ctx.Value(workerKey{}).(bool)
	return ok && v
}
