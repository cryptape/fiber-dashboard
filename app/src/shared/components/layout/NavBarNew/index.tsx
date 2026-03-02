"use client";

import "./index.css";
import type { TabItem } from "@/shared/components/ui/NavTabs";
import {
  SelectOption,
} from "@/shared/components/ui/CustomSelect";
import {
  CustomMenu,
  MenuItem,
  MenuOption,
} from "@/shared/components/ui/CustomMenu";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import HeaderSearchBar, { type HeaderSearchBarRef } from "@/shared/components/layout/HeaderSearchBar";
import { useSearch } from "@/shared/hooks/useSearch";

// 基础导航项数据
const NAV_ITEMS_DATA = [
  { id: "overview", label: "Overview", path: "/" },
  { id: "nodes", label: "Nodes", path: "/nodes" },
  { id: "channels", label: "Channels", path: "/channels" },
];

// 为 Tabs 组件转换数据格式
const NAV_ITEMS: TabItem[] = NAV_ITEMS_DATA;

// 为 CustomMenu 组件转换数据格式
const MENU_ITEMS: MenuItem[] = NAV_ITEMS_DATA.map(item => ({
  value: item.id,
  label: item.label,
}));

// 基础网络选项数据
const NETWORK_DATA = [
  { value: "mainnet", label: "Mainnet", fullLabel: "Mainnet (Meepo)", iconSrc: "/mainnet.svg" },
  { value: "testnet", label: "Testnet", fullLabel: "Testnet (Meepo)", iconSrc: "/testnet.svg" },
];

// 为 CustomSelect 组件转换数据格式 - 选中状态使用简短label，展开时使用fullLabel
const NETWORK_OPTIONS: SelectOption[] = NETWORK_DATA.map(network => ({
  value: network.value,
  label: network.fullLabel, // 展开时显示完整label
  icon: (
    <Image
      src={network.iconSrc}
      alt={network.label}
      width={16}
      height={16}
      className="w-4 h-4"
    />
  ),
}));

// 为 CustomMenu 组件转换数据格式
const MENU_OPTIONS: MenuOption[] = NETWORK_DATA.map(network => ({
  value: network.value,
  label: network.label,
  icon: (
    <Image
      src={network.iconSrc}
      alt={network.label}
      width={16}
      height={16}
      className="w-4 h-4"
    />
  ),
}));

