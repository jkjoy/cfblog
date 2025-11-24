# Database Migrations

这个目录包含了数据库迁移脚本，用于在不丢失现有数据的情况下更新数据库结构。

## 迁移文件列表

- `0001_add_sticky_to_posts.sql` - ✅ 已应用 - 为 posts 表添加 sticky 字段，用于支持文章置顶功能

## 如何应用迁移

⚠️ **重要提示**：由于 Cloudflare D1 迁移系统的限制，建议使用 `execute` 命令而不是 `migrations apply`。

### 推荐方法：使用 execute 命令

**本地环境：**
```bash
npx wrangler d1 execute cfblog-db --file=./migrations/0001_add_sticky_to_posts.sql --local
```

**生产环境：**
```bash
npx wrangler d1 execute cfblog-db --file=./migrations/0001_add_sticky_to_posts.sql --remote
```

### 验证迁移是否成功

检查 sticky 字段是否存在：
```bash
npx wrangler d1 execute cfblog-db --command="PRAGMA table_info(posts);" --remote | grep sticky
```

检查索引是否创建：
```bash
npx wrangler d1 execute cfblog-db --command="SELECT name FROM sqlite_master WHERE type='index' AND name='idx_posts_sticky';" --remote
```

## 注意事项

1. **不要修改已应用的迁移文件** - 已经应用到生产环境的迁移文件不应该被修改
2. **按顺序编号** - 新迁移文件应该使用递增的编号（0002, 0003, etc.）
3. **测试迁移** - 在应用到生产环境之前，先在本地或开发环境测试迁移
4. **备份数据** - 在执行重要迁移之前，建议先备份数据库

## 创建新迁移

创建新迁移文件时，使用以下命名格式：

```
<序号>_<描述性名称>.sql
```

例如：
- `0002_add_user_avatar.sql`
- `0003_create_settings_table.sql`
