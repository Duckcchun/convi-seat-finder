import React from 'react';
import { Store } from '../types/store';

interface InfoWindowProps {
  store: Store;
  position: { lat: number; lng: number };
  onEdit: () => void;
}

export const InfoWindow: React.FC<InfoWindowProps> = ({ store, position, onEdit }) => {
  // 실제 좌표→픽셀 변환은 map API에서 제공해야 함. 여기선 예시로 position을 style에 바로 사용
  return (
    <div
      className="absolute z-50 bg-white rounded-xl shadow-lg p-4"
      style={{
        left: position.lng, // 실제로는 좌표→픽셀 변환 필요
        top: position.lat,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <h3 className="font-bold">{store.name}</h3>
      <p className={store.hasSeating === 'unknown' ? 'text-red-600' : 'text-green-600'}>
        좌석: {store.hasSeating === 'unknown' ? '확인 필요' : store.hasSeating === 'yes' ? '있음' : '없음'}
      </p>
      <div className="text-xs text-gray-500 mt-2">{store.notes || '좌석 형태/비고 정보가 없습니다'}</div>
      <button
        className={
          store.hasSeating === 'unknown'
            ? 'bg-blue-500 text-white px-3 py-2 rounded mt-3'
            : 'bg-orange-500 text-white px-3 py-2 rounded mt-3'
        }
        onClick={onEdit}
      >
        {store.hasSeating === 'unknown' ? '정보 추가하기' : '⚠️ 실제와 다른가요?'}
      </button>
    </div>
  );
};
