import { Hono } from 'hono';
import type { Context } from 'hono';
import { marked } from 'marked';
import type { AppEnv, Env } from '../types';
import { getPublicCommentProtectionSettings } from '../comment-security';
import { getSiteSettings, md5, normalizeBaseUrl } from '../utils';
import { PUBLIC_SITE_CSS, PUBLIC_SITE_JS } from './assets';

marked.use({
  async: false,
  breaks: true,
  gfm: true,
});

type AppContext = Context<AppEnv>;
type AppRouter = Hono<AppEnv>;

interface SiteMeta {
  adminAvatarUrl: string;
  adminEmail: string;
  authorName: string;
  baseUrl: string;
  commentTurnstileEnabled: boolean;
  commentTurnstileSiteKey: string;
  description: string;
  faviconUrl: string;
  footerHtml: string;
  headHtml: string;
  homePostsPerPage: number;
  icp: string;
  keywords: string;
  logoUrl: string;
  noticeHtml: string;
  socialLinks: SocialLink[];
  title: string;
}

interface SocialLink {
  href: string;
  icon: 'email' | 'mastodon' | 'qq' | 'telegram' | 'x';
  label: string;
}

interface NavPage {
  slug: string;
  title: string;
}

interface CountInfo {
  articles: number;
  categories: number;
  tags: number;
}

interface TaxonomyItem {
  count: number;
  description?: string;
  id: number;
  name: string;
  slug: string;
}

interface AuthorInfo {
  avatarUrl: string;
  bio: string;
  name: string;
  username: string;
}

interface PostCard {
  author: AuthorInfo;
  categories: TaxonomyItem[];
  commentCount: number;
  coverUrl: string;
  dateLabel: string;
  excerpt: string;
  id: number;
  publishedAt: string;
  readingMinutes: number;
  slug: string;
  sticky: boolean;
  tags: TaxonomyItem[];
  title: string;
  type: 'page' | 'post';
  viewCount: number;
}

interface PostDetail extends PostCard {
  contentHtml: string;
  contentText: string;
  description: string;
}

interface CommentNode {
  avatarUrl: string;
  isAdminAuthor: boolean;
  authorName: string;
  authorUrl: string;
  children: CommentNode[];
  contentHtml: string;
  createdAt: string;
  dateLabel: string;
  id: number;
}

interface MomentCommentNode {
  avatarUrl: string;
  isAdminAuthor: boolean;
  authorName: string;
  authorUrl: string;
  children: MomentCommentNode[];
  contentHtml: string;
  createdAt: string;
  dateLabel: string;
  id: number;
  momentId: number;
}

interface LinkItem {
  avatar: string;
  categoryName: string;
  description: string;
  name: string;
  target: string;
  url: string;
}

interface LinkGroup {
  description: string;
  id: number;
  items: LinkItem[];
  name: string;
  slug: string;
}

interface MomentItem {
  author: AuthorInfo;
  commentCount: number;
  comments: MomentCommentNode[];
  contentHtml: string;
  contentText: string;
  dateLabel: string;
  id: number;
  likeCount: number;
  mediaUrls: string[];
  viewCount: number;
}

interface PaginationData {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

interface CommonSiteData {
  navPages: NavPage[];
  recentPosts: PostCard[];
  site: SiteMeta;
  stats: CountInfo;
  topCategories: TaxonomyItem[];
  topTags: TaxonomyItem[];
}

interface RssFeedItem {
  authorName: string;
  categories: string[];
  contentHtml: string;
  excerpt: string;
  link: string;
  publishedAt: string;
  title: string;
  updatedAt: string;
}

interface SitemapUrlEntry {
  lastModified?: string;
  path: string;
}

interface RawPostRow {
  author_avatar_url: string | null;
  author_bio: string | null;
  author_display_name: string | null;
  author_username: string | null;
  author_id: number;
  comment_count: number | null;
  content: string | null;
  created_at: string;
  excerpt: string | null;
  featured_image_url: string | null;
  id: number;
  post_type: 'page' | 'post';
  published_at: string | null;
  slug: string;
  sticky: number | null;
  title: string;
  updated_at: string;
  view_count: number | null;
}

interface RawMomentRow {
  author_avatar_url: string | null;
  author_bio: string | null;
  author_display_name: string | null;
  author_username: string | null;
  comment_count: number | null;
  content: string;
  created_at: string;
  id: number;
  like_count: number | null;
  media_urls: string | null;
  updated_at: string;
  view_count: number | null;
}

interface RawCommentRow {
  author_email: string | null;
  author_name: string | null;
  author_url: string | null;
  content: string;
  created_at: string;
  id: number;
  parent_id: number | null;
  user_avatar_url: string | null;
}

interface RawMomentCommentRow {
  author_email: string | null;
  author_name: string | null;
  author_url: string | null;
  content: string;
  created_at: string;
  id: number;
  moment_id: number;
  parent_id: number | null;
}

const RESERVED_NAV_SLUGS = new Set([
  '_cfblog',
  'archive',
  'archives',
  'category',
  'categories',
  'favicon.ico',
  'friends',
  'links',
  'media',
  'moments',
  'robots.txt',
  'rss.xml',
  'sitemap.xml',
  'tag',
  'talking',
  'wp-admin',
  'wp-json',
]);

const RSS_FEED_LIMIT = 50;

export function registerPublicSiteRoutes(app: AppRouter): void {
  app.get('/favicon.ico', servePublicAsset);

  app.get('/_cfblog/style.css', (c) => {
    return c.text(PUBLIC_SITE_CSS, 200, {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'text/css; charset=utf-8',
    });
  });

  app.get('/_cfblog/app.js', (c) => {
    return c.text(PUBLIC_SITE_JS, 200, {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/javascript; charset=utf-8',
    });
  });

  app.get('/robots.txt', serveRobotsTxt);
  app.get('/rss.xml', renderRssFeed);
  app.get('/sitemap.xml', serveSitemapXml);
  app.get('/archives', renderArchivePage);
  app.get('/archive', renderArchivePage);
  app.get('/categories/:slug', renderCategoryPage);
  app.get('/category/:slug', renderCategoryPage);
  app.get('/tag/:slug', renderTagPage);
  app.get('/links', renderLinksPage);
  app.get('/friends', renderLinksPage);
  app.get('/talking', renderMomentsPage);
  app.get('/moments', renderMomentsPage);
  app.get('/:slug', renderContentBySlug);
}

async function servePublicAsset(c: AppContext): Promise<Response> {
  return c.env.ASSETS.fetch(c.req.raw);
}

export async function renderPublicHome(c: AppContext): Promise<Response> {
  const page = getPageNumber(c.req.query('page'));
  const keyword = normalizeQuery(c.req.query('q'));
  const common = await getCommonSiteData(c.env, c.req.url);
  const listData = await getPostList(c.env, common.site, {
    page,
    perPage: common.site.homePostsPerPage,
    search: keyword || undefined,
  });

  const mainHtml = renderArticleGridPage({
    description: keyword ? `共找到 ${listData.pagination.totalItems} 篇匹配文章。` : undefined,
    emptyText: keyword ? '没有找到匹配的文章。' : '还没有已发布的文章。',
    pagination: listData.pagination,
    path: keyword ? '/archives' : '/',
    posts: listData.items,
    query: keyword ? { q: keyword } : undefined,
    title: keyword ? `搜索：${keyword}` : page > 1 ? `第 ${page} 页文章` : '',
  });

  return c.html(
    renderLayout({
      activePath: '/',
      canonicalPath: buildCanonicalPath('/', page, keyword ? { q: keyword } : undefined),
      common,
      description: keyword
        ? `与 “${keyword}” 相关的文章归档。`
        : common.site.description,
      hero: renderHero({
        common,
        description: keyword
          ? `搜索 “${keyword}” 的结果会直接由当前 Worker 渲染。`
          : common.site.description,
        kicker: keyword ? 'Search' : 'Home',
        title: keyword ? `搜索：${keyword}` : common.site.title,
      }),
      main: mainHtml,
      title: keyword ? `${keyword} - ${common.site.title}` : common.site.title,
    }),
  );
}

async function renderRssFeed(c: AppContext): Promise<Response> {
  const site = await getSiteMeta(c.env, c.req.url);
  const items = await getRssFeedItems(c.env, site, RSS_FEED_LIMIT);
  const view = normalizeQuery(c.req.query('view')).toLowerCase();
  const headers = {
    'Cache-Control': 'public, max-age=900',
    Vary: 'Accept',
  };

  if (view !== 'xml' && requestPrefersHtml(c.req.header('accept'))) {
    return c.html(renderRssPreviewPage(site, items), 200, headers);
  }

  return c.body(renderRssXml(site, items), 200, {
    ...headers,
    'Content-Type': 'application/rss+xml; charset=utf-8',
  });
}

async function serveRobotsTxt(c: AppContext): Promise<Response> {
  const site = await getSiteMeta(c.env, c.req.url);
  return c.body(renderRobotsTxt(site), 200, {
    'Cache-Control': 'public, max-age=3600',
    'Content-Type': 'text/plain; charset=utf-8',
  });
}

async function serveSitemapXml(c: AppContext): Promise<Response> {
  const site = await getSiteMeta(c.env, c.req.url);
  const entries = await getSitemapEntries(c.env);
  return c.body(renderSitemapXml(site, entries), 200, {
    'Cache-Control': 'public, max-age=3600',
    'Content-Type': 'application/xml; charset=utf-8',
  });
}

async function renderArchivePage(c: AppContext): Promise<Response> {
  const page = getPageNumber(c.req.query('page'));
  const keyword = normalizeQuery(c.req.query('q'));
  const common = await getCommonSiteData(c.env, c.req.url);

  if (keyword) {
    const listData = await getPostList(c.env, common.site, {
      page,
      perPage: common.site.homePostsPerPage,
      search: keyword || undefined,
    });

    return c.html(
      renderLayout({
        activePath: '/archives',
        canonicalPath: buildCanonicalPath('/archives', page, { q: keyword }),
        common,
        description: `搜索 “${keyword}” 的文章归档。`,
        hero: renderHero({
          common,
          description: `当前共找到 ${listData.pagination.totalItems} 篇匹配文章。`,
          kicker: 'Search',
          title: `搜索：${keyword}`,
        }),
        main: renderArticleGridPage({
          description: `共找到 ${listData.pagination.totalItems} 篇匹配文章。`,
          emptyText: '没有找到匹配文章。',
          pagination: listData.pagination,
          path: '/archives',
          posts: listData.items,
          query: { q: keyword },
          title: `搜索：${keyword}`,
        }),
        title: `搜索：${keyword} - ${common.site.title}`,
      }),
    );
  }

  const posts = await getArchivePosts(c.env, common.site, {});

  return c.html(
    renderLayout({
      activePath: '/archives',
      canonicalPath: '/archives',
      common,
      description: `${common.site.title} 的完整公开文章归档。`,
      hero: renderHero({
        common,
        description: '按时间线浏览整个站点的公开文章。',
        kicker: 'Archive',
        title: '归档',
      }),
      main: `
        <section class="vh-page">
          ${renderPageHeader('文章归档', `共收录 ${posts.length} 篇公开文章。`)}
          ${renderArchiveTimeline(posts, '还没有可浏览的文章。')}
        </section>
      `,
      title: `文章归档 - ${common.site.title}`,
    }),
  );
}

async function renderCategoryPage(c: AppContext): Promise<Response> {
  const slug = c.req.param('slug');
  const common = await getCommonSiteData(c.env, c.req.url);
  const category = await getCategoryBySlug(c.env, slug);

  if (!category) {
    return c.html(renderNotFoundPage(common, '这个分类不存在或尚未公开。'), 404);
  }

  const posts = await getArchivePosts(c.env, common.site, {
    categorySlug: slug,
  });

  return c.html(
    renderLayout({
      activePath: '/archives',
      canonicalPath: `/categories/${slug}`,
      common,
      description: category.description || `${category.name} 分类下的公开文章。`,
      hero: renderHero({
        common,
        description:
          category.description ||
          `当前分类收录 ${category.count} 篇文章。`,
        kicker: 'Category',
        title: category.name,
      }),
      main: `
        <section class="vh-page">
          ${renderPageHeader(`${category.name}`, category.description || `${posts.length} 篇内容归于这个分类。`)}
          ${renderArchiveTimeline(posts, '这个分类下暂时没有公开文章。')}
        </section>
      `,
      title: `${category.name} - ${common.site.title}`,
    }),
  );
}

async function renderTagPage(c: AppContext): Promise<Response> {
  const slug = c.req.param('slug');
  const common = await getCommonSiteData(c.env, c.req.url);
  const tag = await getTagBySlug(c.env, slug);

  if (!tag) {
    return c.html(renderNotFoundPage(common, '这个标签不存在或尚未公开。'), 404);
  }

  const posts = await getArchivePosts(c.env, common.site, {
    tagSlug: slug,
  });

  return c.html(
    renderLayout({
      activePath: '/archives',
      canonicalPath: `/tag/${slug}`,
      common,
      description: tag.description || `标签 ${tag.name} 下的公开文章。`,
      hero: renderHero({
        common,
        description:
          tag.description ||
          `当前标签累计关联 ${tag.count} 篇文章。`,
        kicker: 'Tag',
        title: `# ${tag.name}`,
      }),
      main: `
        <section class="vh-page">
          ${renderPageHeader(`# ${tag.name}`, tag.description || `${posts.length} 篇内容带有这个标签。`)}
          ${renderArchiveTimeline(posts, '这个标签下暂时没有公开文章。')}
        </section>
      `,
      title: `#${tag.name} - ${common.site.title}`,
    }),
  );
}

async function renderLinksPage(c: AppContext): Promise<Response> {
  const common = await getCommonSiteData(c.env, c.req.url);
  const groups = await getLinkGroups(c.env);
  const items = groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      description: item.description || group.description || item.categoryName,
    })),
  );

  return c.html(
    renderLayout({
      activePath: '/links',
      canonicalPath: '/links',
      common,
      description: `友链与推荐站点列表，全部由 ${common.site.title} 当前 Worker 渲染。`,
      hero: renderHero({
        common,
        description: '这里展示公开友链和站点收藏。',
        kicker: 'Links',
        title: '朋友',
      }),
      main: renderToolPage({
        content: items.length
          ? items.map((item) => renderLinkItem(item)).join('')
          : '<section class="vh-page-section"><p>还没有设置公开友链。</p></section>',
        description: `共 ${items.length} 个站点，分属 ${groups.length} 个分类。`,
        note:
          '<section class="vh-node vh-note note-import"><p>排名不分先后。</p></section>',
        title: '朋友 🤝',
        type: 'links',
      }),
      title: `友链 - ${common.site.title}`,
    }),
  );
}

