import { describe, it, expect } from 'vitest';
import {
  formatDate,
  getSeatingStatusText,
  getSeatingBadgeStyle,
  formatNotes,
  countStoresBySeating,
} from '../../utils/formatters';
import type { Store } from '../../types/store';

describe('formatters', () => {
  describe('formatDate', () => {
    it('ISO 날짜를 한글로 포맷팅해야 함', () => {
      const result = formatDate('2026-04-13T10:30:00Z');
      expect(result).toMatch(/2026년 4월 13일/);
    });

    it('잘못된 날짜는 기본값을 반환해야 함', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('정보 없음');
    });

    it('빈 문자열은 기본값을 반환해야 함', () => {
      const result = formatDate('');
      expect(result).toBe('정보 없음');
    });
  });

  describe('getSeatingStatusText', () => {
    it('좌석 있음을 반환해야 함', () => {
      const result = getSeatingStatusText('yes');
      expect(result).toBe('좌석 있음');
    });

    it('좌석 없음을 반환해야 함', () => {
      const result = getSeatingStatusText('no');
      expect(result).toBe('좌석 없음');
    });

    it('정보 부족을 반환해야 함', () => {
      const result = getSeatingStatusText('unknown');
      expect(result).toBe('정보 부족');
    });
  });

  describe('getSeatingBadgeStyle', () => {
    it('좌석 있음일 때 초록색 스타일을 반환해야 함', () => {
      const result = getSeatingBadgeStyle('yes');
      expect(result.bg).toContain('green');
      expect(result.text).toContain('green');
    });

    it('좌석 없음일 때 빨간색 스타일을 반환해야 함', () => {
      const result = getSeatingBadgeStyle('no');
      expect(result.bg).toContain('red');
      expect(result.text).toContain('red');
    });

    it('정보 부족일 때 회색 스타일을 반환해야 함', () => {
      const result = getSeatingBadgeStyle('unknown');
      expect(result.bg).toContain('gray');
    });
  });

  describe('formatNotes', () => {
    it('비어있으면 기본 메시지를 반환해야 함', () => {
      const result = formatNotes('', 'yes');
      expect(result).toBe('추가 정보 없음');
    });

    it('정보가 있으면 그대로 반환해야 함', () => {
      const result = formatNotes('좌석 4개 있음', 'yes');
      expect(result).toBe('좌석 4개 있음');
    });
  });

  describe('countStoresBySeating', () => {
    const mockStores: Store[] = [
      {
        id: '1',
        name: '편의점 A',
        address: '서울시',
        hasSeating: 'yes',
        lastUpdated: '2026-04-13T00:00:00Z',
        available_seats: 10,
        total_seats: 20,
      },
      {
        id: '2',
        name: '편의점 B',
        address: '서울시',
        hasSeating: 'no',
        lastUpdated: '2026-04-13T00:00:00Z',
        available_seats: 0,
        total_seats: 0,
      },
      {
        id: '3',
        name: '편의점 C',
        address: '서울시',
        hasSeating: 'unknown',
        lastUpdated: '2026-04-13T00:00:00Z',
        available_seats: 0,
        total_seats: 0,
      },
    ];

    it('좌석 상태별로 개수를 세어야 함', () => {
      const result = countStoresBySeating(mockStores);
      expect(result.total).toBe(3);
      expect(result.hasSeating).toBe(1);
      expect(result.noSeating).toBe(1);
      expect(result.unknown).toBe(1);
    });

    it('빈 배열의 경우 모두 0이어야 함', () => {
      const result = countStoresBySeating([]);
      expect(result.total).toBe(0);
      expect(result.hasSeating).toBe(0);
      expect(result.noSeating).toBe(0);
      expect(result.unknown).toBe(0);
    });
  });
});
