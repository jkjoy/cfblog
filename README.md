## 项目简介
![后台截图](./ScreenShot.png)
CFBlog 是一个类似 WordPress 的博客系统，使用 Cloudflare 生态系统构建，具有高性能、低成本、全球分发的特点。

当前版本已经内置公开前台，不再依赖单独部署的前端项目。访客前台、`/wp-admin` 后台和 `/wp-json` API 现在由同一个 Cloudflare Worker 提供。
默认前台视觉已切换为参考 `vhAstro-Theme` 的一体化主题风格，静态图片、字体、SVG 和主题样式由 Worker 的 `assets` 绑定直接托管。
  
### 技术栈

**后端 (API)**
- Cloudflare Workers - 无服务器计算平台
- Hono - 快速轻量的 Web 框架
- D1 - Cloudflare 的 SQLite 数据库
- R2 - Cloudflare 对象存储
- AI - Cloudflare 人工智能服务
- TypeScript - 类型安全的开发体验
- bcryptjs - 密码加密
- jose - JWT 认证

**前端 (SSR)**
- Cloudflare Workers + Hono HTML 渲染
- Marked - Markdown 转 HTML
- 原生 CSS + 少量原生 JavaScript
- Workers Assets - 托管 `public/` 下的主题静态资源
- 一体化部署: 前台、后台、API 同域同服务

## 功能特性

### 内容管理
- ✅ 集成式前台（首页、归档、分类、标签、文章页、友链页、动态页）
- ✅ 文章管理（创建、编辑、删除、发布）
- ✅ 分类和标签系统
- ✅ Markdown 编辑器支持
- ✅ 文章摘要和置顶功能
- ✅ 特色图片支持（URL 或媒体库）
- ✅ 文章状态管理（草稿、发布、待审核、私密、回收站）
- ✅ 页面和文章类型支持
- ✅ 评论系统
- ✅ 基于 Resend 的评论邮件通知（可开关）
- ✅ 浏览计数
- ✅ 固定 JSON 内容导入（后台导入页 + WordPress / Typecho 导出插件示例 + Hugo Markdown 转换脚本）
- ✅ 使用Cloudflare AI自动生成文章的slug
- ✅ 使用Cloudflare AI自动生成文章的摘要
- ✅ 使用Cloudflare AI自动生成分类和标签的slug

### 媒体管理
- ✅ 图片上传到 R2 存储
- ✅ 媒体库管理
- ✅ 图片元数据（标题、描述、替代文本）
- ✅ 支持多种文件格式

### 用户系统
- ✅ 用户注册和登录 第一个注册的用户为管理员 之后不再显示注册
- ✅ JWT 认证
- ✅ 角色权限系统（管理员、编辑、作者、投稿者、订阅者）通过后台添加用户或者通过API创建用户
- ✅ 用户资料管理
- ✅ 头像和个人简介

### 友情链接
- ✅ 链接分类管理
- ✅ 友情链接管理
- ✅ 链接排序和可见性控制
- ✅ 头像支持

### 系统设置
- ✅ 站点基础设置（标题、描述、关键词）
- ✅ SEO 配置
- ✅ 自定义页脚文本
- ✅ ICP 备案信息
- ✅ webhook url 填写Cloudflare Pages的部署钩子,选择触发的事件,会在事件发生时触发部署任务

## 内容导入

当前版本已内置后台导入页：`/wp-admin -> 导入`。

导入格式使用固定 JSON 结构，支持文章/页面放到 `content`，动态/说说放到 `moments`。核心字段如下：

```json
{
  "format": "cfblog-import",
  "version": "1.1",
  "source": {
    "platform": "hugo",
    "site_name": "Example Blog",
    "site_url": "https://example.com"
  },
  "categories": [
    {
      "name": "技术",
      "slug": "tech"
    }
  ],
  "tags": [
    {
      "name": "cloudflare",
      "slug": "cloudflare"
    }
  ],
  "content": [
    {
      "type": "post",
      "title": "Hello CFBlog",
      "slug": "hello-cfblog",
      "content": "# Markdown or HTML",
      "status": "publish",
      "categories": ["tech"],
      "tags": ["cloudflare"]
    }
  ],
  "moments": [
    {
      "content": "今天把 Hugo 的 memo 成功迁进来了。",
      "status": "publish",
      "media_urls": ["https://example.com/uploads/moment-1.jpg"]
    }
  ]
}
```

说明：

- 当前导入支持：分类、标签、文章、页面、动态（moments/说说）
- 冲突策略支持：`update`、`skip`、`duplicate`
- 后台支持先勾选“仅预检，不写入数据库”
- 当前媒体迁移以 `featured_image_url` 和 `moments[].media_urls` 的远程地址为主，不会自动抓取全部二进制附件到 R2
- 导入模板示例文件：`examples/import/cfblog-import.template.json`

