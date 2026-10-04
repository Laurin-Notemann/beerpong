# openapi codegen

The app's API client is typed from an OpenAPI document:

```typescript
// generated client in the app
const api = await openApi.getClient<BeerPongClient>();

api.getFoo();
```

## where the types come from

`api-go/openapi/openapi.json` is the API's OpenAPI document. It is written by hand next to the Go
handlers (it started as the spec springdoc generated from the Java backend) and the Go API serves
it at `/v3/api-docs`. `TestSpecMatchesRoutes` in `api-go/internal/api` fails when an endpoint is
served but not documented, or the other way round.

`make gen-open-api` from the root copies it to `mobile-app/api/generated/openapi.json`, which the
client loads at runtime, and generates `mobile-app/openapi/openapi.d.ts` from it with `openapicmd`
(`npm run gen-types`). Never edit those two files by hand. The copy happens in `scripts/gen-api`
rather than the npm script because `package.json` scripts are part of the app's runtime fingerprint.

So an API change is: change the handler and its DTO in `api-go`, update `openapi.json` to match,
run `make gen-open-api`, and update the hooks that use the changed types. The `Generate OpenApi`
action runs the generation for every push that changes `openapi.json` and commits
`chore: update openapi types` if the generated files were out of date.

## gotchas

(1) `openapicmd` only parses responses with `content-type: "application/json"`. springdoc wrote
`"*/*"`; the document uses `application/json` throughout, keep it that way.

(2) for the typescript client, all fields are optional, for both request bodies and responses,
because the document doesn't mark any as `required`.

(3) schema names become TypeScript type names, so they must be valid identifiers. List responses
are `ResponseEnvelopeList<Name>` schemas with an `array` `data` property; a name like
`ResponseEnvelopeFoo[]` breaks the app's build.
