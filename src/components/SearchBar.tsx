import React, { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery);
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2">
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder="편의점 이름 또는 주소로 검색..."
          value={query}
          onChange={handleInputChange}
          className="h-10 pr-10"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 h-10">
        검색
      </Button>
    </form>
  );
}