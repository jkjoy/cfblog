// Cloudflare Workers environment bindings
export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  AI: Ai;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  SITE_NAME: string;
  SITE_URL: string;
}

// User types
export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  display_name: string | null;
  role: 'administrator' | 'editor' | 'author' | 'contributor' | 'subscriber';
  status: 'active' | 'inactive';
  registered_at: string;
  last_login: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export interface UserResponse {
  id: number;
  name: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  avatar_urls: Record<number, string>;
  roles?: string[];
  role?: string; // For backward compatibility
  email?: string;
  registered_date?: string;
  meta: any[];
  _links: any;
}

// Post types
export interface Post {
  id: number;
  title: string;
  content: string | null;
  excerpt: string | null;
  slug: string;
  status: 'publish' | 'draft' | 'pending' | 'private' | 'trash';
  post_type: 'post' | 'page';
  author_id: number;
  parent_id: number;
  featured_image: string | null;
  featured_image_url: string | null;
  featured_media_id: number | null;
  comment_status: 'open' | 'closed';
  comment_count: number;
  view_count: number;
  sticky: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface PostResponse {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  author: number;
  featured_media: number;
  featured_image_url?: string;
  comment_status: string;
  ping_status: string;
  sticky: boolean;
  template: string;
  format: string;
  meta: any[];
  categories: number[];
  tags: number[];
  comment_count?: number;
  view_count?: number;
  _links: any;
}

// Category types
export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parent_id: number;
  count: number;
  created_at: string;
}

export interface CategoryResponse {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
  meta: any[];
  _links: any;
}

// Tag types
export interface Tag {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  count: number;
  created_at: string;
}

export interface TagResponse {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  meta: any[];
  _links: any;
}

// Media types
export interface Media {
  id: number;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  r2_key: string;
  url: string;
  alt_text: string | null;
  caption: string | null;
  description: string | null;
  width: number | null;
  height: number | null;
  author_id: number;
  created_at: string;
}

export interface MediaResponse {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  author: number;
  comment_status: string;
  ping_status: string;
  template: string;
  meta: any[];
  description: {
    rendered: string;
  };
  caption: {
    rendered: string;
  };
  alt_text: string;
  media_type: string;
  mime_type: string;
  media_details: {
    width: number;
    height: number;
    file: string;
    filesize: number;
  };
  source_url: string;
  _links: any;
}

// Comment types
export interface Comment {
  id: number;
  post_id: number;
  parent_id: number;
  author_name: string;
  author_email: string;
  author_url: string | null;
  author_ip: string | null;
  content: string;
  status: 'approved' | 'pending' | 'spam' | 'trash';
  user_id: number | null;
  created_at: string;
}

export interface CommentResponse {
  id: number;
  post: number;
  post_title?: string; // Title of the post this comment belongs to
  parent: number;
  author: number; // user_id, 0 for guests
  author_name: string;
  author_url: string;
  author_email?: string; // Only visible to admins
  author_ip?: string; // Only visible to admins
  date: string;
  date_gmt: string;
  content: {
    rendered: string;
  };
  link: string;
  status: string;
  type: string;
  author_avatar_urls: Record<number, string>;
  meta: any[];
  _links: any;
}

// JWT payload
export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// API Response
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  per_page?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: string;
}

// WordPress REST API error response
export interface WPError {
  code: string;
  message: string;
  data: {
    status: number;
  };
}
