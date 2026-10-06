import { createFileRoute } from '@tanstack/react-router';

import type { CameraRecordingCreateDto } from '@/openapi/openapi';
import { apiFor, ApiError } from '~/tv/server/api';
import { authorize, DisplayError } from '~/tv/server/displays';

/** Streams camera footage to the signed bucket URL without depending on bucket CORS. */
export const Route = createFileRoute('/tv/api/cameras/$id/recordings/$recordingId')({
    server: {
        handlers: {
            PUT: async ({ request, params }) => {
                try {
                    const camera = authorize(params.id, request.headers.get('X-Camera-Key'));
                    if (
                        camera.kind !== 'camera' ||
                        !camera.refreshToken ||
                        !camera.config.groupId
                    ) {
                        return new Response(null, { status: 403 });
                    }
                    const raw = request.headers.get('X-Recording-Metadata') ?? '';
                    if (raw.length > 8_000) return new Response(null, { status: 400 });
                    const metadata = JSON.parse(raw) as CameraRecordingCreateDto & {
                        groupId: string;
                    };
                    const groupId = camera.config.groupId;
                    if (metadata.groupId !== groupId) return new Response(null, { status: 403 });
                    const size = metadata.sizeBytes;
                    if (
                        !Number.isSafeInteger(size) ||
                        size < 1 ||
                        size > 32 * 1024 * 1024 ||
                        !request.body
                    ) {
                        return new Response(null, { status: 400 });
                    }
                    const api = apiFor(camera.refreshToken);
                    const upload = await api.recordingUpload(groupId, params.recordingId, {
                        ...metadata,
                        cameraId: camera.id,
                        cameraName: metadata.cameraName || camera.name,
                    });
                    let received = 0;
                    const body = request.body.pipeThrough(
                        new TransformStream<Uint8Array, Uint8Array>({
                            transform(chunk, controller) {
                                received += chunk.byteLength;
                                if (received > size)
                                    throw new Error('Camera recording exceeds declared size');
                                controller.enqueue(chunk);
                            },
                            flush() {
                                if (received !== size)
                                    throw new Error('Camera recording size mismatch');
                            },
                        })
                    );
                    const init: RequestInit & { duplex: 'half' } = {
                        method: 'PUT',
                        headers: {
                            'Content-Type': metadata.contentType,
                            'Content-Length': String(size),
                        },
                        body,
                        duplex: 'half',
                        signal: AbortSignal.any([request.signal, AbortSignal.timeout(120_000)]),
                    };
                    const result = await fetch(upload.singleUploadUrl, init);
                    await result.body?.cancel();
                    if (!result.ok)
                        throw new Error(`Camera recording bucket PUT failed (${result.status})`);
                    await api.completeRecording(groupId, params.recordingId);
                    return new Response(null, { status: 204 });
                } catch (error) {
                    if (error instanceof DisplayError)
                        return new Response(null, { status: error.status });
                    if (
                        error instanceof ApiError &&
                        error.httpCode >= 400 &&
                        error.httpCode < 500
                    ) {
                        return new Response(null, { status: error.httpCode });
                    }
                    if (error instanceof SyntaxError) return new Response(null, { status: 400 });
                    // The request middleware reports unexpected failures without request bodies or keys.
                    throw error;
                }
            },
        },
    },
});