async function renderMomentsPage(c: AppContext): Promise<Response> {
  const page = getPageNumber(c.req.query('page'));
  const common = await getCommonSiteData(c.env, c.req.url);
  const moments = await getMoments(c.env, common.site, page, 10);

  return c.html(
    renderLayout({
      activePath: '/talking',
      canonicalPath: buildCanonicalPath('/talking', page),
      common,
      description: `来自 ${common.site.title} 的公开动态流。`,
      hero: renderHero({
        common,
        description: '记录公开的动态、片段和碎碎念。',
        kicker: 'Talking',
        title: '动态',
      }),
      main: `
        ${renderToolPage({
          content: moments.items.length
            ? moments.items
                .map((item) =>
                  renderMomentItem(
                    item,
                    common.site.commentTurnstileEnabled
                      ? common.site.commentTurnstileSiteKey
                      : '',
                  ),
                )
                .join('')
            : '<section class="vh-page-section"><p>还没有公开动态。</p></section>',
          description: `第 ${moments.pagination.page} / ${Math.max(moments.pagination.totalPages, 1)} 页，共 ${moments.pagination.totalItems} 条动态。`,
          note:
            '<section class="vh-node vh-note note-import"><p>分享美好生活。</p></section>',
          title: '动态 🥫',
          type: 'talking',
        })}
        ${renderInlinePagination('/talking', moments.pagination)}
      `,
      title: `动态 - ${common.site.title}`,
    }),
  );
}

async function renderContentBySlug(c: AppContext): Promise<Response> {
  const slug = c.req.param('slug');
  if (slug.includes('.')) {
    return c.notFound();
  }
  const common = await getCommonSiteData(c.env, c.req.url);
  const detail = await getContentDetailBySlug(c.env, common.site, slug);

  if (!detail) {
    return c.html(renderNotFoundPage(common, '没有找到对应的文章或页面。'), 404);
  }

  if (detail.type === 'page') {
    return c.html(
      renderLayout({
        activePath: `/${detail.slug}`,
        canonicalPath: `/${detail.slug}`,
        common,
        description: detail.description,
        hero: renderHero({
          common,
          description: detail.description,
          kicker: 'Page',
          title: detail.title,
        }),
        main: `
          <section class="vh-page vh-animation vh-animation-init">
            ${renderPageHeader(detail.title, '')}
            <section class="vh-page-section">
              ${detail.contentHtml}
            </section>
          </section>
        `,
        title: `${detail.title} - ${common.site.title}`,
      }),
    );
  }

  const [comments, related] = await Promise.all([
    getCommentsForPost(c.env, detail.id, common.site.adminEmail),
    getRelatedPosts(c.env, common.site, detail.id, detail.categories.map((item) => item.id)),
  ]);

  const articleCommentFormId = `post-comment-form-${detail.id}`;
  const articleMain = `
    <article class="vh-article-main vh-animation vh-animation-init">
      <header>
        <h1>${escapeHtml(detail.title)}</h1>
        <div class="article-meta">
          <span class="article-meta-item is-date">
            ${renderIcon('calendar')}
            <time datetime="${escapeAttribute(detail.publishedAt)}">${escapeHtml(formatArticleMetaDate(detail.publishedAt))}</time>
          </span>
          <span class="article-meta-item is-count">
            ${renderIcon('pen')}
            <span>${detail.contentText.length || 1}字</span>
          </span>
          <span class="article-meta-item is-reading">
            ${renderIcon('clock')}
            <span>${detail.readingMinutes}分钟</span>
          </span>
          ${
            detail.categories[0]
              ? `<a class="article-meta-item is-category" href="/categories/${encodeURIComponent(detail.categories[0].slug)}">${renderIcon('category')}<span>${escapeHtml(detail.categories[0].name)}</span></a>`
              : ''
          }
        </div>
      </header>
      <main>
        ${detail.contentHtml}
        <section class="tag-list">
          ${detail.tags
            .map(
              (item) => `
                <a href="/tag/${encodeURIComponent(item.slug)}">
                  ${renderIcon('tag')}
                  ${escapeHtml(item.name)}
                </a>
              `,
            )
            .join('')}
        </section>
      </main>
      <footer>
        <section class="vh-page">
          <section class="vh-page-section">
            <h2>继续阅读</h2>
            <p>${related.length ? '从同类主题中继续往下读。' : '还没有更多相关文章。'}</p>
            ${
              related.length
                ? `<div class="vh-related-grid">${related
                    .map(
                      (item) => `
                        <a class="vh-related-item" href="/${encodeURIComponent(item.slug)}">
                          <strong>${escapeHtml(item.title)}</strong>
                          <span>${item.dateLabel} · ${item.readingMinutes} 分钟</span>
                        </a>
                      `,
                    )
                    .join('')}</div>`
                : ''
            }
          </section>
          <section class="vh-page-section" id="comments">
            <h2>评论</h2>
            <p></p>
            ${
              comments.length
                ? comments.map((item) => renderCommentTree(item, false, articleCommentFormId)).join('')
                : '<article class="vh-comment-item"><div class="comment-content">暂时还没有评论，欢迎留下第一条。</div></article>'
            }
          </section>
          <section class="vh-page-section">
            <h2>发表评论</h2>
            <p>雁过留声，人过留名</p>
            ${renderCommentForm({
              formId: articleCommentFormId,
              id: detail.id,
              kind: 'post',
              turnstileSiteKey: common.site.commentTurnstileEnabled ? common.site.commentTurnstileSiteKey : '',
            })}
          </section>
        </section>
      </footer>
    </article>
  `;

  return c.html(
    renderLayout({
      activePath: `/${detail.slug}`,
      canonicalPath: `/${detail.slug}`,
      common,
      description: detail.description,
      hero: renderHero({
        common,
        description: detail.description,
        kicker: detail.categories[0]?.name || 'Article',
        title: detail.title,
      }),
      main: articleMain,
      title: `${detail.title} - ${common.site.title}`,
    }),
  );
}

async function getArchivePosts(
  env: Env,
  site: SiteMeta,
  options: {
    categorySlug?: string;
    search?: string;
    tagSlug?: string;
  },
): Promise<PostCard[]> {
  const whereParts = [`p.post_type = 'post'`, `p.status = 'publish'`];
  const params: unknown[] = [];

  if (options.categorySlug) {
    whereParts.push(
      `p.id IN (
        SELECT pc.post_id
        FROM post_categories pc
        INNER JOIN categories c ON c.id = pc.category_id
        WHERE c.slug = ?
      )`,
    );
    params.push(options.categorySlug);
  }

  if (options.tagSlug) {
    whereParts.push(
      `p.id IN (
        SELECT pt.post_id
        FROM post_tags pt
        INNER JOIN tags t ON t.id = pt.tag_id
        WHERE t.slug = ?
      )`,
    );
    params.push(options.tagSlug);
  }

  if (options.search) {
    whereParts.push(`(p.title LIKE ? OR p.content LIKE ? OR p.excerpt LIKE ?)`);
    const likeQuery = `%${options.search}%`;
    params.push(likeQuery, likeQuery, likeQuery);
  }

  const result = await env.DB.prepare(`
    SELECT p.*, u.display_name AS author_display_name, u.username AS author_username,
           u.avatar_url AS author_avatar_url, u.bio AS author_bio
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    WHERE ${whereParts.join(' AND ')}
    ORDER BY COALESCE(p.published_at, p.created_at) DESC
  `).bind(...params).all<RawPostRow>();

  return hydratePostCards(env, site, result.results || []);
}

async function getCommonSiteData(env: Env, requestUrl: string): Promise<CommonSiteData> {
  const settings = await getSiteMeta(env, requestUrl);
  const [navPages, topCategories, topTags, stats, recentPosts] = await Promise.all([
    getNavPages(env),
    getTopCategories(env, 8),
    getTopTags(env, 18),
    getCounts(env),
    getRecentPosts(env, settings, 5),
  ]);

  return {
    navPages,
    recentPosts,
    site: settings,
    stats,
    topCategories,
    topTags,
  };
}

async function getSiteMeta(env: Env, requestUrl: string): Promise<SiteMeta> {
  const rawSettings = await getSiteSettings(env);
  const requestOrigin = normalizeBaseUrl(new URL(requestUrl).origin);
  const configuredUrl = String(rawSettings.site_url || '').trim();
  const baseUrl =
    configuredUrl && !configuredUrl.includes('localhost')
      ? normalizeBaseUrl(configuredUrl)
      : requestOrigin;
  const title = String(rawSettings.site_title || 'CFBlog').trim() || 'CFBlog';
  const description =
    String(rawSettings.site_description || '').trim() ||
    '基于 Cloudflare Workers 的前后端一体化博客系统。';
  const authorName = String(rawSettings.site_author || '').trim() || title;
  const adminEmail = normalizeEmail(rawSettings.admin_email);
  const adminAvatarUrl = adminEmail
    ? `https://cn.cravatar.com/avatar/${await md5(adminEmail)}?s=96&d=mp&r=g`
    : '';
  const faviconUrl = normalizeOptionalUrl(rawSettings.site_favicon);
  const logoUrl =
    normalizeOptionalUrl(rawSettings.site_logo) ||
    faviconUrl ||
    '/assets/images/logo.png';
  const socialLinks = buildSocialLinks(rawSettings);
  const noticeHtml = renderNoticeHtml(String(rawSettings.site_notice || '').trim());
  const commentProtection = getPublicCommentProtectionSettings(rawSettings);
  const homePostsPerPage = parsePositiveIntSetting(rawSettings.home_posts_per_page, 15);

  return {
    adminAvatarUrl,
    adminEmail,
    authorName,
    baseUrl,
    commentTurnstileEnabled: commentProtection.turnstileEnabled,
    commentTurnstileSiteKey: commentProtection.turnstileSiteKey,
    description,
    faviconUrl,
    footerHtml:
      String(rawSettings.site_footer_text || '').trim() ||
      '© CFBlog. Powered by Cloudflare Workers.',
    headHtml: String(rawSettings.head_html || ''),
    homePostsPerPage,
    icp: String(rawSettings.site_icp || '').trim(),
    keywords: String(rawSettings.site_keywords || '').trim(),
    logoUrl,
    noticeHtml,
    socialLinks,
    title,
  };
}

async function getNavPages(env: Env): Promise<NavPage[]> {
  const result = await env.DB.prepare(`
    SELECT title, slug
    FROM posts
    WHERE post_type = 'page'
      AND status = 'publish'
    ORDER BY COALESCE(published_at, created_at) DESC
    LIMIT 4
  `).all<{ title: string; slug: string }>();

  return (result.results || [])
    .filter((item) => item.slug && !RESERVED_NAV_SLUGS.has(item.slug))
    .map((item) => ({
      slug: item.slug,
      title: item.title,
    }));
}

