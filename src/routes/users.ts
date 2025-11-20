import { Hono } from 'hono';
import { Env, User, JWTPayload } from '../types';
import { formatUserResponse, buildPaginationHeaders, createWPError, getSiteSettings } from '../utils';
import { authMiddleware, optionalAuthMiddleware, requireRole, generateToken, hashPassword, comparePassword } from '../auth';

const users = new Hono<{ Bindings: Env }>();

// POST /wp/v2/users/login - Login (non-standard WordPress endpoint but useful)
users.post('/login', async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return createWPError('rest_invalid_param', 'Username and password are required.', 400);
    }

    // Find user
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND status = ?'
    )
      .bind(username, username, 'active')
      .first<User>();

    if (!user) {
      return createWPError('invalid_username', 'Invalid username or password.', 401);
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password!);

    if (!isValidPassword) {
      return createWPError('invalid_password', 'Invalid username or password.', 401);
    }

    // Update last login
    await c.env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?')
      .bind(new Date().toISOString(), user.id)
      .run();

    // Generate token
    const token = await generateToken(user, c.env.JWT_SECRET);

    // Remove password from response
    delete user.password;

    return c.json({
      token,
      user: await formatUserResponse(user, baseUrl, true),
      user_email: user.email,
      user_nicename: user.username,
      user_display_name: user.display_name || user.username
    });
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// POST /wp/v2/users/register - Register new user
users.post('/register', async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const body = await c.req.json();
    const { username, email, password, display_name } = body;

    if (!username || !email || !password) {
      return createWPError(
        'rest_invalid_param',
        'Username, email, and password are required.',
        400
      );
    }

    // Check if username or email already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    )
      .bind(username, email)
      .first();

    if (existingUser) {
      return createWPError(
        'existing_user_login',
        'Sorry, that username or email already exists!',
        400
      );
    }

    // Check if this is the first user - if so, make them an administrator
    const userCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users')
      .first();

    const isFirstUser = (userCount?.count as number) === 0;
    const userRole = isFirstUser ? 'administrator' : 'subscriber';

    // Hash password
    const hashedPassword = await hashPassword(password);

    const now = new Date().toISOString();

    // Create user
    const result = await c.env.DB.prepare(
      'INSERT INTO users (username, email, password, display_name, role, status, registered_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(username, email, hashedPassword, display_name || username, userRole, 'active', now)
      .run();

    const userId = result.meta.last_row_id;

    // Get created user
    const createdUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    // Generate token
    const token = await generateToken(createdUser!, c.env.JWT_SECRET);

    // Remove password from response
    delete createdUser!.password;

    return c.json(
      {
        token,
        user: await formatUserResponse(createdUser!, baseUrl, true)
      },
      201
    );
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// GET /wp/v2/users/me - Get current user
users.get('/me', authMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const user = c.get('user') as JWTPayload;

    const dbUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(user.userId)
      .first<User>();

    if (!dbUser) {
      return createWPError('rest_user_invalid_id', 'Invalid user ID.', 404);
    }

    delete dbUser.password;

    return c.json(await formatUserResponse(dbUser, baseUrl, true));
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// GET /wp/v2/users - List users
users.get('/', optionalAuthMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    // Check if user is authenticated admin
    let isAdmin = false;
    try {
      const user = c.get('user') as JWTPayload;
      isAdmin = user && ['administrator', 'editor'].includes(user.role);
    } catch (e) {
      // Not authenticated, continue as public user
    }

    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(c.req.query('per_page') || '10');
    const search = c.req.query('search');
    const role = c.req.query('role');
    const orderby = c.req.query('orderby') || 'registered_at';
    const order = c.req.query('order') || 'desc';

    const offset = (page - 1) * perPage;

    let query = 'SELECT * FROM users WHERE status = ?';
    const params: any[] = ['active'];

    if (search) {
      query += ' AND (username LIKE ? OR email LIKE ? OR display_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    // Order
    const orderMap: Record<string, string> = {
      registered: 'registered_at',
      name: 'display_name',
      id: 'id',
      email: 'email'
    };
    const orderColumn = orderMap[orderby] || 'registered_at';
    query += ` ORDER BY ${orderColumn} ${order.toUpperCase()} LIMIT ? OFFSET ?`;
    params.push(perPage, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM users WHERE status = ?';
    const countParams: any[] = ['active'];
    if (search) {
      countQuery += ' AND (username LIKE ? OR email LIKE ? OR display_name LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (role) {
      countQuery += ' AND role = ?';
      countParams.push(role);
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const totalItems = (countResult?.count as number) || 0;

    const formattedUsers = await Promise.all((result.results as User[]).map(async (user) => {
      delete user.password;
      return await formatUserResponse(user, baseUrl, isAdmin);
    }));

    // Add pagination headers
    const headers = buildPaginationHeaders(
      page,
      perPage,
      totalItems,
      `${baseUrl}/wp-json/wp/v2/users`
    );

    return c.json(formattedUsers, 200, headers);
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// GET /wp/v2/users/:id - Get single user
users.get('/:id', optionalAuthMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const id = parseInt(c.req.param('id'));

    // Check if user is authenticated admin or viewing their own profile
    let isAdmin = false;
    try {
      const currentUser = c.get('user') as JWTPayload;
      isAdmin = (currentUser && ['administrator', 'editor'].includes(currentUser.role)) || currentUser?.userId === id;
    } catch (e) {
      // Not authenticated, continue as public user
    }

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ? AND status = ?')
      .bind(id, 'active')
      .first<User>();

    if (!user) {
      return createWPError('rest_user_invalid_id', 'Invalid user ID.', 404);
    }

    delete user.password;

    return c.json(await formatUserResponse(user, baseUrl, isAdmin));
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// POST /wp/v2/users - Create user (admin only)
users.post('/', authMiddleware, requireRole('administrator'), async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const body = await c.req.json();
    const { username, email, password, display_name, role } = body;

    if (!username || !email || !password) {
      return createWPError(
        'rest_invalid_param',
        'Username, email, and password are required.',
        400
      );
    }

    // Check if username or email already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    )
      .bind(username, email)
      .first();

    if (existingUser) {
      return createWPError(
        'existing_user_login',
        'Sorry, that username or email already exists!',
        400
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const now = new Date().toISOString();

    // Create user
    const result = await c.env.DB.prepare(
      'INSERT INTO users (username, email, password, display_name, role, status, registered_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        username,
        email,
        hashedPassword,
        display_name || username,
        role || 'subscriber',
        'active',
        now
      )
      .run();

    const userId = result.meta.last_row_id;

    // Get created user
    const createdUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    delete createdUser!.password;

    return c.json(await formatUserResponse(createdUser!, baseUrl, true), 201);
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// PUT /wp/v2/users/:id - Update user
users.put('/:id', authMiddleware, async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const currentUser = c.get('user') as JWTPayload;
    const id = parseInt(c.req.param('id'));

    // Check if user can edit (self or admin)
    if (currentUser.userId !== id && currentUser.role !== 'administrator') {
      return createWPError(
        'rest_cannot_edit',
        'Sorry, you are not allowed to edit this user.',
        403
      );
    }

    // Check if user exists
    const existingUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<User>();

    if (!existingUser) {
      return createWPError('rest_user_invalid_id', 'Invalid user ID.', 404);
    }

    const body = await c.req.json();
    const { email, display_name, bio, avatar_url, password, role } = body;

    // Only admins can change roles
    if (role && currentUser.role !== 'administrator') {
      return createWPError(
        'rest_cannot_edit_roles',
        'Sorry, you are not allowed to edit roles.',
        403
      );
    }

    // Check if email is being changed and if it's already in use
    if (email !== undefined && email !== existingUser.email) {
      const emailExists = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?')
        .bind(email, id)
        .first();

      if (emailExists) {
        return createWPError(
          'existing_user_email',
          'Sorry, that email address is already used!',
          400
        );
      }
    }

    // Build update query dynamically to avoid undefined values
    const updates: string[] = [];
    const params: any[] = [];

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }

    if (display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(display_name);
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio);
    }

    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatar_url);
    }

    if (password) {
      const hashedPassword = await hashPassword(password);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (role && currentUser.role === 'administrator') {
      updates.push('role = ?');
      params.push(role);
    }

    // If no fields to update, return current user
    if (updates.length === 0) {
      delete existingUser.password;
      return c.json(await formatUserResponse(existingUser, baseUrl, true));
    }

    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    await c.env.DB.prepare(updateQuery).bind(...params).run();

    // Get updated user
    const updatedUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<User>();

    delete updatedUser!.password;

    return c.json(await formatUserResponse(updatedUser!, baseUrl, true));
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

// DELETE /wp/v2/users/:id - Delete user (admin only)
users.delete('/:id', authMiddleware, requireRole('administrator'), async (c) => {
  try {
    const settings = await getSiteSettings(c.env);
    const baseUrl = settings.site_url || 'http://localhost:8787';

    const id = parseInt(c.req.param('id'));
    const reassign = c.req.query('reassign');
    const force = c.req.query('force') === 'true';

    // Check if user exists
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<User>();

    if (!user) {
      return createWPError('rest_user_invalid_id', 'Invalid user ID.', 404);
    }

    // Don't allow deleting yourself
    const currentUser = c.get('user') as JWTPayload;
    if (currentUser.userId === id) {
      return createWPError(
        'rest_cannot_delete',
        'Sorry, you cannot delete yourself.',
        403
      );
    }

    if (force) {
      // Reassign posts if specified
      if (reassign) {
        await c.env.DB.prepare('UPDATE posts SET author_id = ? WHERE author_id = ?')
          .bind(parseInt(reassign), id)
          .run();
      } else {
        // Delete user's posts
        await c.env.DB.prepare('DELETE FROM posts WHERE author_id = ?').bind(id).run();
      }

      // Delete user
      await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
      await c.env.DB.prepare('DELETE FROM user_meta WHERE user_id = ?').bind(id).run();

      delete user.password;

      return c.json({ deleted: true, previous: await formatUserResponse(user, baseUrl, true) });
    } else {
      // Deactivate user
      await c.env.DB.prepare('UPDATE users SET status = ? WHERE id = ?').bind('inactive', id).run();

      const deactivatedUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
        .bind(id)
        .first<User>();

      delete deactivatedUser!.password;

      return c.json(await formatUserResponse(deactivatedUser!, baseUrl, true));
    }
  } catch (error: any) {
    return createWPError('server_error', error.message, 500);
  }
});

export default users;
