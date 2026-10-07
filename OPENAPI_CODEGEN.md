# openapi codegen

The app's API client is typed from an OpenAPI document:

```typescript
// generated client in the app
const api = await openApi.getClient<BeerPongClient>();

api.getFoo();
```

## where the types come from

`apps/api/openapi/openapi.json` is the API's OpenAPI document. It is written by hand next to the Go
handlers (it started as the spec springdoc generated from the Java backend) and the Go API serves
it at `/v3/api-docs`. `TestSpecMatchesRoutes` in `apps/api/internal/api` fails when an endpoint is
served but not documented, or the other way round.

`make gen-open-api` from the root copies it to `apps/mobile/api/generated/openapi.json`, which the
client loads at runtime, and generates `apps/mobile/openapi/openapi.d.ts` from it with `openapicmd`
(`pnpm run gen-types`). Never edit those two files by hand. The copy happens in `scripts/gen-api`
rather than a `package.json` script because `package.json` scripts are part of the app's runtime fingerprint.

So an API change is: change the handler and its DTO in `apps/api`, update `openapi.json` to match,
run `make gen-open-api`, and update the hooks that use the changed types. The `Generate OpenApi`
action runs the generation for every push that changes `openapi.json` and commits
`chore: update openapi types` if the generated files were out of date.

## gotchas

(1) `openapicmd` only parses responses with `content-type: "application/json"`. springdoc wrote
`"*/*"`; the document uses `application/json` throughout, keep it that way.

(2) a response schema lists in `required` every field the API always sends in it, and marks the
ones that can be null `nullable`; the generated types follow. A schema that requests use too only
requires what both sides always have. `openapicmd` ignores `nullable` next to a `$ref` and on an
enum, so a nullable `$ref` is `"allOf": [{ "$ref": ... }]` with `nullable`, and a nullable enum
lists `null`. `TestGoldensMatchTheAPIDocument` in `api-tests` checks the recorded
responses against the document. The persisted React Query cache can hold values from older app
versions and values the app built itself, so keep the fallbacks (`?.`, `??`) when reading it.

(3) schema names become TypeScript type names, so they must be valid identifiers. List responses
are `ResponseEnvelopeList<Name>` schemas with an `array` `data` property; a name like
`ResponseEnvelopeFoo[]` breaks the app's build.
