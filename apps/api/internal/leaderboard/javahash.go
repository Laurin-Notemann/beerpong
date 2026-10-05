package leaderboard

import (
	"sort"
	"unicode/utf16"
)

// javaHashMapOrder returns keys (distinct, in first-insertion order) in the
// order a java.util.HashMap with default settings iterates them. The Java
// backend returned leaderboard entries in that order and the app renders
// them as they come, so keeping it avoids visibly reshuffled lists.
func javaHashMapOrder(keys []string) []string {
	capacity := 16
	for float64(len(keys)) > 0.75*float64(capacity) {
		capacity *= 2
	}
	bucket := func(key string) int {
		h := javaStringHash(key)
		h ^= int32(uint32(h) >> 16)
		return int(h) & (capacity - 1)
	}
	out := make([]string, len(keys))
	copy(out, keys)
	sort.SliceStable(out, func(i, j int) bool { return bucket(out[i]) < bucket(out[j]) })
	return out
}

// javaStringHash is String.hashCode(); a null key hashes to 0.
func javaStringHash(s string) int32 {
	if s == nullProfile {
		return 0
	}
	var h int32
	for _, unit := range utf16.Encode([]rune(s)) {
		h = 31*h + int32(unit)
	}
	return h
}
