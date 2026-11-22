import { LocaleNegotiatorService } from './locale-negotiator.service';

describe('LocaleNegotiatorService', () => {
  let service: LocaleNegotiatorService;

  beforeEach(() => {
    service = new LocaleNegotiatorService();
  });

  it('should negotiate preferred language from Accept-Language header', () => {
    expect(service.negotiateLocale('fr-CH, fr;q=0.9, en;q=0.8')).toBe('fr');
    expect(service.negotiateLocale('es-ES, es;q=0.8')).toBe('es');
    expect(service.negotiateLocale('de-DE, de;q=0.9')).toBe('de');
    expect(service.negotiateLocale('ar-SA, ar;q=0.9')).toBe('ar');
  });

  it('should fallback to en when no matching or supported language is requested', () => {
    expect(service.negotiateLocale('ja, zh;q=0.8')).toBe('en');
    expect(service.negotiateLocale(undefined)).toBe('en');
  });

  it('should translate error message while preserving error code stability', () => {
    const translated = service.translateError('FORBIDDEN', 'Access denied', 'fr-FR');
    expect(translated.locale).toBe('fr');
    expect(translated.message).toBe('Vous n\'avez pas la permission d\'effectuer cette action.');
  });
});
