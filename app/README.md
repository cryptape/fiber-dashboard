# Lightning Network Dashboard - Frontend

[English](#english) | [中文](#中文)

---

## English

### Overview

A modern, real-time dashboard application for monitoring and analyzing the Lightning Network infrastructure. Built with Next.js 15, React 19, and TypeScript, providing comprehensive insights into network nodes, channels, and performance metrics.

### Features

- 📊 **Real-time Dashboard**: Live monitoring of Lightning Network statistics and metrics
- 🌐 **Network Visualization**: Interactive network topology visualization using force-graph
- 📈 **Advanced Analytics**: Comprehensive charts and graphs powered by ECharts
- 🔍 **Node Explorer**: Detailed node information and metrics
- 💰 **Channel Management**: Monitor and analyze payment channels
- 🎨 **Modern UI**: Beautiful, responsive interface built with Tailwind CSS and Radix UI
- 🌓 **Dark/Light Mode**: Support for multiple theme modes
- ⚡ **High Performance**: Optimized with Next.js 15 Turbopack for fast development

### Project Structure

```
app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── channel/           # Channel detail pages
│   │   ├── channels/          # Channels list page
│   │   ├── node/              # Node detail pages
│   │   ├── nodes/             # Nodes list page
│   │   ├── test/              # Test pages
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page (Dashboard)
│   │   └── style.css          # Global styles
│   ├── features/              # Feature modules
│   │   ├── channels/          # Channel-related features
│   │   ├── dashboard/         # Dashboard features
│   │   ├── networks/          # Network context and features
│   │   └── nodes/             # Node-related features
│   ├── lib/                   # Core utilities and configurations
│   │   ├── client.ts          # API client
│   │   ├── const.ts           # Constants
│   │   ├── types.ts           # Type definitions
│   │   └── utils.ts           # Utility functions
│   ├── shared/                # Shared components and utilities
│   │   └── components/        # Reusable components
│   │       ├── chart/         # Chart components
│   │       ├── layout/        # Layout components (Header, Footer, etc.)
│   │       └── ui/            # UI primitives (Button, Card, etc.)
│   └── test/                  # Test utilities and setup
├── .env.local                 # Environment variables
├── next.config.ts             # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── vitest.config.ts           # Vitest configuration
└── package.json               # Dependencies and scripts
```

### Getting Started

#### Prerequisites

- Node.js 20 or higher
- pnpm (recommended package manager)

#### Installation

```bash
# Install dependencies
pnpm install
```

#### Environment Setup

Create a `.env.local` file in the app directory:

```env
NEXT_PUBLIC_API_BASE_URL=https://fiber-dash-api-test.fiber.channel/
```

#### Development

```bash
# Start development server with Turbopack
pnpm dev

# The app will be available at http://localhost:3000
```

#### Build

```bash
# Create production build
pnpm build

# Start production server
pnpm start
```

#### Testing

```bash
# Run unit tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run end-to-end tests
pnpm test:e2e
```

#### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run unit tests |
| `pnpm test:ui` | Run tests with UI |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check code formatting |

### Key Features Implementation

#### Dashboard
- Real-time network statistics
- KPI cards for key metrics
- Interactive charts and graphs
- Network health monitoring

#### Node Management
- Browse all Lightning Network nodes
- View detailed node information
- Analyze node capacity and channels
- Geographic distribution visualization

#### Channel Analytics
- Channel list and details
- Capacity and liquidity metrics
- Channel state monitoring
- Payment flow analysis

### API Integration

The application connects to a backend API for data fetching. Configure the API endpoint in `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=https://fiber-dash-api-test.fiber.channel/
```

### Performance Optimization

- **Turbopack**: Fast builds and hot module replacement
- **React Query**: Efficient data caching and synchronization
- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js automatic image optimization
- **Lazy Loading**: Components loaded on demand

### Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Contributing

1. Follow the existing code style
2. Write tests for new features
3. Run linting and formatting before committing
4. Use conventional commit messages

### License

MIT

---

## 中文

### 概述

一个现代化的实时仪表盘应用，用于监控和分析闪电网络基础设施。使用 Next.js 15、React 19 和 TypeScript 构建，提供网络节点、通道和性能指标的全面洞察。

### 功能特性

- 📊 **实时仪表盘**：实时监控闪电网络统计数据和指标
- 🌐 **网络可视化**：使用 force-graph 的交互式网络拓扑可视化
- 📈 **高级分析**：基于 ECharts 的综合图表和图形
- 🔍 **节点浏览器**：详细的节点信息和指标
- 💰 **通道管理**：监控和分析支付通道
- 🎨 **现代化 UI**：使用 Tailwind CSS 和 Radix UI 构建的美观响应式界面
- 🌓 **深色/浅色模式**：支持多种主题模式
- ⚡ **高性能**：使用 Next.js 15 Turbopack 优化，实现快速开发

### 项目结构

```
app/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── channel/           # 通道详情页
│   │   ├── channels/          # 通道列表页
│   │   ├── node/              # 节点详情页
│   │   ├── nodes/             # 节点列表页
│   │   ├── test/              # 测试页面
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页（仪表盘）
│   │   └── style.css          # 全局样式
│   ├── features/              # 功能模块
│   │   ├── channels/          # 通道相关功能
│   │   ├── dashboard/         # 仪表盘功能
│   │   ├── networks/          # 网络上下文和功能
│   │   └── nodes/             # 节点相关功能
│   ├── lib/                   # 核心工具和配置
│   │   ├── client.ts          # API 客户端
│   │   ├── const.ts           # 常量
│   │   ├── types.ts           # 类型定义
│   │   └── utils.ts           # 工具函数
│   ├── shared/                # 共享组件和工具
│   │   └── components/        # 可复用组件
│   │       ├── chart/         # 图表组件
│   │       ├── layout/        # 布局组件（Header、Footer 等）
│   │       └── ui/            # UI 原语（Button、Card 等）
│   └── test/                  # 测试工具和设置
├── .env.local                 # 环境变量
├── next.config.ts             # Next.js 配置
├── tailwind.config.js         # Tailwind CSS 配置
├── tsconfig.json              # TypeScript 配置
├── vitest.config.ts           # Vitest 配置
└── package.json               # 依赖和脚本
```

### 快速开始

#### 前置要求

- Node.js 20 或更高版本
- pnpm（推荐的包管理器）

#### 安装

```bash
# 安装依赖
pnpm install
```

#### 环境配置

在 app 目录下创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_BASE_URL=https://fiber-dash-api-test.fiber.channel/
```

#### 开发

```bash
# 使用 Turbopack 启动开发服务器
pnpm dev

# 应用将在 http://localhost:3000 上运行
```

#### 构建

```bash
# 创建生产构建
pnpm build

# 启动生产服务器
pnpm start
```

#### 测试

```bash
# 运行单元测试
pnpm test

# 使用 UI 运行测试
pnpm test:ui

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 运行端到端测试
pnpm test:e2e
```

#### 代码质量

```bash
# 代码检查
pnpm lint

# 格式化代码
pnpm format

# 检查代码格式
pnpm format:check
```

### 可用脚本

| 脚本 | 描述 |
|------|------|
| `pnpm dev` | 使用 Turbopack 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 启动生产服务器 |
| `pnpm lint` | 运行 ESLint |
| `pnpm test` | 运行单元测试 |
| `pnpm test:ui` | 使用 UI 运行测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm format` | 使用 Prettier 格式化代码 |
| `pnpm format:check` | 检查代码格式 |

### 关键功能实现

#### 仪表盘
- 实时网络统计
- 关键指标的 KPI 卡片
- 交互式图表和图形
- 网络健康监控

#### 节点管理
- 浏览所有闪电网络节点
- 查看详细的节点信息
- 分析节点容量和通道
- 地理分布可视化

#### 通道分析
- 通道列表和详情
- 容量和流动性指标
- 通道状态监控
- 支付流分析

### API 集成

应用程序连接到后端 API 以获取数据。在 `.env.local` 中配置 API 端点：

```env
NEXT_PUBLIC_API_BASE_URL=https://fiber-dash-api-test.fiber.channel/
```

### 性能优化

- **Turbopack**：快速构建和热模块替换
- **React Query**：高效的数据缓存和同步
- **代码分割**：基于路由的自动代码分割
- **图片优化**：Next.js 自动图片优化
- **懒加载**：按需加载组件

### 浏览器支持

- Chrome（最新版）
- Firefox（最新版）
- Safari（最新版）
- Edge（最新版）

### 贡献指南

1. 遵循现有的代码风格
2. 为新功能编写测试
3. 提交前运行代码检查和格式化
4. 使用约定式提交消息

### 许可证

MIT