async function getCounts(env: Env): Promise<CountInfo> {
  const [articlesRow, categoriesRow, tagsRow] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) AS count FROM posts WHERE post_type = 'post' AND status = 'publish'`,
    ).first<{ count: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM categories`).first<{ count: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM tags`).first<{ count: number }>(),
  ]);

  return {
    articles: Number(articlesRow?.count || 0),
    categories: Number(categoriesRow?.count || 0),
    tags: Number(tagsRow?.count || 0),
  };
}

async function getTopCategories(env: Env, limit: number): Promise<TaxonomyItem[]> {
  const result = await env.DB.prepare(`
    SELECT id, name, slug, description, count
    FROM categories
    ORDER BY count DESC, name ASC
    LIMIT ?
  `).bind(limit).all<any>();

  return (result.results || []).map(mapTaxonomy);
}

async function getTopTags(env: Env, limit: number): Promise<TaxonomyItem[]> {
  const result = await env.DB.prepare(`
    SELECT id, name, slug, description, count
    FROM tags
    ORDER BY count DESC, name ASC
    LIMIT ?
  `).bind(limit).all<any>();

  return (result.results || []).map(mapTaxonomy);
}

async function getFeaturedPosts(env: Env, site: SiteMeta, limit: number): Promise<PostCard[]> {
  const stickyResult = await env.DB.prepare(`
    SELECT p.*, u.display_name AS author_display_name, u.username AS author_username,
           u.avatar_url AS author_avatar_url, u.bio AS author_bio
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    WHERE p.post_type = 'post'
      AND p.status = 'publish'
      AND p.sticky = 1
    ORDER BY COALESCE(p.published_at, p.created_at) DESC
    LIMIT ?
  `).bind(limit).all<RawPostRow>();

  const stickyPosts = await hydratePostCards(env, site, stickyResult.results || []);
  if (stickyPosts.length >= limit) {
    return stickyPosts.slice(0, limit);
  }

  const recentPosts = await getRecentPosts(
    env,
    site,
    limit - stickyPosts.length,
    stickyPosts.map((item) => item.id),
  );
  return [...stickyPosts, ...recentPosts];
}

async function getRecentPosts(
  env: Env,
  site: SiteMeta,
  limit: number,
  excludeIds: number[] = [],
): Promise<PostCard[]> {
  let query = `
    SELECT p.*, u.display_name AS author_display_name, u.username AS author_username,
           u.avatar_url AS author_avatar_url, u.bio AS author_bio
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    WHERE p.post_type = 'post'
      AND p.status = 'publish'
  `;
  const params: unknown[] = [];

  if (excludeIds.length) {
    query += ` AND p.id NOT IN (${excludeIds.map(() => '?').join(',')})`;
    params.push(...excludeIds);
  }

  query += ` ORDER BY COALESCE(p.published_at, p.created_at) DESC LIMIT ?`;
  params.push(limit);

  const result = await env.DB.prepare(query).bind(...params).all<RawPostRow>();
  return hydratePostCards(env, site, result.results || []);
}

async function getRssFeedItems(env: Env, site: SiteMeta, limit: number): Promise<RssFeedItem[]> {
  const result = await env.DB.prepare(`
    SELECT p.*, u.display_name AS author_display_name, u.username AS author_username,
           u.avatar_url AS author_avatar_url, u.bio AS author_bio
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    WHERE p.post_type = 'post'
      AND p.status = 'publish'
    ORDER BY COALESCE(p.published_at, p.created_at) DESC
    LIMIT ?
  `).bind(limit).all<RawPostRow>();

  const rows = result.results || [];
  const postIds = rows.map((row) => row.id);
  const [categoryMap, tagMap] = await Promise.all([
    getCategoryMapForPosts(env, postIds),
    getTagMapForPosts(env, postIds),
  ]);

  return rows.map((row) => {
    const articleUrl = buildAbsoluteUrl(site.baseUrl, `/${encodeURIComponent(row.slug)}`);
    const contentSource = String(row.content || '');
    const excerptSource = String(row.excerpt || '').trim() || toPlainText(contentSource);
    const categoryNames = [
      ...(categoryMap.get(row.id) || []).map((item) => item.name),
      ...(tagMap.get(row.id) || []).map((item) => item.name),
    ];

    return {
      authorName: mapAuthor(row, site.authorName).name,
      categories: [...new Set(categoryNames.filter(Boolean))],
      contentHtml: absolutizeHtmlUrls(renderBodyContent(contentSource), articleUrl),
      excerpt: truncateText(excerptSource, 280),
      link: articleUrl,
      publishedAt: String(row.published_at || row.created_at || ''),
      title: String(row.title || ''),
      updatedAt: String(row.updated_at || row.published_at || row.created_at || ''),
    };
  });
}

async function getSitemapEntries(env: Env): Promise<SitemapUrlEntry[]> {
  const [contentRows, categoryRows, tagRows, latestPostRow, linkRow, momentRow] = await Promise.all([
    env.DB.prepare(`
      SELECT slug, COALESCE(updated_at, published_at, created_at) AS lastmod
      FROM posts
      WHERE status = 'publish'
        AND post_type IN ('post', 'page')
      ORDER BY COALESCE(published_at, created_at) DESC
    `).all<{ slug: string; lastmod: string | null }>(),
    env.DB.prepare(`
      SELECT c.slug, MAX(COALESCE(p.updated_at, p.published_at, p.created_at)) AS lastmod
      FROM categories c
      INNER JOIN post_categories pc ON pc.category_id = c.id
      INNER JOIN posts p ON p.id = pc.post_id
      WHERE p.status = 'publish'
        AND p.post_type = 'post'
      GROUP BY c.id, c.slug
      ORDER BY c.name ASC
    `).all<{ slug: string; lastmod: string | null }>(),
    env.DB.prepare(`
      SELECT t.slug, MAX(COALESCE(p.updated_at, p.published_at, p.created_at)) AS lastmod
      FROM tags t
      INNER JOIN post_tags pt ON pt.tag_id = t.id
      INNER JOIN posts p ON p.id = pt.post_id
      WHERE p.status = 'publish'
        AND p.post_type = 'post'
      GROUP BY t.id, t.slug
      ORDER BY t.name ASC
    `).all<{ slug: string; lastmod: string | null }>(),
    env.DB.prepare(`
      SELECT MAX(COALESCE(updated_at, published_at, created_at)) AS lastmod
      FROM posts
      WHERE status = 'publish'
        AND post_type = 'post'
    `).first<{ lastmod: string | null }>(),
    env.DB.prepare(`
      SELECT COUNT(*) AS count, MAX(COALESCE(updated_at, created_at)) AS lastmod
      FROM links
      WHERE visible = 'yes'
    `).first<{ count: number; lastmod: string | null }>(),
    env.DB.prepare(`
      SELECT COUNT(*) AS count, MAX(COALESCE(updated_at, created_at)) AS lastmod
      FROM moments
      WHERE status = 'publish'
    `).first<{ count: number; lastmod: string | null }>(),
  ]);

  const entries: SitemapUrlEntry[] = [
    {
      lastModified: formatSitemapLastmod(latestPostRow?.lastmod),
      path: '/',
    },
    {
      lastModified: formatSitemapLastmod(latestPostRow?.lastmod),
      path: '/archives',
    },
  ];

  if (Number(linkRow?.count || 0) > 0) {
    entries.push({
      lastModified: formatSitemapLastmod(linkRow?.lastmod),
      path: '/links',
    });
  }

  if (Number(momentRow?.count || 0) > 0) {
    entries.push({
      lastModified: formatSitemapLastmod(momentRow?.lastmod),
      path: '/talking',
    });
  }

  for (const row of contentRows.results || []) {
    if (!isIndexableContentSlug(row.slug)) {
      continue;
    }
    entries.push({
      lastModified: formatSitemapLastmod(row.lastmod),
      path: `/${encodeURIComponent(row.slug)}`,
    });
  }

  for (const row of categoryRows.results || []) {
    if (!isIndexableNestedSlug(row.slug)) {
      continue;
    }
    entries.push({
      lastModified: formatSitemapLastmod(row.lastmod),
      path: `/categories/${encodeURIComponent(row.slug)}`,
    });
  }

  for (const row of tagRows.results || []) {
    if (!isIndexableNestedSlug(row.slug)) {
      continue;
    }
    entries.push({
      lastModified: formatSitemapLastmod(row.lastmod),
      path: `/tag/${encodeURIComponent(row.slug)}`,
    });
  }

  return entries;
}

async function getPostList(
  env: Env,
  site: SiteMeta,
  options: {
    categorySlug?: string;
    excludeIds?: number[];
    page: number;
    perPage: number;
    search?: string;
    tagSlug?: string;
  },
): Promise<{ items: PostCard[]; pagination: PaginationData }> {
  const whereParts = [`p.post_type = 'post'`, `p.status = 'publish'`];
  const params: unknown[] = [];

  if (options.categorySlug) {
    whereParts.push(
      `p.id IN (
        SELECT pc.post_id
        FROM post_categories pc
        INNER JOIN categories c ON c.id = pc.category_id
        WHERE c.slug = ?
      )`,
    );
    params.push(options.categorySlug);
  }

  if (options.tagSlug) {
    whereParts.push(
      `p.id IN (
        SELECT pt.post_id
        FROM post_tags pt
        INNER JOIN tags t ON t.id = pt.tag_id
        WHERE t.slug = ?
      )`,
    );
    params.push(options.tagSlug);
  }

  if (options.search) {
    whereParts.push(`(p.title LIKE ? OR p.content LIKE ? OR p.excerpt LIKE ?)`);
    const likeQuery = `%${options.search}%`;
    params.push(likeQuery, likeQuery, likeQuery);
  }

  if (options.excludeIds?.length) {
    whereParts.push(`p.id NOT IN (${options.excludeIds.map(() => '?').join(',')})`);
    params.push(...options.excludeIds);
  }

  const whereClause = whereParts.join(' AND ');
  const countRow = await env.DB.prepare(`
    SELECT COUNT(*) AS count
    FROM posts p
    WHERE ${whereClause}
  `).bind(...params).first<{ count: number }>();

  const totalItems = Number(countRow?.count || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / options.perPage));
  const safePage = Math.min(options.page, totalPages);
  const safeOffset = (safePage - 1) * options.perPage;

  const rows = await env.DB.prepare(`
    SELECT p.*, u.display_name AS author_display_name, u.username AS author_username,
           u.avatar_url AS author_avatar_url, u.bio AS author_bio
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    WHERE ${whereClause}
    ORDER BY p.sticky DESC, COALESCE(p.published_at, p.created_at) DESC
    LIMIT ? OFFSET ?
  `).bind(...params, options.perPage, safeOffset).all<RawPostRow>();

  return {
    items: await hydratePostCards(env, site, rows.results || []),
    pagination: {
      page: safePage,
      perPage: options.perPage,
      totalItems,
      totalPages,
    },
  };
}

async function getCategoryBySlug(env: Env, slug: string): Promise<TaxonomyItem | null> {
  const row = await env.DB.prepare(`
    SELECT id, name, slug, description, count
    FROM categories
    WHERE slug = ?
  `).bind(slug).first<any>();

  return row ? mapTaxonomy(row) : null;
}

async function getTagBySlug(env: Env, slug: string): Promise<TaxonomyItem | null> {
  const row = await env.DB.prepare(`
    SELECT id, name, slug, description, count
    FROM tags
    WHERE slug = ?
  `).bind(slug).first<any>();

  return row ? mapTaxonomy(row) : null;
}

async function getContentDetailBySlug(
  env: Env,
  site: SiteMeta,
  slug: string,
): Promise<PostDetail | null> {
  const row = await env.DB.prepare(`
    SELECT p.*, u.display_name AS author_display_name, u.username AS author_username,
           u.avatar_url AS author_avatar_url, u.bio AS author_bio
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    WHERE p.slug = ?
      AND p.status = 'publish'
      AND p.post_type IN ('post', 'page')
    ORDER BY CASE p.post_type WHEN 'post' THEN 0 ELSE 1 END
    LIMIT 1
  `).bind(slug).first<RawPostRow>();

  if (!row) {
    return null;
  }

  const [postCard] = await hydratePostCards(env, site, [row]);
  if (!postCard) {
    return null;
  }

  let detail = postCard;
  if (row.post_type === 'post') {
    await env.DB.prepare(`UPDATE posts SET view_count = view_count + 1 WHERE id = ?`)
      .bind(row.id)
      .run();
    detail = {
      ...postCard,
      viewCount: postCard.viewCount + 1,
    };
  }

  const contentSource = String(row.content || '');
  return {
    ...detail,
    contentHtml: renderBodyContent(contentSource),
    contentText: toPlainText(contentSource),
    description: detail.excerpt,
  };
}

async function getCommentsForPost(
  env: Env,
  postId: number,
  adminEmail: string,
): Promise<CommentNode[]> {
  const result = await env.DB.prepare(`
    SELECT c.id, c.author_name, c.author_email, c.author_url, c.content, c.created_at, c.parent_id,
           u.avatar_url AS user_avatar_url
    FROM comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
      AND c.status = 'approved'
    ORDER BY created_at ASC
  `).bind(postId).all<RawCommentRow>();

  const rawRows = result.results || [];
  const nodes = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];
  const parents = new Map<number, number>();

  const rows = await Promise.all(rawRows.map(async (row) => {
    const emailHash = row.author_email ? await md5(String(row.author_email)) : '';
    return {
      ...row,
      avatar_url:
        String(row.user_avatar_url || '').trim() ||
        (emailHash
          ? `https://cn.cravatar.com/avatar/${emailHash}?s=96&d=mp&r=g`
          : createMonogramDataUri(String(row.author_name || '匿名'))),
    };
  }));

  for (const row of rows) {
    const node: CommentNode = {
      avatarUrl: String(row.avatar_url || ''),
      isAdminAuthor: !!adminEmail && normalizeEmail(row.author_email) === adminEmail,
      authorName: String(row.author_name || '匿名访客'),
      authorUrl: String(row.author_url || ''),
      children: [],
      contentHtml: renderCommentContent(String(row.content || '')),
      createdAt: String(row.created_at || ''),
      dateLabel: formatLongDate(row.created_at),
      id: Number(row.id),
    };
    nodes.set(node.id, node);
    parents.set(node.id, Number(row.parent_id || 0));
  }

  for (const [id, node] of nodes) {
    const parentId = parents.get(id) || 0;
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

async function getRelatedPosts(
  env: Env,
  site: SiteMeta,
  currentPostId: number,
  categoryIds: number[],
): Promise<PostCard[]> {
  let query = `
    SELECT DISTINCT p.*, u.display_name AS author_display_name, u.username AS author_username,
           u.avatar_url AS author_avatar_url, u.bio AS author_bio
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
  `;
  const params: unknown[] = [];

  if (categoryIds.length) {
    query += ` INNER JOIN post_categories pc ON pc.post_id = p.id`;
  }

  query += `
    WHERE p.post_type = 'post'
      AND p.status = 'publish'
      AND p.id != ?
  `;
  params.push(currentPostId);

  if (categoryIds.length) {
    query += ` AND pc.category_id IN (${categoryIds.map(() => '?').join(',')})`;
    params.push(...categoryIds);
  }

  query += ` ORDER BY COALESCE(p.published_at, p.created_at) DESC LIMIT 3`;
  const result = await env.DB.prepare(query).bind(...params).all<RawPostRow>();

  return hydratePostCards(env, site, result.results || []);
}

async function getLinkGroups(env: Env): Promise<LinkGroup[]> {
  const [groupResult, linkResult] = await Promise.all([
    env.DB.prepare(`
      SELECT id, name, slug, description
      FROM link_categories
      ORDER BY name ASC
    `).all<any>(),
    env.DB.prepare(`
      SELECT l.name, l.url, l.description, l.avatar, l.target, l.category_id,
             lc.name AS category_name
      FROM links l
      LEFT JOIN link_categories lc ON lc.id = l.category_id
      WHERE l.visible = 'yes'
      ORDER BY l.sort_order ASC, l.created_at DESC
    `).all<any>(),
  ]);

  const itemsByGroup = new Map<number, LinkItem[]>();
  for (const row of linkResult.results || []) {
    const current = itemsByGroup.get(Number(row.category_id)) || [];
    current.push({
      avatar: normalizeOptionalUrl(row.avatar) || createMonogramDataUri(String(row.name || 'Link')),
      categoryName: String(row.category_name || '未分组'),
      description: String(row.description || ''),
      name: String(row.name || '未命名站点'),
      target: String(row.target || '_blank'),
      url: String(row.url || '#'),
    });
    itemsByGroup.set(Number(row.category_id), current);
  }

  return (groupResult.results || [])
    .map((row) => ({
      description: String(row.description || ''),
      id: Number(row.id),
      items: itemsByGroup.get(Number(row.id)) || [],
      name: String(row.name || '未命名分类'),
      slug: String(row.slug || ''),
    }))
    .filter((group) => group.items.length > 0);
}

async function getMoments(
  env: Env,
  site: SiteMeta,
  page: number,
  perPage: number,
): Promise<{ items: MomentItem[]; pagination: PaginationData }> {
  const countRow = await env.DB.prepare(`
    SELECT COUNT(*) AS count
    FROM moments
    WHERE status = 'publish'
  `).first<{ count: number }>();

  const totalItems = Number(countRow?.count || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * perPage;

  const result = await env.DB.prepare(`
    SELECT m.*, u.display_name AS author_display_name, u.username AS author_username,
           u.avatar_url AS author_avatar_url, u.bio AS author_bio
    FROM moments m
    LEFT JOIN users u ON u.id = m.author_id
    WHERE m.status = 'publish'
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT ? OFFSET ?
  `).bind(perPage, offset).all<RawMomentRow>();

  const rows = result.results || [];
  const commentMap = await getMomentCommentMap(env, rows.map((row) => Number(row.id)), site.adminEmail);

  return {
    items: rows.map((row) => ({
      author: mapAuthor(row, site.authorName, site.adminAvatarUrl),
      commentCount: Number(row.comment_count || 0),
      comments: commentMap.get(Number(row.id)) || [],
      contentHtml: renderCommentContent(String(row.content || '')),
      contentText: toPlainText(String(row.content || '')),
      dateLabel: formatLongDate(row.created_at),
      id: Number(row.id),
      likeCount: Number(row.like_count || 0),
      mediaUrls: parseMediaUrls(row.media_urls),
      viewCount: Number(row.view_count || 0),
    })),
    pagination: {
      page: safePage,
      perPage,
      totalItems,
      totalPages,
    },
  };
}

async function getMomentCommentMap(
  env: Env,
  momentIds: number[],
  adminEmail: string,
): Promise<Map<number, MomentCommentNode[]>> {
  const map = new Map<number, MomentCommentNode[]>();
  if (!momentIds.length) {
    return map;
  }

  try {
    const result = await env.DB.prepare(`
      SELECT id, moment_id, parent_id, author_name, author_email, author_url, content, created_at
      FROM moment_comments
      WHERE moment_id IN (${momentIds.map(() => '?').join(',')})
        AND status = 'approved'
      ORDER BY created_at ASC
    `).bind(...momentIds).all<RawMomentCommentRow>();

    const nodeMap = new Map<number, MomentCommentNode>();
    const parentMap = new Map<number, number>();

    for (const row of result.results || []) {
      const emailHash = row.author_email ? await md5(String(row.author_email)) : '';
      const node: MomentCommentNode = {
        avatarUrl: emailHash
          ? `https://cn.cravatar.com/avatar/${emailHash}?s=96&d=mp&r=g`
          : createMonogramDataUri(String(row.author_name || '匿名')),
        isAdminAuthor: !!adminEmail && normalizeEmail(row.author_email) === adminEmail,
        authorName: String(row.author_name || '匿名访客'),
        authorUrl: String(row.author_url || ''),
        children: [],
        contentHtml: renderCommentContent(String(row.content || '')),
        createdAt: String(row.created_at || ''),
        dateLabel: formatLongDate(row.created_at),
        id: Number(row.id),
        momentId: Number(row.moment_id),
      };

      nodeMap.set(node.id, node);
      parentMap.set(node.id, Number(row.parent_id || 0));
    }

    for (const node of nodeMap.values()) {
      const parentId = parentMap.get(node.id) || 0;
      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId)?.children.push(node);
        continue;
      }

      const roots = map.get(node.momentId) || [];
      roots.push(node);
      map.set(node.momentId, roots);
    }

    return map;
  } catch {
    return map;
  }
}

