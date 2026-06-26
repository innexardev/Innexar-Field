package storage

import (
	"errors"
	"fmt"
	"io"

	"github.com/gofiber/fiber/v2"
)

// ReadFormFile reads a multipart form file up to maxBytes.
func ReadFormFile(c *fiber.Ctx, field string, maxBytes int64) ([]byte, error) {
	file, err := c.FormFile(field)
	if err != nil {
		return nil, fmt.Errorf("%s file required", field)
	}
	if file.Size > maxBytes {
		return nil, ErrFileTooLarge
	}

	f, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to read %s file", field)
	}
	defer f.Close()

	limited := io.LimitReader(f, maxBytes+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return nil, fmt.Errorf("failed to read %s file", field)
	}
	if int64(len(data)) > maxBytes {
		return nil, ErrFileTooLarge
	}
	return data, nil
}

// MapUploadError maps storage validation errors to HTTP status and message.
func MapUploadError(err error) (code int, msg string, ok bool) {
	switch {
	case err == nil:
		return 0, "", false
	case err.Error() == "photo file required" || err.Error() == "logo file required":
		return 400, err.Error(), true
	default:
		switch {
		case isErr(err, ErrLogoEmpty), isErr(err, ErrPhotoEmpty):
			return 400, err.Error(), true
		case isErr(err, ErrLogoTooLarge), isErr(err, ErrPhotoTooLarge), isErr(err, ErrFileTooLarge):
			return 400, err.Error(), true
		case isErr(err, ErrLogoInvalidType), isErr(err, ErrPhotoInvalidType):
			return 400, err.Error(), true
		case isErr(err, ErrLogoTenantMissing), isErr(err, ErrPhotoTenantMissing):
			return 401, err.Error(), true
		default:
			return 0, "", false
		}
	}
}

func isErr(err, target error) bool {
	return errors.Is(err, target)
}
