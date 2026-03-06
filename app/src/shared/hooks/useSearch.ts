import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useNetwork } from "@/features/networks/context/NetworkContext";

const SEARCH_HISTORY_KEY = "fiber_search_history";
const MAX_HISTORY_ITEMS = 10;

export function useSearch() {
  const [query, setQuery] = useState("");
  const [showNoResults, setShowNoResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const router = useRouter();
  const { apiClient } = useNetwork();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载搜索历史
  useEffect(() => {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (e) {
        console.error("Failed to parse search history:", e);
      }
    }
  }, []);

  // 点击外部关闭下拉框并失焦输入框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowHistory(false);
        setShowNoResults(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 保存搜索历史
  const saveToHistory = (searchTerm: string) => {
    const updatedHistory = [
      searchTerm,
      ...searchHistory.filter((item) => item !== searchTerm),
    ].slice(0, MAX_HISTORY_ITEMS);

    setSearchHistory(updatedHistory);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  // 清除搜索历史
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  // 搜索逻辑
  const handleSearch = async () => {
    const rawValue = query.trim();
    if (!rawValue) return;

    setShowHistory(false);

    // 允许可选的 0x 前缀，但长度判断按去掉前缀后的纯十六进制长度
    const has0xPrefix = rawValue.startsWith("0x") || rawValue.startsWith("0X");
    const normalized = has0xPrefix ? rawValue.slice(2) : rawValue;

    // 如果是十六进制
    if (/^[0-9a-fA-F]+$/.test(normalized)) {
      if (normalized.length === 72) {
        saveToHistory(rawValue);
        router.push(`/channel/${encodeURIComponent(rawValue)}`);
        return;
      } else if (normalized.length === 66) {
        saveToHistory(rawValue);
        router.push(`/node/${encodeURIComponent(rawValue)}`);
        return;
      }
    }

    // 不是十六进制，执行模糊搜索
    setIsSearching(true);
    setShowNoResults(false);

    try {
      const result = await apiClient.searchNodesByName(rawValue, 0, undefined, undefined, 10);
      
      if (result.nodes && result.nodes.length > 0) {
        // 有结果，保存到历史并跳转到搜索结果页面
        saveToHistory(rawValue);
        router.push(`/search?q=${encodeURIComponent(rawValue)}`);
      } else {
        // 没有结果，显示提示（不保存到历史）
        setShowNoResults(true);
      }
    } catch (error) {
      console.error("Search error:", error);
      setShowNoResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowNoResults(false);
  };

  // 处理聚焦
  const handleFocus = () => {
    if (searchHistory.length > 0) {
      setShowHistory(true);
      setShowNoResults(false);
      setHighlightedIndex(-1);
    }
  };

  // 清空搜索
  const clearQuery = () => {
    setQuery('');
    setShowNoResults(false);
  };

  // 处理历史记录点击
  const handleHistoryClick = (historyItem: string) => {
    setQuery(historyItem);
    setShowHistory(false);
    setHighlightedIndex(-1);
    // 直接搜索
    setTimeout(() => {
      const rawValue = historyItem.trim();
      if (!rawValue) return;

      const has0xPrefix = rawValue.startsWith("0x") || rawValue.startsWith("0X");
      const normalized = has0xPrefix ? rawValue.slice(2) : rawValue;

      // 只有当是十六进制且长度符合要求时才直接跳转
      if (/^[0-9a-fA-F]+$/.test(normalized) && (normalized.length === 72 || normalized.length === 66)) {
        if (normalized.length === 72) {
          router.push(`/channel/${encodeURIComponent(rawValue)}`);
        } else if (normalized.length === 66) {
          router.push(`/node/${encodeURIComponent(rawValue)}`);
        }
      } else {
        // 其他情况都当作搜索词处理
        router.push(`/search?q=${encodeURIComponent(rawValue)}`);
      }
    }, 100);
  };

  // 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (showHistory && searchHistory.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % searchHistory.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex(prev => (prev <= 0 ? searchHistory.length - 1 : prev - 1));
        return;
      }
      if (event.key === "Enter" && highlightedIndex >= 0) {
        event.preventDefault();
        handleHistoryClick(searchHistory[highlightedIndex]);
        return;
      }
    }
    if (event.key === "Escape") {
      setShowHistory(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
      return;
    }
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  return {
    // State
    query,
    showNoResults,
    isSearching,
    showHistory,
    searchHistory,
    highlightedIndex,
    wrapperRef,
    inputRef,
    // Actions
    handleSearch,
    handleInputChange,
    handleKeyDown,
    handleFocus,
    clearQuery,
    clearHistory,
    handleHistoryClick,
    setHighlightedIndex,
    setQuery,
  };
}