async function hydratePostCards(env: Env, site: SiteMeta, rows: RawPostRow[]): Promise<PostCard[]> {
  if (!rows.length) {
    return [];
  }

  const postIds = rows.map((row) => row.id);
  const [categoryMap, tagMap] = await Promise.all([
    getCategoryMapForPosts(env, postIds),
    getTagMapForPosts(env, postIds),
  ]);

  return rows.map((row) => {
    const contentText = toPlainText(String(row.content || ''));
    const excerptSource = String(row.excerpt || '').trim() || contentText;
    const excerpt = truncateText(excerptSource, 148);

    return {
      author: mapAuthor(row, site.authorName),
      categories: categoryMap.get(row.id) || [],
      commentCount: Number(row.comment_count || 0),
      coverUrl: normalizeOptionalUrl(row.featured_image_url) || getDefaultCoverUrl(row.id),
      dateLabel: formatThemeCardDate(row.published_at || row.created_at),
      excerpt,
      id: row.id,
      publishedAt: String(row.published_at || row.created_at),
      readingMinutes: estimateReadingMinutes(contentText),
      slug: row.slug,
      sticky: Number(row.sticky || 0) === 1,
      tags: tagMap.get(row.id) || [],
      title: row.title,
      type: row.post_type,
      viewCount: Number(row.view_count || 0),
    };
  });
}

async function getCategoryMapForPosts(
  env: Env,
  postIds: number[],
): Promise<Map<number, TaxonomyItem[]>> {
  const map = new Map<number, TaxonomyItem[]>();
  if (!postIds.length) {
    return map;
  }

  const result = await env.DB.prepare(`
    SELECT pc.post_id, c.id, c.name, c.slug, c.description, c.count
    FROM post_categories pc
    INNER JOIN categories c ON c.id = pc.category_id
    WHERE pc.post_id IN (${postIds.map(() => '?').join(',')})
    ORDER BY c.count DESC, c.name ASC
  `).bind(...postIds).all<any>();

  for (const row of result.results || []) {
    const items = map.get(Number(row.post_id)) || [];
    items.push(mapTaxonomy(row));
    map.set(Number(row.post_id), items);
  }

  return map;
}

async function getTagMapForPosts(env: Env, postIds: number[]): Promise<Map<number, TaxonomyItem[]>> {
  const map = new Map<number, TaxonomyItem[]>();
  if (!postIds.length) {
    return map;
  }

  const result = await env.DB.prepare(`
    SELECT pt.post_id, t.id, t.name, t.slug, t.description, t.count
    FROM post_tags pt
    INNER JOIN tags t ON t.id = pt.tag_id
    WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
    ORDER BY t.count DESC, t.name ASC
  `).bind(...postIds).all<any>();

  for (const row of result.results || []) {
    const items = map.get(Number(row.post_id)) || [];
    items.push(mapTaxonomy(row));
    map.set(Number(row.post_id), items);
  }

  return map;
}

function renderLayout(input: {
  activePath: string;
  canonicalPath: string;
  common: CommonSiteData;
  description: string;
  hero: string;
  main: string;
  title: string;
}): string {
  const canonicalUrl = buildAbsoluteUrl(input.common.site.baseUrl, input.canonicalPath);
  const metaDescription = escapeAttribute(input.description || input.common.site.description);
  const pageTitle = escapeHtml(input.title);
  const siteTitle = escapeHtml(input.common.site.title);
  const headerHeight = input.activePath === '/' ? '38.88rem' : '28.88rem';
  const rssUrl = buildAbsoluteUrl(input.common.site.baseUrl, '/rss.xml');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${pageTitle}</title>
  <meta name="description" content="${metaDescription}">
  <meta name="keywords" content="${escapeAttribute(input.common.site.keywords)}">
  <meta name="theme-color" content="#1f8a70">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeAttribute(input.title)}">
  <meta property="og:description" content="${metaDescription}">
  <meta property="og:site_name" content="${siteTitle}">
  <meta property="og:url" content="${escapeAttribute(canonicalUrl)}">
  <link rel="canonical" href="${escapeAttribute(canonicalUrl)}">
  <link rel="alternate" type="application/rss+xml" title="${escapeAttribute(
    `${input.common.site.title} RSS`,
  )}" href="${escapeAttribute(rssUrl)}">
  <link rel="stylesheet" href="/_cfblog/vh-theme.css">
  <link rel="stylesheet" href="/_cfblog/style.css">
  ${
    input.common.site.faviconUrl
      ? `<link rel="icon" href="${escapeAttribute(input.common.site.faviconUrl)}">`
      : ''
  }
  <style>
    :root {
      --vh-main-color: #01C4B6;
      --vh-font-color: #34495e;
      --vh-aside-width: 318px;
      --vh-main-radius: 0.88rem;
      --vh-main-max-width: 1458px;
      --vh-main-header-height: ${headerHeight};
      --vh-home-banner: url('/assets/images/home-banner.webp') no-repeat center 60%/cover;
  }
  </style>
  ${input.common.site.headHtml}
  ${
    input.common.site.commentTurnstileEnabled && input.common.site.commentTurnstileSiteKey
      ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>'
      : ''
  }
</head>
<body>
  ${renderMobileSidebar(input.common, input.activePath)}
  ${renderHeader(input.common, input.activePath)}
  <main class="main">
    ${input.hero}
    <section class="main-inner" style="padding-top:0.88rem">
      <section class="main-inner-content">${input.main}</section>
      ${renderAside(input.common)}
    </section>
    ${renderBackTop()}
  </main>
  ${renderFooter(input.common)}
  ${renderSearchDialog(input.common.recentPosts)}
  <script src="/assets/js/vhCaiqi.js" defer></script>
  <script type="module" src="/_cfblog/app.js"></script>
