# openapi codegen

we use the github action `.github/workflows/generate-openapi.yaml` to automatically generate a typesafe typescript client library for our api, which can be used both in the mobile app and on the web:

```java
// java method in our backend
@GetMapping
public ResponseEntity<ResponseEnvelope<Foo>> getFoo() {
    ...
}
```

```typescript
// automatically generated client in our frontend
const api = await openApi.getClient<BeerPongClient>();

api.getFoo();
```

no manual input is required from your side, the action automatically adds a `chore: update openapi types` commit to every pull request.

## how the action works

on the java side, the maven plugin `springdoc-openapi-maven-plugin` generates `mobile-app/api/generated/openapi.json` from our backend code.
the backend has to be actually running for this (!) using `mvn verify`. this is why our action provides a database.

running `npm run gen-types` in the mobile app then uses the `openapicmd` package to parse `mobile-app/api/generated/openapi.json` into `mobile-app/openapi/openapi.d.ts`, which is then able to be used by the client library.

## gotchas and dumb stuff

(1) when generating `openapi.json`, `springdoc-openapi-maven-plugin` doesn't seem to understand that most of our endpoints serve json, and reads them as `content-type: "*/*"`. this is a problem because `openapicmd` relies on `content-type: "application/json"` in order to automatically parse responses. to fix this, we run a command over the file, to replace all occurences of `"*/*"` with `"application/json"`.

(2) for the typescript client, all fields are always optional, for both request bodies and responses. this is fairly annoying and we'll look into fixing it at some point.

(3) using `Foo[]` instead of `List<Foo>` in java endpoint declarations breaks our codegen.
this:

```java
// List<Foo> is GOOD
@GetMapping
public ResponseEntity<ResponseEnvelope<List<Foo>>> getFoos() {
    ...
}
```

gets turned into this:

```json
"ResponseEnvelopeListFoo": {
    "type": "object",
    "properties": {
        "status": { "type": "string", "enum": ["OK", "ERROR"] },
        "httpCode": { "type": "integer", "format": "int32" },
        "data": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/Foo" }
        },
        "error": { "$ref": "#/components/schemas/ErrorDetails" }
    }
}
```

while this:

```java
// Foo[] is BAD and breaks our action!
@GetMapping
public ResponseEntity<ResponseEnvelope<Foo[]>> getFoos() {
    ...
}
```

gets turned into this:

```json
"ResponseEnvelopeFoo[]": {
    "type": "object",
    "properties": {
        "status": { "type": "string", "enum": ["OK", "ERROR"] },
        "httpCode": { "type": "integer", "format": "int32" },
        "data": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/Foo" }
        },
        "error": { "$ref": "#/components/schemas/ErrorDetails" }
    }
}
```

notice the difference in the generated names? `"ResponseEnvelopeListFoo"` vs `"ResponseEnvelopeFoo[]"`? well, the `openapicmd` package doesn't really like parsing the latter, because of the brackets. it tries to generate this typescript code:

```typescript
export type ResponseEnvelopeFoo[] = Components.Schemas.ResponseEnvelopeFoo;
```

which is invalid typescript syntax, and causes our frontend build to fail.
