package identity

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

// ValidationError is returned for client-correctable signup failures.
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string { return e.Message }

func mapSignupErr(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		switch pgErr.ConstraintName {
		case "tenants_slug_key":
			return &ValidationError{Message: "company name is already taken"}
		case "users_tenant_id_email_key":
			return &ValidationError{Message: "email is already registered"}
		default:
			return &ValidationError{Message: "account already exists"}
		}
	}
	return err
}
