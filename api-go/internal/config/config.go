// Package config reads the service configuration from the environment. The
// variable names are the ones the Java backend used, so both run from the
// same env file.
package config

import (
	"fmt"
	"time"

	"github.com/caarlos0/env/v11"
)

type Config struct {
	Port int `env:"PORT" envDefault:"8080"`

	Postgres Postgres

	JWTSecret      string        `env:"JWT_SECRET,required,notEmpty"`
	AccessTokenTTL time.Duration `env:"JWT_ACCESS_TTL" envDefault:"1h"`

	AWS AWS

	SentryDSN         string `env:"BACKEND_SENTRY_DSN"`
	SentryEnvironment string `env:"SENTRY_ENVIRONMENT" envDefault:"staging"`
	SentryRelease     string `env:"SENTRY_RELEASE"`

	// Migrate runs the database migrations on startup.
	Migrate bool `env:"DB_MIGRATE" envDefault:"true"`
}

type Postgres struct {
	Host     string `env:"POSTGRES_HOST,required"`
	Port     int    `env:"POSTGRES_PORT" envDefault:"5432"`
	Database string `env:"POSTGRES_DB_NAME,required"`
	User     string `env:"POSTGRES_USER,required"`
	Password string `env:"POSTGRES_PASSWORD,required"`
	MaxConns int32  `env:"DB_MAX_CONNS" envDefault:"10"`
}

type AWS struct {
	Region    string `env:"AWS_REGION,required"`
	Bucket    string `env:"AWS_BUCKET_NAME,required"`
	Endpoint  string `env:"AWS_ENDPOINT,required"` // host without scheme, e.g. fsn1.your-objectstorage.com
	AccessKey string `env:"AWS_ACCESS_KEY,required"`
	SecretKey string `env:"AWS_SECRET_KEY,required"`
}

func Load() (Config, error) {
	cfg, err := env.ParseAs[Config]()
	if err != nil {
		return cfg, err
	}
	// HS256 needs at least 256 bits of key; the Java backend refused to start
	// with less as well.
	if len(cfg.JWTSecret) < 32 {
		return cfg, fmt.Errorf("JWT_SECRET must be at least 32 bytes")
	}
	return cfg, nil
}
