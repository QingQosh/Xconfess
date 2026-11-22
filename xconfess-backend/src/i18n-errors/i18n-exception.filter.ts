import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { LocaleNegotiatorService } from './locale-negotiator.service';

@Catch(HttpException)
export class I18nExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(I18nExceptionFilter.name);

  constructor(private readonly localeService: LocaleNegotiatorService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let code = 'HTTP_ERROR';
    let rawMessage = exception.message;
    let extraDetails: Record<string, any> = {};

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const respObj = exceptionResponse as Record<string, any>;
      code = respObj.code || (status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR');
      rawMessage = respObj.message || exception.message;
      const { message, code: _, ...rest } = respObj;
      extraDetails = rest;
    }

    // Keep server-side logging language-neutral (English)
    this.logger.debug(
      `[HTTP ${status}] ${request.method} ${request.url} code=${code} msg="${rawMessage}"`,
    );

    const acceptLang = request.headers['accept-language'];
    const { message: localizedMessage, locale } = this.localeService.translateError(
      code,
      Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage,
      acceptLang,
    );

    response.setHeader('Content-Language', locale);
    response.status(status).json({
      statusCode: status,
      code, // Machine-readable error code stays stable & neutral
      message: localizedMessage, // Negotiated user-facing error message
      ...extraDetails,
    });
  }
}
