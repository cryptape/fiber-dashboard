"use client";

import "./index.css";
import Tabs, { TabItem } from "@/shared/components/ui/NavTabs";
import {
  CustomSelect,
  SelectOption,
} from "@/shared/components/ui/CustomSelect";
import {
  CustomMenu,
  MenuItem,
  MenuOption,
} from "@/shared/components/ui/CustomMenu";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useNetwork } from "@/features/networks/context/NetworkContext";

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
  { value: "mainnet", label: "Mainnet (Meepo)", iconSrc: "/mainnet.svg" },
  { value: "testnet", label: "Testnet (Meepo)", iconSrc: "/testnet.svg" },
];

// 为 CustomSelect 组件转换数据格式
const NETWORK_OPTIONS: SelectOption[] = NETWORK_DATA.map(network => ({
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

  // 使用 NetworkContext 来管理网络状态
  const { currentNetwork, switchNetwork } = useNetwork();

  // 统一管理选中的 tab 状态
  const [selectedTab, setSelectedTab] = useState(() =>
    getTabIdFromPath(pathname)
  );

  // 监听页面滚动，控制背景色
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 64);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 监听路由变化,同步更新 selectedTab
  useEffect(() => {
    const tabId = getTabIdFromPath(pathname);
    setSelectedTab(tabId);
  }, [pathname]);

  const handleTabChange = (tabId: string) => {
    setSelectedTab(tabId);
    const selectedItem = NAV_ITEMS_DATA.find(item => item.id === tabId);
    if (selectedItem) {
      router.push(selectedItem.path);
    }
  };

  const handleNetworkChange = (network: string) => {
    switchNetwork(network as "mainnet" | "testnet");
    console.log("Network changed to:", network);
  };

  return (
    <nav className={`navbar-fixed z-50 transition-colors duration-300 ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="flex items-center justify-between relative h-12">
        {/* Left item - Logo */}
        <div className="flex items-center">
          <div 
            className="glass-card flex justify-center items-center w-12 h-12 p-2.5 rounded-full shrink-0 lg:w-[207px] lg:h-12 lg:gap-2.5 lg:rounded-[40px] cursor-pointer"
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
        </div>

        {/* Center item - Main NavBar (hidden on mobile and tablet, visible on desktop) */}
        <div className="hidden lg:flex items-center justify-center px-6">
          <Tabs
            items={NAV_ITEMS}
            value={selectedTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Right item - Network Select (hidden on mobile and tablet, visible on desktop) */}
        <div className="hidden lg:flex items-center relative h-12">
          <CustomSelect
            options={NETWORK_OPTIONS}
            value={currentNetwork}
            onChange={handleNetworkChange}
          />
        </div>

        {/* Collapse button with CustomMenu (visible on mobile and tablet, hidden on desktop) */}
        <div className="flex lg:hidden items-center">
          <CustomMenu
            menuItems={MENU_ITEMS}
            selectedMenuItem={selectedTab}
            onMenuItemChange={handleTabChange}
            options={MENU_OPTIONS}
            selectedOption={currentNetwork}
            onOptionChange={handleNetworkChange}
          />
        </div>
      </div>
    </nav>
  );
}
