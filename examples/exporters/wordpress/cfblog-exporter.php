<?php
/**
 * Plugin Name: CFBlog Exporter
 * Description: Export WordPress posts and pages to the cfblog-import JSON format used by CFBlog.
 * Version: 1.0.0
 * Author: CFBlog
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('admin_menu', 'cfblog_exporter_register_page');
add_action('admin_post_cfblog_export_download', 'cfblog_exporter_handle_download');

function cfblog_exporter_register_page() {
    add_management_page(
        'CFBlog Export',
        'CFBlog Export',
        'export',
        'cfblog-exporter',
        'cfblog_exporter_render_page'
    );
}

function cfblog_exporter_render_page() {
    if (!current_user_can('export')) {
        wp_die(esc_html__('You do not have permission to export content.', 'cfblog-exporter'));
    }
    ?>
    <div class="wrap">
        <h1>CFBlog Export</h1>
        <p>Download a JSON package that can be imported from the CFBlog admin import page.</p>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('cfblog_export_download'); ?>
            <input type="hidden" name="action" value="cfblog_export_download">

            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row">Content Types</th>
                    <td>
                        <label><input type="checkbox" name="post_types[]" value="post" checked> Posts</label><br>
                        <label><input type="checkbox" name="post_types[]" value="page" checked> Pages</label>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Statuses</th>
                    <td>
                        <label><input type="checkbox" name="include_drafts" value="1"> Include drafts</label><br>
                        <label><input type="checkbox" name="include_private" value="1"> Include private items</label><br>
                        <label><input type="checkbox" name="include_pending" value="1"> Include pending items</label>
                    </td>
                </tr>
            </table>

            <?php submit_button('Download CFBlog JSON'); ?>
        </form>
    </div>
    <?php
}

function cfblog_exporter_handle_download() {
    if (!current_user_can('export')) {
        wp_die(esc_html__('You do not have permission to export content.', 'cfblog-exporter'));
    }

    check_admin_referer('cfblog_export_download');

    $post_types = isset($_POST['post_types'])
        ? array_values(array_intersect(array_map('sanitize_key', (array) wp_unslash($_POST['post_types'])), array('post', 'page')))
        : array('post', 'page');

    if (empty($post_types)) {
        $post_types = array('post', 'page');
    }

    $post_statuses = array('publish');
    if (!empty($_POST['include_drafts'])) {
        $post_statuses[] = 'draft';
    }
    if (!empty($_POST['include_private'])) {
        $post_statuses[] = 'private';
    }
    if (!empty($_POST['include_pending'])) {
        $post_statuses[] = 'pending';
    }

    $package = cfblog_exporter_build_package($post_types, array_unique($post_statuses));

    nocache_headers();
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename=cfblog-wordpress-export-' . gmdate('Ymd-His') . '.json');

    echo wp_json_encode($package, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function cfblog_exporter_build_package(array $post_types, array $post_statuses) {
    $query = new WP_Query(array(
        'post_type' => $post_types,
        'post_status' => $post_statuses,
        'posts_per_page' => -1,
        'orderby' => 'date',
        'order' => 'ASC',
        'ignore_sticky_posts' => false,
        'no_found_rows' => true,
    ));

    $categories = get_terms(array(
        'taxonomy' => 'category',
        'hide_empty' => false,
    ));

    $tags = get_terms(array(
        'taxonomy' => 'post_tag',
        'hide_empty' => false,
    ));

    return array(
        'format' => 'cfblog-import',
        'version' => '1.0',
        'source' => array(
            'platform' => 'wordpress',
            'site_name' => get_bloginfo('name'),
            'site_url' => untrailingslashit(home_url('/')),
            'exported_at' => gmdate('c'),
            'generator' => 'cfblog-wordpress-exporter/1.0.0',
        ),
        'categories' => cfblog_exporter_map_terms($categories, 'category'),
        'tags' => cfblog_exporter_map_terms($tags, 'post_tag'),
        'content' => array_map('cfblog_exporter_map_post', $query->posts),
    );
}

function cfblog_exporter_map_terms($terms, $taxonomy) {
    if (is_wp_error($terms) || empty($terms)) {
        return array();
    }

    $mapped = array();
    foreach ($terms as $term) {
        $parent_slug = '';
        if (!empty($term->parent)) {
            $parent = get_term((int) $term->parent, $taxonomy);
            if ($parent && !is_wp_error($parent)) {
                $parent_slug = $parent->slug;
            }
        }

        $item = array(
            'name' => $term->name,
            'slug' => $term->slug,
            'description' => (string) $term->description,
        );

        if ($parent_slug) {
            $item['parent_slug'] = $parent_slug;
        }

        $mapped[] = $item;
    }

    return $mapped;
}

function cfblog_exporter_map_post(WP_Post $post) {
    $post_type = $post->post_type === 'page' ? 'page' : 'post';
    $status = cfblog_exporter_map_status($post->post_status);
    $author = get_userdata((int) $post->post_author);
    $published_at = $status === 'publish'
        ? gmdate('c', (int) get_post_time('U', true, $post))
        : null;

    $item = array(
        'type' => $post_type,
        'title' => html_entity_decode($post->post_title, ENT_QUOTES, get_bloginfo('charset')),
        'slug' => $post->post_name,
        'content' => $post->post_content,
        'excerpt' => wp_strip_all_tags((string) get_the_excerpt($post)),
        'status' => $status,
        'created_at' => gmdate('c', (int) get_post_time('U', true, $post)),
        'updated_at' => gmdate('c', (int) get_post_modified_time('U', true, $post)),
        'comment_status' => $post->comment_status === 'closed' ? 'closed' : 'open',
        'sticky' => $post_type === 'post' ? is_sticky($post->ID) : false,
        'featured_image_url' => get_the_post_thumbnail_url($post, 'full') ?: '',
        'categories' => $post_type === 'post' ? cfblog_exporter_get_term_slugs($post->ID, 'category') : array(),
        'tags' => $post_type === 'post' ? cfblog_exporter_get_term_slugs($post->ID, 'post_tag') : array(),
        'source' => array(
            'id' => (string) $post->ID,
            'url' => get_permalink($post) ?: '',
        ),
        'author' => array(
            'username' => $author ? $author->user_login : '',
            'display_name' => $author ? $author->display_name : '',
            'email' => $author ? $author->user_email : '',
        ),
    );

    if ($published_at) {
        $item['published_at'] = $published_at;
    }

    if ($post_type === 'page' && !empty($post->post_parent)) {
        $parent = get_post((int) $post->post_parent);
        if ($parent instanceof WP_Post && !empty($parent->post_name)) {
            $item['parent_slug'] = $parent->post_name;
        }
    }

    return $item;
}

function cfblog_exporter_get_term_slugs($post_id, $taxonomy) {
    $terms = wp_get_post_terms((int) $post_id, $taxonomy, array('fields' => 'slugs'));
    if (is_wp_error($terms) || empty($terms)) {
        return array();
    }

    return array_values(array_filter(array_map('strval', $terms)));
}

function cfblog_exporter_map_status($status) {
    switch ($status) {
        case 'publish':
        case 'draft':
        case 'pending':
        case 'private':
        case 'trash':
            return $status;
        default:
            return 'draft';
    }
}