</body>
</html>`;
}

function renderHeader(common: CommonSiteData, activePath: string): string {
  const navItems = getPrimaryNavItems(common);

  return `
    <header class="vh-header">
      <section class="main">
        <a href="/" class="home vh-hover">
          ${renderIcon('home')}
          <span>首页</span>
        </a>
        <nav>
          ${navItems
            .map(
              (item) => `
                <a class="nav-link vh-hover${isActive(activePath, item.href) ? ' active' : ''}" href="${escapeAttribute(
                  item.href,
                )}"${item.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>
                  ${escapeHtml(item.label)}
                  ${renderIcon(item.icon)}
                </a>
              `,
            )
            .join('')}
          <span class="nav-link vh-hover search-btn">${renderIcon('search')} 搜索</span>
          <span class="nav-link vh-hover menu-btn">${renderIcon('menu')}</span>
        </nav>
      </section>
    </header>
  `;
}

function renderHero(input: {
  actions?: Array<{ href: string; label: string }>;
  common: CommonSiteData;
  description: string;
  kicker: string;
  title: string;
}): string {
  const messages = [...new Set([input.common.site.description, input.description].filter(Boolean))];
  const headerAvatarUrl = input.common.site.logoUrl;
  return `
    <div class="header-main">
      <div class="avatar">
        <img src="/assets/images/lazy-loading.webp" data-vh-lz-src="${escapeAttribute(
          headerAvatarUrl,
        )}" alt="${escapeAttribute(input.common.site.authorName)}" />
      </div>
      <h3 class="auther">${escapeHtml(input.common.site.authorName)}</h3>
      <p class="desc" data-fallback="${escapeAttribute(
        input.common.site.description,
      )}" data-typewrite="${escapeAttribute(JSON.stringify(messages))}"></p>
    </div>
  `;
}

function renderAside(common: CommonSiteData): string {
  const asideAvatarUrl = common.site.adminAvatarUrl || common.site.logoUrl;
  return `
    <aside class="vh-aside">
      <section class="vh-aside-item user">
        <img class="vh-aside-avatar" src="/assets/images/lazy-loading.webp" data-vh-lz-src="${escapeAttribute(
          asideAvatarUrl,
        )}" alt="${escapeAttribute(common.site.authorName)}" />
        <span class="vh-aside-auther">${escapeHtml(common.site.authorName)}</span>
        <p class="vh-aside-motto">${escapeHtml(common.site.description)}</p>
        ${
          common.site.socialLinks.length
            ? `<section class="vh-aside-links">
                ${common.site.socialLinks
                  .map(
                    (item) => `
                      <a class="vh-aside-links-item" href="${escapeAttribute(item.href)}" title="${escapeAttribute(
                        item.label,
                      )}" target="_blank" rel="noopener noreferrer">
                        ${renderIcon(item.icon)}
                      </a>
                    `,
                  )
                  .join('')}
              </section>`
            : ''
        }
        <section class="vh-aside-info">
          <div class="count">
            <span>${common.stats.articles}</span>
            <p>文章数</p>
          </div>
          <div class="count">
            <span>${common.stats.categories}</span>
            <p>分类数</p>
          </div>
          <div class="count">
            <span>${common.stats.tags}</span>
            <p>标签数</p>
          </div>
        </section>
        <canvas class="vh-aside-canvas" width="888" height="1888"></canvas>
      </section>

      ${
        common.site.noticeHtml
          ? `<section class="vh-aside-item tips">
              <span>${renderIcon('spark')}公告</span>
              <div class="tips-content">${common.site.noticeHtml}</div>
            </section>`
          : ''
      }

      <section class="vh-aside-item cat">
        <h3>分类</h3>
        <div class="vh-aside-cat">
          ${
            common.topCategories.length
              ? common.topCategories
                  .map(
                    (item) => `
                      <a href="/categories/${encodeURIComponent(item.slug)}">
                        <span>${escapeHtml(item.name)}</span>
                        <i>${item.count}</i>
                      </a>
                    `,
                  )
                  .join('')
              : '<a href="javascript:;"><span>暂无分类</span><i>0</i></a>'
          }
        </div>
      </section>

      <section class="vh-aside-item tags">
        <h3>热门标签</h3>
        <div class="vh-aside-tags">
          ${
            common.topTags.length
              ? common.topTags
                  .map(
                    (item) => `
                      <a href="/tag/${encodeURIComponent(item.slug)}">
                        <span>${escapeHtml(item.name)}</span>
                        <em>${item.count}</em>
                      </a>
                    `,
                  )
                  .join('')
              : '<a href="javascript:;"><span>暂无标签</span><em>0</em></a>'
          }
        </div>
      </section>

      <section class="sticky-aside">
        <section class="vh-aside-item articles">
          <h3>推荐文章</h3>
          <div class="vh-aside-articles">
            ${
              common.recentPosts.length
                ? common.recentPosts
                    .map(
                      (item, index) => `
                        <a href="/${encodeURIComponent(item.slug)}">
                          <span>
                            ${index < 3 ? `<i>${index + 1}</i>` : `<em>${index + 1}.</em>`}
                            <cite class="vh-ellipsis">${escapeHtml(item.title)}</cite>
                          </span>
                          <time>${escapeHtml(item.dateLabel)}</time>
                        </a>
                      `,
                    )
                    .join('')
                : '<a href="javascript:;"><span><em>1.</em><cite class="vh-ellipsis">暂无更新</cite></span><time>--</time></a>'
            }
          </div>
        </section>
      </section>
    </aside>
  `;
}

function renderFooter(common: CommonSiteData): string {
  return `
    <footer class="vh-footer">
      <section class="text">
        <p>${common.site.footerHtml}</p>
        ${
          common.site.icp
            ? `<p><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">${escapeHtml(
                common.site.icp,
              )}</a></p>`
            : ''
        }
        <p class="vh-footer-badge">
          <a
            href="https://github.com/jkjoy/cfblog"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub stars for jkjoy/cfblog"
          >
            <img
              src="https://img.shields.io/github/stars/jkjoy/cfblog?style=flat-square"
              alt="GitHub stars for jkjoy/cfblog"
              decoding="async"
            >
          </a>
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="订阅 RSS"
          >
            <img
              src="https://img.shields.io/badge/RSS-Subscribe-FF6B35?style=flat-square&logo=rss&logoColor=white"
              alt="RSS Subscribe"
              decoding="async"
            >
          </a>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="查看 Sitemap XML"
          >
            <img
              src="https://img.shields.io/badge/Sitemap-XML-34A853?style=flat-square&logo=google&logoColor=white"
              alt="Sitemap XML"
              decoding="async"
            >
          </a>
        </p>
      </section>
    </footer>
  `;
}

function renderSearchDialog(recentPosts: PostCard[]): string {
  return `
    <section class="vh-search">
      <main>
        <form class="search-input" action="/archives" method="get">
          ${renderIcon('search-solid')}
          <input name="q" type="search" placeholder="搜索文章" />
        </form>
        <section class="vh-search-list" data-search-list>
          <em${recentPosts.length ? ' style="display:none"' : ''}>输入关键词后按回车搜索全部文章</em>
          ${recentPosts
            .map(
              (item) => `
                <a class="vh-search-item" href="/${encodeURIComponent(item.slug)}">
                  <span>${escapeHtml(item.title)}</span>
                  <p><span>${escapeHtml(item.dateLabel)}</span>${escapeHtml(item.excerpt)}</p>
                </a>
              `,
            )
            .join('')}
        </section>
      </main>
    </section>
  `;
}

function renderArticleGridPage(input: {
  description?: string;
  emptyText: string;
  pagination: PaginationData;
  path: string;
  posts: PostCard[];
  query?: Record<string, string>;
  title: string;
}): string {
  const grid = input.posts.length
    ? `
        <section class="article-list-main">
          <section class="article-list">
            ${input.posts.map((item) => renderPostCard(item)).join('')}
          </section>
          ${renderThemePagination(input.path, input.pagination, input.query)}
        </section>
      `
    : `<section class="vh-page-section"><p>${escapeHtml(input.emptyText)}</p></section>`;

  if (!input.title) {
    return grid;
  }

  return `
    <section class="vh-page vh-animation vh-animation-init">
      ${renderPageHeader(input.title, input.description || '')}
      <section class="vh-page-section">
        ${grid}
      </section>
    </section>
  `;
}

function renderPostCard(post: PostCard, options?: { badge?: string }): string {
  const primaryCategory = post.categories[0];
  const tagMarkup = post.tags
    .slice(0, 4)
    .map(
      (tag) =>
        `<a href="/tag/${encodeURIComponent(tag.slug)}">${escapeHtml(tag.name)}</a>`,
    )
    .join('');
  const categoryThemeClass = getThemeCategoryClass(primaryCategory?.slug || primaryCategory?.name || '');

  return `
    <article class="vh-article-item vh-animation vh-animation-init vh-article-link${post.sticky ? ' active' : ''}">
      <section class="vh-article-banner">
        <img src="/assets/images/lazy-loading.webp" data-vh-lz-src="${escapeAttribute(
          post.coverUrl,
        )}" alt="${escapeAttribute(post.title)}" />
      </section>
      <header>
        <h3>
          ${
            primaryCategory
              ? `<a class="vh-article-cat vh-cat-${escapeAttribute(
                  categoryThemeClass,
                )}" href="/categories/${encodeURIComponent(primaryCategory.slug)}">${escapeHtml(
                  primaryCategory.name,
                )}</a>`
              : '<a class="vh-article-cat" href="/archives">Blog</a>'
          }
          <time>${escapeHtml(post.dateLabel)}</time>
        </h3>
        <h1 class="title"><a class="vh-ellipsis" href="/${encodeURIComponent(post.slug)}">${escapeHtml(
          post.title,
        )}</a></h1>
      </header>
      <h2 class="vh-article-excerpt vh-ellipsis line-2">${escapeHtml(post.excerpt)}</h2>
      ${tagMarkup ? `<div class="vh-article-taglist vh-ellipsis">${tagMarkup}</div>` : ''}
    </article>
  `;
}

function renderLinkItem(item: LinkItem): string {
  const relValue = item.target === '_blank' ? 'noopener noreferrer' : '';
  return `
    <a href="${escapeAttribute(item.url)}" target="${escapeAttribute(
      item.target || '_blank',
    )}" rel="${escapeAttribute(relValue)}">
      <img class="avatar" src="/assets/images/lazy-loading.webp" data-vh-lz-src="${escapeAttribute(
        item.avatar,
      )}" alt="${escapeAttribute(item.name)}" />
      <div class="link-info">
        <span>${escapeHtml(item.name)}</span>
        <p>${escapeHtml(item.description || item.categoryName)}</p>
      </div>
    </a>
  `;
}

function renderMomentItem(item: MomentItem, turnstileSiteKey = ''): string {
  const mediaUrls = item.mediaUrls.slice(0, 9);
  const mediaHtml = mediaUrls.length
    ? `<div class="vh-img-flex" data-media-count="${mediaUrls.length}">${mediaUrls
        .map(
          (url, index) => `
            <button
              type="button"
              class="vh-img-grid-item"
              data-vh-lightbox-trigger
              data-vh-lightbox-group="moment-${item.id}"
              data-vh-lightbox-src="${escapeAttribute(url)}"
              data-vh-lightbox-alt="${escapeAttribute(item.author.name)} 发布的第 ${index + 1} 张图片"
              aria-label="查看第 ${index + 1} 张大图"
              aria-haspopup="dialog"
            >
              <img src="/assets/images/lazy-loading.webp" data-vh-lz-src="${escapeAttribute(
                url,
              )}" alt="${escapeAttribute(item.author.name)} 发布的第 ${index + 1} 张图片" />
            </button>
          `,
        )
        .join('')}</div>`
    : '';
  const formId = `moment-comment-form-${item.id}`;
  const commentList = item.comments.length
    ? item.comments.map((comment) => renderMomentCommentTree(comment, false, formId)).join('')
    : '<article class="vh-comment-item"><div class="comment-content">还没有评论，欢迎留言。</div></article>';

  return `
    <article class="moment-entry" data-moment-entry>
      <header>
        <img src="/assets/images/lazy-loading.webp" data-vh-lz-src="${escapeAttribute(
          item.author.avatarUrl,
        )}" alt="${escapeAttribute(item.author.name)}" />
        <div class="info">
          <span>${escapeHtml(item.author.name)}</span>
          <time>${escapeHtml(item.dateLabel)}</time>
        </div>
      </header>
      <div class="main">
        <p>${item.contentHtml}</p>
        ${mediaHtml}
      </div>
      <footer>
        <button type="button" class="moment-action" data-moment-like data-moment-id="${item.id}">
          点赞 <strong data-moment-like-count>${item.likeCount}</strong>
        </button>
        <button
          type="button"
          class="moment-action"
          data-moment-toggle
          data-moment-id="${item.id}"
          aria-expanded="false"
          data-comment-count="${item.commentCount}"
        >
          评论 ${item.commentCount}
        </button>
      </footer>
      <section class="moment-interactions is-collapsed" data-moment-interactions data-moment-id="${item.id}">
        <div class="moment-comment-list">${commentList}</div>
        ${renderCommentForm({
          formId,
          id: item.id,
          kind: 'moment',
          turnstileSiteKey,
        })}
      </section>
    </article>
  `;
}

function renderCommentTree(
  node: CommentNode,
  nested = false,
  formId = 'post-comment-form',
): string {
  const authorNameMarkup = node.authorUrl
    ? `<a class="comment-author-link" href="${escapeAttribute(node.authorUrl)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(node.authorName)}</strong></a>`
    : `<strong class="comment-author-link">${escapeHtml(node.authorName)}</strong>`;

  return `
    <article class="vh-comment-item ${nested ? 'child' : ''}">
      <div class="comment-head">
        <div class="comment-author">
          <img src="${escapeAttribute(node.avatarUrl)}" alt="${escapeAttribute(node.authorName)}">
          <div class="comment-author-meta">
            <div class="comment-author-name-row">
              ${authorNameMarkup}
              ${node.isAdminAuthor ? '<span class="comment-author-badge">博主</span>' : ''}
            </div>
          </div>
        </div>
        <time datetime="${escapeAttribute(node.createdAt)}">${escapeHtml(node.dateLabel)}</time>
      </div>
      <div class="comment-content">${node.contentHtml}</div>
      <div class="comment-actions">
        <button
          type="button"
          class="comment-reply-button"
          data-comment-reply
          data-comment-form-target="${escapeAttribute(formId)}"
          data-comment-id="${node.id}"
          data-comment-author="${escapeAttribute(node.authorName)}"
        >
          回复
        </button>
      </div>
      ${
        node.children.length
          ? `<div class="comment-children">${node.children
              .map((child) => renderCommentTree(child, true, formId))
              .join('')}</div>`
          : ''
      }
    </article>
  `;
}

function renderMomentCommentTree(
  node: MomentCommentNode,
  nested = false,
  formId = 'moment-comment-form',
): string {
  const authorNameMarkup = node.authorUrl
    ? `<a class="comment-author-link" href="${escapeAttribute(node.authorUrl)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(node.authorName)}</strong></a>`
    : `<strong class="comment-author-link">${escapeHtml(node.authorName)}</strong>`;

  return `
    <article class="vh-comment-item ${nested ? 'child' : ''}" id="moment-comment-${node.id}">
      <div class="comment-head">
        <div class="comment-author">
          <img src="${escapeAttribute(node.avatarUrl)}" alt="${escapeAttribute(node.authorName)}">
          <div class="comment-author-meta">
            <div class="comment-author-name-row">
              ${authorNameMarkup}
              ${node.isAdminAuthor ? '<span class="comment-author-badge">博主</span>' : ''}
            </div>
          </div>
        </div>
        <time datetime="${escapeAttribute(node.createdAt)}">${escapeHtml(node.dateLabel)}</time>
      </div>
      <div class="comment-content">${node.contentHtml}</div>
      <div class="comment-actions">
        <button
          type="button"
          class="comment-reply-button"
          data-comment-reply
          data-comment-form-target="${escapeAttribute(formId)}"
          data-comment-id="${node.id}"
          data-comment-author="${escapeAttribute(node.authorName)}"
        >
          回复
        </button>
      </div>
      ${
        node.children.length
          ? `<div class="comment-children">${node.children
              .map((child) => renderMomentCommentTree(child, true, formId))
              .join('')}</div>`
          : ''
      }
    </article>
  `;
}

