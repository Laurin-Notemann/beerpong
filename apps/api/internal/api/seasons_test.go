package api

import "testing"

func TestParseWakeTime(t *testing.T) {
	for in, want := range map[string]string{"08:30": "08:30:00", "00:00": "00:00:00", "23:59": "23:59:00", "24:00": "00:00:00"} {
		if got, ok := parseWakeTime(in); !ok || got != want {
			t.Errorf("parseWakeTime(%q) = %q, %v; want %q", in, got, ok, want)
		}
	}
	for _, in := range []string{"24:01", "25:00", "8:00", "08:00:00", "12:60", "", "ab:cd", "+1:00", "08:5"} {
		if got, ok := parseWakeTime(in); ok {
			t.Errorf("parseWakeTime(%q) = %q, want rejected", in, got)
		}
	}
}
