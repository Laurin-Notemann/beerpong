package api

import (
	"crypto/rand"
	"math/big"
	"strings"
	"unicode/utf16"
	"unicode/utf8"
)

// Validation rules were written against Java strings. These helpers keep the
// edges identical (what counts as blank, how long a name with emoji is).

// javaTrimEmpty is s.trim().isEmpty(): trim drops every char <= U+0020.
func javaTrimEmpty(s string) bool {
	return strings.TrimFunc(s, func(r rune) bool { return r <= ' ' }) == ""
}

// javaIsBlank is s.isBlank(), which uses Character.isWhitespace.
func javaIsBlank(s string) bool {
	for _, r := range s {
		if !javaWhitespace(r) {
			return false
		}
	}
	return true
}

func javaWhitespace(r rune) bool {
	switch {
	case r >= '\t' && r <= '\r', r >= 0x1C && r <= 0x1F, r == ' ':
		return true
	case r == 0xA0 || r == 0x2007 || r == 0x202F: // no-break spaces are not whitespace in Java
		return false
	case r == 0x1680, r >= 0x2000 && r <= 0x2006, r >= 0x2008 && r <= 0x200A, r == 0x2028, r == 0x2029, r == 0x205F, r == 0x3000:
		return true
	}
	return false
}

// javaLength is s.length(): UTF-16 code units.
func javaLength(s string) int {
	n := 0
	for _, r := range s {
		if r == utf8.RuneError {
			n++
			continue
		}
		n += len(utf16.Encode([]rune{r}))
	}
	return n
}

const inviteAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func randomInviteCode() (string, error) {
	var b strings.Builder
	for range 9 {
		i, err := rand.Int(rand.Reader, big.NewInt(int64(len(inviteAlphabet))))
		if err != nil {
			return "", err
		}
		b.WriteByte(inviteAlphabet[i.Int64()])
	}
	return b.String(), nil
}

// nameInvalid is the 2..50 character rule for group and season names.
func nameInvalid(name *string) bool {
	if name == nil || javaTrimEmpty(*name) {
		return true
	}
	l := javaLength(*name)
	return l < 2 || l > 50
}