function renderCommentForm(input: {
  formId: string;
  id: number;
  kind: 'moment' | 'post';
  turnstileSiteKey?: string;
}): string {
  return `
    <form
      id="${escapeAttribute(input.formId)}"
      class="vh-comment-form"
      data-comment-form
      data-comment-kind="${input.kind}"
      ${input.kind === 'post' ? `data-post-id="${input.id}"` : `data-moment-id="${input.id}"`}
    >
      <div class="comment-form-meta is-hidden" data-comment-reply-meta>
        <span data-comment-reply-text>正在回复</span>
        <button type="button" data-comment-reply-cancel>取消回复</button>
      </div>
      <input type="hidden" name="parent" value="0" data-comment-parent>
      <div class="vh-form-grid">
        <label>
          <span>昵称</span>
          <input name="author_name" type="text" required placeholder="你的名字">
        </label>
        <label>
          <span>邮箱</span>
          <input name="author_email" type="email" required placeholder="you@example.com">
        </label>
        <label>
          <span>网址（可选）</span>
          <input name="author_url" type="url" placeholder="https://example.com">
        </label>
      </div>
      <input
        name="website"
        type="text"
        tabindex="-1"
        autocomplete="off"
        style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;"
        aria-hidden="true"
      >
      <label>
        <span>评论内容</span>
        <textarea name="content" required placeholder="写下你的看法…"></textarea>
      </label>
      ${
        input.turnstileSiteKey
          ? `
            <div class="comment-form-turnstile">
              <div class="cf-turnstile" data-sitekey="${escapeAttribute(input.turnstileSiteKey)}"></div>
            </div>
          `
          : ''
      }
      <div class="comment-form-actions">
        <button type="submit">提交评论</button>
        <span class="status-message" data-comment-status></span>
      </div>
    </form>
  `;
}

function renderInlinePagination(
  path: string,
  pagination: PaginationData,
  query?: Record<string, string>,
): string {
  return renderThemePagination(path, pagination, query, true);
}

function renderThemePagination(
  path: string,
  pagination: PaginationData,
  query?: Record<string, string>,
  inline = false,
): string {
  if (pagination.totalPages <= 1) {
    return '';
  }

  return `
    <section class="vh-art-page${inline ? ' vh-inline-page' : ''}">
      <a class="vh-pagination-item${pagination.page <= 1 ? ' disabled' : ''}" href="${escapeAttribute(
        pagination.page > 1 ? buildPageHref(path, pagination.page - 1, query) : 'javascript:;',
      )}" title="上一页">${renderIcon('chevron-left')}</a>
      ${
        pagination.page > 2
          ? `<a class="vh-pagination-item" href="${escapeAttribute(
              buildPageHref(path, 1, query),
            )}" title="第一页">1</a>`
          : ''
      }
      ${
        pagination.page > 2
          ? `<a class="vh-pagination-item" href="${escapeAttribute(
              buildPageHref(path, pagination.page - 1, query),
            )}" title="上一页">${pagination.page - 1}</a>`
          : ''
      }
      <a class="vh-pagination-item active" href="javascript:;" title="当前页">${pagination.page}</a>
      ${
        pagination.page < pagination.totalPages - 1
          ? `<a class="vh-pagination-item" href="${escapeAttribute(
              buildPageHref(path, pagination.page + 1, query),
            )}" title="下一页">${pagination.page + 1}</a>`
          : ''
      }
      ${
        pagination.page < pagination.totalPages - 1
          ? `<a class="vh-pagination-item" href="${escapeAttribute(
              buildPageHref(path, pagination.totalPages, query),
            )}" title="最后一页">${pagination.totalPages}</a>`
          : ''
      }
      <a class="vh-pagination-item${pagination.page >= pagination.totalPages ? ' disabled' : ''}" href="${escapeAttribute(
        pagination.page < pagination.totalPages
          ? buildPageHref(path, pagination.page + 1, query)
          : 'javascript:;',
      )}" title="下一页">${renderIcon('chevron-right')}</a>
    </section>
  `;
}

function renderNotFoundPage(common: CommonSiteData, message: string): string {
  return renderLayout({
    activePath: '/',
    canonicalPath: '/404',
    common,
    description: message,
    hero: renderHero({
      actions: [],
      common,
      description: message,
      kicker: '404',
      title: '页面不存在',
    }),
    main: `
      <section class="vh-page vh-animation vh-animation-init">
        ${renderPageHeader('页面不存在', message)}
        <section class="vh-page-section">
          <p>${escapeHtml(message)}</p>
        </section>
      </section>
    `,
    title: `404 - ${common.site.title}`,
  });
}

function getPrimaryNavItems(common: CommonSiteData): Array<{
  external?: boolean;
  href: string;
  icon: string;
  label: string;
}> {
  const baseItems = [
    { href: '/links', icon: 'friends', label: '朋友' },
    { href: '/talking', icon: 'talking', label: '动态' },
    { href: '/archives', icon: 'archives', label: '归档' },
  ];
  const pageItems = common.navPages.map((item) => ({
    href: `/${item.slug}`,
    icon: item.slug === 'message' ? 'message' : item.slug === 'about' ? 'about' : 'page',
    label: item.title,
  }));
  const seen = new Set<string>();
  const result: Array<{ external?: boolean; href: string; icon: string; label: string }> = [];

  [...baseItems, ...pageItems].forEach((item) => {
    if (seen.has(item.href)) {
      return;
    }
    seen.add(item.href);
    result.push(item);
  });

  result.push({ external: true, href: '/wp-json/', icon: 'api', label: 'API' });
  return result;
}

function renderMobileSidebar(common: CommonSiteData, activePath: string): string {
  const navItems = getPrimaryNavItems(common);
  return `
    <nav class="vh-mobilesidebar">
      <section class="main">
        <div class="vh-mobilesidebar-list user-panel">
          <h3>${escapeHtml(common.site.title)}</h3>
        </div>
        <div class="vh-mobilesidebar-list vh-link-list">
          ${navItems
            .map(
              (item) => `
                <a class="${isActive(activePath, item.href) ? 'active' : ''}" href="${escapeAttribute(
                  item.href,
                )}"${item.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>
                  ${renderIcon(item.icon)}
                  ${escapeHtml(item.label)}
                </a>
              `,
            )
            .join('')}
        </div>
      </section>
    </nav>
  `;
}

function renderBackTop(): string {
  return `
    <section class="vh-back-top">
      ${renderIcon('back-ring')}
      ${renderIcon('back-top')}
    </section>
  `;
}

function renderPageHeader(title: string, description: string): string {
  return `
    <header class="vh-page-header">
      <h1>${escapeHtml(title)}</h1>
      ${description ? `<p>${escapeHtml(description)}</p>` : ''}
    </header>
  `;
}

function renderToolPage(input: {
  content: string;
  description: string;
  note?: string;
  title: string;
  type: 'links' | 'talking';
}): string {
  return `
    <section class="vh-tools-main vh-animation vh-animation-init">
      ${renderPageHeader(input.title, input.description)}
      ${input.note ? `<main>${input.note}</main>` : ''}
      <main class="${input.type}-main main">${input.content}</main>
    </section>
  `;
}

function renderArchiveTimeline(posts: PostCard[], emptyText: string): string {
  if (!posts.length) {
    return `<section class="vh-page-section"><p>${escapeHtml(emptyText)}</p></section>`;
  }

  const groups = groupPostsByYear(posts);
  return `
    <section class="vh-archive-main vh-animation vh-animation-init">
      <div class="archive-list">
        ${groups
          .map(
            (group) => `
              <div class="archive-list-item">
                <p class="title">
                  <em>${group.year}</em>
                  <i></i>
                  <span>${group.items.length}篇文章</span>
                </p>
                ${group.items
                  .map(
                    (item) => `
                      <a href="/${encodeURIComponent(item.slug)}">
                        <em>${escapeHtml(formatMonthDay(item.publishedAt))}</em>
                        <i></i>
                        <span class="vh-ellipsis">${escapeHtml(item.title)}</span>
                        ${
                          item.tags.length
                            ? `<cite class="vh-ellipsis">${escapeHtml(
                                item.tags.map((tag) => `#${tag.name}`).join(' '),
                              )}</cite>`
                            : ''
                        }
                      </a>
                    `,
                  )
                  .join('')}
              </div>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
}

function groupPostsByYear(posts: PostCard[]): Array<{ items: PostCard[]; year: string }> {
  const groups = new Map<string, PostCard[]>();
  posts.forEach((post) => {
    const date = post.publishedAt ? new Date(post.publishedAt) : null;
    const year =
      date && !Number.isNaN(date.getTime()) ? String(date.getFullYear()) : '未知';
    const items = groups.get(year) || [];
    items.push(post);
    groups.set(year, items);
  });
  return [...groups.entries()].map(([year, items]) => ({ items, year }));
}

function renderIcon(name: string): string {
  switch (name) {
    case 'home':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11.5l7 -6l7 6"></path><path d="M9 21v-6h6v6"></path><path d="M4 10.5v9.5h16v-9.5"></path></svg>';
    case 'friends':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4 4 0 1 1 2.98 -6.667"></path><path d="M17 18a4 4 0 1 0 -2.98 -6.667"></path><path d="M8 18h8"></path><path d="M9 8a3 3 0 1 1 6 0"></path></svg>';
    case 'talking':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v10h-5l-3 3l-3 -3h-5z"></path></svg>';
    case 'archives':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"></path><path d="M7 12h13"></path><path d="M10 18h10"></path></svg>';
    case 'message':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v10h-4l-4 4l-4 -4h-4z"></path></svg>';
    case 'about':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3"></circle><path d="M5.5 21a6.5 6.5 0 0 1 13 0"></path></svg>';
    case 'api':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8l-4 4l4 4"></path><path d="M17 8l4 4l-4 4"></path><path d="M14 4l-4 16"></path></svg>';
    case 'telegram':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21.4 4.6c.3-.2.7.1.6.5l-3.2 15.1c-.1.5-.7.7-1.1.5l-4.7-3.5l-2.4 2.3c-.3.3-.8.2-.9-.3l-.5-5.1l10.1-9.1c.2-.2 0-.5-.2-.4l-12.5 7.7l-4.9-1.5c-.5-.2-.5-.9 0-1.1z"/></svg>';
    case 'x':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.3 22H3.2l7.3-8.4L1 2h6.3l4.4 5.9zm-1.1 18h1.7L6.4 3.9H4.6z"/></svg>';
    case 'mastodon':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.9 8.5c0-4.7-3.1-6.1-3.1-6.1C16.2 1.7 13.6 1.4 12 1.4h-.1c-1.6 0-4.2.3-5.8 1C6.1 2.4 3 3.8 3 8.5c0 1.1 0 2.4.1 3.7c.1 2.2.4 4.4 1.6 6.2c1.1 1.6 2.6 2.6 4.5 2.8c1 .1 2 .3 3 .2c1.8-.1 2.8-.6 2.8-.6l-.1-1.8s-1.3.4-2.8.4c-1.4 0-2.9-.4-3.1-2.1c-.1-.4-.1-.8-.1-1.3c1.1.3 2.4.5 3.6.6c2 .1 3.9-.1 5.8-.8c2-.8 2.5-3.6 2.7-6.3c.1-1.1.1-2.1.1-2.9zM17 14h-2.4V8.1c0-1.2-.5-1.8-1.4-1.8c-1 0-1.5.7-1.5 2.1v3.2H9.4V8.4c0-1.4-.5-2.1-1.5-2.1c-.9 0-1.4.6-1.4 1.8V14H4.1V7.9c0-1.2.3-2.1.9-2.9c.7-.8 1.7-1.2 2.9-1.2c1.4 0 2.4.5 3.1 1.5l.7 1.2l.7-1.2c.7-1 1.8-1.5 3.1-1.5c1.2 0 2.2.4 2.9 1.2c.6.8.9 1.7.9 2.9z"/></svg>';
    case 'email':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6l9-6"/></svg>';
    case 'qq':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c2.8 0 5 2.4 5 5.3c0 1.3-.4 2.6-1 3.7c.8.8 1.3 1.9 1.3 3.1c0 .7-.2 1.5-.5 2.1l1.2 1.6c.2.3.1.7-.2.9c-.9.5-2 .6-3 .2l-.6-.2v1.2c0 .8-.6 1.4-1.4 1.4h-1.6c-.8 0-1.4-.6-1.4-1.4v-1.2l-.6.2c-1 .4-2.1.3-3-.2c-.3-.2-.4-.6-.2-.9l1.2-1.6c-.3-.6-.5-1.4-.5-2.1c0-1.2.5-2.3 1.3-3.1c-.6-1.1-1-2.4-1-3.7C7 4.4 9.2 2 12 2z"/></svg>';
    case 'page':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h7l5 5v11h-12z"></path><path d="M14 4v5h5"></path></svg>';
    case 'search':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6"></circle><path d="M20 20l-3.5 -3.5"></path></svg>';
    case 'search-solid':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#B4B4B4" d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"></path></svg>';
    case 'menu':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"></path><path d="M7 12h13"></path><path d="M10 18h10"></path></svg>';
    case 'spark':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.662c2 2.338 2 4.338 0 6.338c3 .5 4.5 1 5 4c2 -3 6 -4 9 0c0 -3 1 -4 4 -4.004q -3 -2.995 0 -5.996c-3 0 -5 -2 -5 -5c-2 4 -5 3 -7.5 -1c-.5 3 -2.5 5 -5.5 5.662"></path></svg>';
    case 'shield':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M269.4 2.9C265.2 1 260.7 0 256 0s-9.2 1-13.4 2.9L54.3 82.8c-22 9.3-38.4 31-38.3 57.2c.5 99.2 41.3 280.7 213.6 363.2c16.7 8 36.1 8 52.8 0C454.7 420.7 495.5 239.2 496 140c.1-26.2-16.3-47.9-38.3-57.2L269.4 2.9zM144 221.3c0-33.8 27.4-61.3 61.3-61.3c16.2 0 31.8 6.5 43.3 17.9l7.4 7.4 7.4-7.4c11.5-11.5 27.1-17.9 43.3-17.9c33.8 0 61.3 27.4 61.3 61.3c0 16.2-6.5 31.8-17.9 43.3l-82.7 82.7c-6.2 6.2-16.4 6.2-22.6 0l-82.7-82.7c-11.5-11.5-17.9-27.1-17.9-43.3z"></path></svg>';
    case 'calendar':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M3 10h18"></path></svg>';
    case 'clock':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>';
    case 'pen':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1l1-4z"></path></svg>';
    case 'category':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"></path><path d="M7 12h13"></path><path d="M10 18h10"></path></svg>';
    case 'tag':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path><path d="M3 6v5.172a2 2 0 0 0 .586 1.414l7.71 7.71a2.41 2.41 0 0 0 3.408 0l5.592 -5.592a2.41 2.41 0 0 0 0 -3.408l-7.71 -7.71a2 2 0 0 0 -1.414 -.586h-5.172a3 3 0 0 0 -3 3z"></path></svg>';
    case 'chevron-left':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6l6 6"></path></svg>';
    case 'chevron-right':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6l-6 6"></path></svg>';
    case 'back-ring':
      return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="48" fill="none" stroke="rgba(1,196,182,.18)" stroke-width="4"></circle></svg>';
    case 'back-top':
      return '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l-6 6"></path><path d="M12 5l6 6"></path><path d="M12 5v14"></path></svg>';
    default:
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"></circle></svg>';
  }
}