### 导出插件示例

仓库内已提供两个导出插件样例，都会导出为上面的固定 JSON 格式：

- WordPress: `examples/exporters/wordpress/cfblog-exporter.php`
- Typecho: `examples/exporters/CFBlogExport/Plugin.php`
- Typecho 面板页: `examples/exporters/CFBlogExport/panel.php`
- Hugo Markdown 转换脚本: `scripts/convert-hugo-content.mjs`

使用方式：

1. WordPress
   - 把 `examples/exporters/wordpress/cfblog-exporter.php` 放到 `wp-content/plugins/cfblog-exporter/cfblog-exporter.php`
   - 在后台启用插件
   - 进入 `Tools -> CFBlog Export`
   - 下载 JSON 后到 CFBlog 后台导入

2. Typecho
   - 把 `examples/exporters/CFBlogExport/` 目录复制到 `usr/plugins/CFBlogExport/`
   - 在 Typecho 后台启用 `CFBlog Export`
   - 打开插件面板下载 JSON
   - 回到 CFBlog 后台导入

3. Hugo Markdown
   - 执行 `npm run convert:hugo -- --posts-dir "E:\\OneDrive\\桌面\\都是github\\hugoblog\\content\\zh-cn\\posts" --memo-dir "E:\\OneDrive\\桌面\\都是github\\hugoblog\\content\\zh-cn\\memo" --output ".\\hugoblog-import.json" --site-name "hugoblog"`
   - 生成的 `hugoblog-import.json` 同时包含 `content` 和 `moments`
   - 到 CFBlog 后台 `导入` 页面上传该 JSON，或者调用导入 API

### 导入 API

- `GET /wp-json/wp/v2/import` - 查看导入格式说明和模板
- `GET /wp-json/wp/v2/import/template` - 获取导入模板 JSON
- `POST /wp-json/wp/v2/import` - 执行导入（需要管理员登录）

  
## 项目结构

```
cfblog/
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions 自动部署
├── src/                    # 后端源码
│   ├── index.ts           # Workers 入口文件
│   ├── public-site/       # 一体化前台渲染模块
├── schema.sql             # 完整数据库架构（已整合所有迁移）
├── wrangler.toml          # Cloudflare Workers 配置
├── package.json
└── README.md

```

## 快速开始

### 前置要求

- Node.js 20.19.0+ 或 22.12.0+
- npm 或 yarn
- Cloudflare 账号
- Wrangler CLI

### 安装

1. **克隆项目**
```bash
git clone <repository-url>
cd cfblog
```

2. **安装后端依赖**
```bash
npm install
```

### 配置

1. **创建 Cloudflare 资源**

```bash
# 创建 D1 数据库
wrangler d1 create cfblog-db

# 创建 R2 存储桶
wrangler r2 bucket create cfblog-media
```


2. **配置 Wrangler**

编辑 `wrangler.toml` 文件：

```toml
name = "cfblog"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "cfblog-db"
database_id = "your-database-id-here"  # 替换为你的 D1 数据库 ID

[[r2_buckets]]
binding = "MEDIA"
bucket_name = "cfblog-media"           # 替换为你的 R2 存储桶名称

# Workers AI binding
[ai]
binding = "AI"

#[vars]
#JWT_SECRET = "your-jwt-secret-here"    # 替换为安全的密钥
```

生产环境建议不要把真实密钥直接提交到仓库，可以使用：

```bash
wrangler secret put JWT_SECRET
```

然后在 Cloudflare 端维护生产密钥。

如果你要启用评论邮件通知，还需要额外配置 Resend API Key：

```bash
wrangler secret put RESEND_API_KEY
```

同时请在 Resend 后台验证发件域名，并在后台设置页填写 `From Email`。


3. **初始化数据库**

```bash
wrangler d1 execute cfblog-db --file=./schema.sql --remote
```

或者 

```bash
npm run db:init
``` 

## 部署

### 手动部署到 Cloudflare Workers

```bash
wrangler deploy
```
或者使用 
```bash
npm run deploy
```

推荐顺序：

1. 配置 `wrangler.toml` 中的 D1 / R2 / AI 绑定
2. 初始化数据库或执行迁移
3. 如需邮件通知，执行 `wrangler secret put RESEND_API_KEY`
4. 执行 `wrangler deploy`

### GitHub Actions 自动部署

仓库已内置 GitHub Actions 工作流：

- 工作流文件：`.github/workflows/deploy.yml`
- 触发方式：
  - 推送到 `main` 分支时自动部署
  - 在 GitHub Actions 页面手动执行 `workflow_dispatch`

在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 中新增以下 Secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

建议步骤：

