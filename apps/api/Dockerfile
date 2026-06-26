# syntax=docker/dockerfile:1

FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY apps/api ./apps/api
COPY packages ./packages
COPY config ./config

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /api ./apps/api/cmd/server

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata \
    && adduser -D -u 10001 appuser

WORKDIR /app

COPY --from=builder /api /app/api
COPY config /app/config

USER appuser

EXPOSE 8080

ENV PORT=8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health/ready || exit 1

ENTRYPOINT ["/app/api"]
