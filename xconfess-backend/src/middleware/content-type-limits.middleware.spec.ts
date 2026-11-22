import { ContentTypeLimitsMiddleware, CONTENT_TYPE_LIMITS } from './content-type-limits.middleware';

describe('ContentTypeLimitsMiddleware', () => {
  let middleware: ContentTypeLimitsMiddleware;

  beforeEach(() => {
    middleware = new ContentTypeLimitsMiddleware();
  });

  it('should allow valid JSON bodies within 100KiB', () => {
    const req: any = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '2048',
      },
      on: jest.fn(),
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject JSON bodies exceeding 100KiB with 413 Payload Too Large', () => {
    const req: any = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': String(CONTENT_TYPE_LIMITS.JSON + 1),
      },
      on: jest.fn(),
    };
    const jsonMock = jest.fn();
    const res: any = { status: jest.fn().mockReturnValue({ json: jsonMock }) };
    const next = jest.fn();

    middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'PAYLOAD_TOO_LARGE',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject unsupported media types on mutations with 415', () => {
    const req: any = {
      method: 'POST',
      headers: {
        'content-type': 'application/xml',
      },
      on: jest.fn(),
    };
    const jsonMock = jest.fn();
    const res: any = { status: jest.fn().mockReturnValue({ json: jsonMock }) };
    const next = jest.fn();

    middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(415);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UNSUPPORTED_MEDIA_TYPE',
      }),
    );
  });
});
