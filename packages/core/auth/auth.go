package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidToken       = errors.New("invalid token")
)

// Claims are JWT claims for FieldForge sessions.
type Claims struct {
	UserID          string `json:"user_id"`
	TenantID        string `json:"tenant_id"`
	Email           string `json:"email"`
	Role            string `json:"role"`
	CustomerID      string `json:"customer_id,omitempty"`
	IsPlatformAdmin bool   `json:"is_platform_admin,omitempty"`
	jwt.RegisteredClaims
}

// Service handles password hashing and JWT operations.
type Service struct {
	secret []byte
	expiry time.Duration
}

func NewService(secret string, expiryHours int) *Service {
	return &Service{
		secret: []byte(secret),
		expiry: time.Duration(expiryHours) * time.Hour,
	}
}

func HashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(b), err
}

func CheckPassword(hash, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}

func (s *Service) IssueToken(userID, tenantID, email, role string) (string, error) {
	return s.issueClaims(Claims{
		UserID:   userID,
		TenantID: tenantID,
		Email:    email,
		Role:     role,
	})
}

// IssueCustomerToken issues a JWT for a customer portal session.
func (s *Service) IssueCustomerToken(customerID, tenantID, email string) (string, error) {
	return s.issueClaims(Claims{
		UserID:     customerID,
		TenantID:   tenantID,
		Email:      email,
		Role:       "customer",
		CustomerID: customerID,
	})
}

// IssuePlatformToken issues a JWT for a platform administrator (cross-tenant).
func (s *Service) IssuePlatformToken(adminID, email string) (string, error) {
	return s.issueClaims(Claims{
		UserID:          adminID,
		Email:           email,
		Role:            "super_admin",
		IsPlatformAdmin: true,
	})
}

func (s *Service) issueClaims(claims Claims) (string, error) {
	claims.RegisteredClaims = jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.expiry)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Issuer:    "fieldforge",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

func (s *Service) ParseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, ErrInvalidToken
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

// Authenticate validates email/password against store.
type UserStore interface {
	FindByEmail(ctx context.Context, email string) (id, tenantID, passwordHash, role string, err error)
}

func (s *Service) Login(ctx context.Context, store UserStore, email, password string) (string, *Claims, error) {
	id, tenantID, hash, role, err := store.FindByEmail(ctx, email)
	if err != nil {
		return "", nil, ErrInvalidCredentials
	}
	if err := CheckPassword(hash, password); err != nil {
		return "", nil, ErrInvalidCredentials
	}
	token, err := s.IssueToken(id, tenantID, email, role)
	if err != nil {
		return "", nil, err
	}
	claims := &Claims{UserID: id, TenantID: tenantID, Email: email, Role: role}
	return token, claims, nil
}
