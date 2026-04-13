<?php
if (!defined('__TYPECHO_ROOT_DIR__')) {
    exit;
}

$panel = isset($_GET['panel']) ? (string) $_GET['panel'] : 'CFBlogExport/panel.php';
$downloadUrl = './extending.php?panel=' . rawurlencode($panel) . '&download=1';

if (isset($_GET['download']) && $_GET['download'] === '1') {
    $package = \TypechoPlugin\CFBlogExport\Plugin::buildExportPackage();

    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename=cfblog-typecho-export-' . gmdate('Ymd-His') . '.json');

    echo json_encode($package, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>CFBlog Export</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            padding: 24px;
            color: #1d2327;
        }
        .card {
            max-width: 780px;
            background: #fff;
            border: 1px solid #dcdcde;
            border-radius: 6px;
            padding: 24px;
        }
        .button {
            display: inline-block;
            margin-top: 16px;
            padding: 10px 16px;
            background: #2271b1;
            color: #fff;
            text-decoration: none;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>CFBlog Export</h1>
        <p>This panel exports Typecho content to the <code>cfblog-import</code> JSON format used by CFBlog.</p>
        <p>After downloading the JSON file, open the CFBlog admin panel and import it from the new Import page.</p>
        <a class="button" href="<?php echo htmlspecialchars($downloadUrl, ENT_QUOTES, 'UTF-8'); ?>">Download JSON</a>
    </div>
</body>
</html>
