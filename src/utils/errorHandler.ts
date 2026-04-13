/**
 * 다양한 에러 타입을 사용자 친화적 메시지로 변환
 */
export const getErrorMessage = (error: unknown): string => {
  // Network errors
  if (error instanceof TypeError) {
    if (error.message.includes('fetch')) {
      return '네트워크 연결을 확인해주세요.';
    }
    return '네트워크 오류가 발생했습니다.';
  }

  // Error 객체
  if (error instanceof Error) {
    // 특정 에러 메시지 매핑
    if (error.message.includes('AbortError')) {
      return '요청 시간이 초과되었습니다. 다시 시도해주세요.';
    }
    if (error.message.includes('timeout')) {
      return '요청 시간이 초과되었습니다. 다시 시도해주세요.';
    }
    if (error.message.includes('cardinality')) {
      return '유효하지 않은 데이터입니다. 입력을 다시 확인해주세요.';
    }
    if (error.message.includes('duplicate')) {
      return '이미 존재하는 정보입니다.';
    }
    if (error.message.includes('permission')) {
      return '접근 권한이 없습니다.';
    }
    return error.message;
  }

  // 기타 에러
  return '알 수 없는 오류가 발생했습니다.';
};

/**
 * API 응답 상태 코드를 메시지로 변환
 */
export const getHttpErrorMessage = (statusCode: number): string => {
  switch (statusCode) {
    case 400:
      return '잘못된 요청입니다.';
    case 401:
      return '인증이 필요합니다.';
    case 403:
      return '접근 권한이 없습니다.';
    case 404:
      return '요청한 정보를 찾을 수 없습니다.';
    case 409:
      return '중복된 데이터입니다.';
    case 500:
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    case 503:
      return '서버가 일시적으로 이용 불가능합니다.';
    default:
      return '오류가 발생했습니다.';
  }
};

/**
 * 폼 유효성 검사 에러 메시지
 */
export const getValidationErrorMessage = (field: string): string => {
  const messages: Record<string, string> = {
    name: '편의점 이름은 필수 입력 항목입니다.',
    address: '주소는 필수 입력 항목입니다.',
    hasSeating: '좌석 상태를 선택해주세요.',
    reporterName: '이름은 2자 이상이어야 합니다.',
    notes: '메모는 500자 이내여야 합니다.',
  };

  return messages[field] || '입력 값이 유효하지 않습니다.';
};

/**
 * 위치 인식 에러 처리
 */
export const getGeolocationErrorMessage = (code: number): string => {
  switch (code) {
    case 1:
      return '위치 접근 권한이 필요합니다. 브라우저 설정을 확인해주세요.';
    case 2:
      return '위치 정보를 가져올 수 없습니다.';
    case 3:
      return '위치 요청 시간이 초과되었습니다.';
    default:
      return '위치 인식 중 오류가 발생했습니다.';
  }
};
