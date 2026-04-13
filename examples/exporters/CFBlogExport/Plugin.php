<?php
namespace TypechoPlugin\CFBlogExport;

use Typecho\Plugin\PluginInterface;
use Typecho\Widget\Helper\Form;
use Utils\Helper;
use Widget\Options;

if (!defined('__TYPECHO_ROOT_DIR__')) {
    exit;
}

/**
 * Export Typecho content to the cfblog-import JSON format used by CFBlog.
 *
 * @package CFBlogExport
 * @author CFBlog
 * @version 1.0.0
 * @link https://github.com/jkjoy/cloudflare-blog-REST-API
 */
class Plugin implements PluginInterface
{
    private const PANEL_FILE = 'CFBlogExport/panel.php';

    public static function activate()
    {
        $menuIndex = Helper::addMenu('CFBlogExport');
        Helper::addPanel($menuIndex, self::PANEL_FILE, 'CFBlog Export', 'CFBlog Export', 'administrator');
        return _t('CFBlog export panel has been added.');
    }

    public static function deactivate()
    {
        $menuIndex = Helper::removeMenu('CFBlogExport');
        Helper::removePanel($menuIndex, self::PANEL_FILE);
        return _t('CFBlog export panel has been removed.');
    }

    public static function config(Form $form)
    {
    }

    public static function personalConfig(Form $form)
    {
    }