function buildSocialLinks(settings: Record<string, any>): SocialLink[] {
  const links: SocialLink[] = [];
  const telegram = normalizeOptionalUrl(settings.social_telegram);
  const x = normalizeOptionalUrl(settings.social_x);
  const mastodon = normalizeOptionalUrl(settings.social_mastodon);
  const email = normalizeOptionalUrl(settings.social_email);
  const qq = normalizeOptionalUrl(settings.social_qq);

  if (telegram) {
    links.push({
      href: telegram.startsWith('http') ? telegram : `https://t.me/${telegram.replace(/^@/, '')}`,
      icon: 'telegram',
      label: 'Telegram',
    });
  }
  if (x) {
    links.push({
      href: x.startsWith('http') ? x : `https://x.com/${x.replace(/^@/, '')}`,
      icon: 'x',
      label: 'X',
    });
  }
  if (mastodon) {
    links.push({
      href: mastodon.startsWith('http') ? mastodon : `https://${mastodon.replace(/^@/, '')}`,
      icon: 'mastodon',
      label: 'Mastodon',
    });
  }
  if (email) {
    links.push({
      href: `mailto:${email}`,
      icon: 'email',
      label: email,
    });
  }
  if (qq) {
    links.push({
      href: `https://wpa.qq.com/msgrd?v=3&uin=${encodeURIComponent(qq)}&site=qq&menu=yes`,
      icon: 'qq',
      label: `QQ ${qq}`,
    });
  }

  return links;
}

