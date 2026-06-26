//go:build integration

package identity_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListUsers_Integration(t *testing.T) {
	ctx, pool, appCfg, authSvc, identitySvc := setupAuthIntegration(t)
	_ = ctx
	_ = pool
	app := newAuthApp(identitySvc, authSvc, pool)

	email := "owner@list-users.test"
	signupRes := postJSON(t, app, "/auth/signup", "", map[string]string{
		"company_name":  "List Users Co",
		"email":         email,
		"password":      "secure-password-123",
		"industry_pack": "field-services",
		"plan_id":       "starter",
	})
	require.Equal(t, http.StatusCreated, signupRes.StatusCode)
	defer signupRes.Body.Close()

	var signupBody struct {
		Token string `json:"token"`
	}
	require.NoError(t, json.NewDecoder(signupRes.Body).Decode(&signupBody))
	require.NotEmpty(t, signupBody.Token)

	listRes := getJSON(t, app, "/users", signupBody.Token)
	require.Equal(t, http.StatusOK, listRes.StatusCode)
	defer listRes.Body.Close()

	var listBody struct {
		Data []struct {
			ID        string `json:"id"`
			Email     string `json:"email"`
			Role      string `json:"role"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
			CreatedAt string `json:"created_at"`
		} `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listRes.Body).Decode(&listBody))
	require.Len(t, listBody.Data, 1)
	assert.Equal(t, email, listBody.Data[0].Email)
	assert.Equal(t, "owner", listBody.Data[0].Role)
	assert.Equal(t, "List Users Co", listBody.Data[0].FirstName)
	assert.NotEmpty(t, listBody.Data[0].CreatedAt)
	_ = appCfg
}

func TestListUsers_TenantIsolation_Integration(t *testing.T) {
	ctx, pool, appCfg, authSvc, identitySvc := setupAuthIntegration(t)
	_ = appCfg
	app := newAuthApp(identitySvc, authSvc, pool)

	signupA := postJSON(t, app, "/auth/signup", "", map[string]string{
		"company_name":  "Tenant A",
		"email":         "a@tenant-isolation.test",
		"password":      "secure-password-123",
		"industry_pack": "field-services",
	})
	require.Equal(t, http.StatusCreated, signupA.StatusCode)
	defer signupA.Body.Close()
	var bodyA struct {
		Token string `json:"token"`
	}
	require.NoError(t, json.NewDecoder(signupA.Body).Decode(&bodyA))

	signupB := postJSON(t, app, "/auth/signup", "", map[string]string{
		"company_name":  "Tenant B",
		"email":         "b@tenant-isolation.test",
		"password":      "secure-password-123",
		"industry_pack": "field-services",
	})
	require.Equal(t, http.StatusCreated, signupB.StatusCode)
	defer signupB.Body.Close()
	var bodyB struct {
		Token string `json:"token"`
	}
	require.NoError(t, json.NewDecoder(signupB.Body).Decode(&bodyB))

	listA := getJSON(t, app, "/users", bodyA.Token)
	require.Equal(t, http.StatusOK, listA.StatusCode)
	defer listA.Body.Close()
	var usersA struct {
		Data []struct {
			Email string `json:"email"`
		} `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listA.Body).Decode(&usersA))
	require.Len(t, usersA.Data, 1)
	assert.Equal(t, "a@tenant-isolation.test", usersA.Data[0].Email)

	listB := getJSON(t, app, "/users", bodyB.Token)
	require.Equal(t, http.StatusOK, listB.StatusCode)
	defer listB.Body.Close()
	var usersB struct {
		Data []struct {
			Email string `json:"email"`
		} `json:"data"`
	}
	require.NoError(t, json.NewDecoder(listB.Body).Decode(&usersB))
	require.Len(t, usersB.Data, 1)
	assert.Equal(t, "b@tenant-isolation.test", usersB.Data[0].Email)

	_ = ctx
	_ = pool
	_ = authSvc
}
