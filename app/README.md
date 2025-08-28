# Lightning Network Dashboard

一个基于 Next.js 的闪电网络（Lightning Network）实时监控 Dashboard，提供网络容量、节点分布、ISP 分析等关键指标的实时可视化。

## 🚀 特性

- **实时数据监控**: 使用 TanStack Query 实现数据轮询和缓存
- **丰富的数据可视化**: 集成 ECharts 提供多种图表类型
  - KPI 卡片展示关键指标
  - 时间序列面积图显示网络趋势
  - 世界地图展示全球节点分布
  - ISP 排行榜柱状图
- **响应式设计**: 支持移动端和桌面端
- **暗色模式**: 自动适配系统主题
- **类型安全**: 完整的 TypeScript 支持，使用 Zod 进行数据验证
- **现代化 UI**: 基于 shadcn/ui 和 Tailwind CSS

## 🛠️ 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS v4
- **UI 组件**: shadcn/ui + lucide-react
- **数据获取**: TanStack Query v5
- **图表**: ECharts 6
- **数据验证**: Zod
- **测试**: Vitest + Testing Library
- **代码质量**: ESLint + Prettier

## 📦 安装和运行

### 前置要求

- Node.js 18+
- pnpm (推荐) 或 npm

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 📊 功能模块

### 1. KPI 指标卡片

- 总容量 (Total Capacity)
- 节点数 (Total Nodes)
- 通道数 (Total Channels)
- 平均通道容量 (Average Channel Capacity)
- 网络增长率 (Network Growth)

### 2. 数据可视化

- **网络容量趋势图**: 显示过去30天的容量变化
- **全球节点分布图**: 交互式世界地图展示节点分布
- **ISP 排行榜**: 按节点数量排序的 ISP 统计

### 3. 数据轮询

- KPI 数据: 30秒轮询
- 时间序列: 1分钟轮询
- 地理数据: 5分钟轮询
- ISP 数据: 5分钟轮询

## 🔧 配置

### 环境变量

创建 `.env.local` 文件：

```env
# API 基础 URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api

# 是否使用假数据 (开发模式)
NEXT_PUBLIC_USE_MOCK_DATA=true
```

### 替换真实 API

1. 设置 `NEXT_PUBLIC_API_BASE_URL` 为你的 API 地址
2. 设置 `NEXT_PUBLIC_USE_MOCK_DATA=false`
3. 确保 API 返回符合 [API 文档](./docs/api-integration.md) 的数据格式

## 🧪 测试

```bash
# 运行测试
pnpm test

# 运行测试 UI
pnpm test:ui

# 生成测试覆盖率报告
pnpm test:coverage
```

## 📝 代码质量

```bash
# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 检查格式化
pnpm format:check
```

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── dashboard/         # Dashboard 页面
│   ├── api/              # API 路由
│   └── ...
├── components/           # React 组件
│   ├── ui/              # shadcn/ui 基础组件
│   ├── charts/          # ECharts 图表组件
│   └── dashboard/       # Dashboard 专用组件
├── libs/                # 工具库和类型定义
│   ├── types.ts         # TypeScript 类型定义
│   ├── api.ts           # API 请求封装
│   └── query.ts         # TanStack Query 配置
└── test/                # 测试设置
```

详细的项目结构请参考 [项目结构文档](./docs/project-structure.md)。

## 📚 文档

- [项目结构文档](./docs/project-structure.md)
- [API 集成文档](./docs/api-integration.md)
- [AI 必读文档](./docs/ai-must-read.md)

## 🤝 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [ECharts](https://echarts.apache.org/) - 图表库
- [TanStack Query](https://tanstack.com/query) - 数据获取库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