function renderNoticeHtml(value: string): string {
  if (!value) {
    return '';
  }

  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<p>${escapeHtml(item)}</p>`)
    .join('');
}

function mapTaxonomy(row: any): TaxonomyItem {
  return {
    count: Number(row.count || 0),
    description: String(row.description || ''),
    id: Number(row.id),
    name: String(row.name || ''),
    slug: String(row.slug || ''),
  };
}

function mapAuthor(row: {
  author_avatar_url: string | null;
  author_bio: string | null;
  author_display_name: string | null;
  author_username: string | null;
}, fallbackName: string, fallbackAvatarUrl = ''): AuthorInfo {
  const username = String(row.author_username || fallbackName);
  const name = String(row.author_display_name || row.author_username || fallbackName);
  return {
    avatarUrl:
      normalizeOptionalUrl(row.author_avatar_url) ||
      normalizeOptionalUrl(fallbackAvatarUrl) ||
      createMonogramDataUri(name),
    bio: String(row.author_bio || ''),
    name,
    username,
  };
}

function createMonogramDataUri(label: string): string {
  const safeLabel = (label || 'CF')
    .trim()
    .slice(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none">
    <rect width="320" height="320" rx="80" fill="url(#a)"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="112" font-weight="700">${escapeSvgText(safeLabel)}</text>
    <defs>
      <linearGradient id="a" x1="0" y1="0" x2="320" y2="320">
        <stop stop-color="#1f8a70"/>
        <stop offset="1" stop-color="#f0a34d"/>
      </linearGradient>
    </defs>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createPostCardCoverDataUri(input: {
  authorName: string;
  categoryName: string;
  title: string;
}): string {
  const palette = getThemePalette(getThemeCategoryClass(input.categoryName || input.title));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="960" viewBox="0 0 1600 960" fill="none">
    <rect width="1600" height="960" fill="${palette.background}"/>
    <rect x="36" y="36" width="1528" height="888" rx="32" fill="${palette.paper}" stroke="${palette.line}" stroke-width="2"/>
    <g opacity="0.36">
      <path d="M112 120h1376v720H112z" stroke="${palette.grid}" stroke-width="2" stroke-dasharray="10 18"/>
      <path d="M800 120v720" stroke="${palette.grid}" stroke-width="2" stroke-dasharray="10 18"/>
      <path d="M112 480h1376" stroke="${palette.grid}" stroke-width="2" stroke-dasharray="10 18"/>
    </g>
    <rect x="90" y="110" width="540" height="540" rx="36" fill="${palette.panel}" opacity="0.96"/>
    <rect x="116" y="136" width="488" height="488" rx="24" fill="${palette.panel}" opacity="0.84"/>
    <circle cx="1284" cy="226" r="138" fill="${palette.accentSoft}"/>
    <circle cx="1284" cy="226" r="104" fill="${palette.accent}"/>
    <path d="M1246 170c20-18 54-26 84-10c28 15 44 47 38 78c-7 31-34 58-68 63c-18 2-35-1-50-9l-24 24l-16-16l25-24c-7-14-10-27-8-43c2-24 7-39 19-63z" fill="#fff" opacity="0.95"/>
    <circle cx="360" cy="380" r="126" fill="${palette.accent}" opacity="0.92"/>
    <circle cx="360" cy="380" r="78" fill="${palette.paper}" opacity="0.94"/>
    <path d="M330 338l64 86M394 338l-64 86" stroke="${palette.accent}" stroke-width="22" stroke-linecap="round"/>
    <rect x="760" y="142" width="370" height="54" rx="27" fill="${palette.panel}" opacity="0.9"/>
    <rect x="760" y="238" width="560" height="72" rx="20" fill="${palette.panel}" opacity="0.8"/>
    <rect x="760" y="338" width="430" height="48" rx="18" fill="${palette.panel}" opacity="0.66"/>
    <rect x="760" y="612" width="260" height="46" rx="23" fill="${palette.accent}" opacity="0.9"/>
    <rect x="1050" y="612" width="180" height="46" rx="23" fill="${palette.panel}" opacity="0.82"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getDefaultCoverUrl(seed: number): string {
  const covers = [
    '/assets/images/banner/072c12ec85d2d3b5.webp',
    '/assets/images/banner/2cc757cc144b109f.webp',
    '/assets/images/banner/7b1491d13dfb97a4.webp',
    '/assets/images/banner/82d5c86c7e85dfe8.webp',
    '/assets/images/banner/947f3ca34f5f5c52.webp',
    '/assets/images/banner/e236278e3b5a265e.webp',
  ];
  const safeIndex = Math.abs(seed || 0) % covers.length;
  return covers[safeIndex] || createCoverDataUri('CFBlog');
}

function createCoverDataUri(title: string): string {
  const safeTitle = escapeSvgText(truncateText(title, 32));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" fill="none">
    <rect width="1600" height="1000" fill="#10353a"/>
    <circle cx="1280" cy="200" r="220" fill="#1f8a70" fill-opacity="0.46"/>
    <circle cx="260" cy="780" r="280" fill="#f0a34d" fill-opacity="0.28"/>
    <rect x="86" y="86" width="1428" height="828" rx="54" fill="url(#bg)" stroke="#ffffff" stroke-opacity="0.18"/>
    <text x="120" y="810" fill="#ffffff" font-family="Arial, sans-serif" font-size="92" font-weight="700">${safeTitle}</text>
    <text x="120" y="140" fill="#F5E8D8" font-family="Arial, sans-serif" font-size="42" letter-spacing="8">CFBLOG</text>
    <defs>
      <linearGradient id="bg" x1="86" y1="86" x2="1500" y2="914" gradientUnits="userSpaceOnUse">
        <stop stop-color="#1f8a70"/>
        <stop offset="0.48" stop-color="#12383d"/>
        <stop offset="1" stop-color="#f0a34d"/>
      </linearGradient>
    </defs>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderBodyContent(content: string): string {
  if (!content.trim()) {
    return '<p>暂无内容。</p>';
  }

  return forceArticleLinksToNewWindow(marked.parse(content) as string);
}

function renderCommentContent(content: string): string {
  return escapeHtml(content).replace(/\n/g, '<br>');
}

function forceArticleLinksToNewWindow(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (_match, attrs: string) => {
    let nextAttrs = attrs;

    if (/\btarget\s*=/.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(
        /\btarget\s*=\s*(".*?"|'.*?'|[^\s>]+)/i,
        'target="_blank"',
      );
    } else {
      nextAttrs += ' target="_blank"';
    }

    if (/\brel\s*=/.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(
        /\brel\s*=\s*(".*?"|'.*?'|[^\s>]+)/i,
        'rel="noopener noreferrer"',
      );
    } else {
      nextAttrs += ' rel="noopener noreferrer"';
    }

    return `<a${nextAttrs}>`;
  });
}

function parseMediaUrls(mediaUrls: string | null): string[] {
  if (!mediaUrls) {
    return [];
  }

  try {
    const parsed = JSON.parse(mediaUrls);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function getPageNumber(value: string | undefined): number {
  const page = Number.parseInt(value || '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function parsePositiveIntSetting(value: unknown, fallback: number, max = 100): number {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function normalizeQuery(value: string | undefined): string {
  return String(value || '').trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function wrapCdata(value: string): string {
  return `<![CDATA[${String(value || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

function formatRssDate(value: string | null | undefined): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toUTCString();
  }
  return date.toUTCString();
}

function formatSitemapLastmod(value: string | null | undefined): string {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match?.[1]) {
    return match[1];
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function absolutizeHtmlUrls(html: string, baseUrl: string): string {
  return html.replace(
    /\b(href|src)=("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (_match, attrName: string, _rawValue, doubleQuoted: string | undefined, singleQuoted: string | undefined, unquoted: string | undefined) => {
      const originalValue = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
      const nextValue = absolutizeUrl(originalValue, baseUrl);
      return `${attrName}="${escapeAttribute(nextValue)}"`;
    },
  );
}

function absolutizeUrl(value: string, baseUrl: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('#')) {
    return trimmed;
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return trimmed;
  }
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toPlainText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/[#>*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trim()}…`;
}

function estimateReadingMinutes(value: string): number {
  const length = value.trim().length;
  if (!length) {
    return 1;
  }
  return Math.max(1, Math.ceil(length / 520));
}

function formatLongDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatArticleMetaDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
}

function formatThemeCardDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatMonthDay(value: string | null | undefined): string {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

function normalizeOptionalUrl(value: unknown): string {
  return String(value || '').trim();
}

function getThemeCategoryClass(value: string): string {
  const normalized = String(value || '').toLowerCase();
  if (
    normalized.includes('code') ||
    normalized.includes('dev') ||
    normalized.includes('tech') ||
    normalized.includes('编程') ||
    normalized.includes('开发')
  ) {
    return 'Code';
  }
  if (
    normalized.includes('share') ||
    normalized.includes('book') ||
    normalized.includes('资源') ||
    normalized.includes('分享')
  ) {
    return 'Share';
  }
  if (
    normalized.includes('tool') ||
    normalized.includes('software') ||
    normalized.includes('产品') ||
    normalized.includes('工具')
  ) {
    return 'Software';
  }
  if (
    normalized.includes('life') ||
    normalized.includes('daily') ||
    normalized.includes('talk') ||
    normalized.includes('日常') ||
    normalized.includes('生活')
  ) {
    return 'Daily';
  }
  return 'Code';
}

function getThemePalette(theme: string): {
  accent: string;
  accentSoft: string;
  background: string;
  grid: string;
  kicker: string;
  line: string;
  meta: string;
  panel: string;
  paper: string;
  title: string;
} {
  switch (theme) {
    case 'Daily':
      return {
        accent: '#4C8BF5',
        accentSoft: '#D7E7FF',
        background: '#F6FAFF',
        grid: '#D8E5F3',
        kicker: '#3D7CF0',
        line: '#E4EDF6',
        meta: '#D6E8FF',
        panel: '#243B63',
        paper: '#FFFFFF',
        title: '#FFFFFF',
      };
    case 'Software':
      return {
        accent: '#01C4B6',
        accentSoft: '#BFF3ED',
        background: '#F6FFFD',
        grid: '#DAEEE9',
        kicker: '#00A79B',
        line: '#E2F2EF',
        meta: '#D8FFF9',
        panel: '#1F3B39',
        paper: '#FFFFFF',
        title: '#FFFFFF',
      };
    case 'Share':
      return {
        accent: '#FF69BF',
        accentSoft: '#FFD7EE',
        background: '#FFF8FC',
        grid: '#F2DFEA',
        kicker: '#FF69BF',
        line: '#F3E2EC',
        meta: '#FFE4F3',
        panel: '#2F3243',
        paper: '#FFFFFF',
        title: '#FF8BD1',
      };
    case 'Code':
    default:
      return {
        accent: '#F59E0B',
        accentSoft: '#FFE1A8',
        background: '#FFFCF7',
        grid: '#EFE5D3',
        kicker: '#FF9D00',
        line: '#F0E8DA',
        meta: '#FFF0CC',
        panel: '#2A3245',
        paper: '#FFFFFF',
        title: '#FFBF5E',
      };
  }
}

function sanitizeToken(value: string): string {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'default';
}

function normalizeEmail(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function buildAbsoluteUrl(baseUrl: string, path: string): string {
  if (!path) {
    return baseUrl;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${normalizeBaseUrl(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`;
}

function isIndexableContentSlug(slug: string): boolean {
  return !!slug && !slug.includes('.') && !RESERVED_NAV_SLUGS.has(slug);
}

function isIndexableNestedSlug(slug: string): boolean {
  return !!slug && !slug.includes('.');
}

function renderRobotsTxt(site: SiteMeta): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /wp-admin',
    'Disallow: /wp-admin/',
    'Disallow: /wp-json',
    'Disallow: /wp-json/',
    '',
    `Sitemap: ${buildAbsoluteUrl(site.baseUrl, '/sitemap.xml')}`,
  ].join('\n');
}

function renderRssXml(site: SiteMeta, items: RssFeedItem[]): string {
  const feedUrl = buildAbsoluteUrl(site.baseUrl, '/rss.xml');
  const channelImageUrl = site.logoUrl
    ? buildAbsoluteUrl(site.baseUrl, site.logoUrl)
    : site.faviconUrl
      ? buildAbsoluteUrl(site.baseUrl, site.faviconUrl)
      : '';
  const lastBuildDate = formatRssDate(items[0]?.updatedAt || items[0]?.publishedAt);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeHtml(site.title)}</title>
    <link>${escapeHtml(site.baseUrl)}</link>
    <description>${escapeHtml(site.description)}</description>
    <language>zh-CN</language>
    <generator>CFBlog</generator>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <ttl>60</ttl>
    <lastBuildDate>${escapeHtml(lastBuildDate)}</lastBuildDate>
    <atom:link href="${escapeAttribute(feedUrl)}" rel="self" type="application/rss+xml" />
    ${
      site.adminEmail
        ? `<managingEditor>${escapeHtml(site.adminEmail)} (${escapeHtml(site.authorName)})</managingEditor>
    <webMaster>${escapeHtml(site.adminEmail)} (${escapeHtml(site.authorName)})</webMaster>`
        : ''
    }
    ${
      channelImageUrl
        ? `<image>
      <url>${escapeHtml(channelImageUrl)}</url>
      <title>${escapeHtml(site.title)}</title>
      <link>${escapeHtml(site.baseUrl)}</link>
    </image>`
        : ''
    }
    ${items
      .map(
        (item) => `    <item>
      <title>${escapeHtml(item.title)}</title>
      <link>${escapeHtml(item.link)}</link>
      <guid isPermaLink="true">${escapeHtml(item.link)}</guid>
      <pubDate>${escapeHtml(formatRssDate(item.publishedAt))}</pubDate>
      <dc:creator>${wrapCdata(item.authorName)}</dc:creator>
      ${item.categories.map((category) => `<category>${wrapCdata(category)}</category>`).join('')}
      <description>${wrapCdata(item.excerpt)}</description>
      <content:encoded>${wrapCdata(item.contentHtml)}</content:encoded>
    </item>`,
      )
      .join('\n')}
  </channel>
</rss>`;
}

function renderSitemapXml(site: SiteMeta, entries: SitemapUrlEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  ${entries
    .map(
      (entry) => `  <url>
    <loc>${escapeHtml(buildAbsoluteUrl(site.baseUrl, entry.path))}</loc>
    ${entry.lastModified ? `<lastmod>${escapeHtml(entry.lastModified)}</lastmod>` : ''}
  </url>`,
    )
    .join('\n')}
</urlset>`;
}

function renderRssPreviewPage(site: SiteMeta, items: RssFeedItem[]): string {
  const subscribeUrl = buildAbsoluteUrl(site.baseUrl, '/rss.xml');
  const rawXmlUrl = buildAbsoluteUrl(site.baseUrl, '/rss.xml?view=xml');
  const siteUrl = buildAbsoluteUrl(site.baseUrl, '/');
  const lastBuildDate = formatRssDate(items[0]?.updatedAt || items[0]?.publishedAt);
  const feedlyUrl = `https://feedly.com/i/subscription/feed/${encodeURIComponent(subscribeUrl)}`;
  const inoreaderUrl = `https://www.inoreader.com/?add_feed=${encodeURIComponent(subscribeUrl)}`;
  const newsblurUrl = `https://www.newsblur.com/?url=${encodeURIComponent(subscribeUrl)}`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(site.title)} RSS</title>
  <meta name="description" content="${escapeAttribute(site.description)}">
  <meta name="robots" content="noindex,follow">
  <style>
    :root {
      color-scheme: dark;
      --rss-bg: #090915;
      --rss-card: #121220;
      --rss-card-strong: #171729;
      --rss-border: rgba(255, 255, 255, 0.08);
      --rss-border-strong: rgba(255, 255, 255, 0.14);
      --rss-title: #ffffff;
      --rss-text: #d6d6e1;
      --rss-muted: #8d90a6;
      --rss-link: #a5b4fc;
      --rss-link-strong: #f9a8d4;
      --rss-accent: #f97316;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "SF Pro Display", "PingFang SC", "Segoe UI", sans-serif;
      color: var(--rss-text);
      background:
        radial-gradient(circle at top left, rgba(79, 70, 229, 0.22), transparent 30%),
        radial-gradient(circle at top right, rgba(232, 121, 249, 0.18), transparent 24%),
        linear-gradient(180deg, #090915 0%, #11111d 100%);
    }
    .shell {
      width: min(1040px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 56px;
    }
    .header {
      display: grid;
      gap: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--rss-title);
      text-decoration: none;
      width: fit-content;
    }
    .brand-icon {
      width: 30px;
      height: 30px;
      color: var(--rss-accent);
      flex: none;
    }
    .brand-title {
      font-size: clamp(28px, 5vw, 40px);
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: -0.03em;
      background: linear-gradient(90deg, #818cf8 0%, #e879f9 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .summary {
      max-width: 760px;
      font-size: 1.0625rem;
      line-height: 1.85;
      color: var(--rss-text);
    }
    .caption {
      color: var(--rss-muted);
      font-size: 0.9375rem;
      line-height: 1.7;
    }
    .caption a,
    .subscribe-links a,
    .item-content a,
    .item-read {
      color: var(--rss-link);
      text-decoration: none;
      transition: color .15s ease;
    }
    .caption a:hover,
    .subscribe-links a:hover,
    .item-content a:hover,
    .item-read:hover {
      color: var(--rss-link-strong);
    }
    .subscribe-links {
      color: var(--rss-text);
      font-size: 0.9375rem;
      line-height: 1.8;
    }
    .divider {
      height: 1px;
      margin: 24px 0;
      background: linear-gradient(90deg, transparent 0%, var(--rss-border-strong) 12%, var(--rss-border-strong) 88%, transparent 100%);
    }
    .feed-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .feed-stats span,
    .feed-stats a {
      display: inline-flex;
      align-items: center;
      min-height: 34px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid var(--rss-border);
      background: rgba(255, 255, 255, 0.03);
      color: var(--rss-text);
      text-decoration: none;
      font-size: 13px;
    }
    .feed-stats a:hover {
      border-color: rgba(129, 140, 248, 0.45);
      color: var(--rss-title);
    }
    .list {
      display: grid;
      gap: 18px;
    }
    .item {
      border: 1px solid var(--rss-border);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(23, 23, 41, 0.88) 0%, rgba(18, 18, 32, 0.9) 100%);
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.24);
    }
    .item > details {
      display: block;
    }
    .item > details[open] {
      background: rgba(255, 255, 255, 0.01);
    }
    .item > details > summary {
      display: block;
      padding: 18px 20px;
      cursor: pointer;
      list-style: none;
    }
    .item > details > summary::-webkit-details-marker {
      display: none;
    }
    .item-heading {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      justify-content: space-between;
    }
    .item-title {
      margin: 0;
      font-size: 1.125rem;
      line-height: 1.55;
      font-weight: 700;
      color: var(--rss-title);
    }
    .item-meta {
      margin-top: 8px;
      color: var(--rss-muted);
      font-size: 0.875rem;
    }
    .item-toggle {
      flex: none;
      width: 30px;
      height: 30px;
      border-radius: 999px;
      border: 1px solid var(--rss-border);
      background: rgba(255, 255, 255, 0.03);
      position: relative;
    }
    .item-toggle::before,
    .item-toggle::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 10px;
      height: 1.5px;
      background: var(--rss-text);
      border-radius: 999px;
      transform: translate(-50%, -50%);
      transition: transform .15s ease, opacity .15s ease;
    }
    .item-toggle::after {
      transform: translate(-50%, -50%) rotate(90deg);
    }
    details[open] .item-toggle::after {
      opacity: 0;
      transform: translate(-50%, -50%) rotate(90deg) scaleX(.3);
    }
    .item-content {
      padding: 0 20px 20px;
      color: var(--rss-text);
      line-height: 1.85;
    }
    .item-content p {
      margin: 0;
    }
    .item-read {
      display: inline-flex;
      margin-top: 14px;
      font-weight: 700;
    }
    .footer {
      margin-top: 24px;
      color: var(--rss-muted);
      font-size: 13px;
      line-height: 1.8;
    }
    .footer strong {
      color: var(--rss-title);
    }
    @media (max-width: 640px) {
      .shell {
        width: min(100% - 20px, 1040px);
        padding-top: 22px;
      }
      .brand-title {
        font-size: 1.9rem;
      }
      .item > details > summary,
      .item-content {
        padding-left: 16px;
        padding-right: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="header">
      <a class="brand" href="${escapeAttribute(siteUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeAttribute(site.title)}">
        <svg class="brand-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path>
          <path d="M4 4a16 16 0 0 1 16 16"></path>
          <path d="M4 11a9 9 0 0 1 9 9"></path>
        </svg>
        <span class="brand-title">${escapeHtml(site.title)}</span>
      </a>
      <p class="summary">${escapeHtml(site.description)}</p>
      <p class="caption">
        这是 <a href="${escapeAttribute(siteUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(site.title)}</a> 的 RSS 订阅页。浏览器会看到这个预览；RSS 阅读器直接订阅 <code>/rss.xml</code> 会拿到标准 XML。
      </p>
      <p class="subscribe-links">
        你可以通过
        <a href="${escapeAttribute(feedlyUrl)}" target="_blank" rel="noopener noreferrer">Feedly</a>、
        <a href="${escapeAttribute(inoreaderUrl)}" target="_blank" rel="noopener noreferrer">Inoreader</a>、
        <a href="${escapeAttribute(newsblurUrl)}" target="_blank" rel="noopener noreferrer">NewsBlur</a>
        或者 <a href="${escapeAttribute(rawXmlUrl)}" target="_blank" rel="noopener noreferrer">查看原始 XML</a> 订阅这个源。
      </p>
      <div class="feed-stats">
        <a href="${escapeAttribute(siteUrl)}" target="_blank" rel="noopener noreferrer">访问网站</a>
        <a href="${escapeAttribute(subscribeUrl)}" target="_blank" rel="noopener noreferrer">订阅地址</a>
        <span>共 ${items.length} 篇文章</span>
        <span>最近构建: ${escapeHtml(lastBuildDate)}</span>
      </div>
    </header>

    <div class="divider"></div>

    <section class="list">
      ${items
        .map(
          (item) => `
            <article class="item">
              <details${item === items[0] ? ' open' : ''}>
                <summary>
                  <div class="item-heading">
                    <div>
                      <h2 class="item-title">${escapeHtml(item.title)}</h2>
                      <div class="item-meta">
                        <span>${escapeHtml(formatRssDate(item.publishedAt))}</span>
                        <span> · </span>
                        <span>${escapeHtml(item.authorName)}</span>
                      </div>
                    </div>
                    <span class="item-toggle" aria-hidden="true"></span>
                  </div>
                </summary>
                <div class="item-content">
                  <p>${escapeHtml(item.excerpt)}</p>
                  <a class="item-read" href="${escapeAttribute(item.link)}" target="_blank" rel="noopener noreferrer">Read More</a>
                </div>
              </details>
            </article>
          `,
        )
        .join('')}
    </section>

    <div class="divider"></div>

    <footer class="footer">
      <strong>RSS Preview</strong><br>
      灵感参考 vvhan.com/rss.xml 的预览层级，但这里仍然使用服务端 HTML 预览，避免浏览器对 XSLT 支持不一致。
    </footer>
  </div>
</body>
</html>`;
}

function requestPrefersHtml(acceptHeader: string | undefined): boolean {
  const value = String(acceptHeader || '').toLowerCase();
  if (!value) {
    return false;
  }
  return value.includes('text/html') || value.includes('application/xhtml+xml');
}

function buildCanonicalPath(path: string, page: number, query?: Record<string, string>): string {
  return buildPageHref(path, page, query);
}

function buildPageHref(path: string, page: number, query?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        params.set(key, value);
      }
    }
  }
  if (page > 1) {
    params.set('page', String(page));
  }
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function isActive(currentPath: string, href: string): boolean {
  if (href === '/') {
    return currentPath === '/';
  }
  return currentPath === href || currentPath.startsWith(`${href}?`);
}
