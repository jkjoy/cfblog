import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './types';
import { getSiteSettings } from './utils';
import posts from './routes/posts';
import categories from './routes/categories';
import tags from './routes/tags';
import media from './routes/media';
import users from './routes/users';
import links from './routes/links';
import link分类 from './routes/link-categories';
import comments from './routes/comments';
import pages from './routes/pages';
import settings from './routes/settings';
import moments from './routes/moments';
import imports from './routes/import';
import { registerPublicSiteRoutes, renderPublicHome } from './public-site';

const app = new Hono<AppEnv>();

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-WP-Total', 'X-WP-TotalPages', 'Link'],
  maxAge: 600,
  credentials: true,
}));

// Root endpoint - Simple landing page
app.get('/', async (c) => {
  return renderPublicHome(c);

  const siteSettings = await getSiteSettings(c.env);
  const apiUrl = siteSettings.site_url || 'http://localhost:8787';

  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteSettings.site_title || 'CFBlog'} - API Server</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #333;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 50px;
      max-width: 600px;
      width: 90%;
      text-align: center;
    }
    h1 {
      font-size: 36px;
      margin-bottom: 10px;
      color: #2c3e50;
    }
    .subtitle {
      font-size: 18px;
      color: #7f8c8d;
      margin-bottom: 40px;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: #e8f5e9;
      border: 2px solid #4caf50;
      border-radius: 8px;
      padding: 15px 25px;
      margin: 20px 0;
      font-weight: 600;
      color: #2e7d32;
    }
    .status.checking {
      background: #fff3e0;
      border-color: #ff9800;
      color: #e65100;
    }
    .status.error {
      background: #ffebee;
      border-color: #f44336;
      color: #c62828;
    }
    .indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #4caf50;
      animation: pulse 2s infinite;
    }
    .status.checking .indicator {
      background: #ff9800;
    }
    .status.error .indicator {
      background: #f44336;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .button-group {
      display: flex;
      gap: 15px;
      justify-content: center;
      margin-top: 30px;
      flex-wrap: wrap;
    }
    .button {
      display: inline-block;
      padding: 14px 30px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.3s;
      border: none;
      cursor: pointer;
      font-size: 16px;
    }
    .button:hover {
      background: #764ba2;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
    .button.secondary {
      background: #ecf0f1;
      color: #2c3e50;
    }
    .button.secondary:hover {
      background: #bdc3c7;
    }
    .info {
      margin-top: 40px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      text-align: left;
    }
    .info h3 {
      color: #2c3e50;
      margin-bottom: 15px;
      font-size: 18px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .info-item:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #666;
    }
    .info-value {
      color: #2c3e50;
      font-family: 'Courier New', monospace;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #95a5a6;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${siteSettings.site_title || 'CFBlog'}</h1>
    <p class="subtitle">${siteSettings.site_description || 'WordPress-like Headless CMS'}</p>

    <div id="status" class="status checking">
      <span class="indicator"></span>
      <span id="status-text">Checking API status...</span>
    </div>

    <div class="button-group">
      <a href="/wp-admin" class="button">Go to Dashboard</a>
      <a href="/wp-json/" class="button secondary">View API Info</a>
    </div>

    <div class="info">
      <h3>API Endpoints</h3>
      <div class="info-item">
        <span class="info-label">API Root:</span>
        <span class="info-value">/wp-json/</span>
      </div>
      <div class="info-item">
        <span class="info-label">Posts:</span>
        <span class="info-value">/wp-json/wp/v2/posts</span>
      </div>
      <div class="info-item">
        <span class="info-label">分类:</span>
        <span class="info-value">/wp-json/wp/v2/categories</span>
      </div>
      <div class="info-item">
        <span class="info-label">标签:</span>
        <span class="info-value">/wp-json/wp/v2/tags</span>
      </div>
      <div class="info-item">
        <span class="info-label">Media:</span>
        <span class="info-value">/wp-json/wp/v2/media</span>
      </div>
      <div class="info-item">
        <span class="info-label">Dashboard:</span>
        <span class="info-value">/wp-admin</span>
      </div>
    </div>

    <div class="footer">
      Powered by Cloudflare Workers + D1 + R2
    </div>
  </div>

  <script>
    // Check API status
    async function checkApiStatus() {
      const statusEl = document.getElementById('status');
      const statusTextEl = document.getElementById('status-text');

      try {
        const response = await fetch('/wp-json/');
        if (response.ok) {
          const data = await response.json();
          statusEl.className = 'status';
          statusTextEl.textContent = 'API is online and ready';
        } else {
          throw new Error('API returned error');
        }
      } catch (error) {
        statusEl.className = 'status error';
        statusTextEl.textContent = 'API connection failed';
      }
    }

    // Run check on load
    checkApiStatus();

    // Recheck every 30 seconds
    setInterval(checkApiStatus, 30000);
  </script>
</body>
</html>
  `);
});

// WordPress REST API root - Discovery endpoint
app.get('/wp-json', async (c) => {
  const siteSettings = await getSiteSettings(c.env);
  return c.json({
    name: siteSettings.site_title || 'CFBlog',
    description: siteSettings.site_description || 'WordPress-like headless CMS powered by Cloudflare Workers',
    url: siteSettings.site_url || 'http://localhost:8787',
    home: siteSettings.site_url || 'http://localhost:8787',
    gmt_offset: 0,
    timezone_string: 'UTC',
    namespaces: ['wp/v2'],
    authentication: {
      oauth1: false,
      oauth2: false,
      jwt: true
    },
    routes: {
      '/wp-json/': {
        namespace: '',
        methods: ['GET'],
        endpoints: [
          {
            methods: ['GET'],
            args: {
              context: {
                default: 'view',
                required: false
              }
            }
          }
        ],
        _links: {
          self: `${siteSettings.site_url || 'http://localhost:8787'}/wp-json/`
        }
      },
      '/wp-json/wp/v2': {
        methods: ['GET']
      },
      '/wp-json/wp/v2/posts': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/posts/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/pages': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/pages/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/categories': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/categories/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/tags': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/tags/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/media': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/media/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/users': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/users/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/links': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/links/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/link-categories': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/link-categories/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/comments': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/comments/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/import': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/settings': {
        methods: ['GET', 'PUT']
      }
    }
  });
});

// WordPress REST API root with trailing slash (alias)
app.get('/wp-json/', async (c) => {
  const siteSettings = await getSiteSettings(c.env);
  return c.json({
    name: siteSettings.site_title || 'CFBlog',
    description: siteSettings.site_description || 'WordPress-like headless CMS powered by Cloudflare Workers',
    url: siteSettings.site_url || 'http://localhost:8787',
    home: siteSettings.site_url || 'http://localhost:8787',
    gmt_offset: 0,
    timezone_string: 'UTC',
    namespaces: ['wp/v2'],
    authentication: {
      oauth1: false,
      oauth2: false,
      jwt: true
    },
    routes: {
      '/wp-json/': {
        namespace: '',
        methods: ['GET'],
        endpoints: [
          {
            methods: ['GET'],
            args: {
              context: {
                default: 'view',
                required: false
              }
            }
          }
        ],
        _links: {
          self: `${siteSettings.site_url || 'http://localhost:8787'}/wp-json/`
        }
      },
      '/wp-json/wp/v2': {
        methods: ['GET']
      },
      '/wp-json/wp/v2/posts': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/posts/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/pages': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/pages/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/categories': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/categories/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/tags': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/tags/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/media': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/media/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/users': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/users/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/links': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/links/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/link-categories': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/link-categories/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/comments': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/comments/(?P<id>[\\d]+)': {
        methods: ['GET', 'PUT', 'DELETE']
      },
      '/wp-json/wp/v2/import': {
        methods: ['GET', 'POST']
      },
      '/wp-json/wp/v2/settings': {
        methods: ['GET', 'PUT']
      }
    }
  });
});

// WordPress REST API v2 info
app.get('/wp-json/wp/v2', (c) => {
  return c.json({
    namespace: 'wp/v2',
    routes: {
      '/wp/v2': {
        namespace: 'wp/v2',
        methods: ['GET']
      },
      '/wp/v2/posts': {
        namespace: 'wp/v2',
        methods: ['GET', 'POST']
      },
      '/wp/v2/categories': {
        namespace: 'wp/v2',
        methods: ['GET', 'POST']
      },
      '/wp/v2/tags': {
        namespace: 'wp/v2',
        methods: ['GET', 'POST']
      },
      '/wp/v2/media': {
        namespace: 'wp/v2',
        methods: ['GET', 'POST']
      },
      '/wp/v2/users': {
        namespace: 'wp/v2',
        methods: ['GET', 'POST']
      },
      '/wp/v2/import': {
        namespace: 'wp/v2',
        methods: ['GET', 'POST']
      }
    }
  });
});

// Mount routes
app.route('/wp-json/wp/v2/posts', posts);
app.route('/wp-json/wp/v2/pages', pages);
app.route('/wp-json/wp/v2/categories', categories);
app.route('/wp-json/wp/v2/tags', tags);
app.route('/wp-json/wp/v2/media', media);
app.route('/wp-json/wp/v2/users', users);
app.route('/wp-json/wp/v2/links', links);
app.route('/wp-json/wp/v2/link-categories', link分类);
app.route('/wp-json/wp/v2/comments', comments);
app.route('/wp-json/wp/v2/import', imports);
app.route('/wp-json/wp/v2/settings', settings);
app.route('/wp-json/wp/v2/moments', moments);

// Serve media files from R2
app.get('/media/*', async (c) => {
  try {
    // Extract the R2 key from the URL path
    // URL format: /media/uploads/2025/10/filename.jpg
    const path = c.req.path.replace('/media/', '');

    // Get the file from R2
    const object = await c.env.MEDIA.get(path);

    if (!object) {
      return c.text('File not found', 404);
    }

    // Get the content type from R2 metadata
    const contentType = object.httpMetadata?.contentType || 'application/octet-stream';

    // Return the file with appropriate headers
    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error serving media file:', error);
    return c.text('Internal server error', 500);
  }
});

// Admin dashboard route (will serve HTML)
app.get('/wp-admin', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${c.env.SITE_NAME || 'CFBlog'} - Dashboard</title>
  <!-- EasyMDE Markdown Editor -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde@2.18.0/dist/easymde.min.css">
  <script src="https://cdn.jsdelivr.net/npm/easymde@2.18.0/dist/easymde.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
      background: #f0f0f1;
      color: #2c3338;
    }
    #app {
      display: flex;
      min-height: 100vh;
    }
    .sidebar {
      width: 160px;
      background: #1e1e1e;
      color: #fff;
      padding: 0;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
    }
    .sidebar-header {
      padding: 20px;
      background: #2271b1;
      text-align: center;
      font-size: 20px;
      font-weight: 600;
    }
    .sidebar-menu {
      list-style: none;
      padding: 10px 0;
    }
    .sidebar-menu li {
      padding: 0;
    }
    .sidebar-menu a {
      display: block;
      padding: 10px 20px;
      color: #fff;
      text-decoration: none;
      transition: background 0.2s;
    }
    .sidebar-menu a:hover,
    .sidebar-menu a.active {
      background: #2271b1;
    }
    .main-content {
      flex: 1;
      margin-left: 160px;
      padding: 0;
    }
    .top-bar {
      background: #fff;
      padding: 15px 30px;
      border-bottom: 1px solid #dcdcde;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .top-bar h1 {
      font-size: 23px;
      font-weight: 400;
      color: #1e1e1e;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .content-area {
      padding: 30px;
    }
    .welcome-panel {
      background: #fff;
      border: 1px solid #c3c4c7;
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 4px;
    }
    .welcome-panel h2 {
      font-size: 21px;
      font-weight: 400;
      margin-bottom: 15px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 30px;
    }
    .stat-card {
      background: #fff;
      border: 1px solid #c3c4c7;
      padding: 20px;
      border-radius: 4px;
      text-align: center;
    }
    .stat-card h3 {
      font-size: 14px;
      color: #646970;
      font-weight: 400;
      margin-bottom: 10px;
    }
    .stat-card .number {
      font-size: 32px;
      font-weight: 300;
      color: #1e1e1e;
    }
    .button {
      display: inline-block;
      padding: 8px 16px;
      background: #2271b1;
      color: #fff;
      text-decoration: none;
      border-radius: 3px;
      border: none;
      cursor: pointer;
      font-size: 13px;
    }
    .button:hover {
      background: #135e96;
    }
    .button-secondary {
      background: #f0f0f1;
      color: #2c3338;
      border: 1px solid #2271b1;
    }
    .button-secondary:hover {
      background: #fff;
    }
    .login-form {
      max-width: 400px;
      margin: 100px auto;
      background: #fff;
      padding: 40px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.13);
    }
    .login-form h1 {
      text-align: center;
      margin-bottom: 30px;
      font-size: 28px;
      font-weight: 600;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }
    .form-group input {
      width: 100%;
      padding: 10px;
      border: 1px solid #8c8f94;
      border-radius: 3px;
      font-size: 14px;
    }
    .form-group input:focus {
      outline: none;
      border-color: #2271b1;
      box-shadow: 0 0 0 1px #2271b1;
    }
    .error-message {
      background: #f0f0f1;
      border-left: 4px solid #d63638;
      padding: 12px;
      margin-bottom: 20px;
    }
    .隐藏 {
      display: none !important;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .table-container {
      background: #fff;
      border: 1px solid #c3c4c7;
      border-radius: 4px;
      overflow: 隐藏;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    table th {
      background: #f6f7f7;
      text-align: left;
      padding: 12px;
      font-weight: 500;
      border-bottom: 1px solid #c3c4c7;
    }
    table td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f1;
    }
    table tr:hover {
      background: #f6f7f7;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    .action-link {
      color: #2271b1;
      text-decoration: none;
      font-size: 13px;
    }
    .action-link:hover {
      text-decoration: underline;
    }
    .action-link.delete {
      color: #d63638;
    }
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      background: #fff;
      padding: 30px;
      border-radius: 4px;
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .modal-header h2 {
      font-size: 21px;
      font-weight: 400;
    }
    .close-button {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #646970;
    }
    textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #8c8f94;
      border-radius: 3px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      min-height: 200px;
    }
    textarea:focus {
      outline: none;
      border-color: #2271b1;
      box-shadow: 0 0 0 1px #2271b1;
    }
    select {
      width: 100%;
      padding: 10px;
      border: 1px solid #8c8f94;
      border-radius: 3px;
      font-size: 14px;
      background: #fff;
    }
    select:focus {
      outline: none;
      border-color: #2271b1;
      box-shadow: 0 0 0 1px #2271b1;
    }
    .checkbox-group {
      border: 1px solid #8c8f94;
      border-radius: 3px;
      padding: 10px;
      max-height: 150px;
      overflow-y: auto;
    }
    .checkbox-group label {
      display: block;
      padding: 5px 0;
      font-weight: 400;
    }
    .checkbox-group input[type="checkbox"] {
      width: auto;
      margin-right: 8px;
    }
    /* EasyMDE Markdown Editor Customization */
    .EasyMDEContainer {
      margin-bottom: 15px;
    }
    .EasyMDEContainer .CodeMirror {
      border: 1px solid #8c8f94;
      border-radius: 3px;
      min-height: 300px;
      font-size: 14px;
    }
    .EasyMDEContainer .CodeMirror-focused {
      border-color: #2271b1;
      box-shadow: 0 0 0 1px #2271b1;
    }
    .EasyMDEContainer .editor-toolbar {
      border: 1px solid #8c8f94;
      border-bottom: none;
      border-radius: 3px 3px 0 0;
      background: #f9f9f9;
    }
    .EasyMDEContainer .editor-toolbar button {
      color: #2c3338 !important;
    }
    .EasyMDEContainer .editor-toolbar button:hover {
      background: #e0e0e0;
      border-color: #999;
    }
    .EasyMDEContainer .editor-toolbar.fullscreen {
      z-index: 10000;
    }
    .EasyMDEContainer .CodeMirror-fullscreen {
      z-index: 10000;
    }
    .success-message {
      background: #e7f5e7;
      border-left: 4px solid #00a32a;
      padding: 12px;
      margin-bottom: 20px;
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #646970;
    }

    /* Toast Notification Styles */
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .toast {
      min-width: 300px;
      max-width: 500px;
      padding: 16px 20px;
      background: #fff;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideIn 0.3s ease-out;
      border-left: 4px solid #0073aa;
    }
    .toast.success {
      border-left-color: #00a32a;
    }
    .toast.error {
      border-left-color: #d63638;
    }
    .toast.warning {
      border-left-color: #dba617;
    }
    .toast-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    .toast.success .toast-icon {
      color: #00a32a;
    }
    .toast.error .toast-icon {
      color: #d63638;
    }
    .toast.warning .toast-icon {
      color: #dba617;
    }
    .toast-message {
      flex: 1;
      color: #2c3338;
    }
    .toast-close {
      cursor: pointer;
      color: #646970;
      font-size: 18px;
      flex-shrink: 0;
      padding: 0 4px;
    }
    .toast-close:hover {
      color: #2c3338;
    }
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    .toast.removing {
      animation: slideOut 0.3s ease-out forwards;
    }

    /* Mobile Responsive Styles */
    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: -160px;
        transition: left 0.3s ease;
        z-index: 1000;
      }
      .sidebar.open {
        left: 0;
      }
      .main-content {
        margin-left: 0;
      }
      .top-bar {
        padding: 10px 15px;
        flex-wrap: wrap;
        gap: 10px;
      }
      .top-bar h1 {
        font-size: 18px;
        width: 100%;
        order: 2;
      }
      .user-info {
        width: 100%;
        justify-content: space-between;
        order: 1;
      }
      .content-area {
        padding: 15px;
      }
      .page-header {
        flex-direction: column;
        gap: 10px;
        align-items: flex-start;
      }
      .page-header .button {
        width: 100%;
        text-align: center;
      }
      .table-container {
        overflow-x: auto;
      }
      table {
        min-width: 600px;
      }
      .modal-content {
        width: 95%;
        max-width: none;
        max-height: 95vh;
        margin: 10px;
        padding: 20px;
      }
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .stat-card {
        padding: 15px;
      }
      .stat-card .number {
        font-size: 24px;
      }
      .welcome-panel {
        padding: 20px;
      }
      .welcome-panel h2 {
        font-size: 18px;
      }
      .form-group input,
      .form-group textarea,
      .form-group select {
        font-size: 16px;
      }
      .actions {
        flex-direction: column;
        gap: 5px;
      }
      .checkbox-group {
        max-height: 120px;
      }
      .login-form {
        margin: 20px;
        padding: 25px;
      }
      .login-form h1 {
        font-size: 24px;
      }
      #lang-switcher {
        padding: 4px;
        font-size: 12px;
      }
      .info {
        padding: 15px;
      }
      .info-item {
        flex-direction: column;
        gap: 5px;
      }
    }

    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
      .button-group {
        flex-direction: column;
      }
      .button-group .button {
        width: 100%;
      }
    }

    /* Mobile menu toggle button */
    .mobile-menu-toggle {
      display: none;
      background: #2271b1;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 18px;
    }
    @media (max-width: 768px) {
      .mobile-menu-toggle {
        display: block;
      }
    }

    /* Sidebar overlay for mobile */
    .sidebar-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 999;
    }
    .sidebar-overlay.show {
      display: block;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <div class="toast-container" id="toast-container"></div>

  <script>
    const API_BASE = '/wp-json/wp/v2';
    let currentUser = null;
    let authToken = localStorage.getItem('auth_token');
    let adminEmailCache = null;
    let adminEmailRequest = null;

    // i18n Language System
    const i18n = {
      currentLang: 'zh',

      t(key) {
        const lang = this.currentLang;
        const keys = key.split('.');
        let value = this.translations[lang];

        for (const k of keys) {
          if (value && typeof value === 'object') {
            value = value[k];
          } else {
            return key;
          }
        }

        return typeof value === 'string' ? value : key;
      },

      setLang(lang) {
        this.currentLang = lang;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('admin_lang', lang);
        }
      },

      initLang() {
        if (typeof localStorage !== 'undefined') {
          const savedLang = localStorage.getItem('admin_lang');
          if (savedLang === 'zh' || savedLang === 'en') {
            this.currentLang = savedLang;
          }
        }
      },

      translations: {
        zh: {
          nav: { dashboard: '仪表盘', posts: '文章', pages: '页面', moments: '动态', categories: '分类', tags: '标签', media: '媒体库', links: '链接', comments: '评论', import: '导入', users: '用户', settings: '设置', logout: '退出登录' },
          common: { add: '添加', edit: '编辑', delete: '删除', create: '创建', update: '更新', save: '保存', cancel: '取消', close: '关闭', view: '查看', upload: '上传', insert: '插入', search: '搜索', filter: '筛选', all: '全部', yes: '是', no: '否', actions: '操作', status: '状态', date: '日期', name: '名称', slug: '别名', description: '描述', count: '数量', required: '必填', optional: '可选' },
          posts: { title: '文章', allPosts: '所有文章', addNew: '添加文章', createNew: '创建新文章', editPost: '编辑文章', postTitle: '标题', content: '内容', excerpt: '摘要', featuredImage: '特色图片', sticky: '置顶', publishDate: '发布日期', categories: '分类', tags: '标签', author: '作者', noPostsYet: '还没有文章。创建你的第一篇文章！', createPost: '创建文章', updatePost: '更新文章', deleteConfirm: '确定要删除这篇文章吗？', addMedia: '添加媒体', selectFromLibrary: '从媒体库选择', autoGenerated: '留空自动生成', customDate: '可以自定义文章发布日期', createNewTag: '创建新标签', addNewTag: '添加新标签' },
          statusOptions: { draft: '草稿', publish: '发布', published: '已发布', private: '私密', pending: '待审核', approved: '已批准', spam: '垃圾', trash: '回收站', open: '开启', closed: '关闭' },
          categories: { title: '分类', allCategories: '所有分类', addNew: '添加分类', createNew: '创建新分类', editCategory: '编辑分类', categoryName: '分类名称', parentCategory: '父分类', none: '无', noCategories: '还没有分类。', createCategory: '创建分类', updateCategory: '更新分类', deleteConfirm: '确定要删除这个分类吗？' },
          tags: { title: '标签', allTags: '所有标签', addNew: '添加标签', createNew: '创建新标签', editTag: '编辑标签', tagName: '标签名称', noTags: '还没有标签。', createTag: '创建标签', updateTag: '更新标签', deleteConfirm: '确定要删除这个标签吗？' },
          media: { title: '媒体库', uploadFiles: '上传文件', uploadNew: '上传新媒体', selectFile: '选择文件', fileName: '文件名', fileType: '文件类型', fileSize: '文件大小', uploadedDate: '上传日期', altText: '替代文本', noMedia: '未找到媒体文件。', uploadMedia: '上传媒体' },
          users: { title: '用户', allUsers: '所有用户', addNew: '添加用户', createNew: '创建新用户', editUser: '编辑用户', username: '用户名', email: '邮箱', displayName: '显示名称', password: '密码', role: '角色', bio: '简介', registered: '注册时间', noUsers: '未找到用户。', createUser: '创建用户', updateUser: '更新用户', deleteConfirm: '确定要删除这个用户吗？' },
          roles: { administrator: '管理员', editor: '编辑', author: '作者', contributor: '贡献者', subscriber: '订阅者' },
          pages: { title: '页面', allPages: '所有页面', addNew: '添加页面', createNew: '创建新页面', editPage: '编辑页面', noPages: '还没有页面。', createPage: '创建页面', updatePage: '更新页面', deleteConfirm: '确定要删除这个页面吗？', commentStatus: '评论状态' },
          moments: { title: '动态', allMoments: '所有动态', addNew: '添加动态', createNew: '创建新动态', editMoment: '编辑动态', momentContent: '动态内容', mediaUrls: '媒体 URL', noMoments: '还没有动态。', createMoment: '创建动态', updateMoment: '更新动态', deleteConfirm: '确定要删除这条动态吗？', whatOnMind: '分享你的想法...' },
          comments: { title: '评论', allComments: '所有评论', author: '作者', comment: '评论', post: '文章', noComments: '未找到评论。', noEmail: '无邮箱', ownerBadge: '博主', approve: '批准', markAsSpam: '标记为垃圾', reply: '回复', replyTo: '回复评论', replyContent: '回复内容', sendReply: '发送回复', editComment: '编辑评论', deleteConfirm: '确定要删除这条评论吗？' },
          links: { title: '友情链接', allLinks: '所有链接', addNew: '添加链接', createNew: '创建新链接', editLink: '编辑链接', siteName: '网站名称', siteUrl: '网站地址', linkDescription: '链接描述', avatarUrl: '头像 URL', linkCategory: '链接分类', target: '打开方式', visible: '可见', sortOrder: '排序', noLinks: '还没有链接。', createLink: '创建链接', updateLink: '更新链接', deleteConfirm: '确定要删除这个链接吗？', manageCategories: '管理分类', lowerFirst: '数字越小排序越靠前' },
          import: {
            title: '内容导入',
            subtitle: '导入固定 JSON 格式的文章、页面和动态，适合从 Hugo / WordPress / Typecho 导出的数据包迁移。',
            fileLabel: '选择 JSON 文件',
            fileHint: '也可以直接把导出的 JSON 粘贴到下方文本框。',
            textareaLabel: '导入 JSON',
            formatHint: '固定格式：format=cfblog-import，version=1.x；文章/页面放在 content，动态放在 moments。',
            strategyLabel: '冲突策略',
            strategyUpdate: '更新同 slug 内容',
            strategySkip: '跳过已存在内容',
            strategyDuplicate: '保留原内容并复制一份',
            dryRun: '仅预检，不写入数据库',
            loadTemplate: '载入模板',
            runImport: '开始导入',
            resultTitle: '导入结果',
            sourceTitle: '导出源信息',
            issuesTitle: '问题列表',
            noIssues: '没有发现问题。',
            noResult: '导入结果会显示在这里。',
            invalidJson: 'JSON 格式不正确，请检查后重试。',
            importFailed: '导入失败：',
            completed: '导入完成！',
            templateLoaded: '模板已载入。',
            fileLoaded: '文件已载入。',
            summaryCreated: '新增',
            summaryUpdated: '更新',
            summarySkipped: '跳过',
            summaryFailed: '失败',
            summaryCategories: '分类',
            summaryTags: '标签',
            dryRunBadge: '预检模式',
            sourceUnknown: '未提供'
          },
          settings: {
            title: '网站设置',
            language: '界面语言',
            languageHint: '选择后台管理界面的显示语言',
            siteTitle: '网站标题',
            siteTitleHint: '将显示在浏览器标题栏和站点页头中。',
            siteUrl: '网站地址',
            siteUrlHint: '填写站点完整 URL，不要包含末尾斜杠。它也会作为 WordPress API 的 home URL。',
            adminEmail: '管理员邮箱',
            adminEmailHint: '该邮箱将用于接收后台通知。',
            emailNotifications: '邮件通知',
            fromName: '发件人名称',
            fromNameHint: '通知邮件中显示的发件人名称。',
            fromEmail: '发件邮箱',
            fromEmailHint: '请填写已在 Resend 中验证域名下的发件地址。',
            enableMailNotifications: '启用邮件通知',
            enableMailNotificationsHint: '需要先在 Worker 中配置 <code>RESEND_API_KEY</code> Secret。',
            notifyAdminOnComment: '有新评论时通知管理员',
            notifyCommenterOnReply: '有人回复评论时通知原评论者',
            siteDescription: '网站描述',
            siteDescriptionHint: '用于 SEO 描述信息。',
            siteKeywords: '网站关键词',
            siteKeywordsHint: '使用逗号分隔多个关键词，用于 SEO。',
            siteAuthor: '网站作者',
            siteFavicon: '网站图标',
            siteFaviconHint: '网站 favicon 地址，推荐 32x32。',
            siteLogo: '网站 Logo',
            siteLogoHint: '网站 Logo 图片地址。',
            siteNotice: '网站公告',
            siteNoticeHint: '显示在前台侧边栏公告卡片中，支持多行文本。',
            siteNoticePlaceholder: '每行一段公告内容',
            siteIcp: 'ICP备案号',
            siteIcpHint: '仅中国大陆站点需要填写。',
            siteIcpPlaceholder: '京ICP备xxxxx号',
            footerText: '页脚文本',
            footerTextHint: '显示在每个页面底部，支持 HTML。',
            headHtml: '自定义 Head HTML',
            headHtmlHint: '将插入到站点 <head> 中，可用于分析脚本、自定义 CSS 或 meta 标签。',
            socialContacts: '社交联系方式',
            email: '邮箱',
            socialTelegramPlaceholder: '@username 或 https://t.me/username',
            socialXPlaceholder: '@username 或 https://x.com/username',
            socialMastodonPlaceholder: '完整主页地址',
            socialQqPlaceholder: 'QQ号码',
            webhookSection: 'Webhook 设置',
            webhookUrl: 'Webhook 地址',
            webhookUrlHint: 'Webhook 事件推送地址，留空则关闭 Webhook。',
            webhookSecret: 'Webhook 密钥',
            webhookSecretHint: '用于 HMAC-SHA256 签名，签名会通过 <code>X-Webhook-Signature</code> 请求头发送。',
            webhookSecretPlaceholder: '请输入密钥',
            webhookEvents: 'Webhook 事件',
            webhookEventsSelect: '选择要触发 Webhook 的事件：',
            webhookEventPostCreated: '文章创建为草稿',
            webhookEventPostUpdated: '文章更新',
            webhookEventPostPublished: '文章发布',
            webhookEventPostDeleted: '文章删除',
            webhookEventCommentCreated: '评论创建',
            webhookEventCommentUpdated: '评论更新',
            webhookEventCommentDeleted: '评论删除',
            webhookEventsHint: '选择哪些事件会触发 Webhook。全部不勾选则不发送。',
            webhookRecommended: '部署推荐：',
            webhookTipsTitle: 'Webhook 提示：',
            webhookTipDeploy: '对于 Vercel/Cloudflare Pages 部署：建议只勾选 post.published 和 post.updated，避免不必要的构建。',
            webhookTipPublish: '创建并发布文章：只会触发 post.published，避免重复。',
            webhookTipDraft: '保存草稿：触发 post.created。',
            webhookTipDraftToPublish: '草稿发布：触发 post.published。',
            webhookTipUpdatePublished: '更新已发布文章：触发 post.updated。',
            saveSettings: '保存设置',
            settingsSaved: '设置已保存！',
            saveFailed: '保存设置失败：',
            loadFailed: '加载设置失败。'
          },
          dashboard: { welcome: '欢迎来到', subtitle: '基于 Cloudflare Workers、D1 和 R2 的 WordPress 风格无头博客', stats: { posts: '文章', pages: '页面', comments: '评论', categories: '分类', tags: '标签', media: '媒体', links: '链接', users: '用户', moments: '动态' } },
          messages: { loading: '加载中...', saving: '保存中...', saved: '已保存', created: '创建成功！', updated: '更新成功！', deleted: '删除成功！', uploaded: '上传成功！', failed: '操作失败', error: '发生错误', confirm: '确认', cancel: '取消' }
        },
        en: {
          nav: { dashboard: 'Dashboard', posts: 'Posts', pages: 'Pages', moments: 'Moments', categories: 'Categories', tags: 'Tags', media: 'Media', links: 'Links', comments: 'Comments', import: 'Import', users: 'Users', settings: 'Settings', logout: 'Logout' },
          common: { add: 'Add', edit: 'Edit', delete: 'Delete', create: 'Create', update: 'Update', save: 'Save', cancel: 'Cancel', close: 'Close', view: 'View', upload: 'Upload', insert: 'Insert', search: 'Search', filter: 'Filter', all: 'All', yes: 'Yes', no: 'No', actions: 'Actions', status: 'Status', date: 'Date', name: 'Name', slug: 'Slug', description: 'Description', count: 'Count', required: 'Required', optional: 'Optional' },
          posts: { title: 'Posts', allPosts: 'All Posts', addNew: 'Add New', createNew: 'Create New Post', editPost: 'Edit Post', postTitle: 'Title', content: 'Content', excerpt: 'Excerpt', featuredImage: 'Featured Image', sticky: 'Sticky', publishDate: 'Publish Date', categories: 'Categories', tags: 'Tags', author: 'Author', noPostsYet: 'No posts yet. Create your first post!', createPost: 'Create Post', updatePost: 'Update Post', deleteConfirm: 'Are you sure you want to delete this post?', addMedia: 'Add Media', selectFromLibrary: 'Select from Library', autoGenerated: 'Leave empty for auto-generation', customDate: 'Custom publish date', createNewTag: 'Create new tag', addNewTag: 'Add New Tag' },
          statusOptions: { draft: 'Draft', publish: 'Publish', published: 'Published', private: 'Private', pending: 'Pending', approved: 'Approved', spam: 'Spam', trash: 'Trash', open: 'Open', closed: 'Closed' },
          categories: { title: 'Categories', allCategories: 'All Categories', addNew: 'Add New', createNew: 'Create New Category', editCategory: 'Edit Category', categoryName: 'Category Name', parentCategory: 'Parent Category', none: 'None', noCategories: 'No categories yet.', createCategory: 'Create Category', updateCategory: 'Update Category', deleteConfirm: 'Are you sure you want to delete this category?' },
          tags: { title: 'Tags', allTags: 'All Tags', addNew: 'Add New', createNew: 'Create New Tag', editTag: 'Edit Tag', tagName: 'Tag Name', noTags: 'No tags yet.', createTag: 'Create Tag', updateTag: 'Update Tag', deleteConfirm: 'Are you sure you want to delete this tag?' },
          media: { title: 'Media Library', uploadFiles: 'Upload Files', uploadNew: 'Upload New Media', selectFile: 'Select File', fileName: 'File Name', fileType: 'File Type', fileSize: 'File Size', uploadedDate: 'Uploaded Date', altText: 'Alt Text', noMedia: 'No media found.', uploadMedia: 'Upload Media' },
          users: { title: 'Users', allUsers: 'All Users', addNew: 'Add New', createNew: 'Create New User', editUser: 'Edit User', username: 'Username', email: 'Email', displayName: 'Display Name', password: 'Password', role: 'Role', bio: 'Bio', registered: 'Registered', noUsers: 'No users found.', createUser: 'Create User', updateUser: 'Update User', deleteConfirm: 'Are you sure you want to delete this user?' },
          roles: { administrator: 'Administrator', editor: 'Editor', author: 'Author', contributor: 'Contributor', subscriber: 'Subscriber' },
          pages: { title: 'Pages', allPages: 'All Pages', addNew: 'Add New', createNew: 'Create New Page', editPage: 'Edit Page', noPages: 'No pages yet.', createPage: 'Create Page', updatePage: 'Update Page', deleteConfirm: 'Are you sure you want to delete this page?', commentStatus: 'Comment Status' },
          moments: { title: 'Moments', allMoments: 'All Moments', addNew: 'Add New', createNew: 'Create New Moment', editMoment: 'Edit Moment', momentContent: 'Moment Content', mediaUrls: 'Media URLs', noMoments: 'No moments yet.', createMoment: 'Create Moment', updateMoment: 'Update Moment', deleteConfirm: 'Are you sure you want to delete this moment?', whatOnMind: "What's on your mind?" },
          comments: { title: 'Comments', allComments: 'All Comments', author: 'Author', comment: 'Comment', post: 'Post', noComments: 'No comments found.', noEmail: 'No email', ownerBadge: 'Author', approve: 'Approve', markAsSpam: 'Mark as Spam', reply: 'Reply', replyTo: 'Reply to Comment', replyContent: 'Reply Content', sendReply: 'Send Reply', editComment: 'Edit Comment', deleteConfirm: 'Are you sure you want to delete this comment?' },
          links: { title: 'Links', allLinks: 'All Links', addNew: 'Add New', createNew: 'Create New Link', editLink: 'Edit Link', siteName: 'Site Name', siteUrl: 'Site URL', linkDescription: 'Link Description', avatarUrl: 'Avatar URL', linkCategory: 'Link Category', target: 'Target', visible: 'Visible', sortOrder: 'Sort Order', noLinks: 'No links yet.', createLink: 'Create Link', updateLink: 'Update Link', deleteConfirm: 'Are you sure you want to delete this link?', manageCategories: 'Manage Categories', lowerFirst: 'Lower numbers appear first' },
          import: {
            title: 'Content Import',
            subtitle: 'Import posts, pages, and moments from a fixed JSON package. Useful for Hugo / WordPress / Typecho migrations.',
            fileLabel: 'Choose JSON file',
            fileHint: 'You can also paste the exported JSON into the textarea below.',
            textareaLabel: 'Import JSON',
            formatHint: 'Expected format: format=cfblog-import, version=1.x, with posts/pages in content and short-form entries in moments.',
            strategyLabel: 'Conflict strategy',
            strategyUpdate: 'Update existing item by slug',
            strategySkip: 'Skip existing item',
            strategyDuplicate: 'Keep existing item and create a copy',
            dryRun: 'Dry run only, do not write to database',
            loadTemplate: 'Load Template',
            runImport: 'Run Import',
            resultTitle: 'Import Result',
            sourceTitle: 'Source Metadata',
            issuesTitle: 'Issues',
            noIssues: 'No issues found.',
            noResult: 'Import results will appear here.',
            invalidJson: 'Invalid JSON. Please fix it and try again.',
            importFailed: 'Import failed: ',
            completed: 'Import completed!',
            templateLoaded: 'Template loaded.',
            fileLoaded: 'File loaded.',
            summaryCreated: 'Created',
            summaryUpdated: 'Updated',
            summarySkipped: 'Skipped',
            summaryFailed: 'Failed',
            summaryCategories: 'Categories',
            summaryTags: 'Tags',
            dryRunBadge: 'Dry run',
            sourceUnknown: 'Not provided'
          },
          settings: {
            title: 'Site Settings',
            language: 'Interface Language',
            languageHint: 'Choose the display language for admin interface',
            siteTitle: 'Site Title',
            siteTitleHint: 'This will be displayed in the browser title bar and site header.',
            siteUrl: 'Site URL',
            siteUrlHint: 'Enter the full site URL without a trailing slash. It is also used as the home URL in the WordPress API.',
            adminEmail: 'Admin Email',
            adminEmailHint: 'This email will be used for administrative notifications.',
            emailNotifications: 'Email Notifications',
            fromName: 'From Name',
            fromNameHint: 'The sender name shown in notification emails.',
            fromEmail: 'From Email',
            fromEmailHint: 'Use a sender address from a domain that has already been verified in Resend.',
            enableMailNotifications: 'Enable email notifications',
            enableMailNotificationsHint: 'Requires the <code>RESEND_API_KEY</code> Worker secret to be configured.',
            notifyAdminOnComment: 'Notify admin when a new comment is submitted',
            notifyCommenterOnReply: 'Notify the original commenter when someone replies',
            siteDescription: 'Site Description',
            siteDescriptionHint: 'Used for the SEO meta description.',
            siteKeywords: 'Site Keywords',
            siteKeywordsHint: 'Comma-separated keywords for SEO.',
            siteAuthor: 'Site Author',
            siteFavicon: 'Site Favicon',
            siteFaviconHint: 'URL to your site favicon. Recommended: 32x32.',
            siteLogo: 'Site Logo',
            siteLogoHint: 'URL to your site logo image.',
            siteNotice: 'Site Notice',
            siteNoticeHint: 'Displayed in the public site notice card and supports multiple lines.',
            siteNoticePlaceholder: 'One notice per line',
            siteIcp: 'ICP Number',
            siteIcpHint: 'Only needed for websites in mainland China.',
            siteIcpPlaceholder: 'ICP filing number',
            footerText: 'Footer Text',
            footerTextHint: 'Displayed at the bottom of every page. HTML is supported.',
            headHtml: 'Custom Head HTML',
            headHtmlHint: 'Inserted into the site <head>. Useful for analytics, custom CSS, or meta tags.',
            socialContacts: 'Social Contacts',
            email: 'Email',
            socialTelegramPlaceholder: '@username or https://t.me/username',
            socialXPlaceholder: '@username or https://x.com/username',
            socialMastodonPlaceholder: 'Full profile URL',
            socialQqPlaceholder: 'QQ number',
            webhookSection: 'Webhook Settings',
            webhookUrl: 'Webhook URL',
            webhookUrlHint: 'Webhook delivery URL. Leave empty to disable webhooks.',
            webhookSecret: 'Webhook Secret',
            webhookSecretHint: 'Used to sign payloads with HMAC-SHA256. The signature is sent in the <code>X-Webhook-Signature</code> header.',
            webhookSecretPlaceholder: 'Enter a secret key',
            webhookEvents: 'Webhook Events',
            webhookEventsSelect: 'Select events to trigger webhook:',
            webhookEventPostCreated: 'Post saved as draft',
            webhookEventPostUpdated: 'Post updated',
            webhookEventPostPublished: 'Post published',
            webhookEventPostDeleted: 'Post deleted',
            webhookEventCommentCreated: 'Comment created',
            webhookEventCommentUpdated: 'Comment updated',
            webhookEventCommentDeleted: 'Comment deleted',
            webhookEventsHint: 'Choose which events should trigger the webhook. Leave all unchecked to disable webhooks.',
            webhookRecommended: 'Recommended for deployment:',
            webhookTipsTitle: 'Webhook Tips:',
            webhookTipDeploy: 'For Vercel/Cloudflare Pages deployment, only select post.published and post.updated to avoid unnecessary builds.',
            webhookTipPublish: 'Creating and publishing a post only triggers post.published, which avoids duplicates.',
            webhookTipDraft: 'Saving as draft triggers post.created.',
            webhookTipDraftToPublish: 'Publishing a draft triggers post.published.',
            webhookTipUpdatePublished: 'Updating a published post triggers post.updated.',
            saveSettings: 'Save Settings',
            settingsSaved: 'Settings saved!',
            saveFailed: 'Failed to save settings:',
            loadFailed: 'Failed to load settings.'
          },
          dashboard: { welcome: 'Welcome to', subtitle: 'Your WordPress-like headless blog powered by Cloudflare Workers, D1, and R2', stats: { posts: 'Posts', pages: 'Pages', comments: 'Comments', categories: 'Categories', tags: 'Tags', media: 'Media', links: 'Links', users: 'Users', moments: 'Moments' } },
          messages: { loading: 'Loading...', saving: 'Saving...', saved: 'Saved', created: 'Created successfully!', updated: 'Updated successfully!', deleted: 'Deleted successfully!', uploaded: 'Uploaded successfully!', failed: 'Operation failed', error: 'An error occurred', confirm: 'Confirm', cancel: 'Cancel' }
        }
      }
    };

    // Initialize language on load
    i18n.initLang();

    // Helper function to translate status values
    function translateStatus(status) {
      const statusMap = {
        'draft': 'statusOptions.draft',
        'publish': 'statusOptions.publish',
        'published': 'statusOptions.published',
        'private': 'statusOptions.private',
        'pending': 'statusOptions.pending',
        'approved': 'statusOptions.approved',
        'spam': 'statusOptions.spam',
        'trash': 'statusOptions.trash',
        'open': 'statusOptions.open',
        'closed': 'statusOptions.closed'
      };
      return i18n.t(statusMap[status] || status);
    }

    function escapeHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function normalizeEmail(value) {
      return String(value ?? '').trim().toLowerCase();
    }

    async function getAdminEmail(forceRefresh = false) {
      if (forceRefresh) {
        adminEmailCache = null;
        adminEmailRequest = null;
      }

      if (adminEmailCache !== null) {
        return adminEmailCache;
      }

      if (adminEmailRequest) {
        return adminEmailRequest;
      }

      const token = localStorage.getItem('auth_token') || authToken || '';
      adminEmailRequest = fetch(API_BASE + '/settings/admin', {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })
        .then(async response => {
          if (!response.ok) {
            return '';
          }

          const settings = await response.json();
          adminEmailCache = normalizeEmail(settings.admin_email);
          return adminEmailCache;
        })
        .catch(() => '')
        .finally(() => {
          adminEmailRequest = null;
        });

      return adminEmailRequest;
    }

    function renderOwnerBadge(isOwner) {
      if (!isOwner) {
        return '';
      }

      return \`<span style="display: inline-flex; align-items: center; justify-content: center; padding: 2px 8px; border-radius: 999px; background: rgba(34, 113, 177, 0.12); border: 1px solid rgba(34, 113, 177, 0.22); color: #2271b1; font-size: 12px; font-weight: 600; line-height: 1.4;">\${escapeHtml(i18n.t('comments.ownerBadge'))}</span>\`;
    }

    function renderCommentAuthorMeta(name, email, adminEmail) {
      const safeName = escapeHtml(name || '匿名访客');
      const safeEmail = escapeHtml(email || i18n.t('comments.noEmail'));
      const isOwner = !!adminEmail && normalizeEmail(email) === adminEmail;

      return \`
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 2px;">
          <strong>\${safeName}</strong>
          \${renderOwnerBadge(isOwner)}
        </div>
        <small style="color: #646970;">\${safeEmail}</small>
      \`;
    }

    // Helper function to translate role values
    function translateRole(role) {
      const roleMap = {
        'administrator': 'roles.administrator',
        'editor': 'roles.editor',
        'author': 'roles.author',
        'contributor': 'roles.contributor',
        'subscriber': 'roles.subscriber'
      };
      return i18n.t(roleMap[role] || role);
    }

    // Toast notification system
    function showToast(message, type = 'info', duration = 3000) {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = \`toast \${type}\`;

      const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
      };

      toast.innerHTML = \`
        <span class="toast-icon">\${icons[type] || icons.info}</span>
        <span class="toast-message">\${message}</span>
        <span class="toast-close" onclick="this.parentElement.remove()">×</span>
      \`;

      container.appendChild(toast);

      // Auto remove after duration
      if (duration > 0) {
        setTimeout(() => {
          toast.classList.add('removing');
          setTimeout(() => {
            if (toast.parentElement) {
              toast.remove();
            }
          }, 300);
        }, duration);
      }
    }

    // Convenience methods
    window.showSuccess = (message, duration) => showToast(message, 'success', duration);
    window.showError = (message, duration) => showToast(message, 'error', duration);
    window.showWarning = (message, duration) => showToast(message, 'warning', duration);
    window.showInfo = (message, duration) => showToast(message, 'info', duration);

    // Router
    const routes = {
      '/': showDashboard,
      '/posts': showPosts,
      '/pages': showPages,
      '/moments': showMoments,
      '/categories': show分类,
      '/tags': show标签,
      '/media': showMedia,
      '/users': showUsers,
      '/links': showLinks,
      '/comments': showComments,
      '/import': showImportTools,
      '/settings': showSettings,
    };

    function navigate(path) {
      const route = routes[path] || routes['/'];
      route();

      // Update active menu item
      document.querySelectorAll('.sidebar-menu a').forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('data-route') === path) {
          a.classList.add('active');
        }
      });
    }

    // Auth check
    async function checkAuth() {
      if (!authToken) {
        showLogin();
        return false;
      }

      try {
        const response = await fetch(API_BASE + '/users/me', {
          headers: {
            'Authorization': 'Bearer ' + authToken
          }
        });

        if (response.ok) {
          currentUser = await response.json();
          return true;
        } else {
          localStorage.removeItem('auth_token');
          authToken = null;
          showLogin();
          return false;
        }
      } catch (error) {
        showLogin();
        return false;
      }
    }

    // Login/Register
    async function showLogin() {
      // Check if any users exist (single-user mode)
      let hasUsers = false;
      try {
        const response = await fetch(API_BASE + '/users?per_page=1');
        const users = await response.json();
        hasUsers = users.length > 0;
      } catch (error) {
        console.error('Failed to check users:', error);
      }

      document.getElementById('app').innerHTML = \`
        <div class="login-form">
          <h1>${c.env.SITE_NAME || 'CFBlog'}</h1>
          <div id="form-error" class="error-message 隐藏"></div>

          <!-- Login Form -->
          <form id="login-form">
            <div class="form-group">
              <label for="login-username">Username or Email</label>
              <input type="text" id="login-username" name="username" required>
            </div>
            <div class="form-group">
              <label for="login-password">Password</label>
              <input type="password" id="login-password" name="password" required>
            </div>
            <button type="submit" class="button" style="width: 100%;">Log In</button>
          </form>

          \${!hasUsers ? \`
            <div style="text-align: center; margin: 20px 0; color: #646970;">
              — or —
            </div>

            <!-- Register Form -->
            <form id="register-form">
              <div class="form-group">
                <label for="reg-username">Username</label>
                <input type="text" id="reg-username" name="username" required>
              </div>
              <div class="form-group">
                <label for="reg-email">Email</label>
                <input type="email" id="reg-email" name="email" required>
              </div>
              <div class="form-group">
                <label for="reg-password">Password</label>
                <input type="password" id="reg-password" name="password" required minlength="6">
              </div>
              <div class="form-group">
                <label for="reg-display-name">Display Name (optional)</label>
                <input type="text" id="reg-display-name" name="display_name">
              </div>
              <button type="submit" class="button button-secondary" style="width: 100%;">Create Account</button>
            </form>

            <div style="margin-top: 20px; padding: 15px; background: #e7f5fe; border-left: 4px solid #2271b1; font-size: 13px;">
              <strong>First time here?</strong><br>
              The first account will automatically become the administrator.
            </div>
          \` : ''}
        </div>
      \`;

      // Login handler
      document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
          const response = await fetch(API_BASE + '/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          if (response.ok) {
            const data = await response.json();
            authToken = data.token;
            localStorage.setItem('auth_token', authToken);
            currentUser = data.user;
            init();
          } else {
            const error = await response.json();
            document.getElementById('form-error').textContent = error.message;
            document.getElementById('form-error').classList.remove('隐藏');
          }
        } catch (error) {
          document.getElementById('form-error').textContent = 'Login failed. Please try again.';
          document.getElementById('form-error').classList.remove('隐藏');
        }
      });

      // Register handler (only if register form exists)
      const registerForm = document.getElementById('register-form');
      if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const username = document.getElementById('reg-username').value;
          const email = document.getElementById('reg-email').value;
          const password = document.getElementById('reg-password').value;
          const display_name = document.getElementById('reg-display-name').value;

          try {
            const response = await fetch(API_BASE + '/users/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, email, password, display_name })
            });

            if (response.ok) {
              const data = await response.json();
              authToken = data.token;
              localStorage.setItem('auth_token', authToken);
              currentUser = data.user;
              init();
            } else {
              const error = await response.json();
              document.getElementById('form-error').textContent = error.message;
              document.getElementById('form-error').classList.remove('隐藏');
            }
          } catch (error) {
            document.getElementById('form-error').textContent = 'Registration failed. Please try again.';
            document.getElementById('form-error').classList.remove('隐藏');
          }
        });
      }
    }

    // Dashboard
    async function showDashboard() {
      const app = document.getElementById('app');
      renderLayout(i18n.t('nav.dashboard'));

      const content = document.querySelector('.content-area');
      content.innerHTML = \`
        <div class="welcome-panel">
          <h2>\${i18n.t('dashboard.welcome')} ${c.env.SITE_NAME || 'CFBlog'}!</h2>
          <p>\${i18n.t('dashboard.subtitle')}</p>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>\${i18n.t('dashboard.stats.posts')}</h3>
            <div class="number" id="posts-count">-</div>
          </div>
          <div class="stat-card">
            <h3>\${i18n.t('dashboard.stats.pages')}</h3>
            <div class="number" id="pages-count">-</div>
          </div>
          <div class="stat-card">
            <h3>\${i18n.t('dashboard.stats.comments')}</h3>
            <div class="number" id="comments-count">-</div>
          </div>
          <div class="stat-card">
            <h3>\${i18n.t('dashboard.stats.categories')}</h3>
            <div class="number" id="categories-count">-</div>
          </div>
          <div class="stat-card">
            <h3>\${i18n.t('dashboard.stats.tags')}</h3>
            <div class="number" id="tags-count">-</div>
          </div>
          <div class="stat-card">
            <h3>\${i18n.t('dashboard.stats.media')}</h3>
            <div class="number" id="media-count">-</div>
          </div>
          <div class="stat-card">
            <h3>\${i18n.t('dashboard.stats.links')}</h3>
            <div class="number" id="links-count">-</div>
          </div>
          <div class="stat-card">
            <h3>\${i18n.t('dashboard.stats.users')}</h3>
            <div class="number" id="users-count">-</div>
          </div>
          <div class="stat-card">
            <h3>\${i18n.t('dashboard.stats.moments')}</h3>
            <div class="number" id="moments-count">-</div>
          </div>
        </div>
      \`;

      // Load stats
      loadStats();
    }

    async function loadStats() {
      try {
        const [posts, pages, comments, categories, tags, media, links, users, moments] = await Promise.all([
          fetch(API_BASE + '/posts?per_page=1', { headers: { 'Authorization': 'Bearer ' + authToken } }),
          fetch(API_BASE + '/pages?per_page=1', { headers: { 'Authorization': 'Bearer ' + authToken } }),
          fetch(API_BASE + '/comments?per_page=1', { headers: { 'Authorization': 'Bearer ' + authToken } }),
          fetch(API_BASE + '/categories?per_page=1', { headers: { 'Authorization': 'Bearer ' + authToken } }),
          fetch(API_BASE + '/tags?per_page=1', { headers: { 'Authorization': 'Bearer ' + authToken } }),
          fetch(API_BASE + '/media?per_page=1', { headers: { 'Authorization': 'Bearer ' + authToken } }),
          fetch(API_BASE + '/links?per_page=1', { headers: { 'Authorization': 'Bearer ' + authToken } }),
          fetch(API_BASE + '/users?per_page=1', { headers: { 'Authorization': 'Bearer ' + authToken } }),
          fetch(API_BASE + '/moments?per_page=1', { headers: { 'Authorization': 'Bearer ' + authToken } })
        ]);

        document.getElementById('posts-count').textContent = posts.headers.get('X-WP-Total') || '0';
        document.getElementById('pages-count').textContent = pages.headers.get('X-WP-Total') || '0';
        document.getElementById('comments-count').textContent = comments.headers.get('X-WP-Total') || '0';
        document.getElementById('categories-count').textContent = categories.headers.get('X-WP-Total') || '0';
        document.getElementById('tags-count').textContent = tags.headers.get('X-WP-Total') || '0';
        document.getElementById('media-count').textContent = media.headers.get('X-WP-Total') || '0';
        document.getElementById('links-count').textContent = links.headers.get('X-WP-Total') || '0';
        document.getElementById('users-count').textContent = users.headers.get('X-WP-Total') || '0';
        document.getElementById('moments-count').textContent = moments.headers.get('X-WP-Total') || '0';
      } catch (error) {
        console.error('加载失败 stats:', error);
      }
    }

    // Posts Management
    async function showPosts() {
      renderLayout(i18n.t('nav.posts'));
      const content = document.querySelector('.content-area');

      content.innerHTML = \`
        <div class="page-header">
          <h2>\${i18n.t('posts.allPosts')}</h2>
          <button class="button" onclick="showCreatePostModal()">\${i18n.t('posts.addNew')}</button>
        </div>
        <div id="posts-list"></div>
      \`;

      await loadPosts();
    }

    async function loadPosts() {
      try {
        const response = await fetch(API_BASE + '/posts?per_page=50', {
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const posts = await response.json();

        const container = document.getElementById('posts-list');
        if (posts.length === 0) {
          container.innerHTML = \`<div class="empty-state">\${i18n.t('posts.noPostsYet')}</div>\`;
          return;
        }

        container.innerHTML = \`
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>\${i18n.t('posts.postTitle')}</th>
                  <th>\${i18n.t('common.status')}</th>
                  <th>\${i18n.t('common.date')}</th>
                  <th>\${i18n.t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                \${posts.map(post => \`
                  <tr>
                    <td><strong>\${post.sticky ? '📌 ' : ''}\${post.title.rendered}</strong></td>
                    <td>\${translateStatus(post.status)}</td>
                    <td>\${new Date(post.date).toLocaleDateString()}</td>
                    <td class="actions">
                      <a href="#" class="action-link" onclick="editPost(\${post.id}); return false;">\${i18n.t('common.edit')}</a>
                      <a href="#" class="action-link delete" onclick="deletePost(\${post.id}); return false;">\${i18n.t('common.delete')}</a>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 posts:', error);
      }
    }

    window.showCreatePostModal = async function() {
      const categories = await fetch分类();
      const tags = await fetch标签();

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>创建新文章</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="create-post-form">
            <div class="form-group">
              <label>标题 *</label>
              <input type="text" name="title" required>
            </div>
            <div class="form-group">
              <label>别名 (URL) <small style="color: #646970;">(留空自动生成)</small></label>
              <input type="text" name="slug" placeholder="auto-generated-from-title">
            </div>
            <div class="form-group">
              <label>内容</label>
              <div style="margin-bottom: 10px;">
                <button type="button" class="button button-secondary" onclick="openMediaLibrary('create')">添加媒体</button>
              </div>
              <textarea id="post-content" name="content"></textarea>
            </div>
            <div class="form-group">
              <label>摘要</label>
              <textarea name="excerpt" style="min-height: 100px;"></textarea>
            </div>
            <div class="form-group">
              <label>特色图片 URL</label>
              <input type="url" id="featured-image-url-input" name="featured_image_url" placeholder="https://example.com/image.jpg">
              <div style="display: flex; gap: 10px; margin-top: 5px;">
                <button type="button" class="button button-secondary" onclick="openFeaturedImageLibrary('create')">从媒体库选择</button>
              </div>
              <small style="color: #646970; display: block; margin-top: 5px;">直接输入图片URL地址或从媒体库选择</small>
            </div>
            <div class="form-group">
              <label>状态</label>
              <select name="status">
                <option value="draft">草稿</option>
                <option value="publish" selected>发布</option>
                <option value="private">私密</option>
              </select>
            </div>
            <div class="form-group">
              <label>置顶</label>
              <select name="sticky">
                <option value="false" selected>否</option>
                <option value="true">是</option>
              </select>
              <small style="color: #646970; display: block; margin-top: 5px;">设置为"是"后文章将显示在列表顶部</small>
            </div>
            <div class="form-group">
              <label>发布日期 <small style="color: #646970;">(留空使用当前时间)</small></label>
              <input type="datetime-local" name="date" placeholder="自动使用当前时间">
              <small style="color: #646970; display: block; margin-top: 5px;">可以自定义文章发布日期</small>
            </div>
            <div class="form-group">
              <label>分类</label>
              <div class="checkbox-group">
                \${categories.map(cat => \`
                  <label>
                    <input type="checkbox" name="categories" value="\${cat.id}">
                    \${cat.name}
                  </label>
                \`).join('')}
              </div>
            </div>
            <div class="form-group">
              <label>标签</label>
              <div class="checkbox-group" id="tags-checkbox-group">
                \${tags.map(tag => \`
                  <label>
                    <input type="checkbox" name="tags" value="\${tag.id}">
                    \${tag.name}
                  </label>
                \`).join('')}
              </div>
              <div style="margin-top: 10px; display: flex; gap: 5px;">
                <input type="text" id="new-tag-name" placeholder="创建新标签" style="flex: 1; padding: 5px;">
                <button type="button" class="button button-secondary" onclick="createAndAddTag('create')">添加新标签</button>
              </div>
            </div>
            <button type="submit" class="button" style="width: 100%;">创建文章</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      // Initialize EasyMDE for content editor
      const contentEditor = new EasyMDE({
        element: document.getElementById('post-content'),
        spellChecker: false,
        placeholder: '在此输入文章内容... 支持 Markdown 语法',
        toolbar: [
          'bold', 'italic', 'heading', '|',
          'quote', 'unordered-list', 'ordered-list', '|',
          'link', 'image', '|',
          'preview', 'side-by-side', 'fullscreen', '|',
          'guide'
        ],
        status: ['lines', 'words', 'cursor'],
        minHeight: '300px',
        maxHeight: '600px'
      });

      // Custom media button handler
      window.currentEditor = contentEditor;

      // Function to create and add new tag
      window.createAndAddTag = async function(mode) {
        const inputId = mode === 'edit' ? 'edit-new-tag-name' : 'new-tag-name';
        const checkboxGroupId = mode === 'edit' ? 'tags-edit-checkbox-group' : 'tags-checkbox-group';

        const tagNameInput = document.getElementById(inputId);
        const tagName = tagNameInput.value.trim();

        if (!tagName) {
          showWarning('请输入标签名称');
          return;
        }

        try {
          const response = await fetch(API_BASE + '/tags', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: tagName })
          });

          if (response.ok) {
            const newTag = await response.json();

            // Add checkbox to the list
            const checkboxGroup = document.getElementById(checkboxGroupId);
            const newLabel = document.createElement('label');
            newLabel.innerHTML = \`
              <input type="checkbox" name="tags" value="\${newTag.id}" checked>
              \${newTag.name}
            \`;
            checkboxGroup.appendChild(newLabel);

            // Clear input
            tagNameInput.value = '';

            showSuccess('标签创建成功！');
          } else {
            const error = await response.json();
            showError('创建标签失败: ' + error.message);
          }
        } catch (error) {
          console.error('创建失败 tag:', error);
          showError('创建标签失败');
        }
      };

      document.getElementById('create-post-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const categories = Array.from(formData.getAll('categories')).map(Number);
        const tags = Array.from(formData.getAll('tags')).map(Number);

        try {
          const postData = {
            title: formData.get('title'),
            content: contentEditor.value(), // Get content from EasyMDE
            excerpt: formData.get('excerpt'),
            status: formData.get('status'),
            sticky: formData.get('sticky') === 'true',
            categories: categories.length > 0 ? categories : [1],
            tags: tags
          };

          // Only include slug if it's not empty
          const slug = formData.get('slug');
          if (slug && slug.trim()) {
            postData.slug = slug.trim();
          }

          // Include featured_image_url if provided
          const featuredImageUrl = formData.get('featured_image_url');
          if (featuredImageUrl && featuredImageUrl.trim()) {
            postData.featured_image_url = featuredImageUrl.trim();
          }

          // Include custom date if provided
          const customDate = formData.get('date');
          if (customDate) {
            postData.date = new Date(customDate).toISOString();
          }

          const response = await fetch(API_BASE + '/posts', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
          });

          if (response.ok) {
            modal.remove();
            await loadPosts();
            showSuccess('文章创建成功！');
          } else {
            const error = await response.json();
            showError('创建文章失败: ' + (error.message || 'Unknown error'));
          }
        } catch (error) {
          console.error('创建失败 post:', error);
          showError('创建文章失败: ' + error.message);
        }
      });
    };

    window.editPost = async function(id) {
      const post = await fetch(API_BASE + '/posts/' + id, {
        headers: { 'Authorization': 'Bearer ' + authToken }
      }).then(r => r.json());

      const categories = await fetch分类();
      const tags = await fetch标签();

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>编辑文章</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="edit-post-form">
            <div class="form-group">
              <label>标题 *</label>
              <input type="text" name="title" value="\${post.title.rendered}" required>
            </div>
            <div class="form-group">
              <label>别名 (URL)</label>
              <input type="text" name="slug" value="\${post.slug}">
            </div>
            <div class="form-group">
              <label>内容</label>
              <div style="margin-bottom: 10px;">
                <button type="button" class="button button-secondary" onclick="openMediaLibrary('edit', \${post.id})">添加媒体</button>
              </div>
              <textarea id="post-content-edit" name="content">\${post.content.rendered}</textarea>
            </div>
            <div class="form-group">
              <label>摘要</label>
              <textarea name="excerpt" style="min-height: 100px;">\${post.excerpt.rendered}</textarea>
            </div>
            <div class="form-group">
              <label>特色图片 URL</label>
              <input type="url" id="featured-image-url-edit-input" name="featured_image_url" value="\${post.featured_image_url || ''}" placeholder="https://example.com/image.jpg">
              <div style="display: flex; gap: 10px; margin-top: 5px;">
                <button type="button" class="button button-secondary" onclick="openFeaturedImageLibrary('edit')">从媒体库选择</button>
              </div>
              <small style="color: #646970; display: block; margin-top: 5px;">直接输入图片URL地址或从媒体库选择</small>
            </div>
            <div class="form-group">
              <label>状态</label>
              <select name="status">
                <option value="draft" \${post.status === 'draft' ? 'selected' : ''}>草稿</option>
                <option value="publish" \${post.status === 'publish' ? 'selected' : ''}>发布</option>
                <option value="private" \${post.status === 'private' ? 'selected' : ''}>私密</option>
              </select>
            </div>
            <div class="form-group">
              <label>置顶</label>
              <select name="sticky">
                <option value="false" \${!post.sticky ? 'selected' : ''}>否</option>
                <option value="true" \${post.sticky ? 'selected' : ''}>是</option>
              </select>
              <small style="color: #646970; display: block; margin-top: 5px;">设置为"是"后文章将显示在列表顶部</small>
            </div>
            <div class="form-group">
              <label>发布日期</label>
              <input type="datetime-local" name="date" value="\${post.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : ''}">
              <small style="color: #646970; display: block; margin-top: 5px;">可以自定义文章发布日期，留空保持原有日期</small>
            </div>
            <div class="form-group">
              <label>分类</label>
              <div class="checkbox-group">
                \${categories.map(cat => \`
                  <label>
                    <input type="checkbox" name="categories" value="\${cat.id}" \${post.categories.includes(cat.id) ? 'checked' : ''}>
                    \${cat.name}
                  </label>
                \`).join('')}
              </div>
            </div>
            <div class="form-group">
              <label>标签</label>
              <div class="checkbox-group" id="tags-edit-checkbox-group">
                \${tags.map(tag => \`
                  <label>
                    <input type="checkbox" name="tags" value="\${tag.id}" \${post.tags.includes(tag.id) ? 'checked' : ''}>
                    \${tag.name}
                  </label>
                \`).join('')}
              </div>
              <div style="margin-top: 10px; display: flex; gap: 5px;">
                <input type="text" id="edit-new-tag-name" placeholder="创建新标签" style="flex: 1; padding: 5px;">
                <button type="button" class="button button-secondary" onclick="createAndAddTag('edit')">添加新标签</button>
              </div>
            </div>
            <button type="submit" class="button" style="width: 100%;">更新文章</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      // Initialize EasyMDE for edit content editor
      const editContentEditor = new EasyMDE({
        element: document.getElementById('post-content-edit'),
        spellChecker: false,
        placeholder: '在此输入文章内容... 支持 Markdown 语法',
        toolbar: [
          'bold', 'italic', 'heading', '|',
          'quote', 'unordered-list', 'ordered-list', '|',
          'link', 'image', '|',
          'preview', 'side-by-side', 'fullscreen', '|',
          'guide'
        ],
        status: ['lines', 'words', 'cursor'],
        minHeight: '300px',
        maxHeight: '600px'
      });

      // Set initial content
      editContentEditor.value(post.content.rendered);

      // Custom media button handler
      window.currentEditor = editContentEditor;

      document.getElementById('edit-post-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const categories = Array.from(formData.getAll('categories')).map(Number);
        const tags = Array.from(formData.getAll('tags')).map(Number);

        try {
          const postData = {
            title: formData.get('title'),
            content: editContentEditor.value(), // Get content from EasyMDE
            excerpt: formData.get('excerpt'),
            status: formData.get('status'),
            sticky: formData.get('sticky') === 'true',
            categories: categories,
            tags: tags
          };

          // Include slug
          const slug = formData.get('slug');
          if (slug && slug.trim()) {
            postData.slug = slug.trim();
          }

          // Include featured_image_url if provided
          const featuredImageUrl = formData.get('featured_image_url');
          if (featuredImageUrl && featuredImageUrl.trim()) {
            postData.featured_image_url = featuredImageUrl.trim();
          }

          // Include custom date if provided
          const customDate = formData.get('date');
          if (customDate) {
            postData.date = new Date(customDate).toISOString();
          }

          const response = await fetch(API_BASE + '/posts/' + id, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
          });

          if (response.ok) {
            modal.remove();
            await loadPosts();
            showSuccess('文章更新成功！');
          } else {
            const error = await response.json();
            showError('更新文章失败: ' + (error.message || 'Unknown error'));
          }
        } catch (error) {
          console.error('更新失败 post:', error);
          showError('更新文章失败: ' + error.message);
        }
      });
    };

    window.deletePost = async function(id) {
      if (!confirm('确定要删除 this post?')) return;

      try {
        await fetch(API_BASE + '/posts/' + id + '?force=true', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        await loadPosts();
      } catch (error) {
        console.error('删除失败 post:', error);
      }
    };

    // 分类 Management
    async function show分类() {
      renderLayout(i18n.t('nav.categories'));
      const content = document.querySelector('.content-area');

      content.innerHTML = \`
        <div class="page-header">
          <h2>\${i18n.t('categories.title')}</h2>
          <button class="button" onclick="showCreateCategoryModal()">\${i18n.t('categories.addNew')}</button>
        </div>
        <div id="categories-list"></div>
      \`;

      await load分类();
    }

    async function load分类() {
      try {
        const response = await fetch(API_BASE + '/categories?per_page=100');
        const categories = await response.json();

        const container = document.getElementById('categories-list');
        if (categories.length === 0) {
          container.innerHTML = \`<div class="empty-state">\${i18n.t('categories.noCategories')}</div>\`;
          return;
        }

        container.innerHTML = \`
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>\${i18n.t('common.name')}</th>
                  <th>\${i18n.t('common.slug')}</th>
                  <th>\${i18n.t('common.count')}</th>
                  <th>\${i18n.t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                \${categories.map(cat => \`
                  <tr>
                    <td><strong>\${cat.name}</strong></td>
                    <td>\${cat.slug}</td>
                    <td>\${cat.count}</td>
                    <td class="actions">
                      <a href="#" class="action-link" onclick="editCategory(\${cat.id}); return false;">\${i18n.t('common.edit')}</a>
                      \${cat.id !== 1 ? \`<a href="#" class="action-link delete" onclick="deleteCategory(\${cat.id}); return false;">\${i18n.t('common.delete')}</a>\` : ''}
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 categories:', error);
      }
    }

    async function fetch分类() {
      const response = await fetch(API_BASE + '/categories?per_page=100');
      return await response.json();
    }

    async function fetch标签() {
      const response = await fetch(API_BASE + '/tags?per_page=100');
      return await response.json();
    }

    window.showCreateCategoryModal = function() {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>创建新分类</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="create-category-form">
            <div class="form-group">
              <label>名称 *</label>
              <input type="text" name="name" required>
            </div>
            <div class="form-group">
              <label>别名</label>
              <input type="text" name="slug">
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea name="description" style="min-height: 100px;"></textarea>
            </div>
            <button type="submit" class="button" style="width: 100%;">创建分类</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('create-category-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const response = await fetch(API_BASE + '/categories', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: formData.get('name'),
              slug: formData.get('slug'),
              description: formData.get('description')
            })
          });

          if (response.ok) {
            modal.remove();
            await load分类();
          }
        } catch (error) {
          console.error('创建失败 category:', error);
        }
      });
    };

    window.editCategory = async function(id) {
      const cat = await fetch(API_BASE + '/categories/' + id).then(r => r.json());

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>编辑分类</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="edit-category-form">
            <div class="form-group">
              <label>名称 *</label>
              <input type="text" name="name" value="\${cat.name}" required>
            </div>
            <div class="form-group">
              <label>别名</label>
              <input type="text" name="slug" value="\${cat.slug}">
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea name="description" style="min-height: 100px;">\${cat.description}</textarea>
            </div>
            <button type="submit" class="button" style="width: 100%;">更新分类</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('edit-category-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const response = await fetch(API_BASE + '/categories/' + id, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: formData.get('name'),
              slug: formData.get('slug'),
              description: formData.get('description')
            })
          });

          if (response.ok) {
            modal.remove();
            await load分类();
          }
        } catch (error) {
          console.error('更新失败 category:', error);
        }
      });
    };

    window.deleteCategory = async function(id) {
      if (!confirm('Are you sure? Posts will be moved to Uncategorized.')) return;

      try {
        await fetch(API_BASE + '/categories/' + id + '?force=true', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        await load分类();
      } catch (error) {
        console.error('删除失败 category:', error);
      }
    };

    // 标签 Management
    async function show标签() {
      renderLayout(i18n.t('nav.tags'));
      const content = document.querySelector('.content-area');

      content.innerHTML = \`
        <div class="page-header">
          <h2>\${i18n.t('tags.title')}</h2>
          <button class="button" onclick="showCreateTagModal()">\${i18n.t('tags.addNew')}</button>
        </div>
        <div id="tags-list"></div>
      \`;

      await load标签List();
    }

    async function load标签List() {
      try {
        const response = await fetch(API_BASE + '/tags?per_page=100');
        const tags = await response.json();

        const container = document.getElementById('tags-list');
        if (tags.length === 0) {
          container.innerHTML = \`<div class="empty-state">\${i18n.t('tags.noTags')}</div>\`;
          return;
        }

        container.innerHTML = \`
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>\${i18n.t('common.name')}</th>
                  <th>\${i18n.t('common.slug')}</th>
                  <th>\${i18n.t('common.count')}</th>
                  <th>\${i18n.t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                \${tags.map(tag => \`
                  <tr>
                    <td><strong>\${tag.name}</strong></td>
                    <td>\${tag.slug}</td>
                    <td>\${tag.count}</td>
                    <td class="actions">
                      <a href="#" class="action-link" onclick="editTag(\${tag.id}); return false;">\${i18n.t('common.edit')}</a>
                      <a href="#" class="action-link delete" onclick="deleteTag(\${tag.id}); return false;">\${i18n.t('common.delete')}</a>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 tags:', error);
      }
    }

    window.showCreateTagModal = function() {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>创建新标签</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="create-tag-form">
            <div class="form-group">
              <label>名称 *</label>
              <input type="text" name="name" required>
            </div>
            <div class="form-group">
              <label>别名</label>
              <input type="text" name="slug">
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea name="description" style="min-height: 100px;"></textarea>
            </div>
            <button type="submit" class="button" style="width: 100%;">创建标签</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('create-tag-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const response = await fetch(API_BASE + '/tags', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: formData.get('name'),
              slug: formData.get('slug'),
              description: formData.get('description')
            })
          });

          if (response.ok) {
            modal.remove();
            await load标签List();
          }
        } catch (error) {
          console.error('创建失败 tag:', error);
        }
      });
    };

    window.editTag = async function(id) {
      const tag = await fetch(API_BASE + '/tags/' + id).then(r => r.json());

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>编辑标签</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="edit-tag-form">
            <div class="form-group">
              <label>名称 *</label>
              <input type="text" name="name" value="\${tag.name}" required>
            </div>
            <div class="form-group">
              <label>别名</label>
              <input type="text" name="slug" value="\${tag.slug}">
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea name="description" style="min-height: 100px;">\${tag.description}</textarea>
            </div>
            <button type="submit" class="button" style="width: 100%;">更新标签</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('edit-tag-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const response = await fetch(API_BASE + '/tags/' + id, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: formData.get('name'),
              slug: formData.get('slug'),
              description: formData.get('description')
            })
          });

          if (response.ok) {
            modal.remove();
            await load标签List();
          }
        } catch (error) {
          console.error('更新失败 tag:', error);
        }
      });
    };

    window.deleteTag = async function(id) {
      if (!confirm('确定要删除 this tag?')) return;

      try {
        await fetch(API_BASE + '/tags/' + id + '?force=true', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        await load标签List();
      } catch (error) {
        console.error('删除失败 tag:', error);
      }
    };

    // Media Management
    async function showMedia() {
      renderLayout(i18n.t('nav.media'));
      const content = document.querySelector('.content-area');

      content.innerHTML = \`
        <div class="page-header">
          <h2>Media Library</h2>
          <button class="button" onclick="show上传MediaModal()">上传 New</button>
        </div>
        <div id="media-grid"></div>
      \`;

      await loadMediaGrid();
    }

    async function loadMediaGrid() {
      try {
        const response = await fetch(API_BASE + '/media?per_page=50', {
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const mediaItems = await response.json();

        const container = document.getElementById('media-grid');
        if (mediaItems.length === 0) {
          container.innerHTML = '<div class="empty-state">No media files yet. 上传 your first file!</div>';
          return;
        }

        container.innerHTML = \`
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
            \${mediaItems.map(media => \`
              <div class="media-item" style="border: 1px solid #ddd; border-radius: 4px; overflow: 隐藏; cursor: pointer;" onclick="showMediaDetails(\${media.id})">
                <div style="height: 150px; background: #f0f0f1; display: flex; align-items: center; justify-content: center; overflow: 隐藏;">
                  \${media.media_type === 'image'
                    ? \`<img src="\${media.source_url}" alt="\${media.alt_text}" style="max-width: 100%; max-height: 100%; object-fit: cover;">\`
                    : \`<div style="padding: 20px; text-align: center; color: #646970;">\${media.mime_type}</div>\`
                  }
                </div>
                <div style="padding: 10px;">
                  <div style="font-size: 13px; font-weight: 500; white-space: nowrap; overflow: 隐藏; text-overflow: ellipsis;">\${media.title.rendered}</div>
                  <div style="font-size: 12px; color: #646970;">\${formatFileSize(media.media_details.filesize)}</div>
                </div>
              </div>
            \`).join('')}
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 media:', error);
      }
    }

    function formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    window.show上传MediaModal = function() {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>上传媒体</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="upload-media-form" enctype="multipart/form-data">
            <div class="form-group">
              <label>选择文件 *</label>
              <input type="file" id="media-file" name="file" accept="image/*,video/*,.pdf" required style="padding: 5px;">
            </div>
            <div id="file-preview" style="margin: 15px 0; display: none;">
              <img id="preview-image" style="max-width: 100%; max-height: 300px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div class="form-group">
              <label>标题</label>
              <input type="text" id="media-title" name="title" placeholder="Auto-filled from filename">
            </div>
            <div class="form-group">
              <label>替代文本 (for images)</label>
              <input type="text" name="alt_text">
            </div>
            <div class="form-group">
              <label>Caption</label>
              <textarea name="caption" style="min-height: 80px;"></textarea>
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea name="description" style="min-height: 80px;"></textarea>
            </div>
            <div id="upload-progress" class="隐藏" style="margin: 15px 0;">
              <div style="background: #f0f0f1; border-radius: 4px; overflow: 隐藏;">
                <div id="progress-bar" style="background: #2271b1; height: 20px; width: 0%; transition: width 0.3s;"></div>
              </div>
              <div id="progress-text" style="text-align: center; margin-top: 5px; font-size: 13px; color: #646970;">上传ing...</div>
            </div>
            <button type="submit" class="button" style="width: 100%;">上传 File</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      // File preview
      document.getElementById('media-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          document.getElementById('media-title').value = file.name.replace(/\\.[^/.]+$/, '');

          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const preview = document.getElementById('file-preview');
              const img = document.getElementById('preview-image');
              img.src = e.target.result;
              preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
          }
        }
      });

      document.getElementById('upload-media-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const progressDiv = document.getElementById('upload-progress');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        progressDiv.classList.remove('隐藏');
        progressBar.style.width = '50%';

        try {
          const response = await fetch(API_BASE + '/media', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + authToken
            },
            body: formData
          });

          progressBar.style.width = '100%';

          if (response.ok) {
            progressText.textContent = '上传 complete!';
            setTimeout(() => {
              modal.remove();
              showMedia();
            }, 500);
          } else {
            const error = await response.json();
            showError('上传 failed: ' + error.message);
            progressDiv.classList.add('隐藏');
          }
        } catch (error) {
          console.error('Failed to upload media:', error);
          showError('上传 failed. Please try again.');
          progressDiv.classList.add('隐藏');
        }
      });
    };

    window.showMediaDetails = async function(id) {
      try {
        const response = await fetch(API_BASE + '/media/' + id, {
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const media = await response.json();

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = \`
          <div class="modal-content">
            <div class="modal-header">
              <h2>Media Details</h2>
              <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                \${media.media_type === 'image'
                  ? \`<img src="\${media.source_url}" alt="\${media.alt_text}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 4px;">\`
                  : \`<div style="padding: 40px; background: #f0f0f1; text-align: center; border-radius: 4px;">\${media.mime_type}</div>\`
                }
              </div>
              <div>
                <div style="margin-bottom: 15px;">
                  <strong>URL:</strong><br>
                  <input type="text" readonly value="\${media.source_url}" style="width: 100%; padding: 5px; font-size: 12px;" onclick="this.select()">
                </div>
                <div style="margin-bottom: 10px;"><strong>标题:</strong> \${media.title.rendered}</div>
                <div style="margin-bottom: 10px;"><strong>File type:</strong> \${media.mime_type}</div>
                <div style="margin-bottom: 10px;"><strong>File size:</strong> \${formatFileSize(media.media_details.filesize)}</div>
                <div style="margin-bottom: 10px;"><strong>上传ed:</strong> \${new Date(media.date).toLocaleDateString()}</div>
                \${media.media_details.width ? \`<div style="margin-bottom: 10px;"><strong>Dimensions:</strong> \${media.media_details.width} × \${media.media_details.height}</div>\` : ''}
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                  <button class="button button-secondary" onclick="copyMediaUrl('\${media.source_url}')" style="margin-right: 8px;">Copy URL</button>
                  <button class="button" style="background: #d63638;" onclick="deleteMedia(\${media.id})">Delete</button>
                </div>
              </div>
            </div>
          </div>
        \`;
        document.body.appendChild(modal);
      } catch (error) {
        console.error('加载失败 media details:', error);
      }
    };

    window.copyMediaUrl = function(url) {
      navigator.clipboard.writeText(url).then(() => {
        showSuccess('URL copied to clipboard!');
      });
    };

    window.deleteMedia = async function(id) {
      if (!confirm('Are you sure you want to permanently delete this file?')) return;

      try {
        await fetch(API_BASE + '/media/' + id + '?force=true', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });

        document.querySelectorAll('.modal').forEach(m => m.remove());
        showMedia();
      } catch (error) {
        console.error('删除失败 media:', error);
        showError('删除失败 media.');
      }
    };

    window.openMediaLibrary = function(mode, postId) {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content" style="max-width: 900px;">
          <div class="modal-header">
            <h2>Insert Media</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <div style="margin-bottom: 15px;">
            <button class="button" onclick="show上传MediaModalInline()">上传 New File</button>
          </div>
          <div id="media-library-grid" style="max-height: 60vh; overflow-y: auto;"></div>
        </div>
      \`;
      document.body.appendChild(modal);

      loadMediaLibraryGrid(mode, postId);
    };

    async function loadMediaLibraryGrid(mode, postId) {
      try {
        const response = await fetch(API_BASE + '/media?per_page=50', {
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const mediaItems = await response.json();

        const container = document.getElementById('media-library-grid');
        if (mediaItems.length === 0) {
          container.innerHTML = '<div class="empty-state">No media files yet. 上传 your first file!</div>';
          return;
        }

        container.innerHTML = \`
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
            \${mediaItems.map(media => \`
              <div class="media-item" style="border: 2px solid #ddd; border-radius: 4px; overflow: 隐藏; cursor: pointer; transition: border-color 0.2s;" onclick="insertMediaIntoPost('\${media.source_url}', '\${media.title.rendered}', '\${mode}')" onmouseover="this.style.borderColor='#2271b1'" onmouseout="this.style.borderColor='#ddd'">
                <div style="height: 120px; background: #f0f0f1; display: flex; align-items: center; justify-content: center; overflow: 隐藏;">
                  \${media.media_type === 'image'
                    ? \`<img src="\${media.source_url}" alt="\${media.alt_text}" style="max-width: 100%; max-height: 100%; object-fit: cover;">\`
                    : \`<div style="padding: 10px; text-align: center; font-size: 11px; color: #646970;">\${media.mime_type}</div>\`
                  }
                </div>
                <div style="padding: 8px; font-size: 12px; white-space: nowrap; overflow: 隐藏; text-overflow: ellipsis;" title="\${media.title.rendered}">\${media.title.rendered}</div>
              </div>
            \`).join('')}
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 media library:', error);
      }
    }

    window.show上传MediaModalInline = function() {
      show上传MediaModal();
    };

    window.insertMediaIntoPost = function(url, title, mode) {
      // Try to use EasyMDE editor if available
      if (window.currentEditor) {
        const cm = window.currentEditor.codemirror;
        const doc = cm.getDoc();
        const cursor = doc.getCursor();

        // Insert Markdown image syntax
        const imageMarkup = '![' + title + '](' + url + ')';
        doc.replaceRange(imageMarkup, cursor);

        // Move cursor to end of inserted text
        cursor.ch += imageMarkup.length;
        doc.setCursor(cursor);

        // Focus the editor
        cm.focus();
      } else {
        // Fallback to textarea (for compatibility)
        const textareaId = mode === 'edit' ? 'post-content-edit' : 'post-content';
        const textarea = document.getElementById(textareaId);

        if (textarea) {
          const imageMarkup = '![' + title + '](' + url + ')\\n';
          const cursorPos = textarea.selectionStart;
          const textBefore = textarea.value.substring(0, cursorPos);
          const textAfter = textarea.value.substring(cursorPos);

          textarea.value = textBefore + imageMarkup + textAfter;
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = cursorPos + imageMarkup.length;
        }
      }

      // Only close the media library modal, not the post editor
      const mediaModals = document.querySelectorAll('.modal');
      mediaModals.forEach(modal => {
        const header = modal.querySelector('.modal-header h2');
        if (header && header.textContent === 'Insert Media') {
          modal.remove();
        }
      });
    };

    // Open media library for featured image selection
    window.openFeaturedImageLibrary = function(mode) {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content" style="max-width: 900px;">
          <div class="modal-header">
            <h2>选择特色图片</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <div style="margin-bottom: 15px;">
            <button class="button" onclick="show上传MediaModalInline()">上传 New File</button>
          </div>
          <div id="featured-image-library-grid" style="max-height: 60vh; overflow-y: auto;"></div>
        </div>
      \`;
      document.body.appendChild(modal);

      loadFeaturedImageLibrary(mode);
    };

    async function loadFeaturedImageLibrary(mode) {
      try {
        const response = await fetch(API_BASE + '/media?per_page=50', {
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const mediaItems = await response.json();

        const container = document.getElementById('featured-image-library-grid');
        if (mediaItems.length === 0) {
          container.innerHTML = '<div class="empty-state">No media files yet. 上传 your first file!</div>';
          return;
        }

        // Filter only images
        const imageItems = mediaItems.filter(media => media.media_type === 'image');

        if (imageItems.length === 0) {
          container.innerHTML = '<div class="empty-state">No image files found. 上传 an image to use as featured image.</div>';
          return;
        }

        container.innerHTML = \`
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
            \${imageItems.map(media => \`
              <div class="media-item" style="border: 2px solid #ddd; border-radius: 4px; overflow: 隐藏; cursor: pointer; transition: border-color 0.2s;" onclick="selectFeaturedImage('\${media.source_url}', '\${mode}')" onmouseover="this.style.borderColor='#2271b1'" onmouseout="this.style.borderColor='#ddd'">
                <div style="height: 120px; background: #f0f0f1; display: flex; align-items: center; justify-content: center; overflow: 隐藏;">
                  <img src="\${media.source_url}" alt="\${media.alt_text}" style="max-width: 100%; max-height: 100%; object-fit: cover;">
                </div>
                <div style="padding: 8px; font-size: 12px; white-space: nowrap; overflow: 隐藏; text-overflow: ellipsis;" title="\${media.title.rendered}">\${media.title.rendered}</div>
              </div>
            \`).join('')}
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 media library:', error);
      }
    }

    window.selectFeaturedImage = function(url, mode) {
      const inputId = mode === 'edit' ? 'featured-image-url-edit-input' : 'featured-image-url-input';
      const input = document.getElementById(inputId);

      if (input) {
        input.value = url;
        showSuccess('特色图片已选择！');
      }

      // Close the media library modal
      const mediaModals = document.querySelectorAll('.modal');
      mediaModals.forEach(modal => {
        const header = modal.querySelector('.modal-header h2');
        if (header && header.textContent === '选择特色图片') {
          modal.remove();
        }
      });
    };

    // Users Management
    async function showUsers() {
      renderLayout(i18n.t('nav.users'));
      const content = document.querySelector('.content-area');

      content.innerHTML = \`
        <div class="page-header">
          <h2>\${i18n.t('users.allUsers')}</h2>
          \${currentUser.role === 'administrator' ? \`<button class="button" onclick="showCreateUserModal()">\${i18n.t('users.addNew')}</button>\` : ''}
        </div>
        <div id="users-list"></div>
      \`;

      await loadUsersList();
    }

    async function loadUsersList() {
      try {
        const response = await fetch(API_BASE + '/users?per_page=100', {
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const users = await response.json();

        const container = document.getElementById('users-list');
        if (users.length === 0) {
          container.innerHTML = \`<div class="empty-state">\${i18n.t('users.noUsers')}</div>\`;
          return;
        }

        container.innerHTML = \`
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>\${i18n.t('users.username')}</th>
                  <th>\${i18n.t('common.name')}</th>
                  <th>\${i18n.t('users.email')}</th>
                  <th>\${i18n.t('users.role')}</th>
                  <th>\${i18n.t('users.registered')}</th>
                  <th>\${i18n.t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                \${users.map(user => \`
                  <tr>
                    <td><strong>\${user.slug}</strong></td>
                    <td>\${user.name}</td>
                    <td>\${user.email || 'N/A'}</td>
                    <td>\${user.roles ? translateRole(user.roles[0]) : 'N/A'}</td>
                    <td>\${new Date(user.registered_date).toLocaleDateString()}</td>
                    <td class="actions">
                      <a href="#" class="action-link" onclick="editUser(\${user.id}); return false;">\${i18n.t('common.edit')}</a>
                      \${currentUser.role === 'administrator' && user.id !== currentUser.id ? \`<a href="#" class="action-link delete" onclick="deleteUser(\${user.id}); return false;">\${i18n.t('common.delete')}</a>\` : ''}
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 users:', error);
      }
    }

    window.showCreateUserModal = function() {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>创建新用户</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="create-user-form">
            <div class="form-group">
              <label>用户名 *</label>
              <input type="text" name="username" required>
            </div>
            <div class="form-group">
              <label>邮箱 *</label>
              <input type="email" name="email" required>
            </div>
            <div class="form-group">
              <label>密码 *</label>
              <input type="password" name="password" required minlength="6">
            </div>
            <div class="form-group">
              <label>显示名称</label>
              <input type="text" name="display_name">
            </div>
            <div class="form-group">
              <label>角色</label>
              <select name="role">
                <option value="subscriber">订阅者</option>
                <option value="contributor">贡献者</option>
                <option value="author">作者</option>
                <option value="editor">编辑</option>
                <option value="administrator">管理员</option>
              </select>
            </div>
            <button type="submit" class="button" style="width: 100%;">创建用户</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('create-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const response = await fetch(API_BASE + '/users', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: formData.get('username'),
              email: formData.get('email'),
              password: formData.get('password'),
              display_name: formData.get('display_name'),
              role: formData.get('role')
            })
          });

          if (response.ok) {
            modal.remove();
            await loadUsersList();
          } else {
            const error = await response.json();
            showError('创建失败 user: ' + error.message);
          }
        } catch (error) {
          console.error('创建失败 user:', error);
          showError('创建失败 user.');
        }
      });
    };

    window.editUser = async function(id) {
      const user = await fetch(API_BASE + '/users/' + id, {
        headers: { 'Authorization': 'Bearer ' + authToken }
      }).then(r => r.json());

      const isCurrentUser = user.id === currentUser.id;
      const canEditRole = currentUser.role === 'administrator' && !isCurrentUser;

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>编辑用户</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="edit-user-form">
            <div class="form-group">
              <label>用户名</label>
              <input type="text" value="\${user.slug}" disabled style="background: #f0f0f1;">
            </div>
            <div class="form-group">
              <label>邮箱 *</label>
              <input type="email" name="email" value="\${user.email || ''}" required>
            </div>
            <div class="form-group">
              <label>显示名称</label>
              <input type="text" name="display_name" value="\${user.name}">
            </div>
            <div class="form-group">
              <label>简介</label>
              <textarea name="bio" style="min-height: 100px;">\${user.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label>New Password (leave blank to keep current)</label>
              <input type="password" name="password" minlength="6">
            </div>
            \${canEditRole ? \`
              <div class="form-group">
                <label>角色</label>
                <select name="role">
                  <option value="subscriber" \${user.roles && user.roles[0] === 'subscriber' ? 'selected' : ''}>Subscriber</option>
                  <option value="contributor" \${user.roles && user.roles[0] === 'contributor' ? 'selected' : ''}>Contributor</option>
                  <option value="author" \${user.roles && user.roles[0] === 'author' ? 'selected' : ''}>Author</option>
                  <option value="editor" \${user.roles && user.roles[0] === 'editor' ? 'selected' : ''}>Editor</option>
                  <option value="administrator" \${user.roles && user.roles[0] === 'administrator' ? 'selected' : ''}>Administrator</option>
                </select>
              </div>
            \` : ''}
            <button type="submit" class="button" style="width: 100%;">更新用户</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const updateData = {
          email: formData.get('email'),
          display_name: formData.get('display_name'),
          bio: formData.get('bio')
        };

        if (formData.get('password')) {
          updateData.password = formData.get('password');
        }

        if (canEditRole) {
          updateData.role = formData.get('role');
        }

        try {
          const response = await fetch(API_BASE + '/users/' + id, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          });

          if (response.ok) {
            modal.remove();
            await loadUsersList();

            // Update current user if editing self
            if (isCurrentUser) {
              const updatedUser = await response.json();
              currentUser = updatedUser;
            }
          } else {
            const error = await response.json();
            showError('更新失败 user: ' + error.message);
          }
        } catch (error) {
          console.error('更新失败 user:', error);
          showError('更新失败 user.');
        }
      });
    };

    window.deleteUser = async function(id) {
      if (!confirm('确定要删除 this user? Their posts will also be deleted.')) return;

      try {
        await fetch(API_BASE + '/users/' + id + '?force=true', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        await loadUsersList();
      } catch (error) {
        console.error('删除失败 user:', error);
        showError('删除失败 user.');
      }
    };

    // Links Management
    async function showLinks() {
      renderLayout(i18n.t('nav.links'));
      const content = document.querySelector('.content-area');

      content.innerHTML = \`
        <div class="page-header">
          <h2>\${i18n.t('links.title')}</h2>
          <button class="button" onclick="showCreateLinkModal()">\${i18n.t('links.addNew')}</button>
          <button class="button button-secondary" onclick="showLink分类()" style="margin-left: 10px;">管理分类</button>
        </div>
        <div id="links-list"></div>
      \`;

      await loadLinksList();
    }

    async function loadLinksList() {
      try {
        const response = await fetch(API_BASE + '/links?per_page=100&visible=yes', {
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const links = await response.json();

        const container = document.getElementById('links-list');
        if (links.length === 0) {
          container.innerHTML = \`<div class="empty-state">\${i18n.t('links.noLinks')}</div>\`;
          return;
        }

        container.innerHTML = \`
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>\${i18n.t('common.name')}</th>
                  <th>\${i18n.t('links.siteUrl')}</th>
                  <th>\${i18n.t('common.categories')}</th>
                  <th>Description</th>
                  <th>Sort</th>
                  <th>\${i18n.t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                \${links.map(link => \`
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        \${link.avatar ? \`<img src="\${link.avatar}" alt="\${link.name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">\` : ''}
                        <strong>\${link.name}</strong>
                      </div>
                    </td>
                    <td><a href="\${link.url}" target="_blank" style="color: #2271b1;">\${link.url}</a></td>
                    <td>\${link.category.name}</td>
                    <td style="max-width: 200px; overflow: 隐藏; text-overflow: ellipsis; white-space: nowrap;">\${link.description || '-'}</td>
                    <td>\${link.sort_order}</td>
                    <td class="actions">
                      <a href="#" class="action-link" onclick="editLink(\${link.id}); return false;">\${i18n.t('common.edit')}</a>
                      <a href="#" class="action-link delete" onclick="deleteLink(\${link.id}); return false;">\${i18n.t('common.delete')}</a>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 links:', error);
      }
    }

    window.showCreateLinkModal = async function() {
      const categories = await fetchLink分类();

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>添加链接</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="create-link-form">
            <div class="form-group">
              <label>网站名称 *</label>
              <input type="text" name="name" required>
            </div>
            <div class="form-group">
              <label>网站地址 *</label>
              <input type="url" name="url" placeholder="https://example.com" required>
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea name="description" style="min-height: 80px;" placeholder="Brief description of the site"></textarea>
            </div>
            <div class="form-group">
              <label>头像 URL</label>
              <input type="url" name="avatar" placeholder="https://example.com/avatar.jpg">
              <small style="color: #646970; display: block; margin-top: 5px;">Recommended: 100x100px</small>
            </div>
            <div class="form-group">
              <label>Category</label>
              <select name="category_id">
                \${categories.map(cat => \`
                  <option value="\${cat.id}">\${cat.name}</option>
                \`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>打开方式</label>
              <select name="target">
                <option value="_blank">New Window (_blank)</option>
                <option value="_self">Same Window (_self)</option>
              </select>
            </div>
            <div class="form-group">
              <label>排序</label>
              <input type="number" name="sort_order" value="0" min="0">
              <small style="color: #646970; display: block; margin-top: 5px;">数字越小排序越靠前</small>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" name="visible" value="yes" checked style="width: auto; margin-right: 8px;">
                可见
              </label>
            </div>
            <button type="submit" class="button" style="width: 100%;">Add Link</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('create-link-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const response = await fetch(API_BASE + '/links', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: formData.get('name'),
              url: formData.get('url'),
              description: formData.get('description'),
              avatar: formData.get('avatar'),
              category_id: parseInt(formData.get('category_id')),
              target: formData.get('target'),
              visible: formData.get('visible') ? 'yes' : 'no',
              sort_order: parseInt(formData.get('sort_order') || '0')
            })
          });

          if (response.ok) {
            modal.remove();
            await loadLinksList();
          } else {
            const error = await response.json();
            showError('创建失败 link: ' + error.message);
          }
        } catch (error) {
          console.error('创建失败 link:', error);
          showError('创建失败 link.');
        }
      });
    };

    window.editLink = async function(id) {
      const link = await fetch(API_BASE + '/links/' + id, {
        headers: { 'Authorization': 'Bearer ' + authToken }
      }).then(r => r.json());

      const categories = await fetchLink分类();

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>编辑链接</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="edit-link-form">
            <div class="form-group">
              <label>网站名称 *</label>
              <input type="text" name="name" value="\${link.name}" required>
            </div>
            <div class="form-group">
              <label>网站地址 *</label>
              <input type="url" name="url" value="\${link.url}" required>
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea name="description" style="min-height: 80px;">\${link.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label>头像 URL</label>
              <input type="url" name="avatar" value="\${link.avatar || ''}">
              <small style="color: #646970; display: block; margin-top: 5px;">Recommended: 100x100px</small>
            </div>
            <div class="form-group">
              <label>Category</label>
              <select name="category_id">
                \${categories.map(cat => \`
                  <option value="\${cat.id}" \${cat.id === link.category.id ? 'selected' : ''}>\${cat.name}</option>
                \`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>打开方式</label>
              <select name="target">
                <option value="_blank" \${link.target === '_blank' ? 'selected' : ''}>New Window (_blank)</option>
                <option value="_self" \${link.target === '_self' ? 'selected' : ''}>Same Window (_self)</option>
              </select>
            </div>
            <div class="form-group">
              <label>排序</label>
              <input type="number" name="sort_order" value="\${link.sort_order}" min="0">
              <small style="color: #646970; display: block; margin-top: 5px;">数字越小排序越靠前</small>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" name="visible" value="yes" \${link.visible === 'yes' ? 'checked' : ''} style="width: auto; margin-right: 8px;">
                可见
              </label>
            </div>
            <button type="submit" class="button" style="width: 100%;">更新链接</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('edit-link-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const response = await fetch(API_BASE + '/links/' + id, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: formData.get('name'),
              url: formData.get('url'),
              description: formData.get('description'),
              avatar: formData.get('avatar'),
              category_id: parseInt(formData.get('category_id')),
              target: formData.get('target'),
              visible: formData.get('visible') ? 'yes' : 'no',
              sort_order: parseInt(formData.get('sort_order') || '0')
            })
          });

          if (response.ok) {
            modal.remove();
            await loadLinksList();
          } else {
            const error = await response.json();
            showError('更新失败 link: ' + error.message);
          }
        } catch (error) {
          console.error('更新失败 link:', error);
          showError('更新失败 link.');
        }
      });
    };

    window.deleteLink = async function(id) {
      if (!confirm('确定要删除 this link?')) return;

      try {
        await fetch(API_BASE + '/links/' + id, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        await loadLinksList();
      } catch (error) {
        console.error('删除失败 link:', error);
        showError('删除失败 link.');
      }
    };

    async function fetchLink分类() {
      const response = await fetch(API_BASE + '/link-categories');
      return await response.json();
    }

    window.showLink分类 = async function() {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content" style="max-width: 800px;">
          <div class="modal-header">
            <h2>Link 分类</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <div style="margin-bottom: 20px;">
            <button class="button" onclick="showCreateLinkCategoryModal()">Add Category</button>
          </div>
          <div id="link-categories-list"></div>
        </div>
      \`;
      document.body.appendChild(modal);

      await loadLink分类List();
    };

    async function loadLink分类List() {
      try {
        const response = await fetch(API_BASE + '/link-categories');
        const categories = await response.json();

        const container = document.getElementById('link-categories-list');
        container.innerHTML = \`
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>\${i18n.t('common.name')}</th>
                  <th>\${i18n.t('common.slug')}</th>
                  <th>\${i18n.t('common.count')}</th>
                  <th>\${i18n.t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                \${categories.map(cat => \`
                  <tr>
                    <td><strong>\${cat.name}</strong></td>
                    <td>\${cat.slug}</td>
                    <td>\${cat.count}</td>
                    <td class="actions">
                      <a href="#" class="action-link" onclick="editLinkCategory(\${cat.id}); return false;">\${i18n.t('common.edit')}</a>
                      <a href="#" class="action-link delete" onclick="deleteLinkCategory(\${cat.id}); return false;">\${i18n.t('common.delete')}</a>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 link categories:', error);
      }
    }

    window.showCreateLinkCategoryModal = function() {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>Add 链接分类</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="create-link-category-form">
            <div class="form-group">
              <label>名称 *</label>
              <input type="text" name="name" required>
            </div>
            <div class="form-group">
              <label>别名</label>
              <input type="text" name="slug" placeholder="auto-generated">
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea name="description" style="min-height: 80px;"></textarea>
            </div>
            <button type="submit" class="button" style="width: 100%;">创建分类</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('create-link-category-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const response = await fetch(API_BASE + '/link-categories', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: formData.get('name'),
              slug: formData.get('slug'),
              description: formData.get('description')
            })
          });

          if (response.ok) {
            modal.remove();
            await loadLink分类List();
          }
        } catch (error) {
          console.error('创建失败 link category:', error);
        }
      });
    };

    window.editLinkCategory = async function(id) {
      const cat = await fetch(API_BASE + '/link-categories/' + id).then(r => r.json());

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>编辑链接 Category</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="edit-link-category-form">
            <div class="form-group">
              <label>名称 *</label>
              <input type="text" name="name" value="\${cat.name}" required>
            </div>
            <div class="form-group">
              <label>别名</label>
              <input type="text" name="slug" value="\${cat.slug}">
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea name="description" style="min-height: 80px;">\${cat.description || ''}</textarea>
            </div>
            <button type="submit" class="button" style="width: 100%;">更新分类</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('edit-link-category-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const response = await fetch(API_BASE + '/link-categories/' + id, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: formData.get('name'),
              slug: formData.get('slug'),
              description: formData.get('description')
            })
          });

          if (response.ok) {
            modal.remove();
            await loadLink分类List();
          }
        } catch (error) {
          console.error('更新失败 link category:', error);
        }
      });
    };

    window.deleteLinkCategory = async function(id) {
      if (!confirm('Are you sure? Links will be moved to the default category.')) return;

      try {
        await fetch(API_BASE + '/link-categories/' + id, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        await loadLink分类List();
      } catch (error) {
        console.error('删除失败 link category:', error);
      }
    };

    function renderLayout(title) {
      const app = document.getElementById('app');
      app.innerHTML = \`
        <div class="sidebar-overlay" onclick="toggleMobileMenu()"></div>
        <div class="sidebar">
          <div class="sidebar-header">${c.env.SITE_NAME || 'CFBlog'}</div>
          <ul class="sidebar-menu">
            <li><a href="#" data-route="/" class="active">\${i18n.t('nav.dashboard')}</a></li>
            <li><a href="#" data-route="/posts">\${i18n.t('nav.posts')}</a></li>
            <li><a href="#" data-route="/pages">\${i18n.t('nav.pages')}</a></li>
            <li><a href="#" data-route="/moments">\${i18n.t('nav.moments')}</a></li>
            <li><a href="#" data-route="/categories">\${i18n.t('nav.categories')}</a></li>
            <li><a href="#" data-route="/tags">\${i18n.t('nav.tags')}</a></li>
            <li><a href="#" data-route="/media">\${i18n.t('nav.media')}</a></li>
            <li><a href="#" data-route="/links">\${i18n.t('nav.links')}</a></li>
            <li><a href="#" data-route="/comments">\${i18n.t('nav.comments')}</a></li>
            <li><a href="#" data-route="/import">\${i18n.t('nav.import')}</a></li>
            <li><a href="#" data-route="/users">\${i18n.t('nav.users')}</a></li>
            <li><a href="#" data-route="/settings">\${i18n.t('nav.settings')}</a></li>
          </ul>
        </div>
        <div class="main-content">
          <div class="top-bar">
            <button class="mobile-menu-toggle" onclick="toggleMobileMenu()">☰</button>
            <h1>\${title}</h1>
            <div class="user-info">
              <span>\${currentUser.name}</span>
              <button class="button button-secondary" onclick="logout()">\${i18n.t('nav.logout')}</button>
            </div>
          </div>
          <div class="content-area"></div>
        </div>
      \`;

      // Add event listeners to menu
      document.querySelectorAll('.sidebar-menu a').forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          navigate(a.getAttribute('data-route'));
          // Close mobile menu after navigation
          document.querySelector('.sidebar').classList.remove('open');
          document.querySelector('.sidebar-overlay').classList.remove('show');
        });
      });
    }

    // Mobile menu toggle function
    window.toggleMobileMenu = function() {
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.querySelector('.sidebar-overlay');
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
    };

    // Language switcher function
    window.switchLanguage = function(lang) {
      i18n.setLang(lang);
      // Re-render current view
      const currentRoute = Array.from(document.querySelectorAll('.sidebar-menu a')).find(a => a.classList.contains('active'))?.getAttribute('data-route') || '/';
      navigate(currentRoute);
    };

    // Comments Management
    async function showComments() {
      renderLayout(i18n.t('nav.comments'));
      const content = document.querySelector('.content-area');

      content.innerHTML = \`
        <div class="page-header">
          <h2>\${i18n.t('comments.allComments')}</h2>
          <div>
            <select id="comment-status-filter" style="padding: 8px; margin-right: 10px;">
              <option value="all" selected>\${i18n.t('common.all')}</option>
              <option value="approved">\${i18n.t('statusOptions.approved')}</option>
              <option value="pending">\${i18n.t('statusOptions.pending')}</option>
              <option value="spam">\${i18n.t('statusOptions.spam')}</option>
              <option value="trash">\${i18n.t('statusOptions.trash')}</option>
            </select>
          </div>
        </div>
        <div id="comments-list"></div>
      \`;

      document.getElementById('comment-status-filter').addEventListener('change', (e) => {
        loadCommentsList(e.target.value);
      });

      await loadCommentsList('all');
    }

    async function loadCommentsList(status = 'all') {
      try {
        const [postResponse, momentResponse, adminEmail] = await Promise.all([
          fetch(API_BASE + '/comments?per_page=50&status=' + status, {
            headers: { 'Authorization': 'Bearer ' + authToken }
          }),
          fetch(API_BASE + '/moments/comments/all?per_page=50&status=' + status, {
            headers: { 'Authorization': 'Bearer ' + authToken }
          }),
          getAdminEmail()
        ]);

        const [postComments, momentComments] = await Promise.all([
          postResponse.json(),
          momentResponse.json()
        ]);

        const comments = [
          ...(Array.isArray(postComments) ? postComments : []),
          ...(Array.isArray(momentComments) ? momentComments : [])
        ];

        const container = document.getElementById('comments-list');
        if (comments.length === 0) {
          container.innerHTML = \`<div class="empty-state">\${i18n.t('comments.noComments')}</div>\`;
          return;
        }

        const sortedComments = comments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const commentMap = new Map();
        const rootComments = [];

        sortedComments.forEach(comment => {
          comment.children = [];
          comment.__key = (comment.type || 'comment') + ':' + comment.id;
          comment.__parentKey = comment.parent ? (comment.type || 'comment') + ':' + comment.parent : '';
          commentMap.set(comment.__key, comment);
        });

        sortedComments.forEach(comment => {
          if (comment.parent && commentMap.has(comment.__parentKey)) {
            commentMap.get(comment.__parentKey).children.push(comment);
          } else {
            rootComments.push(comment);
          }
        });

        // Recursive function to render comment and its children
        function renderComment(comment, depth = 0) {
          const indent = depth * 30; // 30px indent per level
          const isMomentComment = comment.type === 'moment_comment';
          const parentResourceId = isMomentComment ? comment.moment : (comment.post || comment.post_id);
          const commentHtml = \`
            <tr style="background: \${depth > 0 ? '#f6f7f7' : 'white'};">
              <td style="padding-left: \${indent + 10}px;">
                \${depth > 0 ? '<span style="color: #2271b1; margin-right: 5px;">↳</span>' : ''}
                \${renderCommentAuthorMeta(comment.author_name, comment.author_email, adminEmail)}
              </td>
              <td style="max-width: 300px; overflow: 隐藏; text-overflow: ellipsis;">
                \${comment.content.rendered.substring(0, 100)}...
              </td>
              <td>\${comment.post_title || (isMomentComment ? ('动态 #' + comment.moment) : 'N/A')}</td>
              <td>
                <span style="padding: 3px 8px; background: \${
                  comment.status === 'approved' ? '#00a32a' :
                  comment.status === 'pending' ? '#dba617' :
                  comment.status === 'spam' ? '#d63638' : '#646970'
                }; color: white; border-radius: 3px; font-size: 12px;">
                  \${translateStatus(comment.status)}
                </span>
                \${isMomentComment ? '<span style="margin-left: 8px; font-size: 12px; color: #2271b1;">动态</span>' : ''}
              </td>
              <td>\${new Date(comment.date).toLocaleDateString()}</td>
              <td class="actions">
                \${comment.status !== 'approved' ? \`<a href="#" class="action-link" onclick="approveUnifiedComment('\${comment.type || 'comment'}', \${parentResourceId}, \${comment.id}); return false;">\${i18n.t('comments.approve')}</a>\` : ''}
                \${comment.status !== 'spam' ? \`<a href="#" class="action-link" onclick="markUnifiedCommentAsSpam('\${comment.type || 'comment'}', \${parentResourceId}, \${comment.id}); return false;">\${i18n.t('comments.markAsSpam')}</a>\` : ''}
                <a href="#" class="action-link" onclick="replyToUnifiedComment('\${comment.type || 'comment'}', \${parentResourceId}, \${comment.id}); return false;">\${i18n.t('comments.reply')}</a>
                <a href="#" class="action-link" onclick="editUnifiedComment('\${comment.type || 'comment'}', \${parentResourceId}, \${comment.id}); return false;">\${i18n.t('common.edit')}</a>
                <a href="#" class="action-link delete" onclick="deleteUnifiedComment('\${comment.type || 'comment'}', \${parentResourceId}, \${comment.id}); return false;">\${i18n.t('common.delete')}</a>
              </td>
            </tr>
          \`;

          let childrenHtml = '';
          if (comment.children && comment.children.length > 0) {
            childrenHtml = comment.children.map(child => renderComment(child, depth + 1)).join('');
          }

          return commentHtml + childrenHtml;
        }

        container.innerHTML = \`
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>\${i18n.t('comments.author')}</th>
                  <th>\${i18n.t('comments.comment')}</th>
                  <th>\${i18n.t('comments.post')}</th>
                  <th>\${i18n.t('common.status')}</th>
                  <th>\${i18n.t('common.date')}</th>
                  <th>\${i18n.t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                \${rootComments.map(comment => renderComment(comment)).join('')}
              </tbody>
            </table>
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 comments:', error);
      }
    }

    window.approveComment = async function(id) {
      try {
        await fetch(API_BASE + '/comments/' + id, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + authToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'approved' })
        });
        const statusFilter = document.getElementById('comment-status-filter').value;
        await loadCommentsList(statusFilter);
      } catch (error) {
        console.error('Failed to approve comment:', error);
      }
    };

    window.markAsSpam = async function(id) {
      try {
        await fetch(API_BASE + '/comments/' + id, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + authToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'spam' })
        });
        const statusFilter = document.getElementById('comment-status-filter').value;
        await loadCommentsList(statusFilter);
      } catch (error) {
        console.error('Failed to mark comment as spam:', error);
      }
    };

    window.replyToComment = async function(parentId, postId) {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>回复评论</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="reply-comment-form">
            <div class="form-group">
              <label>回复内容 *</label>
              <textarea name="content" required style="min-height: 150px;" placeholder="输入回复内容..."></textarea>
            </div>
            <button type="submit" class="button" style="width: 100%;">发送回复</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('reply-comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const response = await fetch(API_BASE + '/comments', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              post: postId,
              parent: parentId,
              content: formData.get('content')
            })
          });

          if (response.ok) {
            modal.remove();
            const statusFilter = document.getElementById('comment-status-filter').value;
            await loadCommentsList(statusFilter);
            showSuccess('回复已发送！');
          } else {
            const error = await response.json();
            showError('发送回复失败: ' + error.message);
          }
        } catch (error) {
          console.error('Failed to reply comment:', error);
          showError('发送回复失败');
        }
      });
    };

    window.editComment = async function(id) {
      const comment = await fetch(API_BASE + '/comments/' + id, {
        headers: { 'Authorization': 'Bearer ' + authToken }
      }).then(r => r.json());

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>Edit Comment</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="edit-comment-form">
            <div class="form-group">
              <label>Author Name *</label>
              <input type="text" name="author_name" value="\${comment.author_name}" required>
            </div>
            <div class="form-group">
              <label>Author Email *</label>
              <input type="email" name="author_email" value="\${comment.author_email}" required>
            </div>
            <div class="form-group">
              <label>Author URL</label>
              <input type="url" name="author_url" value="\${comment.author_url || ''}">
            </div>
            <div class="form-group">
              <label>Comment *</label>
              <textarea name="content" required style="min-height: 150px;">\${comment.content.rendered}</textarea>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select name="status">
                <option value="approved" \${comment.status === 'approved' ? 'selected' : ''}>Approved</option>
                <option value="pending" \${comment.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="spam" \${comment.status === 'spam' ? 'selected' : ''}>Spam</option>
                <option value="trash" \${comment.status === 'trash' ? 'selected' : ''}>Trash</option>
              </select>
            </div>
            <button type="submit" class="button" style="width: 100%;">Update Comment</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('edit-comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          await fetch(API_BASE + '/comments/' + id, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              author_name: formData.get('author_name'),
              author_email: formData.get('author_email'),
              author_url: formData.get('author_url'),
              content: formData.get('content'),
              status: formData.get('status')
            })
          });
          modal.remove();
          const statusFilter = document.getElementById('comment-status-filter').value;
          await loadCommentsList(statusFilter);
        } catch (error) {
          console.error('更新失败 comment:', error);
        }
      });
    };

    window.deleteComment = async function(id) {
      if (!confirm('确定要删除 this comment permanently?')) return;

      try {
        await fetch(API_BASE + '/comments/' + id + '?force=true', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const statusFilter = document.getElementById('comment-status-filter').value;
        await loadCommentsList(statusFilter);
      } catch (error) {
        console.error('删除失败 comment:', error);
      }
    };

    function getUnifiedCommentStatusFilter() {
      return document.getElementById('comment-status-filter')?.value || 'all';
    }

    window.approveUnifiedComment = async function(type, parentResourceId, commentId) {
      if (type === 'moment_comment') {
        await fetch(API_BASE + '/moments/' + parentResourceId + '/comments/' + commentId, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + authToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'approved' })
        });
      } else {
        await approveComment(commentId);
        return;
      }

      await loadCommentsList(getUnifiedCommentStatusFilter());
      await loadMomentsList();
    };

    window.markUnifiedCommentAsSpam = async function(type, parentResourceId, commentId) {
      if (type === 'moment_comment') {
        await fetch(API_BASE + '/moments/' + parentResourceId + '/comments/' + commentId, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + authToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'spam' })
        });
      } else {
        await markAsSpam(commentId);
        return;
      }

      await loadCommentsList(getUnifiedCommentStatusFilter());
      await loadMomentsList();
    };

    window.replyToUnifiedComment = async function(type, parentResourceId, commentId) {
      if (type === 'moment_comment') {
        await replyToMomentComment(parentResourceId, commentId);
      } else {
        await replyToComment(commentId, parentResourceId);
      }
    };

    window.editUnifiedComment = async function(type, parentResourceId, commentId) {
      if (type === 'moment_comment') {
        const comments = await fetch(API_BASE + '/moments/' + parentResourceId + '/comments?per_page=100&status=all', {
          headers: { 'Authorization': 'Bearer ' + authToken }
        }).then(r => r.json());
        const comment = comments.find(item => item.id === commentId);
        if (!comment) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = \`
          <div class="modal-content">
            <div class="modal-header">
              <h2>Edit Moment Comment</h2>
              <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <form id="edit-unified-moment-comment-form">
              <div class="form-group">
                <label>Author Name *</label>
                <input type="text" name="author_name" value="\${comment.author_name}" required>
              </div>
              <div class="form-group">
                <label>Author Email *</label>
                <input type="email" name="author_email" value="\${comment.author_email || ''}" required>
              </div>
              <div class="form-group">
                <label>Author URL</label>
                <input type="url" name="author_url" value="\${comment.author_url || ''}">
              </div>
              <div class="form-group">
                <label>Comment *</label>
                <textarea name="content" required style="min-height: 150px;">\${comment.content.rendered}</textarea>
              </div>
              <div class="form-group">
                <label>Status</label>
                <select name="status">
                  <option value="approved" \${comment.status === 'approved' ? 'selected' : ''}>Approved</option>
                  <option value="pending" \${comment.status === 'pending' ? 'selected' : ''}>Pending</option>
                  <option value="spam" \${comment.status === 'spam' ? 'selected' : ''}>Spam</option>
                  <option value="trash" \${comment.status === 'trash' ? 'selected' : ''}>Trash</option>
                </select>
              </div>
              <button type="submit" class="button" style="width: 100%;">Update Comment</button>
            </form>
          </div>
        \`;
        document.body.appendChild(modal);

        document.getElementById('edit-unified-moment-comment-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);

          try {
            await fetch(API_BASE + '/moments/' + parentResourceId + '/comments/' + commentId, {
              method: 'PUT',
              headers: {
                'Authorization': 'Bearer ' + authToken,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                author_name: formData.get('author_name'),
                author_email: formData.get('author_email'),
                author_url: formData.get('author_url'),
                content: formData.get('content'),
                status: formData.get('status')
              })
            });

            modal.remove();
            await loadCommentsList(getUnifiedCommentStatusFilter());
            await loadMomentsList();
          } catch (error) {
            console.error('更新失败 unified moment comment:', error);
          }
        });
      } else {
        await editComment(commentId);
      }
    };

    window.deleteUnifiedComment = async function(type, parentResourceId, commentId) {
      if (type === 'moment_comment') {
        if (!confirm('确定要删除 this moment comment permanently?')) return;

        await fetch(API_BASE + '/moments/' + parentResourceId + '/comments/' + commentId + '?force=true', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });

        await loadCommentsList(getUnifiedCommentStatusFilter());
        await loadMomentsList();
      } else {
        await deleteComment(commentId);
      }
    };

    // Pages Management
    async function showPages() {
      renderLayout(i18n.t('nav.pages'));
      const content = document.querySelector('.content-area');

      content.innerHTML = \`
        <div class="page-header">
          <h2>\${i18n.t('pages.allPages')}</h2>
          <button class="button" onclick="showCreatePageModal()">\${i18n.t('pages.addNew')}</button>
        </div>
        <div id="pages-list"></div>
      \`;

      await loadPagesList();
    }

    async function loadPagesList() {
      try {
        const response = await fetch(API_BASE + '/pages?per_page=50&status=all', {
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const pages = await response.json();

        const container = document.getElementById('pages-list');
        if (pages.length === 0) {
          container.innerHTML = \`<div class="empty-state">\${i18n.t('pages.noPages')}</div>\`;
          return;
        }

        container.innerHTML = \`
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>\${i18n.t('posts.postTitle')}</th>
                  <th>\${i18n.t('common.status')}</th>
                  <th>\${i18n.t('pages.commentStatus')}</th>
                  <th>\${i18n.t('common.date')}</th>
                  <th>\${i18n.t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                \${pages.map(page => \`
                  <tr>
                    <td><strong>\${page.title.rendered}</strong></td>
                    <td>\${translateStatus(page.status)}</td>
                    <td>\${translateStatus(page.comment_status)}</td>
                    <td>\${new Date(page.date).toLocaleDateString()}</td>
                    <td class="actions">
                      <a href="#" class="action-link" onclick="editPage(\${page.id}); return false;">\${i18n.t('common.edit')}</a>
                      <a href="#" class="action-link delete" onclick="deletePage(\${page.id}); return false;">\${i18n.t('common.delete')}</a>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 pages:', error);
      }
    }

    window.showCreatePageModal = function() {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>创建新页面</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="create-page-form">
            <div class="form-group">
              <label>标题 *</label>
              <input type="text" name="title" required>
            </div>
            <div class="form-group">
              <label>Slug (URL) <small style="color: #646970;">(留空自动生成)</small></label>
              <input type="text" name="slug" placeholder="auto-generated-from-title">
            </div>
            <div class="form-group">
              <label>Content</label>
              <textarea id="page-content" name="content"></textarea>
            </div>
            <div class="form-group">
              <label>Excerpt</label>
              <textarea name="excerpt" style="min-height: 100px;"></textarea>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select name="status">
                <option value="draft">草稿</option>
                <option value="publish">发布</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div class="form-group">
              <label>评论状态</label>
              <select name="comment_status">
                <option value="open">开启</option>
                <option value="closed">关闭</option>
              </select>
            </div>
            <button type="submit" class="button" style="width: 100%;">Create Page</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      // Initialize EasyMDE
      const pageEditor = new EasyMDE({
        element: document.getElementById('page-content'),
        spellChecker: false,
        placeholder: '在此输入页面内容... 支持 Markdown 语法',
        toolbar: [
          'bold', 'italic', 'heading', '|',
          'quote', 'unordered-list', 'ordered-list', '|',
          'link', 'image', '|',
          'preview', 'side-by-side', 'fullscreen', '|',
          'guide'
        ],
        status: ['lines', 'words', 'cursor'],
        minHeight: '300px',
        maxHeight: '600px'
      });

      document.getElementById('create-page-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const pageData = {
            title: formData.get('title'),
            content: pageEditor.value(),
            excerpt: formData.get('excerpt'),
            status: formData.get('status'),
            comment_status: formData.get('comment_status')
          };

          const slug = formData.get('slug');
          if (slug && slug.trim()) {
            pageData.slug = slug.trim();
          }

          const response = await fetch(API_BASE + '/pages', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(pageData)
          });

          if (response.ok) {
            modal.remove();
            await loadPagesList();
          }
        } catch (error) {
          console.error('创建失败 page:', error);
        }
      });
    };

    window.editPage = async function(id) {
      const page = await fetch(API_BASE + '/pages/' + id, {
        headers: { 'Authorization': 'Bearer ' + authToken }
      }).then(r => r.json());

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>编辑页面</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="edit-page-form">
            <div class="form-group">
              <label>标题 *</label>
              <input type="text" name="title" value="\${page.title.rendered}" required>
            </div>
            <div class="form-group">
              <label>Slug (URL)</label>
              <input type="text" name="slug" value="\${page.slug}">
            </div>
            <div class="form-group">
              <label>Content</label>
              <textarea id="page-content-edit" name="content">\${page.content.rendered}</textarea>
            </div>
            <div class="form-group">
              <label>Excerpt</label>
              <textarea name="excerpt" style="min-height: 100px;">\${page.excerpt.rendered}</textarea>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select name="status">
                <option value="draft" \${page.status === 'draft' ? 'selected' : ''}>Draft</option>
                <option value="publish" \${page.status === 'publish' ? 'selected' : ''}>Publish</option>
                <option value="private" \${page.status === 'private' ? 'selected' : ''}>Private</option>
              </select>
            </div>
            <div class="form-group">
              <label>评论状态</label>
              <select name="comment_status">
                <option value="open" \${page.comment_status === 'open' ? 'selected' : ''}>Open</option>
                <option value="closed" \${page.comment_status === 'closed' ? 'selected' : ''}>Closed</option>
              </select>
            </div>
            <button type="submit" class="button" style="width: 100%;">更新页面</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      // Initialize EasyMDE
      const editPageEditor = new EasyMDE({
        element: document.getElementById('page-content-edit'),
        spellChecker: false,
        placeholder: '在此输入页面内容... 支持 Markdown 语法',
        toolbar: [
          'bold', 'italic', 'heading', '|',
          'quote', 'unordered-list', 'ordered-list', '|',
          'link', 'image', '|',
          'preview', 'side-by-side', 'fullscreen', '|',
          'guide'
        ],
        status: ['lines', 'words', 'cursor'],
        minHeight: '300px',
        maxHeight: '600px'
      });

      editPageEditor.value(page.content.rendered);

      document.getElementById('edit-page-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const pageData = {
            title: formData.get('title'),
            content: editPageEditor.value(),
            excerpt: formData.get('excerpt'),
            status: formData.get('status'),
            comment_status: formData.get('comment_status')
          };

          const slug = formData.get('slug');
          if (slug && slug.trim()) {
            pageData.slug = slug.trim();
          }

          const response = await fetch(API_BASE + '/pages/' + id, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(pageData)
          });

          if (response.ok) {
            modal.remove();
            await loadPagesList();
          }
        } catch (error) {
          console.error('更新失败 page:', error);
        }
      });
    };

    window.deletePage = async function(id) {
      if (!confirm('确定要删除 this page?')) return;

      try {
        await fetch(API_BASE + '/pages/' + id + '?force=true', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        await loadPagesList();
      } catch (error) {
        console.error('删除失败 page:', error);
      }
    };

    // Moments Management
    async function showMoments() {
      renderLayout(i18n.t('nav.moments'));
      const content = document.querySelector('.content-area');

      content.innerHTML = \`
        <div class="page-header">
          <h2>\${i18n.t('moments.allMoments')}</h2>
          <button class="button" onclick="showCreateMomentModal()">\${i18n.t('moments.addNew')}</button>
        </div>
        <div id="moments-list"></div>
      \`;

      await loadMomentsList();
    }

    async function loadMomentsList() {
      try {
        const response = await fetch(API_BASE + '/moments?per_page=50&status=all', {
          headers: { 'Authorization': 'Bearer ' + authToken }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', response.status, errorText);
          const container = document.getElementById('moments-list');
          container.innerHTML = '<div class="error-message">加载失败 moments. Please check if the moments table exists in the database.</div>';
          return;
        }

        const moments = await response.json();

        const container = document.getElementById('moments-list');
        if (!moments || !Array.isArray(moments) || moments.length === 0) {
          container.innerHTML = \`<div class="empty-state">\${i18n.t('moments.noMoments')}</div>\`;
          return;
        }

        container.innerHTML = \`
          <div style="display: grid; gap: 20px; margin-top: 20px;">
            \${moments.map(moment => \`
              <div style="background: #fff; border: 1px solid #c3c4c7; border-radius: 4px; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                  <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                      <img src="\${moment.author_avatar}" alt="\${moment.author_name}" style="width: 32px; height: 32px; border-radius: 50%;">
                      <div>
                        <strong>\${moment.author_name}</strong>
                        <div style="font-size: 12px; color: #646970;">\${new Date(moment.date).toLocaleString()}</div>
                      </div>
                    </div>
                    <div style="margin-bottom: 10px; white-space: pre-wrap;">\${moment.content.rendered}</div>
                    \${moment.media_urls && moment.media_urls.length > 0 ? \`
                      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin: 10px 0;">
                        \${moment.media_urls.map(url => \`
                          <img src="\${url}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">
                        \`).join('')}
                      </div>
                    \` : ''}
                    <div style="font-size: 13px; color: #646970; margin-top: 10px;">
                      <span style="margin-right: 15px;">👁️ \${moment.view_count} views</span>
                      <span style="margin-right: 15px;">❤️ \${moment.like_count} likes</span>
                      <span>💬 \${moment.comment_count} comments</span>
                    </div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <a href="#" class="action-link" onclick="manageMomentComments(\${moment.id}); return false;">管理评论</a>
                    <a href="#" class="action-link" onclick="editMoment(\${moment.id}); return false;">\${i18n.t('common.edit')}</a>
                    <a href="#" class="action-link delete" onclick="deleteMoment(\${moment.id}); return false;">\${i18n.t('common.delete')}</a>
                  </div>
                </div>
              </div>
            \`).join('')}
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 moments:', error);
      }
    }

    window.showCreateMomentModal = function() {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>创建新动态</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="create-moment-form">
            <div class="form-group">
              <label>内容 *</label>
              <textarea name="content" required style="min-height: 150px;" placeholder="What's on your mind?"></textarea>
            </div>
            <div class="form-group">
              <label>媒体 URLs (每行一个)</label>
              <textarea id="media-urls-input" name="media_urls" style="min-height: 100px;" placeholder="https://example.com/image1.jpg
https://example.com/image2.jpg"></textarea>
              <small style="color: #646970; display: block; margin-top: 5px;">Enter image URLs, 每行一个. Or use the media library below.</small>
            </div>
            <div style="margin-bottom: 15px;">
              <button type="button" class="button button-secondary" onclick="openMediaLibraryForMoment('create')">Select from Media Library</button>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select name="status">
                <option value="publish">发布</option>
                <option value="draft">草稿</option>
              </select>
            </div>
            <button type="submit" class="button" style="width: 100%;">Create Moment</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('create-moment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Parse media URLs
        const mediaUrlsText = formData.get('media_urls') || '';
        const mediaUrls = mediaUrlsText
          .split('\\n')
          .map(url => url.trim())
          .filter(url => url.length > 0);

        try {
          const response = await fetch(API_BASE + '/moments', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content: formData.get('content'),
              status: formData.get('status'),
              media_urls: mediaUrls
            })
          });

          if (response.ok) {
            modal.remove();
            await loadMomentsList();
          }
        } catch (error) {
          console.error('创建失败 moment:', error);
        }
      });
    };

    window.editMoment = async function(id) {
      const moment = await fetch(API_BASE + '/moments/' + id, {
        headers: { 'Authorization': 'Bearer ' + authToken }
      }).then(r => r.json());

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>编辑动态</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="edit-moment-form">
            <div class="form-group">
              <label>内容 *</label>
              <textarea name="content" required style="min-height: 150px;">\${moment.content.rendered}</textarea>
            </div>
            <div class="form-group">
              <label>媒体 URLs (每行一个)</label>
              <textarea id="media-urls-edit-input" name="media_urls" style="min-height: 100px;">\${moment.media_urls ? moment.media_urls.join('\\n') : ''}</textarea>
              <small style="color: #646970; display: block; margin-top: 5px;">Enter image URLs, 每行一个.</small>
            </div>
            <div style="margin-bottom: 15px;">
              <button type="button" class="button button-secondary" onclick="openMediaLibraryForMoment('edit', \${id})">Select from Media Library</button>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select name="status">
                <option value="publish" \${moment.status === 'publish' ? 'selected' : ''}>Publish</option>
                <option value="draft" \${moment.status === 'draft' ? 'selected' : ''}>Draft</option>
              </select>
            </div>
            <button type="submit" class="button" style="width: 100%;">更新动态</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('edit-moment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Parse media URLs
        const mediaUrlsText = formData.get('media_urls') || '';
        const mediaUrls = mediaUrlsText
          .split('\\n')
          .map(url => url.trim())
          .filter(url => url.length > 0);

        try {
          const response = await fetch(API_BASE + '/moments/' + id, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content: formData.get('content'),
              status: formData.get('status'),
              media_urls: mediaUrls
            })
          });

          if (response.ok) {
            modal.remove();
            await loadMomentsList();
          }
        } catch (error) {
          console.error('更新失败 moment:', error);
        }
      });
    };

    window.deleteMoment = async function(id) {
      if (!confirm('确定要删除 this moment?')) return;

      try {
        await fetch(API_BASE + '/moments/' + id + '?force=true', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        await loadMomentsList();
      } catch (error) {
        console.error('删除失败 moment:', error);
      }
    };

    window.manageMomentComments = async function(momentId) {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content" style="max-width: 1100px;">
          <div class="modal-header">
            <h2>管理动态评论</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <div class="page-header" style="margin-bottom: 16px;">
            <div>
              <select id="moment-comment-status-filter" style="padding: 8px;">
                <option value="all">\${i18n.t('common.all')}</option>
                <option value="approved">\${i18n.t('statusOptions.approved')}</option>
                <option value="pending">\${i18n.t('statusOptions.pending')}</option>
                <option value="spam">\${i18n.t('statusOptions.spam')}</option>
                <option value="trash">\${i18n.t('statusOptions.trash')}</option>
              </select>
            </div>
          </div>
          <div id="moment-comments-list"></div>
        </div>
      \`;
      modal.dataset.momentId = String(momentId);
      document.body.appendChild(modal);

      document.getElementById('moment-comment-status-filter').addEventListener('change', (e) => {
        loadMomentCommentsList(momentId, e.target.value);
      });

      await loadMomentCommentsList(momentId, 'all');
    };

    async function loadMomentCommentsList(momentId, status = 'all') {
      try {
        const [response, adminEmail] = await Promise.all([
          fetch(API_BASE + '/moments/' + momentId + '/comments?per_page=100&status=' + status, {
            headers: { 'Authorization': 'Bearer ' + authToken }
          }),
          getAdminEmail()
        ]);
        const comments = await response.json();

        const container = document.getElementById('moment-comments-list');
        if (!comments || !Array.isArray(comments) || comments.length === 0) {
          container.innerHTML = '<div class="empty-state">这条动态还没有评论。</div>';
          return;
        }

        const commentMap = new Map();
        const roots = [];

        comments.forEach(comment => {
          comment.children = [];
          commentMap.set(comment.id, comment);
        });

        comments.forEach(comment => {
          if (comment.parent && commentMap.has(comment.parent)) {
            commentMap.get(comment.parent).children.push(comment);
          } else {
            roots.push(comment);
          }
        });

        function renderMomentComment(comment, depth = 0) {
          const indent = depth * 30;
          const row = \`
            <tr style="background: \${depth > 0 ? '#f6f7f7' : 'white'};">
              <td style="padding-left: \${indent + 10}px;">
                \${depth > 0 ? '<span style="color: #2271b1; margin-right: 5px;">↳</span>' : ''}
                \${renderCommentAuthorMeta(comment.author_name, comment.author_email, adminEmail)}
              </td>
              <td style="max-width: 360px; overflow: hidden; text-overflow: ellipsis;">
                \${comment.content.rendered.substring(0, 120)}...
              </td>
              <td>
                <span style="padding: 3px 8px; background: \${
                  comment.status === 'approved' ? '#00a32a' :
                  comment.status === 'pending' ? '#dba617' :
                  comment.status === 'spam' ? '#d63638' : '#646970'
                }; color: white; border-radius: 3px; font-size: 12px;">
                  \${translateStatus(comment.status)}
                </span>
              </td>
              <td>\${new Date(comment.date).toLocaleDateString()}</td>
              <td class="actions">
                \${comment.status !== 'approved' ? \`<a href="#" class="action-link" onclick="approveMomentComment(\${momentId}, \${comment.id}); return false;">\${i18n.t('comments.approve')}</a>\` : ''}
                \${comment.status !== 'spam' ? \`<a href="#" class="action-link" onclick="markMomentCommentAsSpam(\${momentId}, \${comment.id}); return false;">\${i18n.t('comments.markAsSpam')}</a>\` : ''}
                <a href="#" class="action-link" onclick="replyToMomentComment(\${momentId}, \${comment.id}); return false;">\${i18n.t('comments.reply')}</a>
                <a href="#" class="action-link" onclick="editMomentComment(\${momentId}, \${comment.id}); return false;">\${i18n.t('common.edit')}</a>
                <a href="#" class="action-link delete" onclick="deleteMomentComment(\${momentId}, \${comment.id}); return false;">\${i18n.t('common.delete')}</a>
              </td>
            </tr>
          \`;

          const children = comment.children && comment.children.length
            ? comment.children.map(child => renderMomentComment(child, depth + 1)).join('')
            : '';
          return row + children;
        }

        container.innerHTML = \`
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>\${i18n.t('comments.author')}</th>
                  <th>\${i18n.t('comments.comment')}</th>
                  <th>\${i18n.t('common.status')}</th>
                  <th>\${i18n.t('common.date')}</th>
                  <th>\${i18n.t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                \${roots.map(comment => renderMomentComment(comment)).join('')}
              </tbody>
            </table>
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 moment comments:', error);
        const container = document.getElementById('moment-comments-list');
        if (container) {
          container.innerHTML = '<div class="error-message">加载动态评论失败。</div>';
        }
      }
    }

    window.approveMomentComment = async function(momentId, commentId) {
      try {
        await fetch(API_BASE + '/moments/' + momentId + '/comments/' + commentId, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + authToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'approved' })
        });
        const statusFilter = document.getElementById('moment-comment-status-filter').value;
        await loadMomentCommentsList(momentId, statusFilter);
        const unifiedFilter = document.getElementById('comment-status-filter')?.value;
        if (unifiedFilter) {
          await loadCommentsList(unifiedFilter);
        }
        await loadMomentsList();
      } catch (error) {
        console.error('Failed to approve moment comment:', error);
      }
    };

    window.markMomentCommentAsSpam = async function(momentId, commentId) {
      try {
        await fetch(API_BASE + '/moments/' + momentId + '/comments/' + commentId, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + authToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'spam' })
        });
        const statusFilter = document.getElementById('moment-comment-status-filter').value;
        await loadMomentCommentsList(momentId, statusFilter);
        const unifiedFilter = document.getElementById('comment-status-filter')?.value;
        if (unifiedFilter) {
          await loadCommentsList(unifiedFilter);
        }
        await loadMomentsList();
      } catch (error) {
        console.error('Failed to mark moment comment as spam:', error);
      }
    };

    window.replyToMomentComment = async function(momentId, parentId) {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>回复动态评论</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="reply-moment-comment-form">
            <div class="form-group">
              <label>回复内容 *</label>
              <textarea name="content" required style="min-height: 150px;" placeholder="输入回复内容..."></textarea>
            </div>
            <button type="submit" class="button" style="width: 100%;">发送回复</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('reply-moment-comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const response = await fetch(API_BASE + '/moments/' + momentId + '/comments', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              parent: parentId,
              content: formData.get('content')
            })
          });

          if (response.ok) {
            modal.remove();
            const statusFilter = document.getElementById('moment-comment-status-filter').value;
            await loadMomentCommentsList(momentId, statusFilter);
            const unifiedFilter = document.getElementById('comment-status-filter')?.value;
            if (unifiedFilter) {
              await loadCommentsList(unifiedFilter);
            }
            await loadMomentsList();
            showSuccess('回复已发送！');
          } else {
            const error = await response.json();
            showError('发送回复失败: ' + error.message);
          }
        } catch (error) {
          console.error('Failed to reply moment comment:', error);
          showError('发送回复失败');
        }
      });
    };

    window.editMomentComment = async function(momentId, commentId) {
      const comments = await fetch(API_BASE + '/moments/' + momentId + '/comments?per_page=100&status=all', {
        headers: { 'Authorization': 'Bearer ' + authToken }
      }).then(r => r.json());
      const comment = comments.find(item => item.id === commentId);
      if (!comment) return;

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <div class="modal-header">
            <h2>Edit Moment Comment</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <form id="edit-moment-comment-form">
            <div class="form-group">
              <label>Author Name *</label>
              <input type="text" name="author_name" value="\${comment.author_name}" required>
            </div>
            <div class="form-group">
              <label>Author Email *</label>
              <input type="email" name="author_email" value="\${comment.author_email || ''}" required>
            </div>
            <div class="form-group">
              <label>Author URL</label>
              <input type="url" name="author_url" value="\${comment.author_url || ''}">
            </div>
            <div class="form-group">
              <label>Comment *</label>
              <textarea name="content" required style="min-height: 150px;">\${comment.content.rendered}</textarea>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select name="status">
                <option value="approved" \${comment.status === 'approved' ? 'selected' : ''}>Approved</option>
                <option value="pending" \${comment.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="spam" \${comment.status === 'spam' ? 'selected' : ''}>Spam</option>
                <option value="trash" \${comment.status === 'trash' ? 'selected' : ''}>Trash</option>
              </select>
            </div>
            <button type="submit" class="button" style="width: 100%;">Update Comment</button>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('edit-moment-comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          await fetch(API_BASE + '/moments/' + momentId + '/comments/' + commentId, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              author_name: formData.get('author_name'),
              author_email: formData.get('author_email'),
              author_url: formData.get('author_url'),
              content: formData.get('content'),
              status: formData.get('status')
            })
          });
          modal.remove();
          const statusFilter = document.getElementById('moment-comment-status-filter').value;
          await loadMomentCommentsList(momentId, statusFilter);
          const unifiedFilter = document.getElementById('comment-status-filter')?.value;
          if (unifiedFilter) {
            await loadCommentsList(unifiedFilter);
          }
          await loadMomentsList();
        } catch (error) {
          console.error('更新失败 moment comment:', error);
        }
      });
    };

    window.deleteMomentComment = async function(momentId, commentId) {
      if (!confirm('确定要删除 this moment comment permanently?')) return;

      try {
        await fetch(API_BASE + '/moments/' + momentId + '/comments/' + commentId + '?force=true', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const statusFilter = document.getElementById('moment-comment-status-filter').value;
        await loadMomentCommentsList(momentId, statusFilter);
        const unifiedFilter = document.getElementById('comment-status-filter')?.value;
        if (unifiedFilter) {
          await loadCommentsList(unifiedFilter);
        }
        await loadMomentsList();
      } catch (error) {
        console.error('删除失败 moment comment:', error);
      }
    };

    window.openMediaLibraryForMoment = function(mode, momentId) {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = \`
        <div class="modal-content" style="max-width: 900px;">
          <div class="modal-header">
            <h2>Select Media</h2>
            <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <div style="margin-bottom: 15px;">
            <button class="button" onclick="show上传MediaModalInline()">上传 New File</button>
          </div>
          <div id="moment-media-library-grid" style="max-height: 60vh; overflow-y: auto;"></div>
        </div>
      \`;
      document.body.appendChild(modal);

      loadMediaLibraryForMoment(mode, momentId);
    };

    async function loadMediaLibraryForMoment(mode, momentId) {
      try {
        const response = await fetch(API_BASE + '/media?per_page=50', {
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const mediaItems = await response.json();

        const container = document.getElementById('moment-media-library-grid');
        if (mediaItems.length === 0) {
          container.innerHTML = '<div class="empty-state">No media files yet.</div>';
          return;
        }

        container.innerHTML = \`
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
            \${mediaItems.map(media => \`
              <div class="media-item" style="border: 2px solid #ddd; border-radius: 4px; overflow: 隐藏; cursor: pointer; transition: border-color 0.2s;" onclick="insertMediaIntoMoment('\${media.source_url}', '\${mode}')" onmouseover="this.style.borderColor='#2271b1'" onmouseout="this.style.borderColor='#ddd'">
                <div style="height: 120px; background: #f0f0f1; display: flex; align-items: center; justify-content: center; overflow: 隐藏;">
                  \${media.media_type === 'image'
                    ? \`<img src="\${media.source_url}" alt="\${media.alt_text}" style="max-width: 100%; max-height: 100%; object-fit: cover;">\`
                    : \`<div style="padding: 10px; text-align: center; font-size: 11px; color: #646970;">\${media.mime_type}</div>\`
                  }
                </div>
                <div style="padding: 8px; font-size: 12px; white-space: nowrap; overflow: 隐藏; text-overflow: ellipsis;" title="\${media.title.rendered}">\${media.title.rendered}</div>
              </div>
            \`).join('')}
          </div>
        \`;
      } catch (error) {
        console.error('加载失败 media library:', error);
      }
    }

    window.insertMediaIntoMoment = function(url, mode) {
      const textareaId = mode === 'edit' ? 'media-urls-edit-input' : 'media-urls-input';
      const textarea = document.getElementById(textareaId);

      if (textarea) {
        const currentValue = textarea.value.trim();
        textarea.value = currentValue ? currentValue + '\\n' + url : url;
      }

      // Close the media library modal
      const mediaModals = document.querySelectorAll('.modal');
      mediaModals.forEach(modal => {
        const header = modal.querySelector('.modal-header h2');
        if (header && header.textContent === 'Select Media') {
          modal.remove();
        }
      });
    };

    // Import Management
    async function showImportTools() {
      renderLayout(i18n.t('import.title'));
      const content = document.querySelector('.content-area');

      content.innerHTML = \`
        <div class="page-header">
          <h2>\${i18n.t('import.title')}</h2>
        </div>

        <div style="background: white; padding: 20px 24px; border: 1px solid #c3c4c7; border-radius: 4px; margin-bottom: 20px;">
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #1d2327;">\${i18n.t('import.subtitle')}</div>
          <div style="color: #646970; line-height: 1.7;">\${i18n.t('import.formatHint')}</div>
        </div>

        <div style="display: grid; gap: 20px; grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr); align-items: start;">
          <form id="import-form" style="background: white; padding: 24px; border: 1px solid #c3c4c7; border-radius: 4px;">
            <div class="form-group">
              <label>\${i18n.t('import.fileLabel')}</label>
              <input type="file" id="import-file-input" accept=".json,application/json">
              <small style="color: #646970; display: block; margin-top: 5px;">\${i18n.t('import.fileHint')}</small>
            </div>

            <div class="form-group">
              <label>\${i18n.t('import.strategyLabel')}</label>
              <select id="import-conflict-strategy">
                <option value="update">\${i18n.t('import.strategyUpdate')}</option>
                <option value="skip">\${i18n.t('import.strategySkip')}</option>
                <option value="duplicate">\${i18n.t('import.strategyDuplicate')}</option>
              </select>
            </div>

            <div class="form-group">
              <label style="display: flex; align-items: center; gap: 10px; font-weight: 500;">
                <input type="checkbox" id="import-dry-run" style="width: auto;">
                \${i18n.t('import.dryRun')}
              </label>
            </div>

            <div class="form-group">
              <label>\${i18n.t('import.textareaLabel')}</label>
              <textarea id="import-json-input" style="min-height: 520px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 13px;" placeholder='{
  "format": "cfblog-import",
  "version": "1.1",
  "content": [],
  "moments": []
}'></textarea>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
              <button type="button" class="button button-secondary" id="load-import-template-button">\${i18n.t('import.loadTemplate')}</button>
              <button type="submit" class="button">\${i18n.t('import.runImport')}</button>
            </div>
          </form>

          <div style="background: white; padding: 24px; border: 1px solid #c3c4c7; border-radius: 4px;">
            <h3 style="margin: 0 0 16px 0; color: #1d2327;">\${i18n.t('import.resultTitle')}</h3>
            <div id="import-result-panel" style="color: #646970;">\${i18n.t('import.noResult')}</div>
          </div>
        </div>
      \`;

      const fileInput = document.getElementById('import-file-input');
      const jsonInput = document.getElementById('import-json-input');
      const templateButton = document.getElementById('load-import-template-button');
      const importForm = document.getElementById('import-form');
      const IMPORT_BATCH_SIZE = 20;

      function toImportArray(value) {
        return Array.isArray(value) ? value : [];
      }

      function createImportBatches(importPackage) {
        const batches = [];
        const basePackage = {
          format: importPackage.format || 'cfblog-import',
          version: importPackage.version || '1.1',
          source: importPackage.source || null
        };
        const categories = toImportArray(importPackage.categories);
        const tags = toImportArray(importPackage.tags);
        const contentItems = toImportArray(importPackage.content);
        const momentItems = toImportArray(importPackage.moments);

        for (let start = 0; start < contentItems.length; start += IMPORT_BATCH_SIZE) {
          batches.push({
            ...basePackage,
            categories: batches.length === 0 ? categories : [],
            tags: batches.length === 0 ? tags : [],
            content: contentItems.slice(start, start + IMPORT_BATCH_SIZE),
            moments: []
          });
        }

        for (let start = 0; start < momentItems.length; start += IMPORT_BATCH_SIZE) {
          batches.push({
            ...basePackage,
            categories: [],
            tags: [],
            content: [],
            moments: momentItems.slice(start, start + IMPORT_BATCH_SIZE)
          });
        }

        return batches;
      }

      function createAggregateImportResult(importPackage, dryRun, conflictStrategy) {
        const contentItems = toImportArray(importPackage.content);
        const momentItems = toImportArray(importPackage.moments);
        const postsDetected = contentItems.filter(item => (item.type || 'post') === 'post').length;

        return {
          success: true,
          dry_run: dryRun,
          format: importPackage.format || 'cfblog-import',
          version: importPackage.version || '1.1',
          strategy: conflictStrategy,
          source: importPackage.source || null,
          summary: {
            total_content_items: contentItems.length,
            total_moment_items: momentItems.length,
            posts_detected: postsDetected,
            pages_detected: contentItems.length - postsDetected,
            moments_detected: momentItems.length,
            created: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            categories_created: 0,
            categories_matched: 0,
            tags_created: 0,
            tags_matched: 0
          },
          issues: []
        };
      }

      function mergeImportResult(target, source) {
        const summaryFields = [
          'created',
          'updated',
          'skipped',
          'failed',
          'categories_created',
          'categories_matched',
          'tags_created',
          'tags_matched'
        ];

        target.success = target.success && source.success !== false;

        for (const field of summaryFields) {
          target.summary[field] = (target.summary[field] || 0) + (source.summary?.[field] || 0);
        }

        if (Array.isArray(source.issues) && source.issues.length > 0) {
          target.issues.push(...source.issues);
        }
      }

      async function sendImportRequest(importPackage, dryRun, conflictStrategy) {
        const response = await fetch(API_BASE + '/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken
          },
          body: JSON.stringify({
            package: importPackage,
            options: {
              dry_run: dryRun,
              conflict_strategy: conflictStrategy
            }
          })
        });

        const responseText = await response.text();
        let result = {};

        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch {
          result = {
            message: responseText || ('HTTP ' + response.status)
          };
        }

        return { response, result };
      }

      function renderImportProgress(current, total) {
        const panel = document.getElementById('import-result-panel');
        if (!panel) {
          return;
        }

        panel.innerHTML = '<div style="padding: 14px; border: 1px solid #dcdcde; border-radius: 4px; background: #f6f7f7;">正在导入第 ' + current + ' / ' + total + ' 批，请稍候...</div>';
      }

      fileInput.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) {
          return;
        }

        try {
          jsonInput.value = await file.text();
          showSuccess(i18n.t('import.fileLoaded'));
        } catch (error) {
          console.error('读取导入文件失败:', error);
          showError(i18n.t('import.importFailed') + (error.message || ''));
        }
      });

      templateButton.addEventListener('click', async () => {
        try {
          const response = await fetch(API_BASE + '/import/template', {
            headers: {
              'Authorization': 'Bearer ' + authToken
            }
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to load import template');
          }

          const template = await response.json();
          jsonInput.value = JSON.stringify(template, null, 2);
          showSuccess(i18n.t('import.templateLoaded'));
        } catch (error) {
          console.error('加载导入模板失败:', error);
          showError(i18n.t('import.importFailed') + (error.message || ''));
        }
      });

      importForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        let parsedPackage;
        try {
          parsedPackage = JSON.parse(jsonInput.value || '{}');
        } catch (error) {
          showError(i18n.t('import.invalidJson'));
          return;
        }

        const dryRun = document.getElementById('import-dry-run').checked;
        const conflictStrategy = document.getElementById('import-conflict-strategy').value;

        try {
          const batches = createImportBatches(parsedPackage);
          if (batches.length === 0) {
            throw new Error('Import package must include content or moments.');
          }

          const aggregateResult = createAggregateImportResult(parsedPackage, dryRun, conflictStrategy);

          for (let index = 0; index < batches.length; index++) {
            renderImportProgress(index + 1, batches.length);
            const { response, result } = await sendImportRequest(batches[index], dryRun, conflictStrategy);

            if (!response.ok) {
              aggregateResult.success = false;
              aggregateResult.issues.push({
                level: 'error',
                scope: 'package',
                identifier: 'batch-' + (index + 1),
                message: 'Batch ' + (index + 1) + '/' + batches.length + ': ' + (result.message || 'Import failed.')
              });
              renderImportResult(aggregateResult);
              showError(i18n.t('import.importFailed') + (result.message || ''));
              return;
            }

            mergeImportResult(aggregateResult, result);
          }

          renderImportResult(aggregateResult);
          showSuccess((dryRun ? i18n.t('import.dryRunBadge') : i18n.t('import.completed')) + ' (' + batches.length + ' batches)');
        } catch (error) {
          console.error('执行导入失败:', error);
          renderImportResult({
            success: false,
            dry_run: dryRun,
            source: null,
            summary: {},
            issues: [{ level: 'error', scope: 'package', identifier: 'request', message: error.message || 'Import failed.' }]
          });
          showError(i18n.t('import.importFailed') + (error.message || ''));
        }
      });
    }

    function renderImportResult(result) {
      const panel = document.getElementById('import-result-panel');
      if (!panel) {
        return;
      }

      const summary = result.summary || {};
      const issues = Array.isArray(result.issues) ? result.issues : [];
      const source = result.source || {};
      const statCard = (label, value) => \`
        <div style="border: 1px solid #dcdcde; border-radius: 4px; padding: 12px 14px; background: #f6f7f7;">
          <div style="font-size: 12px; color: #646970; margin-bottom: 4px;">\${label}</div>
          <div style="font-size: 24px; color: #1d2327; font-weight: 600;">\${value ?? 0}</div>
        </div>
      \`;

      panel.innerHTML = \`
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
          <span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; background: \${result.success ? '#e8f5e9' : '#fbeaea'}; color: \${result.success ? '#2e7d32' : '#b42318'}; font-size: 12px; font-weight: 600;">
            \${result.success ? 'OK' : 'ERROR'}
          </span>
          \${result.dry_run ? \`<span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; background: #fff3cd; color: #8a6d3b; font-size: 12px; font-weight: 600;">\${i18n.t('import.dryRunBadge')}</span>\` : ''}
          <span style="color: #646970; font-size: 13px;">format: \${escapeHtml(result.format || 'cfblog-import')} / version: \${escapeHtml(result.version || '1.x')}</span>
        </div>

        <div style="display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); margin-bottom: 20px;">
          \${statCard(i18n.t('nav.posts'), summary.posts_detected)}
          \${statCard(i18n.t('nav.pages'), summary.pages_detected)}
          \${statCard(i18n.t('nav.moments'), summary.moments_detected)}
          \${statCard(i18n.t('import.summaryCreated'), summary.created)}
          \${statCard(i18n.t('import.summaryUpdated'), summary.updated)}
          \${statCard(i18n.t('import.summarySkipped'), summary.skipped)}
          \${statCard(i18n.t('import.summaryFailed'), summary.failed)}
          \${statCard(i18n.t('import.summaryCategories'), summary.categories_created)}
          \${statCard(i18n.t('import.summaryTags'), summary.tags_created)}
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; color: #1d2327;">\${i18n.t('import.sourceTitle')}</h4>
          <div style="border: 1px solid #dcdcde; border-radius: 4px; padding: 14px; background: #f9f9f9; font-size: 13px; line-height: 1.8;">
            <div><strong>platform:</strong> \${escapeHtml(source.platform || i18n.t('import.sourceUnknown'))}</div>
            <div><strong>site_name:</strong> \${escapeHtml(source.site_name || i18n.t('import.sourceUnknown'))}</div>
            <div><strong>site_url:</strong> \${escapeHtml(source.site_url || i18n.t('import.sourceUnknown'))}</div>
            <div><strong>exported_at:</strong> \${escapeHtml(source.exported_at || i18n.t('import.sourceUnknown'))}</div>
          </div>
        </div>

        <div>
          <h4 style="margin: 0 0 10px 0; color: #1d2327;">\${i18n.t('import.issuesTitle')}</h4>
          \${issues.length > 0 ? \`
            <div style="display: grid; gap: 10px;">
              \${issues.map(issue => \`
                <div style="border: 1px solid \${issue.level === 'error' ? '#f5c2c7' : '#ffe69c'}; border-radius: 4px; padding: 12px 14px; background: \${issue.level === 'error' ? '#fff5f5' : '#fff8e1'};">
                  <div style="font-size: 12px; font-weight: 700; margin-bottom: 6px; color: \${issue.level === 'error' ? '#b42318' : '#8a6d3b'};">
                    \${escapeHtml(issue.level.toUpperCase())} / \${escapeHtml(issue.scope)} / \${escapeHtml(issue.identifier)}
                  </div>
                  <div style="color: #1d2327; line-height: 1.6;">\${escapeHtml(issue.message)}</div>
                </div>
              \`).join('')}
            </div>
          \` : \`<div style="color: #646970;">\${i18n.t('import.noIssues')}</div>\`}
        </div>
      \`;
    }

    // Settings Management
    async function showSettings() {
      renderLayout(i18n.t('settings.title'));
      const content = document.querySelector('.content-area');

      content.innerHTML = \`
        <div class="page-header">
          <h2>\${i18n.t('settings.title')}</h2>
        </div>
        <div id="settings-container"></div>
      \`;

      await loadSettings();
    }

    async function loadSettings() {
      try {
        const authToken = localStorage.getItem('auth_token');
        const response = await fetch(API_BASE + '/settings/admin', {
          headers: {
            'Authorization': 'Bearer ' + authToken
          }
        });
        const settings = await response.json();
        adminEmailCache = normalizeEmail(settings.admin_email);

        const container = document.getElementById('settings-container');
        container.innerHTML = \`
          <div style="max-width: 800px;">
            <!-- Language Settings -->
            <div style="background: white; padding: 20px 30px; border: 1px solid #c3c4c7; border-radius: 4px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #1d2327;">\${i18n.t('settings.language') || '界面语言'}</h3>
              <div class="form-group" style="margin-bottom: 0;">
                <select id="admin-lang-select" onchange="switchLanguage(this.value)" style="padding: 10px; min-width: 200px;">
                  <option value="zh" \${i18n.currentLang === 'zh' ? 'selected' : ''}>中文</option>
                  <option value="en" \${i18n.currentLang === 'en' ? 'selected' : ''}>English</option>
                </select>
                <small style="color: #646970; display: block; margin-top: 5px;">\${i18n.t('settings.languageHint') || '选择后台管理界面的显示语言'}</small>
              </div>
            </div>

            <form id="settings-form" style="background: white; padding: 30px; border: 1px solid #c3c4c7; border-radius: 4px;">
              <div class="form-group">
                <label>\${i18n.t('settings.siteTitle')} *</label>
                <input type="text" name="site_title" value="\${settings.site_title || ''}" required>
                <small style="color: #646970; display: block; margin-top: 5px;">\${i18n.t('settings.siteTitleHint')}</small>
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.siteUrl')} *</label>
                <input type="url" name="site_url" value="\${settings.site_url || ''}" required placeholder="https://example.com">
                <small style="color: #646970; display: block; margin-top: 5px;">
                  \${i18n.t('settings.siteUrlHint')}
                </small>
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.adminEmail')} *</label>
                <input type="email" name="admin_email" value="\${settings.admin_email || ''}" required placeholder="admin@example.com">
                <small style="color: #646970; display: block; margin-top: 5px;">\${i18n.t('settings.adminEmailHint')}</small>
              </div>

              <hr style="margin: 30px 0; border: none; border-top: 1px solid #dcdcde;">

              <h3 style="margin-bottom: 20px; color: #1d2327;">\${i18n.t('settings.emailNotifications')}</h3>

              <div class="form-group">
                <label>\${i18n.t('settings.fromName')}</label>
                <input type="text" name="mail_from_name" value="\${settings.mail_from_name || settings.site_title || ''}" placeholder="CFBlog">
                <small style="color: #646970; display: block; margin-top: 5px;">
                  \${i18n.t('settings.fromNameHint')}
                </small>
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.fromEmail')}</label>
                <input type="email" name="mail_from_email" value="\${settings.mail_from_email || ''}" placeholder="notifications@example.com">
                <small style="color: #646970; display: block; margin-top: 5px;">
                  \${i18n.t('settings.fromEmailHint')}
                </small>
              </div>

              <div class="form-group">
                <label style="display: flex; align-items: center; gap: 10px; font-weight: 500;">
                  <input type="checkbox" name="mail_notifications_enabled" value="1" \${(settings.mail_notifications_enabled || '0') === '1' ? 'checked' : ''} style="width: auto;">
                  \${i18n.t('settings.enableMailNotifications')}
                </label>
                <small style="color: #646970; display: block; margin-top: 5px;">
                  \${i18n.t('settings.enableMailNotificationsHint')}
                </small>
              </div>

              <div class="form-group">
                <label style="display: flex; align-items: center; gap: 10px; font-weight: 500;">
                  <input type="checkbox" name="notify_admin_on_comment" value="1" \${(settings.notify_admin_on_comment || '1') === '1' ? 'checked' : ''} style="width: auto;">
                  \${i18n.t('settings.notifyAdminOnComment')}
                </label>
              </div>

              <div class="form-group">
                <label style="display: flex; align-items: center; gap: 10px; font-weight: 500;">
                  <input type="checkbox" name="notify_commenter_on_reply" value="1" \${(settings.notify_commenter_on_reply || '1') === '1' ? 'checked' : ''} style="width: auto;">
                  \${i18n.t('settings.notifyCommenterOnReply')}
                </label>
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.siteDescription')}</label>
                <textarea name="site_description" style="min-height: 100px;">\${settings.site_description || ''}</textarea>
                <small style="color: #646970; display: block; margin-top: 5px;">\${i18n.t('settings.siteDescriptionHint')}</small>
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.siteKeywords')}</label>
                <input type="text" name="site_keywords" value="\${settings.site_keywords || ''}" placeholder="blog, tech, programming">
                <small style="color: #646970; display: block; margin-top: 5px;">\${i18n.t('settings.siteKeywordsHint')}</small>
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.siteAuthor')}</label>
                <input type="text" name="site_author" value="\${settings.site_author || ''}">
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.siteFavicon')}</label>
                <input type="url" name="site_favicon" value="\${settings.site_favicon || ''}" placeholder="https://example.com/favicon.ico">
                <small style="color: #646970; display: block; margin-top: 5px;">\${i18n.t('settings.siteFaviconHint')}</small>
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.siteLogo')}</label>
                <input type="url" name="site_logo" value="\${settings.site_logo || ''}" placeholder="https://example.com/logo.png">
                <small style="color: #646970; display: block; margin-top: 5px;">\${i18n.t('settings.siteLogoHint')}</small>
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.siteNotice')}</label>
                <textarea name="site_notice" style="min-height: 100px;" placeholder="\${i18n.t('settings.siteNoticePlaceholder')}">\${settings.site_notice || ''}</textarea>
                <small style="color: #646970; display: block; margin-top: 5px;">\${i18n.t('settings.siteNoticeHint')}</small>
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.siteIcp')}</label>
                <input type="text" name="site_icp" value="\${settings.site_icp || ''}" placeholder="\${i18n.t('settings.siteIcpPlaceholder')}">
                <small style="color: #646970; display: block; margin-top: 5px;">\${i18n.t('settings.siteIcpHint')}</small>
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.footerText')}</label>
                <textarea name="site_footer_text" style="min-height: 80px;">\${settings.site_footer_text || ''}</textarea>
                <small style="color: #646970; display: block; margin-top: 5px;">\${i18n.t('settings.footerTextHint')}</small>
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.headHtml')}</label>
                <textarea name="head_html" style="min-height: 120px; font-family: monospace; font-size: 13px;">\${settings.head_html || ''}</textarea>
                <small style="color: #646970; display: block; margin-top: 5px;">
                  \${i18n.t('settings.headHtmlHint')}
                </small>
              </div>

              <hr style="margin: 30px 0; border: none; border-top: 1px solid #dcdcde;">

              <h3 style="margin-bottom: 20px; color: #1d2327;">\${i18n.t('settings.socialContacts')}</h3>

              <div class="form-group">
                <label>Telegram</label>
                <input type="text" name="social_telegram" value="\${settings.social_telegram || ''}" placeholder="\${i18n.t('settings.socialTelegramPlaceholder')}">
              </div>

              <div class="form-group">
                <label>X</label>
                <input type="text" name="social_x" value="\${settings.social_x || ''}" placeholder="\${i18n.t('settings.socialXPlaceholder')}">
              </div>

              <div class="form-group">
                <label>Mastodon</label>
                <input type="text" name="social_mastodon" value="\${settings.social_mastodon || ''}" placeholder="\${i18n.t('settings.socialMastodonPlaceholder')}">
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.email')}</label>
                <input type="email" name="social_email" value="\${settings.social_email || ''}" placeholder="you@example.com">
              </div>

              <div class="form-group">
                <label>QQ</label>
                <input type="text" name="social_qq" value="\${settings.social_qq || ''}" placeholder="\${i18n.t('settings.socialQqPlaceholder')}">
              </div>

              <hr style="margin: 30px 0; border: none; border-top: 1px solid #dcdcde;">

              <h3 style="margin-bottom: 20px; color: #1d2327;">\${i18n.t('settings.webhookSection')}</h3>

              <div class="form-group">
                <label>\${i18n.t('settings.webhookUrl')}</label>
                <input type="url" name="webhook_url" value="\${settings.webhook_url || ''}" placeholder="https://example.com/webhook">
                <small style="color: #646970; display: block; margin-top: 5px;">
                  \${i18n.t('settings.webhookUrlHint')}
                </small>
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.webhookSecret')}</label>
                <input type="password" name="webhook_secret" value="\${settings.webhook_secret || ''}" placeholder="\${i18n.t('settings.webhookSecretPlaceholder')}">
                <small style="color: #646970; display: block; margin-top: 5px;">
                  \${i18n.t('settings.webhookSecretHint')}
                </small>
              </div>

              <div class="form-group">
                <label>\${i18n.t('settings.webhookEvents')}</label>
                <div style="border: 1px solid #8c8f94; border-radius: 3px; padding: 15px; background: #f9f9f9;">
                  <div style="margin-bottom: 10px;">
                    <strong style="font-size: 13px; color: #2c3338;">\${i18n.t('settings.webhookEventsSelect')}</strong>
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                    <label style="display: flex; align-items: center; padding: 5px 0; font-weight: 400;">
                      <input type="checkbox" name="webhook_events" value="post.created" \${(settings.webhook_events || '').includes('post.created') ? 'checked' : ''} style="width: auto; margin-right: 8px;">
                      post.created (\${i18n.t('settings.webhookEventPostCreated')})
                    </label>
                    <label style="display: flex; align-items: center; padding: 5px 0; font-weight: 400;">
                      <input type="checkbox" name="webhook_events" value="post.updated" \${(settings.webhook_events || '').includes('post.updated') ? 'checked' : ''} style="width: auto; margin-right: 8px;">
                      post.updated (\${i18n.t('settings.webhookEventPostUpdated')})
                    </label>
                    <label style="display: flex; align-items: center; padding: 5px 0; font-weight: 400;">
                      <input type="checkbox" name="webhook_events" value="post.published" \${(settings.webhook_events || '').includes('post.published') ? 'checked' : ''} style="width: auto; margin-right: 8px;">
                      post.published (\${i18n.t('settings.webhookEventPostPublished')})
                    </label>
                    <label style="display: flex; align-items: center; padding: 5px 0; font-weight: 400;">
                      <input type="checkbox" name="webhook_events" value="post.deleted" \${(settings.webhook_events || '').includes('post.deleted') ? 'checked' : ''} style="width: auto; margin-right: 8px;">
                      post.deleted (\${i18n.t('settings.webhookEventPostDeleted')})
                    </label>
                    <label style="display: flex; align-items: center; padding: 5px 0; font-weight: 400;">
                      <input type="checkbox" name="webhook_events" value="comment.created" \${(settings.webhook_events || '').includes('comment.created') ? 'checked' : ''} style="width: auto; margin-right: 8px;">
                      comment.created (\${i18n.t('settings.webhookEventCommentCreated')})
                    </label>
                    <label style="display: flex; align-items: center; padding: 5px 0; font-weight: 400;">
                      <input type="checkbox" name="webhook_events" value="comment.updated" \${(settings.webhook_events || '').includes('comment.updated') ? 'checked' : ''} style="width: auto; margin-right: 8px;">
                      comment.updated (\${i18n.t('settings.webhookEventCommentUpdated')})
                    </label>
                    <label style="display: flex; align-items: center; padding: 5px 0; font-weight: 400;">
                      <input type="checkbox" name="webhook_events" value="comment.deleted" \${(settings.webhook_events || '').includes('comment.deleted') ? 'checked' : ''} style="width: auto; margin-right: 8px;">
                      comment.deleted (\${i18n.t('settings.webhookEventCommentDeleted')})
                    </label>
                  </div>
                </div>
                <small style="color: #646970; display: block; margin-top: 5px;">
                  \${i18n.t('settings.webhookEventsHint')}
                  <strong>\${i18n.t('settings.webhookRecommended')}</strong> post.published, post.updated
                </small>
              </div>

              <div style="background: #f0f6fc; border: 1px solid #0969da; border-radius: 4px; padding: 15px; margin-bottom: 20px;">
                <strong style="color: #0969da;">💡 \${i18n.t('settings.webhookTipsTitle')}</strong>
                <ul style="margin: 10px 0 0 20px; color: #646970; font-size: 13px; line-height: 1.6;">
                  <li>\${i18n.t('settings.webhookTipDeploy')}</li>
                  <li>\${i18n.t('settings.webhookTipPublish')}</li>
                  <li>\${i18n.t('settings.webhookTipDraft')}</li>
                  <li>\${i18n.t('settings.webhookTipDraftToPublish')}</li>
                  <li>\${i18n.t('settings.webhookTipUpdatePublished')}</li>
                </ul>
              </div>

              <div id="settings-message" class="隐藏" style="margin-bottom: 20px;"></div>

              <button type="submit" class="button" style="width: 100%;">\${i18n.t('settings.saveSettings')}</button>
            </form>
          </div>
        \`;

        document.getElementById('settings-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);

          // Collect selected webhook events
          const webhookEvents = Array.from(formData.getAll('webhook_events')).join(',');

          const settingsData = {
            site_title: formData.get('site_title'),
            site_url: formData.get('site_url'),
            admin_email: formData.get('admin_email'),
            mail_from_name: formData.get('mail_from_name'),
            mail_from_email: formData.get('mail_from_email'),
            mail_notifications_enabled: formData.get('mail_notifications_enabled') ? '1' : '0',
            notify_admin_on_comment: formData.get('notify_admin_on_comment') ? '1' : '0',
            notify_commenter_on_reply: formData.get('notify_commenter_on_reply') ? '1' : '0',
            site_description: formData.get('site_description'),
            site_keywords: formData.get('site_keywords'),
            site_author: formData.get('site_author'),
            site_favicon: formData.get('site_favicon'),
            site_logo: formData.get('site_logo'),
            site_notice: formData.get('site_notice'),
            social_telegram: formData.get('social_telegram'),
            social_x: formData.get('social_x'),
            social_mastodon: formData.get('social_mastodon'),
            social_email: formData.get('social_email'),
            social_qq: formData.get('social_qq'),
            site_icp: formData.get('site_icp'),
            site_footer_text: formData.get('site_footer_text'),
            head_html: formData.get('head_html'),
            webhook_url: formData.get('webhook_url'),
            webhook_secret: formData.get('webhook_secret'),
            webhook_events: webhookEvents
          };

          try {
            const authToken = localStorage.getItem('auth_token');
            const response = await fetch(API_BASE + '/settings', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
              },
              body: JSON.stringify(settingsData)
            });

            const messageDiv = document.getElementById('settings-message');
            messageDiv.classList.remove('隐藏');

            if (response.ok) {
              messageDiv.className = 'success-message';
              messageDiv.textContent = i18n.t('settings.settingsSaved');
              adminEmailCache = normalizeEmail(settingsData.admin_email);

              // Reload settings after 1 second
              setTimeout(() => {
                messageDiv.classList.add('隐藏');
              }, 3000);
            } else {
              const error = await response.json();
              messageDiv.className = 'error-message';
              messageDiv.textContent = i18n.t('settings.saveFailed') + ' ' + error.message;
            }
          } catch (error) {
            console.error('Failed to save settings:', error);
            const messageDiv = document.getElementById('settings-message');
            messageDiv.classList.remove('隐藏');
            messageDiv.className = 'error-message';
            messageDiv.textContent = i18n.t('settings.saveFailed') + ' ' + (error.message || '');
          }
        });
      } catch (error) {
        console.error('加载失败 settings:', error);
        const container = document.getElementById('settings-container');
        container.innerHTML = '<div class="error-message">' + i18n.t('settings.loadFailed') + '</div>';
      }
    }

    function logout() {
      localStorage.removeItem('auth_token');
      authToken = null;
      currentUser = null;
      showLogin();
    }

    // Initialize
    async function init() {
      const authenticated = await checkAuth();
      if (authenticated) {
        navigate('/');
      }
    }

    // Start app
    init();
  </script>
</body>
</html>
  `);
});

registerPublicSiteRoutes(app);

app.notFound(async (c) => {
  const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
  if (assetResponse.status !== 404) {
    return assetResponse;
  }
  return c.text('Not Found', 404);
});

export default app;
