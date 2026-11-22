import { Injectable } from '@nestjs/common';

export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'ar'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

const ERROR_TRANSLATIONS: Record<string, Partial<Record<SupportedLocale, string>>> = {
  NOT_FOUND: {
    en: 'The requested resource was not found.',
    es: 'El recurso solicitado no fue encontrado.',
    fr: 'La ressource demandée est introuvable.',
    de: 'Die angeforderte Ressource wurde nicht gefunden.',
    ar: 'المورد المطلوب غير موجود.',
  },
  FORBIDDEN: {
    en: 'You do not have permission to perform this action.',
    es: 'No tienes permiso para realizar esta acción.',
    fr: 'Vous n\'avez pas la permission d\'effectuer cette action.',
    de: 'Sie haben keine Berechtigung für diese Aktion.',
    ar: 'ليس لديك الإذن للقيام بهذا الإجراء.',
  },
  UNAUTHORIZED: {
    en: 'Authentication is required to access this resource.',
    es: 'Se requiere autenticación para acceder a este recurso.',
    fr: 'L\'authentification est requise pour accéder à cette ressource.',
    de: 'Authentifizierung ist erforderlich, um auf diese Ressource zuzugreifen.',
    ar: 'المصادقة مطلوبة للوصول إلى هذا المورد.',
  },
  PAYLOAD_TOO_LARGE: {
    en: 'The request body exceeds the maximum permitted size.',
    es: 'El cuerpo de la solicitud excede el tamaño máximo permitido.',
    fr: 'Le corps de la requête dépasse la taille maximale autorisée.',
    de: 'Der Anfragetext überschreitet die maximal zulässige Größe.',
    ar: 'حجم الطلب يتجاوز الحد الأقصى المسموح به.',
  },
  UNSUPPORTED_MEDIA_TYPE: {
    en: 'The payload content type is not supported.',
    es: 'El tipo de contenido no es compatible.',
    fr: 'Le type de contenu n\'est pas pris en charge.',
    de: 'Der Medientyp wird nicht unterstützt.',
    ar: 'نوع محتوى غير مدعوم.',
  },
  COLLECTION_NOT_FOUND: {
    en: 'Collection not found.',
    es: 'Colección no encontrada.',
    fr: 'Collection introuvable.',
    de: 'Sammlung nicht gefunden.',
    ar: 'المجموعة غير موجودة.',
  },
  COLLECTION_ACCESS_DENIED: {
    en: 'You are not authorized to access this private collection.',
    es: 'No estás autorizado para acceder a esta colección privada.',
    fr: 'Vous n\'êtes pas autorisé à accéder à cette collection privée.',
    de: 'Sie sind nicht berechtigt, auf diese private Sammlung zuzugreifen.',
    ar: 'غير مصرح لك بالوصول إلى هذه المجموعة الخاصة.',
  },
  COLLECTION_CONCURRENCY_CONFLICT: {
    en: 'Collection has been updated by another operation. Please refresh and retry.',
    es: 'La colección ha sido modificada por otra operación. Por favor actualice e intente de nuevo.',
    fr: 'La collection a été modifiée par une autre opération. Veuillez actualiser et réessayer.',
    de: 'Die Sammlung wurde durch einen anderen Vorgang aktualisiert. Bitte aktualisieren und wiederholen.',
    ar: 'تم تحديث المجموعة بواسطة عملية أخرى. يرجى التحديث والمحاولة مرة أخرى.',
  },
  MAX_BATCH_SIZE_EXCEEDED: {
    en: 'Batch size exceeds maximum limit.',
    es: 'El tamaño del lote excede el límite máximo.',
    fr: 'La taille du lot dépasse la limite maximale.',
    de: 'Die Batch-Größe überschreitet das maximale Limit.',
    ar: 'حجم الدفعة يتجاوز الحد الأقصى.',
  },
};

@Injectable()
export class LocaleNegotiatorService {
  readonly defaultLocale: SupportedLocale = 'en';

  negotiateLocale(acceptLanguageHeader?: string): SupportedLocale {
    if (!acceptLanguageHeader) {
      return this.defaultLocale;
    }

    const preferences = acceptLanguageHeader
      .split(',')
      .map((part) => {
        const [rawLang, rawQ] = part.trim().split(';');
        const lang = rawLang.split('-')[0].toLowerCase().trim();
        const q = rawQ ? parseFloat(rawQ.replace('q=', '')) || 0 : 1.0;
        return { lang, q };
      })
      .sort((a, b) => b.q - a.q);

    for (const pref of preferences) {
      if (SUPPORTED_LOCALES.includes(pref.lang as SupportedLocale)) {
        return pref.lang as SupportedLocale;
      }
    }

    return this.defaultLocale;
  }

  translateError(
    code: string,
    defaultMessage: string,
    acceptLanguageHeader?: string,
  ): { message: string; locale: SupportedLocale } {
    const locale = this.negotiateLocale(acceptLanguageHeader);

    const translations = ERROR_TRANSLATIONS[code];
    if (translations && translations[locale]) {
      return { message: translations[locale]!, locale };
    }

    return { message: defaultMessage, locale };
  }
}
