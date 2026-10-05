// Package purchases verifies what the App Store and Google Play say about a
// purchase of Versus Premium.
package purchases

import "errors"

// Premium is the product ID of Versus Premium, the same in both stores.
const Premium = "premium"

// ErrInvalid is a purchase or notification the API must not believe: a bad
// signature, another app, or a product Versus doesn't sell.
var ErrInvalid = errors.New("invalid purchase")

// Stores are the verifiers the API checks purchases with.
type Stores struct {
	Apple *Apple
}
