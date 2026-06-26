package reports

import (
	"fmt"
	"strings"
)

func formatCents(cents int64) string {
	negative := cents < 0
	if negative {
		cents = -cents
	}
	dollars := cents / 100
	remainder := cents % 100
	s := fmt.Sprintf("$%s.%02d", commaThousands(dollars), remainder)
	if negative {
		return "-" + s
	}
	return s
}

func commaThousands(n int64) string {
	s := fmt.Sprintf("%d", n)
	if len(s) <= 3 {
		return s
	}
	var b strings.Builder
	start := len(s) % 3
	if start > 0 {
		b.WriteString(s[:start])
		if len(s) > start {
			b.WriteByte(',')
		}
	}
	for i := start; i < len(s); i += 3 {
		if i > start {
			b.WriteByte(',')
		}
		b.WriteString(s[i : i+3])
	}
	return b.String()
}
