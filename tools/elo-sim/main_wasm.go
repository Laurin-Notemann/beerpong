//go:build js && wasm

package main

// The functions the page calls. Parameters and results are JSON strings.

import (
	"encoding/json"
	"syscall/js"
)

func main() {
	defaults := defaultParams()
	var seasons [][]Game
	use := func(raw string) {
		p := defaults
		json.Unmarshal([]byte(raw), &p)
		setParams(p)
	}
	reply := func(v any) any {
		b, _ := json.Marshal(v)
		return string(b)
	}
	js.Global().Set("eloDefaults", js.FuncOf(func(js.Value, []js.Value) any { return reply(defaults) }))
	js.Global().Set("eloLoad", js.FuncOf(func(_ js.Value, args []js.Value) any {
		json.Unmarshal([]byte(args[0].String()), &seasons)
		return nil
	}))
	js.Global().Set("eloRun", js.FuncOf(func(_ js.Value, args []js.Value) any {
		use(args[1].String())
		res, _, _ := replay(seasons[args[0].Int()], true)
		return reply(res)
	}))
	js.Global().Set("eloPredict", js.FuncOf(func(_ js.Value, args []js.Value) any {
		use(args[0].String())
		return reply(predict(seasons))
	}))
	js.Global().Set("eloSearch", js.FuncOf(func(js.Value, []js.Value) any { return reply(search(seasons)) }))
	select {}
}