    public static function buildExportPackage()
    {
        $db = \Typecho\Db::get();
        $options = Options::alloc();

        $categoryRows = $db->fetchAll(
            $db->select('mid', 'name', 'slug', 'description', 'parent')
                ->from('table.metas')
                ->where('type = ?', 'category')
                ->order('mid', \Typecho\Db::SORT_ASC)
        );

        $tagRows = $db->fetchAll(
            $db->select('mid', 'name', 'slug', 'description')
                ->from('table.metas')
                ->where('type = ?', 'tag')
                ->order('mid', \Typecho\Db::SORT_ASC)
        );

        $userRows = $db->fetchAll(
            $db->select('uid', 'name', 'mail', 'screenName')
                ->from('table.users')
        );

        $relationshipRows = $db->fetchAll(
            $db->select('cid', 'mid')
                ->from('table.relationships')
        );

        $contentRows = $db->fetchAll(
            $db->select('cid', 'title', 'slug', 'text', 'created', 'modified', 'type', 'status', 'authorId', 'allowComment')
                ->from('table.contents')
                ->where('type IN ?', array('post', 'page'))
                ->order('created', \Typecho\Db::SORT_ASC)
        );

        $usersById = array();
        foreach ($userRows as $userRow) {
            $usersById[(int) $userRow['uid']] = array(
                'username' => (string) $userRow['name'],
                'display_name' => (string) $userRow['screenName'],
                'email' => (string) $userRow['mail'],
            );
        }

        $metaById = array();
        $categoriesById = array();
        foreach ($categoryRows as $row) {
            $slug = !empty($row['slug']) ? (string) $row['slug'] : self::slugify((string) $row['name'], (int) $row['mid']);
            $metaById[(int) $row['mid']] = array(
                'type' => 'category',
                'slug' => $slug,
            );
            $categoriesById[(int) $row['mid']] = $slug;
        }

        $categories = array();
        foreach ($categoryRows as $row) {
            $slug = $categoriesById[(int) $row['mid']];
            $item = array(
                'name' => (string) $row['name'],
                'slug' => $slug,
                'description' => (string) $row['description'],
            );

            if (!empty($row['parent']) && isset($categoriesById[(int) $row['parent']])) {
                $item['parent_slug'] = $categoriesById[(int) $row['parent']];
            }

            $categories[] = $item;
        }

        $tags = array();
        foreach ($tagRows as $row) {
            $slug = !empty($row['slug']) ? (string) $row['slug'] : self::slugify((string) $row['name'], (int) $row['mid']);
            $metaById[(int) $row['mid']] = array(
                'type' => 'tag',
                'slug' => $slug,
            );

            $tags[] = array(
                'name' => (string) $row['name'],
                'slug' => $slug,
                'description' => (string) $row['description'],
            );
        }

        $termsByContentId = array();
        foreach ($relationshipRows as $row) {
            $cid = (int) $row['cid'];
            $mid = (int) $row['mid'];
            if (!isset($metaById[$mid])) {
                continue;
            }

            $type = $metaById[$mid]['type'];
            $slug = $metaById[$mid]['slug'];
            if (!isset($termsByContentId[$cid])) {
                $termsByContentId[$cid] = array(
                    'category' => array(),
                    'tag' => array(),
                );
            }

            $termsByContentId[$cid][$type][] = $slug;
        }

        $content = array();
        foreach ($contentRows as $row) {
            $cid = (int) $row['cid'];
            $slug = !empty($row['slug']) ? (string) $row['slug'] : self::slugify((string) $row['title'], $cid);
            $status = self::mapStatus((string) $row['status']);
            $termMap = isset($termsByContentId[$cid]) ? $termsByContentId[$cid] : array('category' => array(), 'tag' => array());
            $normalizedContent = self::normalizeContent((string) $row['text']);

            $item = array(
                'type' => $row['type'] === 'page' ? 'page' : 'post',
                'title' => (string) $row['title'],
                'slug' => $slug,
                'content' => $normalizedContent,
                'excerpt' => self::excerpt($normalizedContent),
                'status' => $status,
                'created_at' => self::isoTime($row['created']),
                'updated_at' => self::isoTime($row['modified']),
                'comment_status' => !empty($row['allowComment']) ? 'open' : 'closed',
                'sticky' => false,
                'categories' => array_values(array_unique($termMap['category'])),
                'tags' => array_values(array_unique($termMap['tag'])),
                'source' => array(
                    'id' => (string) $cid,
                    'url' => self::buildContentUrl($options, $slug),
                ),
                'author' => isset($usersById[(int) $row['authorId']]) ? $usersById[(int) $row['authorId']] : array(
                    'username' => '',
                    'display_name' => '',
                    'email' => '',
                ),
            );

            if ($status === 'publish') {
                $item['published_at'] = self::isoTime($row['created']);
            }

            $content[] = $item;
        }

        return array(
            'format' => 'cfblog-import',
            'version' => '1.0',
            'source' => array(
                'platform' => 'typecho',
                'site_name' => (string) $options->title,
                'site_url' => rtrim((string) $options->siteUrl, '/'),
                'exported_at' => gmdate('c'),
                'generator' => 'cfblog-typecho-exporter/1.0.0',
            ),
            'categories' => $categories,
            'tags' => $tags,
            'content' => $content,
        );
    }

    private static function isoTime($timestamp)
    {
        return gmdate('c', (int) $timestamp);
    }

    private static function buildContentUrl($options, $slug)
    {
        return rtrim((string) $options->siteUrl, '/') . '/' . ltrim((string) $slug, '/');
    }

    private static function normalizeContent($text)
    {
        $content = (string) $text;
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $content = preg_replace('/^\s*<!--\s*(markdown|html)\s*-->\s*/i', '', $content);

        return (string) $content;
    }

    private static function excerpt($text)
    {
        $plain = trim(strip_tags((string) $text));
        if (function_exists('mb_substr')) {
            return mb_substr($plain, 0, 180, 'UTF-8');
        }

        return substr($plain, 0, 180);
    }

    private static function slugify($value, $fallbackId)
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', (string) $value), '-'));
        if ($slug === '') {
            $slug = 'entry-' . (int) $fallbackId;
        }
        return $slug;
    }

    private static function mapStatus($status)
    {
        switch ($status) {
            case 'publish':
                return 'publish';
            case 'private':
                return 'private';
            case 'hidden':
            case 'waiting':
            default:
                return 'draft';
        }
    }
}
