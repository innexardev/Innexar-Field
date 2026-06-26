package tenant

import (
	"context"
	"errors"
)

type contextKey struct{}

var tenantKey = contextKey{}

// ErrMissingTenant is returned when tenant context is required but absent.
var ErrMissingTenant = errors.New("tenant_id missing from context")

// WithID stores tenant_id in context.
func WithID(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, tenantKey, tenantID)
}

// ID extracts tenant_id from context.
func ID(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(tenantKey).(string)
	return v, ok && v != ""
}

// MustID returns tenant_id or panics (use in tests only).
func MustID(ctx context.Context) string {
	id, ok := ID(ctx)
	if !ok {
		panic(ErrMissingTenant)
	}
	return id
}

// UserID context for authenticated user.
type userKeyType struct{}

var userKey = userKeyType{}

func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userKey, userID)
}

func UserID(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(userKey).(string)
	return v, ok && v != ""
}

type customerKeyType struct{}

var customerKey = customerKeyType{}

// WithCustomerID stores customer_id for portal RLS scoping.
func WithCustomerID(ctx context.Context, customerID string) context.Context {
	return context.WithValue(ctx, customerKey, customerID)
}

// CustomerID extracts customer_id from context.
func CustomerID(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(customerKey).(string)
	return v, ok && v != ""
}
