import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface QuickBrandButtonsProps {
  onBrandSelect: (brand: string) => void;
  selectedBrand?: string;
}

export function QuickBrandButtons({ onBrandSelect, selectedBrand }: QuickBrandButtonsProps) {
  const popularBrands = [
    { name: 'CU', color: 'bg-purple-500 hover:bg-purple-600' },
    { name: 'GS25', color: 'bg-blue-500 hover:bg-blue-600' },
    { name: '세븐일레븐', color: 'bg-gray-800 hover:bg-gray-900' },

    { name: '이마트24', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { name: '미니스톱', color: 'bg-green-500 hover:bg-green-600' }
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600 font-medium">인기 브랜드:</span>
        {selectedBrand && selectedBrand !== 'all' && (
          <Badge variant="outline" className="text-xs">
            {selectedBrand} 선택됨
            <button 
              onClick={() => onBrandSelect('all')}
              className="ml-1 hover:bg-gray-300 rounded-full w-3 h-3 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {popularBrands.map((brand) => (
          <Button
            key={brand.name}
            onClick={() => onBrandSelect(brand.name)}
            size="sm"
            variant={selectedBrand === brand.name ? "default" : "outline"}
            className={selectedBrand === brand.name ? brand.color : "hover:bg-gray-50"}
          >
            {brand.name}
          </Button>
        ))}
        <Button
          onClick={() => onBrandSelect('all')}
          size="sm"
          variant={selectedBrand === 'all' || !selectedBrand ? "default" : "outline"}
          className="text-gray-600"
        >
          전체
        </Button>
      </div>
    </div>
  );
}