export default function NavBarNew() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HeaderSearchBarRef>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const { currentNetwork, switchNetwork } = useNetwork();
  
  // 使用搜索 hook
  const {
    query,
    showNoResults,
    isSearching,
    searchHistory,
    wrapperRef: searchWrapperRef,
    handleInputChange,
    handleKeyDown,
    handleFocus,
    clearHistory,
    handleHistoryClick,
  } = useSearch();

  // 监听滚动，控制背景色
  useEffect(() => {
    const handleScroll = () => {
      // 滚动超过64px时切换到白色背景
      setIsScrolled(window.scrollY > 64);
    };

    window.addEventListener('scroll', handleScroll);
    // 初始检查
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 监听 / 键，滚动到顶部并聚焦搜索框（除了首页和 search 路由）
  useEffect(() => {
    const shouldShowSearchBar = pathname !== '/' && pathname !== '/search';
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在应该显示搜索框的页面响应
      if (!shouldShowSearchBar) return;
      
      // 如果焦点在输入框内，不响应
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        // 平滑滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // 延迟聚焦，等待滚动动画开始
        setTimeout(() => {
          searchBarRef.current?.focus();
        }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pathname]);

  // 根据当前路径找到对应的 tab ID
  const getTabIdFromPath = (path: string) => {
    // 精确匹配
    const exactMatch = NAV_ITEMS_DATA.find(item => item.path === path);
    if (exactMatch) return exactMatch.id;

    // 动态路由匹配（例如 /nodes/xxx 或 /node/xxx 匹配到 nodes）
    if (path.startsWith("/node")) return "nodes";
    if (path.startsWith("/channel")) return "channels";

    return "overview";
  };

  // 统一管理选中的 tab 状态
  const [selectedTab, setSelectedTab] = useState(() =>
    getTabIdFromPath(pathname)
  );

  // 监听路由变化,同步更新 selectedTab
  useEffect(() => {
    const tabId = getTabIdFromPath(pathname);
    setSelectedTab(tabId);
  }, [pathname]);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsSelectOpen(false);
      }
    };

    if (isSelectOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelectOpen]);

  const handleTabChange = (tabId: string) => {
    setSelectedTab(tabId);
    const selectedItem = NAV_ITEMS_DATA.find(item => item.id === tabId);
    if (selectedItem) {
      // 保留当前 URL 参数
      const params = searchParams.toString();
      const url = params ? `${selectedItem.path}?${params}` : selectedItem.path;
      router.push(url);
    }
  };

  const handleNetworkChange = (network: string) => {
    switchNetwork(network as "mainnet" | "testnet");
    setIsSelectOpen(false);
    console.log("Network changed to:", network);
  };

  const handleToggleSelect = () => {
    setIsSelectOpen(!isSelectOpen);
  };

  const handleToggleMobileSearch = () => {
    setIsMobileSearchOpen(!isMobileSearchOpen);
  };

  return (
    <>
    <nav className={`navbar-fixed ${isScrolled ? 'navbar-scrolled-white' : 'navbar-scrolled'} z-50 transition-colors duration-300`}>
      <div className="flex items-center justify-between relative h-16">
        {/* Left item - Logo + Main NavBar */}
        <div className="flex items-center">
          <div 
            className=" flex justify-center items-center w-12 h-12 p-2.5 rounded-full shrink-0 lg:w-[207px] lg:h-12 lg:gap-2.5 lg:rounded-[40px] cursor-pointer"
            onClick={() => router.push('/')}
          >
            {/* Desktop Logo */}
            <div className="hidden lg:flex items-center gap-2">
              <Image src="/logo_m.svg" alt="Fiber" width={17} height={24} />
              <Image
                src="/logo_text.svg"
                alt="Fiber Dashboard"
                width={140}
                height={40}
              />
            </div>

            {/* Mobile Logo */}
            <Image
              src="/logo_m.svg"
              alt="Logo"
              width={19.66}
              height={27.62}
              className="block lg:hidden m-auto"
            />
          </div>

          {/* Main NavBar (hidden on mobile and tablet, visible on desktop) */}
          <div className="hidden lg:flex items-center ml-8">
            <div className="inline-flex justify-center items-center">
              {NAV_ITEMS.map((item) => {
                const isSelected = selectedTab === item.id;
                return (
                  <div
                    key={item.id}
                    data-hovered="False"
                    data-selected={isSelected ? "True" : "False"}
                    className="w-24 h-10 px-3 py-2.5 flex justify-center items-center gap-2.5 cursor-pointer"
                    onClick={() => handleTabChange(item.id)}
                  >
                    <div
                      className={`justify-start type-button1 ${isSelected ? "text-purple" : "text-primary"}`}
                    >
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* Right item - Search Bar + Network Select (hidden on mobile and tablet, visible on desktop) */}
        <div className="hidden lg:flex items-center gap-4 relative h-12" ref={selectRef}>
          {/* Search Bar - 只在非首页和非 search 页面显示，滚动超过64px时隐藏 */}
          {pathname !== '/' && pathname !== '/search' && !isScrolled && (
            <HeaderSearchBar ref={searchBarRef} />
          )}

          {/* Network Select */}
          <div className="inline-flex justify-start items-center gap-4">
            <div 
              data-hasicon="true" 
              data-property-1="Default" 
              className="h-10 rounded-lg flex justify-center items-center gap-3 cursor-pointer transition-colors"
              style={{ 
                backgroundColor: 'rgba(116, 89, 230, 0.1)',
                padding: '10px 12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(116, 89, 230, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(116, 89, 230, 0.1)'}
              onClick={handleToggleSelect}
            >
              <div className="flex justify-start items-center gap-2">
                <div className="w-4 h-4 relative">
                  <Image 
                    src={currentNetwork === "mainnet" ? "/mainnet.svg" : "/testnet.svg"}
                    alt="Network"
                    width={16}
                    height={16}
                    className="w-4 h-4"
                  />
                </div>
                <div className="type-button1 text-primary">
                  {currentNetwork === "mainnet" ? "Mainnet" : "Testnet"}
                </div>
              </div>
              <div className="w-4 h-4 relative overflow-hidden">
                <Image 
                  src="/arrow.svg" 
                  alt="Arrow"
                  width={16}
                  height={16}
                  className={`w-4 h-4 transition-transform ${isSelectOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* 下拉菜单 */}
          {isSelectOpen && (
            <div 
              className="w-52 py-0.5 rounded-lg shadow-[0px_4px_6px_0px_rgba(0,0,0,0.08)] inline-flex flex-col justify-start items-start absolute top-full mt-1 right-0 z-50"
              style={{ backgroundColor: '#ffffff' }}
            >
              {NETWORK_OPTIONS.map((option) => {
                const isSelected = option.value === currentNetwork;

                return (
                  <div
                    key={option.value}
                    data-selected={isSelected}
                    data-state="Default"
                    onClick={() => handleNetworkChange(option.value)}
                    className="self-stretch h-10 px-3 inline-flex justify-between items-center cursor-pointer transition-colors hover:bg-surface-layer/30"
                  >
                    <div className="flex justify-start items-center gap-2">
                      {option.icon && (
                        <div data-type="icon" className="w-4 h-4 relative overflow-hidden">
                          {option.icon}
                        </div>
                      )}
                      <div className="type-button1 text-primary">
                        {option.label}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 relative overflow-hidden">
                        <Image
                          src="/check.svg"
                          alt="Selected"
                          width={16}
                          height={16}
                          className="w-full h-full"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Collapse button with CustomMenu (visible on mobile and tablet, hidden on desktop) */}
        <div className="flex lg:hidden items-center">
          {/* Search button - 只在非首页和非 search 页面显示 */}
          {pathname !== '/' && pathname !== '/search' && (
            <button
              onClick={handleToggleMobileSearch}
              className="flex items-center justify-center transition-opacity hover:opacity-70 mr-10"
              aria-label="搜索"
            >
              <Image
                src={isMobileSearchOpen ? "/search3.svg" : "/search2.svg"}
                alt="搜索"
                width={48}
                height={48}
                className={
                  isMobileSearchOpen
                    ? "w-[14px] h-[14px] md:w-12 md:h-12 lg:w-12 lg:h-12"
                    : "w-[14px] h-[14px] md:w-6 md:h-6 lg:w-12 lg:h-12"
                }
              />
            </button>
          )}
          
          {/* 搜索打开时显示关闭按钮，否则显示 CustomMenu */}
          {isMobileSearchOpen && pathname !== '/' && pathname !== '/search' ? (
            <button
              onClick={handleToggleMobileSearch}
              className="flex items-center justify-center transition-opacity hover:opacity-70"
              aria-label="关闭搜索"
            >
              <Image
                src="/close.svg"
                alt="关闭"
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </button>
          ) : (
            <CustomMenu
              menuItems={MENU_ITEMS}
              selectedMenuItem={selectedTab}
              onMenuItemChange={handleTabChange}
              options={MENU_OPTIONS}
              selectedOption={currentNetwork}
              onOptionChange={handleNetworkChange}
            />
          )}
        </div>
      </div>
    </nav>

      {/* Mobile Search Panel - 在 header 下方，覆盖整个视口高度 */}
      {isMobileSearchOpen && pathname !== '/' && pathname !== '/search' && (
        <div 
          className={`lg:hidden fixed left-0 right-0 bg-white shadow-lg z-40 mobile-search-panel ${isScrolled ? 'scrolled' : ''}`}
          ref={searchWrapperRef}
        >
          <div className="flex flex-col">
            {/* Tip Text - 移动端显示 */}
            <div className="text-[10px] font-normal leading-[140%] text-secondary md:hidden mb-2 text-center">
              Tip: search by Channel outpoint / Node ID / Node name
            </div>
            
            {/* Search Input */}
            <div className="self-stretch h-10 px-3 py-2.5 bg-surface-popover  border rounded-lg outline-offset-[-1px] outline-border backdrop-blur-[5px] inline-flex justify-start items-center gap-2">
              <div className="w-4 h-4 relative overflow-hidden flex items-center justify-center">
                <Image
                  src="/search2.svg"
                  alt="搜索"
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
              </div>
              <input
                ref={mobileSearchInputRef}
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-primary text-sm font-medium font-['Inter'] leading-4 placeholder:text-tertiary"
                placeholder="Search..."
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                disabled={isSearching}
              />
            </div>

            {/* Recently Searched - 常驻显示，除非显示无结果 */}
            {!showNoResults && searchHistory.length > 0 && (
              <>
                <div className="flex justify-between items-center mt-6">
                  <div className="type-caption text-tertiary uppercase">RECENTLY SEARCHED</div>
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <Image
                      src="/trash.svg"
                      alt="Clear"
                      width={14}
                      height={14}
                      className="w-3.5 h-3.5"
                    />
                    <div className="type-caption text-tertiary uppercase">CLEAR HISTORY</div>
                  </button>
                </div>
                <div className="flex flex-col mt-2">
                  {searchHistory.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        handleHistoryClick(item);
                        // 延迟关闭搜索面板，确保跳转完成
                        setTimeout(() => {
                          setIsMobileSearchOpen(false);
                        }, 150);
                      }}
                      className="h-8 flex items-center  gap-2 hover:bg-[var(--surface-layer)] transition-colors "
                    >
                      <Image
                        src="/history.svg"
                        alt="History"
                        width={14}
                        height={14}
                        className="w-3.5 h-3.5"
                      />
                      <div className="text-sm font-normal leading-[140%] text-secondary">{item}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* No Results */}
            {showNoResults && (
              <div className="flex flex-col gap-2.5 mt-6">
                <div className="flex flex-col gap-2">
                  <div className="type-body text-primary">
                    Your search <span className="font-bold">&quot;{query}&quot;</span> did not match any records.
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="type-body text-secondary">Try searching with:</div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-[var(--text-secondary)] mt-2 shrink-0" style={{ marginLeft: '2px' }}></div>
                      <div className="type-body text-secondary">A full channel outpoint</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-[var(--text-secondary)] mt-2 shrink-0" style={{ marginLeft: '2px' }}></div>
                      <div className="type-body text-secondary">A full node ID</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-[var(--text-secondary)] mt-2 shrink-0" style={{ marginLeft: '2px' }}></div>
                      <div className="type-body text-secondary">A node name (partial match supported)</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </>
  );
}
