// Package openapi holds the API's OpenAPI document. It is written by hand
// next to the handlers, served at /v3/api-docs, and copied into the app by
// `npm run gen-types`, which generates the client types from it.
package openapi

import _ "embed"

//go:embed openapi.json
var Spec []byte
