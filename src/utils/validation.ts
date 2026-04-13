import type { StoreFormData } from '../types/store';

export type StoreFormSchema = StoreFormData;

/**
 * 폼 필드 검증 규칙
 */
export const VALIDATION_RULES = {
  name: {
    minLength: 2,
    maxLength: 100,
    errorMessages: {
      min: '편의점 이름은 최소 2자 이상이어야 합니다',
      max: '편의점 이름은 100자 이내여야 합니다',
    },
  },
  address: {
    minLength: 5,
    maxLength: 200,
    errorMessages: {
      min: '주소는 최소 5자 이상이어야 합니다',
      max: '주소는 200자 이내여야 합니다',
    },
  },
  reporterName: {
    minLength: 2,
    maxLength: 50,
    errorMessages: {
      min: '이름은 최소 2자 이상이어야 합니다',
      max: '이름은 50자 이내여야 합니다',
    },
  },
  notes: {
    maxLength: 500,
    errorMessages: {
      max: '추가 정보는 500자 이내여야 합니다',
    },
  },
  hasSeating: {
    validValues: ['yes', 'no', 'unknown'] as const,
  },
};

/**
 * 단일 필드 검증
 */
export function validateField(
  fieldName: keyof StoreFormData,
  value: any
): string | null {
  const val = String(value).trim();

  switch (fieldName) {
    case 'name':
      if (val.length < VALIDATION_RULES.name.minLength) {
        return VALIDATION_RULES.name.errorMessages.min;
      }
      if (val.length > VALIDATION_RULES.name.maxLength) {
        return VALIDATION_RULES.name.errorMessages.max;
      }
      break;

    case 'address':
      if (val.length < VALIDATION_RULES.address.minLength) {
        return VALIDATION_RULES.address.errorMessages.min;
      }
      if (val.length > VALIDATION_RULES.address.maxLength) {
        return VALIDATION_RULES.address.errorMessages.max;
      }
      break;

    case 'reporterName':
      if (val.length === 0) break; // Optional
      if (val.length < VALIDATION_RULES.reporterName.minLength) {
        return VALIDATION_RULES.reporterName.errorMessages.min;
      }
      if (val.length > VALIDATION_RULES.reporterName.maxLength) {
        return VALIDATION_RULES.reporterName.errorMessages.max;
      }
      break;

    case 'notes':
      if (val.length > VALIDATION_RULES.notes.maxLength) {
        return VALIDATION_RULES.notes.errorMessages.max;
      }
      break;

    case 'hasSeating':
      if (!VALIDATION_RULES.hasSeating.validValues.includes(val as any)) {
        return '좌석 상태를 선택해주세요';
      }
      break;
  }

  return null;
}

/**
 * 전체 폼 검증
 */
export function validateStoreForm(data: unknown) {
  const errors: Record<string, string> = {};

  // data가 객체인지 확인
  if (!data || typeof data !== 'object') {
    return { success: false, errors: { _form: '유효하지 않은 데이터입니다' } };
  }

  const formData = data as Record<string, any>;

  // 필수 필드 검증
  const requiredFields = ['name', 'address', 'hasSeating', 'reporterName'] as const;

  for (const field of requiredFields) {
    const error = validateField(field, formData[field] || '');
    if (error) {
      errors[field] = error;
    }
  }

  // notes 검증 (선택사항)
  if (formData.notes) {
    const notesError = validateField('notes', formData.notes);
    if (notesError) {
      errors.notes = notesError;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: formData as StoreFormData };
}

/**
 * Zod 호환 에러 파싱 (legacy support)
 */
export function getValidationErrors(error: any) {
  if (error && typeof error === 'object' && error.errors) {
    const fieldErrors: Record<string, string> = {};
    error.errors.forEach((err: any) => {
      const path = err.path?.join('.') || err.path || 'unknown';
      fieldErrors[path] = err.message || '검증 실패';
    });
    return fieldErrors;
  }
  return {};
}
