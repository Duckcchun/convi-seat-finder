import { describe, it, expect } from 'vitest';
import { storeSchema, getValidationErrors } from '../../utils/validation';
import { z } from 'zod';

describe('validation schemas', () => {
  describe('storeSchema', () => {
    it('유효한 데이터를 파싱해야 함', async () => {
      const validData = {
        name: '편의점 A',
        address: '서울시 강남구 테헤란로 123',
        hasSeating: 'yes' as const,
        reporterName: '테스터',
        notes: '좌석 4개 있음',
      };

      const result = await storeSchema.parseAsync(validData);
      expect(result.name).toBe('편의점 A');
      expect(result.hasSeating).toBe('yes');
    });

    it('필드 공백은 자동 제거되어야 함', async () => {
      const data = {
        name: '  편의점 A  ',
        address: '  서울시  ',
        hasSeating: 'yes' as const,
        reporterName: '  테스터  ',
        notes: '  메모  ',
      };

      const result = await storeSchema.parseAsync(data);
      expect(result.name).toBe('편의점 A');
      expect(result.address).toBe('서울시');
      expect(result.reporterName).toBe('테스터');
    });

    it('name이 2자 미만이면 실패해야 함', async () => {
      const invalidData = {
        name: 'A',
        address: '서울시 강남구',
        hasSeating: 'yes' as const,
        reporterName: '테스터',
        notes: '',
      };

      await expect(storeSchema.parseAsync(invalidData)).rejects.toThrow();
    });

    it('address가 5자 미만이면 실패해야 함', async () => {
      const invalidData = {
        name: '편의점',
        address: '서울',
        hasSeating: 'yes' as const,
        reporterName: '테스터',
        notes: '',
      };

      await expect(storeSchema.parseAsync(invalidData)).rejects.toThrow();
    });

    it('hasSeating이 유효한 값이 아니면 실패해야 함', async () => {
      const invalidData = {
        name: '편의점 A',
        address: '서울시 강남구',
        hasSeating: 'maybe' as any,
        reporterName: '테스터',
        notes: '',
      };

      await expect(storeSchema.parseAsync(invalidData)).rejects.toThrow();
    });

    it('reporterName이 2자 미만이면 실패해야 함', async () => {
      const invalidData = {
        name: '편의점 A',
        address: '서울시 강남구',
        hasSeating: 'yes' as const,
        reporterName: '테',
        notes: '',
      };

      await expect(storeSchema.parseAsync(invalidData)).rejects.toThrow();
    });

    it('notes가 500자 초과이면 실패해야 함', async () => {
      const invalidData = {
        name: '편의점 A',
        address: '서울시 강남구',
        hasSeating: 'yes' as const,
        reporterName: '테스터',
        notes: 'a'.repeat(501),
      };

      await expect(storeSchema.parseAsync(invalidData)).rejects.toThrow();
    });

    it('선택사항 필드는 생략 가능해야 함', async () => {
      const minimalData = {
        name: '편의점 A',
        address: '서울시 강남구',
        hasSeating: 'yes' as const,
        reporterName: '테스터',
      };

      const result = await storeSchema.parseAsync(minimalData);
      expect(result.notes).toBe('');
      expect(result.latitude).toBeUndefined();
      expect(result.longitude).toBeUndefined();
    });
  });

  describe('getValidationErrors', () => {
    it('에러를 필드별로 맵핑해야 함', () => {
      const schema = z.object({
        name: z.string().min(2),
        address: z.string().min(5),
      });

      try {
        schema.parse({ name: 'A', address: '서울' });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors = getValidationErrors(error);
          expect(fieldErrors).toHaveProperty('name');
          expect(fieldErrors).toHaveProperty('address');
          expect(fieldErrors.name).toContain('최소 2자');
        }
      }
    });
  });
});