1. 在 Cloudflare Dashboard 创建可用于 Workers 部署的 API Token
2. 在仓库 Secrets 中填入 `CLOUDFLARE_API_TOKEN`
3. 在 Cloudflare Dashboard 复制 Account ID，填入 `CLOUDFLARE_ACCOUNT_ID`
4. 确认 `wrangler.toml` 中的 Worker、D1、R2 绑定信息已经配置正确
5. 推送代码到 `main` 分支，等待 GitHub Actions 自动部署

工作流默认会执行：

```bash
npm ci
node ./scripts/reconcile-remote-d1.mjs cfblog-db
npx wrangler deploy
```

注意事项：

- GitHub Actions 现在会在部署前执行远端 D1 schema 对账脚本
- `push -> main` 时默认自动迁移并部署
- 手动触发 `workflow_dispatch` 时，可以通过 `apply_migrations` 选择是否先执行迁移
- 工作流会先执行 `schema.sql`，再兼容处理历史 `sticky` 字段迁移，避免已有数据库因为重复列报错
- 如需本地演练同一套逻辑，可执行 `node ./scripts/reconcile-remote-d1.mjs cfblog-db --local`
- `scripts/reconcile-remote-d1.mjs` 内部维护了一个 migration plan；以后新增“兼容老库”的迁移时，记得同步补一条检测规则
- 如果你修改了 `schema.sql`，请同步整理对应的 `migrations/*.sql`，尤其是需要兼容旧库时
- 已经应用到生产环境的迁移文件不要再修改，只新增新的迁移文件
- `RESEND_API_KEY` 需要通过 `wrangler secret put RESEND_API_KEY` 配置到 Worker，不需要放到 GitHub Actions Secrets

### 配置评论邮件通知

1. 在 Resend 中验证你的发件域名。
2. 执行 `wrangler secret put RESEND_API_KEY`，把 API Key 配置到 Worker。
3. 部署后进入 `/wp-admin -> Settings`。
4. 填写 `From Name` 和 `From Email`。
5. 打开 `Enable email notifications`。
6. 按需勾选：
   - 新评论时通知管理员
   - 有新回复时通知评论者

### 开发

**启动本地开发服务器**

```bash
npm run dev
```

本地站点将运行在 http://127.0.0.1:8787

- 前台首页: `http://127.0.0.1:8787/`
- 后台管理: `http://127.0.0.1:8787/wp-admin`
- API Root: `http://127.0.0.1:8787/wp-json/`

## API 文档

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 文章管理

- `GET /api/posts` - 获取文章列表
- `GET /api/posts/:id` - 获取文章详情
- `POST /api/posts` - 创建文章（需要认证）
- `PUT /api/posts/:id` - 更新文章（需要认证）
- `DELETE /api/posts/:id` - 删除文章（需要认证）

### 分类管理

- `GET /api/categories` - 获取分类列表
- `GET /api/categories/:id` - 获取分类详情
- `POST /api/categories` - 创建分类（需要认证）
- `PUT /api/categories/:id` - 更新分类（需要认证）
- `DELETE /api/categories/:id` - 删除分类（需要认证）

### 标签管理

- `GET /api/tags` - 获取标签列表
- `GET /api/tags/:id` - 获取标签详情

### 媒体管理

- `GET /api/media` - 获取媒体列表
- `POST /api/media/upload` - 上传媒体文件（需要认证）
- `DELETE /api/media/:id` - 删除媒体文件（需要认证）

### 评论管理

- `GET /api/comments` - 获取评论列表
- `POST /api/comments` - 发表评论
- `PUT /api/comments/:id` - 更新评论（需要认证）
- `DELETE /api/comments/:id` - 删除评论（需要认证）

### 友情链接

- `GET /api/links` - 获取链接列表
- `GET /api/link-categories` - 获取链接分类

### 系统设置

- `GET /api/settings` - 获取系统设置
- `PUT /api/settings` - 更新系统设置（需要认证）

## 前端项目

### 默认主题

根据 `vhAstro-Theme` 的一体化主题风格构建的默认前台界面，静态图片、字体、SVG 和主题样式由 Worker 的 `assets` 绑定直接托管。


###  AKINA主题：

使用vue3 + vite + pinia + vue-router + markdown-it + highlight.js等技术栈构建的现代化前端界面。

项目地址 https://github.com/jkjoy/cfblog-theme-akina

演示地址: https://akina.zxd.im

###  Paper主题：

使用`Astro` + `Tailwind CSS`等技术栈构建的简洁前端界面。

项目地址 https://github.com/jkjoy/astro-paper-cfblog

演示地址: https://paper.zxd.im

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 支持

如有问题，请提交 Issue 或联系维护者。

## 感谢

[vhAstro-Theme](https://github.com/uxiaohan/vhAstro-Theme)
