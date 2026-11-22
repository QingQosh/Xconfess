import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export const CONTENT_TYPE_LIMITS = {
  JSON: 100 * 1024, // 100 KiB
  URL_ENCODED: 50 * 1024, // 50 KiB
  MULTIPART: 15 * 1024 * 1024, // 15 MiB
};

@Injectable()
export class ContentTypeLimitsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH'].includes(method)) {
      return next();
    }

    const contentType = req.headers['content-type']?.toLowerCase() || '';
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    let maxAllowed = CONTENT_TYPE_LIMITS.JSON;
    let typeKey = 'application/json';

    if (contentType.includes('application/json')) {
      maxAllowed = CONTENT_TYPE_LIMITS.JSON;
      typeKey = 'application/json';
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      maxAllowed = CONTENT_TYPE_LIMITS.URL_ENCODED;
      typeKey = 'application/x-www-form-urlencoded';
    } else if (contentType.includes('multipart/form-data')) {
      maxAllowed = CONTENT_TYPE_LIMITS.MULTIPART;
      typeKey = 'multipart/form-data';
    } else if (contentType.length > 0 && !contentType.includes('text/plain')) {
      // Reject unsupported media types for mutations
      res.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).json({
        statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: `Content-Type '${contentType}' is not supported for request payloads.`,
      });
      return;
    }

    if (contentLength > maxAllowed) {
      res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        code: 'PAYLOAD_TOO_LARGE',
        message: `Payload size (${contentLength} bytes) exceeds limit of ${maxAllowed} bytes for content type ${typeKey}`,
        limitBytes: maxAllowed,
        receivedBytes: contentLength,
      });
      return;
    }

    // Stream byte-counting guard for chunked transfer-encoding
    let received = 0;
    const onData = (chunk: Buffer) => {
      received += chunk.length;
      if (received > maxAllowed) {
        req.pause();
        req.removeListener('data', onData);
        res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
          code: 'PAYLOAD_TOO_LARGE',
          message: `Chunked payload size exceeded ${maxAllowed} bytes for content type ${typeKey}`,
          limitBytes: maxAllowed,
        });
      }
    };

    req.on('data', onData);
    next();
  }
}
