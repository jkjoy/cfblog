import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { clearSettingsCache } from '../utils'
import { authMiddleware, requireRole } from '../auth'

const settings = new Hono<AppEnv>()

// 获取所有系统设置（管理员专用，包含敏感字段）
settings.get('/admin', authMiddleware, requireRole('administrator'), async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT setting_key, setting_value
      FROM site_settings
      ORDER BY setting_key
    `).all()

    // 将结果转换为对象格式，包含所有字段（包括敏感字段）
    const settingsObj: Record<string, string> = {}
    for (const row of result.results) {
      settingsObj[row.setting_key as string] = row.setting_value as string
    }

    return c.json(settingsObj)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return c.json({ error: 'Failed to fetch settings' }, 500)
  }
})

// 获取所有系统设置（公开，不含敏感字段）
settings.get('/', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT setting_key, setting_value
      FROM site_settings
      ORDER BY setting_key
    `).all()

    // 敏感字段列表，不应返回给前端
    const sensitiveFields = [
      'webhook_secret',
      'webhook_url',
      'mail_notifications_enabled',
      'notify_admin_on_comment',
      'notify_commenter_on_reply',
      'mail_from_name',
      'mail_from_email'
    ]

    // 将结果转换为对象格式，过滤敏感字段
    const settingsObj: Record<string, string> = {}
    for (const row of result.results) {
      const key = row.setting_key as string
      // 跳过敏感字段
      if (!sensitiveFields.includes(key)) {
        settingsObj[key] = row.setting_value as string
      }
    }

    return c.json(settingsObj)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return c.json({ error: 'Failed to fetch settings' }, 500)
  }
})

// 获取单个设置
settings.get('/:key', async (c) => {
  try {
    const key = c.req.param('key')

    const result = await c.env.DB.prepare(`
      SELECT setting_value
      FROM site_settings
      WHERE setting_key = ?
    `).bind(key).first()

    if (!result) {
      return c.json({ error: 'Setting not found' }, 404)
    }

    return c.json({
      key,
      value: result.setting_value
    })
  } catch (error) {
    console.error('Error fetching setting:', error)
    return c.json({ error: 'Failed to fetch setting' }, 500)
  }
})

// 更新系统设置（仅管理员）
settings.put('/', authMiddleware, requireRole('administrator'), async (c) => {
  try {
    const body = await c.req.json()

    // 批量更新设置
    const updates = Object.entries(body)

    for (const [key, value] of updates) {
      await c.env.DB.prepare(`
        INSERT INTO site_settings (setting_key, setting_value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_at = CURRENT_TIMESTAMP
      `).bind(key, value as string).run()
    }

    // Clear settings cache
    clearSettingsCache()

    return c.json({
      success: true,
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return c.json({ error: 'Failed to update settings' }, 500)
  }
})

// 更新单个设置（仅管理员）
settings.put('/:key', authMiddleware, requireRole('administrator'), async (c) => {
  try {
    const key = c.req.param('key')
    const { value } = await c.req.json()

    await c.env.DB.prepare(`
      INSERT INTO site_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = CURRENT_TIMESTAMP
    `).bind(key, value).run()

    // Clear settings cache
    clearSettingsCache()

    return c.json({
      success: true,
      key,
      value
    })
  } catch (error) {
    console.error('Error updating setting:', error)
    return c.json({ error: 'Failed to update setting' }, 500)
  }
})

export default settings
