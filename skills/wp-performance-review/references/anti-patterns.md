# WordPress Performance Anti-Patterns

Complete catalog of performance anti-patterns for WordPress code review.

## Quick Lookup Table

| Pattern to Find | Severity | Issue |
|-----------------|----------|-------|
| `posts_per_page => -1` | CRITICAL | Unbounded query |
| `numberposts => -1` | CRITICAL | Unbounded query |
| `query_posts()` | CRITICAL | Replaces main query, breaks pagination |
| `session_start()` | CRITICAL | Cache bypass |
| `setInterval.*fetch` | CRITICAL | Polling/self-DDoS |
| `intval($var)` in query args | CRITICAL | Falsy → 0 → no WHERE |
| `update_option` on frontend | CRITICAL | DB write per request |
| `cache_results => false` | WARNING | Disables query cache |
| `LIKE '%...%'` | WARNING | Full table scan |
| `post__not_in` | WARNING | Slow exclusion, filter in PHP instead |
| `meta_query` with `value` | WARNING | Unindexed scan |
| `wp_remote_get` uncached | WARNING | Blocking HTTP |
| `$.post(` for reads | WARNING | Bypasses cache |
| `add_option` without autoload=no | WARNING | Bloats alloptions |
| `setcookie()` on public pages | WARNING | Prevents caching |
| `url_to_postid()` | WARNING | Uncached lookup |
| `get_template_part` in loops | WARNING | Repeated file I/O |
| `admin-ajax.php` | WARNING | Full WP bootstrap |
| `in_array()` without strict | WARNING | O(n) complexity at scale |
| `import _ from 'lodash'` | WARNING | Full library import bloats bundle |
| Heredoc/nowdoc syntax | WARNING | Prevents late escaping |
| Page builder plugins | WARNING | High query count |
| Infinite scroll with POST | WARNING | Uncached requests |
| Many `registerBlockStyle()` | WARNING | Creates iframe per style |
| Missing script version | INFO | Cache busting issues |
| Missing `no_found_rows` | INFO | Unnecessary count |

## Database Query Anti-Patterns

### Unbounded Queries (CRITICAL)
Queries without limits can return millions of rows, causing OOM errors and timeouts.

```php
// ❌ BAD: No limit - returns ALL posts.
$query = new WP_Query(
    array(
        'post_type'      => 'post',
        'posts_per_page' => -1, // CRITICAL: Unbounded.
    )
);

// ✅ GOOD: Always set reasonable limits.
$query = new WP_Query(
    array(
        'post_type'      => 'post',
        'posts_per_page' => 100,
        'no_found_rows'  => true, // Skip counting total rows if not paginating.
    )
);
```

### Using query_posts() (CRITICAL)
`query_posts()` replaces the main query, breaking pagination and conditional functions. Never use it.

```php
// ❌ CRITICAL: Never use query_posts().
query_posts( 'cat=1&posts_per_page=5' );
// Breaks: is_single(), is_page(), pagination, etc.

// ✅ GOOD: Use pre_get_posts to modify main query.
add_action( 'pre_get_posts', 'prefix_modify_main_query' );

function prefix_modify_main_query( $query ) {
    if ( ! is_admin() && $query->is_main_query() && $query->is_home() ) {
        $query->set( 'posts_per_page', 5 );
        $query->set( 'cat', 1 );
    }
}

// ✅ GOOD: Use WP_Query for secondary queries.
$custom_query = new WP_Query(
    array(
        'cat'            => 1,
        'posts_per_page' => 5,
    )
);
```

### Disabling Query Cache (WARNING)
Setting `cache_results => false` prevents WordPress from caching query results.

```php
// ❌ BAD: Disables query result caching.
$query = new WP_Query(
    array(
        'post_type'     => 'post',
        'cache_results' => false, // Forces fresh DB query every time.
    )
);

// ✅ GOOD: Let WordPress cache results (default behavior).
$query = new WP_Query(
    array(
        'post_type' => 'post',
        // cache_results defaults to true.
    )
);
```

### Missing WHERE Clause (CRITICAL)
Falsy values cast to int become 0, removing the WHERE clause entirely.

```php
// ❌ BAD: If $post_id is false/null, this becomes p=0 (no filter!).
$post_id = get_some_id_that_might_fail(); // Returns false.
$query   = new WP_Query(
    array(
        'p'              => intval( $post_id ), // intval( false ) = 0.
        'posts_per_page' => -1,
    )
);
// Result: SELECT * FROM wp_posts WHERE 1=1... (returns ALL posts).

// ✅ GOOD: Validate before querying.
$post_id = get_some_id_that_might_fail();

if ( $post_id ) {
    $query = new WP_Query(
        array(
            'p' => $post_id,
        )
    );
}
```

### LIKE with Leading Wildcard (WARNING)
Leading wildcards force full table scans - indexes cannot be used.

```php
// ❌ BAD: Full table scan.
$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->posts} WHERE post_title LIKE %s",
        '%search%'
    )
);

// ✅ BETTER: Trailing wildcard can use index.
$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->posts} WHERE post_title LIKE %s",
        'search%'
    )
);

// ✅ BEST: Offload to ElasticSearch for full-text search.
// Use ElasticPress plugin for search queries.
```

### NOT IN Queries (WARNING)
`post__not_in` and `NOT IN` clauses scale poorly with large exclusion lists. A better approach is filtering in PHP instead.

```php
// ❌ BAD: Slow with many IDs - creates expensive SQL.
$query = new WP_Query(
    array(
        'post__not_in'   => $hundreds_of_ids, // Each ID checked per row.
        'posts_per_page' => 10,
    )
);

// ✅ GOOD: Use positive filtering when possible.
$query = new WP_Query(
    array(
        'post__in'       => $desired_ids,
        'posts_per_page' => 10,
        'orderby'        => 'post__in',
    )
);

// ✅ BETTER: Filter in PHP after fetching extra posts.
$posts_to_exclude = array( 1, 2, 3, 4, 5 );
$query            = new WP_Query(
    array(
        'posts_per_page' => 10 + count( $posts_to_exclude ), // Fetch extra.
        'no_found_rows'  => true,
    )
);

$count = 0;
while ( $query->have_posts() && $count < 10 ) {
    $query->the_post();

    if ( in_array( get_the_ID(), $posts_to_exclude, true ) ) {
        continue; // Skip excluded posts.
    }

    // Process post.
    $count++;
}
wp_reset_postdata();
```

### Over-use of Taxonomies (WARNING)
Include child terms multiplies query complexity.

```php
// ❌ BAD: Queries all child categories too.
$query = new WP_Query(
    array(
        'cat' => 6, // include_children defaults to true.
    )
);

// ✅ GOOD: Exclude children when not needed.
$query = new WP_Query(
    array(
        'cat'              => 6,
        'include_children' => false,
    )
);
```

### Missing Date Limits (INFO)
Mature sites accumulate millions of posts over years.

```php
// ❌ BAD: Scans entire posts table.
$query = new WP_Query(
    array(
        'category_name'  => 'news',
        'posts_per_page' => 10,
    )
);

// ✅ GOOD: Limit to recent content.
$query = new WP_Query(
    array(
        'category_name'  => 'news',
        'posts_per_page' => 10,
        'date_query'     => array(
            array(
                'after' => '3 months ago',
            ),
        ),
    )
);
```

## Hooks & Actions Anti-Patterns

### Expensive Code on Every Request (WARNING)
Code hooked to `init`, `wp_loaded`, or `plugins_loaded` runs on EVERY request.

```php
// ❌ BAD: Runs on every page load.
add_action( 'init', 'prefix_fetch_external_data_bad' );

function prefix_fetch_external_data_bad() {
    $data = wp_remote_get( 'https://api.example.com/data' ); // HTTP call every request!
}

// ✅ GOOD: Use transients or object cache.
add_action( 'init', 'prefix_fetch_external_data_good' );

function prefix_fetch_external_data_good() {
    $data = get_transient( 'prefix_external_data' );

    if ( false === $data ) {
        $response = wp_remote_get( 'https://api.example.com/data' );

        if ( ! is_wp_error( $response ) ) {
            $data = wp_remote_retrieve_body( $response );
            set_transient( 'prefix_external_data', $data, HOUR_IN_SECONDS );
        }
    }
}
```

### Database Writes on Page Load (CRITICAL)
INSERT/UPDATE on every request causes database contention and binlog growth.

```php
// ❌ CRITICAL: DB write on every page view.
add_action( 'wp_head', 'prefix_track_views_bad' );

function prefix_track_views_bad() {
    $views = get_option( 'prefix_page_views', 0 );
    update_option( 'prefix_page_views', $views + 1 );
}

// ✅ GOOD: Batch via object cache, flush periodically via cron.
add_action( 'shutdown', 'prefix_track_views_good' );

function prefix_track_views_good() {
    wp_cache_incr( 'prefix_page_views_buffer', 1, 'counters' );
}

// Cron job flushes buffer to database.
add_action( 'prefix_flush_view_counts', 'prefix_flush_views_to_db' );

function prefix_flush_views_to_db() {
    $buffer = wp_cache_get( 'prefix_page_views_buffer', 'counters' );

    if ( $buffer ) {
        $current = get_option( 'prefix_page_views', 0 );
        update_option( 'prefix_page_views', $current + $buffer );
        wp_cache_delete( 'prefix_page_views_buffer', 'counters' );
    }
}
```

### Inefficient Hook Placement (WARNING)
Running code in hooks that fire when not needed.

```php
// ❌ BAD: Runs on admin AND frontend.
add_action( 'init', 'prefix_frontend_only_function' );

// ✅ GOOD: Conditional execution.
add_action( 'init', 'prefix_maybe_run_frontend_code' );

function prefix_maybe_run_frontend_code() {
    if ( is_admin() ) {
        return;
    }
    prefix_frontend_only_function();
}

// ✅ BETTER: Use appropriate hook that only fires on frontend.
add_action( 'template_redirect', 'prefix_frontend_only_function' );
```

### Excessive Hook Callbacks (WARNING)
Many callbacks on the same hook add function call overhead.

```php
// ❌ BAD: 50 separate callbacks.
for ( $i = 0; $i < 50; $i++ ) {
    add_filter( 'the_content', "prefix_filter_{$i}" );
}

// ✅ GOOD: Consolidate into single callback.
add_filter( 'the_content', 'prefix_process_content' );

function prefix_process_content( $content ) {
    // All transformations in one place.
    $content = prefix_transform_links( $content );
    $content = prefix_add_schema( $content );
    $content = prefix_lazy_load_images( $content );

    return $content;
}
```

## AJAX & External Request Anti-Patterns

### Using admin-ajax.php (WARNING)
admin-ajax.php loads full WordPress, including `admin_init` hooks.

```php
// ❌ BAD: Full WP bootstrap for simple data.
add_action( 'wp_ajax_nopriv_prefix_get_posts', 'prefix_ajax_handler' );

function prefix_ajax_handler() {
    // Handle AJAX request.
    wp_send_json_success( $data );
}

// ✅ GOOD: Use REST API - leaner bootstrap.
add_action( 'rest_api_init', 'prefix_register_rest_routes' );

function prefix_register_rest_routes() {
    register_rest_route(
        'prefix/v1',
        '/posts',
        array(
            'methods'             => 'GET',
            'callback'            => 'prefix_rest_get_posts',
            'permission_callback' => '__return_true',
        )
    );
}

function prefix_rest_get_posts( $request ) {
    // Handle REST request.
    return rest_ensure_response( $data );
}
```

### POST for Read Operations (WARNING)
POST requests bypass page cache, causing unnecessary server load.

```javascript
// ❌ BAD: POST bypasses cache
$.post(ajaxurl, { action: 'get_items' }, callback);

// ✅ GOOD: GET requests can be cached
$.get('/wp-json/myapp/v1/items', callback);
```

### AJAX Polling (CRITICAL)
Polling creates sustained uncached load - effectively a self-DDoS.

```javascript
// ❌ CRITICAL: Self-DDoS
setInterval(() => {
    fetch('/wp-json/myapp/v1/updates');
}, 5000);  // Every 5 seconds per user!

// ✅ GOOD: Use WebSockets, SSE, or long-polling with backoff
// ✅ GOOD: Poll less frequently with exponential backoff
// ✅ BEST: Push notifications instead of polling
```

### Uncached External HTTP (WARNING)
Synchronous HTTP calls block page generation.

```php
// ❌ BAD: Blocks page render.
function prefix_get_weather_widget() {
    $response = wp_remote_get( 'https://api.weather.com/current' );
    return prefix_process_weather( $response );
}

// ✅ GOOD: Cache external responses.
function prefix_get_weather_widget_cached() {
    $weather = wp_cache_get( 'prefix_weather_data', 'external_api' );

    if ( false === $weather ) {
        $response = wp_remote_get(
            'https://api.weather.com/current',
            array( 'timeout' => 2 )
        );

        if ( ! is_wp_error( $response ) ) {
            $weather = wp_remote_retrieve_body( $response );
            wp_cache_set( 'prefix_weather_data', $weather, 'external_api', 300 );
        }
    }

    return prefix_process_weather( $weather );
}

// ✅ BEST: Fetch via cron, display from cache.
add_action( 'prefix_fetch_weather', 'prefix_cron_fetch_weather' );

function prefix_cron_fetch_weather() {
    $response = wp_remote_get( 'https://api.weather.com/current' );

    if ( ! is_wp_error( $response ) ) {
        $weather = wp_remote_retrieve_body( $response );
        wp_cache_set( 'prefix_weather_data', $weather, 'external_api', HOUR_IN_SECONDS );
    }
}
```

## Template Anti-Patterns

### Over-use of get_template_part (WARNING)
Each template part requires file system access and additional processing.

```php
// ❌ BAD: Template part called 50 times in loop.
while ( have_posts() ) {
    the_post();
    get_template_part( 'partials/card' ); // File access each iteration.
}

// ✅ GOOD: Use template part with data passing (WordPress 5.5+).
while ( have_posts() ) {
    the_post();
    get_template_part(
        'partials/card',
        null,
        array(
            'post_id' => get_the_ID(),
            'title'   => get_the_title(),
        )
    );
}

// ✅ ALTERNATIVE: Cache rendered output for identical partials.
$card_cache = array();

while ( have_posts() ) {
    the_post();
    $post_id = get_the_ID();

    if ( ! isset( $card_cache[ $post_id ] ) ) {
        ob_start();
        get_template_part( 'partials/card' );
        $card_cache[ $post_id ] = ob_get_clean();
    }

    echo $card_cache[ $post_id ]; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}
```

### N+1 Query Problem (CRITICAL)
Querying inside loops multiplies database calls.

```php
// ❌ CRITICAL: 1 query per post.
while ( have_posts() ) {
    the_post();
    $author = get_user_by( 'id', get_the_author_meta( 'ID' ) ); // Query per post!
    $meta   = get_post_meta( get_the_ID(), 'views', true );     // Another query per post!
}

// ✅ GOOD: Prime caches before the loop.
$post_ids = wp_list_pluck( $query->posts, 'ID' );
update_postmeta_cache( $post_ids ); // Single query for all meta.

while ( have_posts() ) {
    the_post();
    // Now get_post_meta() uses cached data - no additional queries.
    $meta = get_post_meta( get_the_ID(), 'views', true );
}
```

## PHP Code Anti-Patterns

### in_array() Without Strict Comparison (WARNING)
`in_array()` has O(n) complexity - at scale, use associative array with `isset()` for O(1) lookups.

```php
// ❌ BAD: O(n) lookup - slow with large arrays.
$allowed = array( 'foo', 'bar', 'baz' );
if ( in_array( $value, $allowed ) ) {
    // Process.
}

// ❌ ALSO BAD: Missing strict comparison (type coercion issues).
if ( in_array( $value, $allowed ) ) {
    // 0 == 'foo' is true due to type juggling!
}

// ✅ GOOD: O(1) lookup with isset().
$allowed = array(
    'foo' => true,
    'bar' => true,
    'baz' => true,
);

if ( isset( $allowed[ $value ] ) ) {
    // Process.
}

// ✅ ACCEPTABLE: in_array() with strict comparison for small arrays.
if ( in_array( $value, $allowed, true ) ) {
    // Third parameter enables strict type checking.
}
```

### Heredoc/Nowdoc Syntax (WARNING)
Heredoc/nowdoc prevents late escaping - escape data at point of output, not before.

```php
// ❌ BAD: Can't escape inside heredoc.
$html = <<<HTML
<div class="$class">$user_content</div>
HTML;
// XSS vulnerability - $user_content not escaped.

// ✅ GOOD: Late escaping at output.
printf(
    '<div class="%s">%s</div>',
    esc_attr( $class ),
    esc_html( $user_content )
);

// ✅ GOOD: Use template part for complex HTML.
get_template_part(
    'partials/card',
    null,
    array(
        'class'   => $class,
        'content' => $user_content,
    )
);
```

### Storing Large Data in Options (WARNING)
The wp_options table should stay lean. Best practice: under 500 rows, autoloaded data under 1MB total. Large autoloaded options slow every page load.

```php
// ❌ BAD: Storing HTML/large data in options.
update_option( 'prefix_plugin_cache', $huge_html_string );

// ✅ GOOD: Store IDs, fetch data on demand.
update_option( 'prefix_plugin_post_ids', array( 1, 2, 3 ) ); // Small data.

// ✅ GOOD: Use transients with expiration for cache-like data.
set_transient( 'prefix_cache', $data, HOUR_IN_SECONDS );

// ✅ GOOD: Use object cache for large frequently-accessed data.
wp_cache_set( 'prefix_data', $large_data, 'prefix_plugin', HOUR_IN_SECONDS );
```

## Options & Transients Anti-Patterns

### Large Autoloaded Options (WARNING)
All autoloaded options load on every request into `alloptions` cache.

```php
// ❌ BAD: Large data autoloaded.
add_option( 'prefix_plugin_log', $massive_array ); // autoload defaults to 'yes'.

// ✅ GOOD: Disable autoload for large/infrequent data.
add_option( 'prefix_plugin_log', $massive_array, '', 'no' );

// ✅ GOOD: Use update_option with explicit autoload (WordPress 4.2+).
update_option( 'prefix_plugin_log', $data, false ); // false = no autoload.
```

### Transients in Database (WARNING)
Without object cache, transients bloat wp_options table.

```php
// ❌ BAD on hosts without persistent object cache: DB bloat.
set_transient( 'prefix_data', $data, DAY_IN_SECONDS );

// ✅ GOOD: Check for object cache availability.
if ( wp_using_ext_object_cache() ) {
    set_transient( 'prefix_data', $data, DAY_IN_SECONDS );
} else {
    // Use file cache or skip caching on shared hosting.
}
```

## WP Cron Anti-Patterns

### Default WP Cron Behavior (WARNING)
By default, WP Cron runs on page requests, adding latency.

```php
// ❌ BAD: Cron tasks run during user requests (default behavior).

// ✅ GOOD: Disable WP Cron and use server cron.
// In wp-config.php:
define( 'DISABLE_WP_CRON', true );

// Server crontab:
// * * * * * cd /path/to/wp && wp cron event run --due-now
```

## Uncached Function Calls

### Functions That Need Caching (WARNING)
These WordPress core functions query the database on every call without caching. At scale, they cause significant performance issues.

| Function | Issue | Solution |
|----------|-------|----------|
| `url_to_postid()` | Full posts table scan | Wrap with object cache |
| `attachment_url_to_postid()` | Expensive meta lookup | Wrap with object cache |
| `count_user_posts()` | COUNT query per call | Cache result per user |
| `get_adjacent_post()` | Complex query | Cache or avoid in loops |
| `wp_oembed_get()` | External HTTP + parsing | Cache with transient |
| `wp_old_slug_redirect()` | Meta table lookup | Cache result |
| `file_get_contents()` | Filesystem/HTTP call | Cache external content |

### Generic Caching Wrapper Pattern

```php
/**
 * Cached version of url_to_postid() - works on any WordPress installation.
 *
 * @param string $url The URL to look up.
 * @return int Post ID, or 0 if not found.
 */
function prefix_cached_url_to_postid( $url ) {
    $cache_key = 'url_to_postid_' . md5( $url );
    $post_id   = wp_cache_get( $cache_key, 'url_lookups' );

    if ( false === $post_id ) {
        $post_id = url_to_postid( $url );
        wp_cache_set( $cache_key, $post_id, 'url_lookups', HOUR_IN_SECONDS );
    }

    return $post_id;
}

/**
 * Cached version of count_user_posts().
 *
 * @param int    $user_id   User ID.
 * @param string $post_type Post type to count.
 * @return int Number of posts.
 */
function prefix_cached_count_user_posts( $user_id, $post_type = 'post' ) {
    $cache_key = 'user_post_count_' . $user_id . '_' . $post_type;
    $count     = wp_cache_get( $cache_key, 'user_counts' );

    if ( false === $count ) {
        $count = count_user_posts( $user_id, $post_type );
        wp_cache_set( $cache_key, $count, 'user_counts', HOUR_IN_SECONDS );
    }

    return $count;
}

/**
 * Reusable wrapper for any expensive function call.
 *
 * @param string   $cache_key Unique cache key.
 * @param callable $callback  Function to call if cache miss.
 * @param string   $group     Cache group.
 * @param int      $ttl       Time to live in seconds.
 * @return mixed Cached or fresh result.
 */
function prefix_cached_call( $cache_key, $callback, $group = '', $ttl = 3600 ) {
    $result = wp_cache_get( $cache_key, $group );

    if ( false === $result ) {
        $result = call_user_func( $callback );
        wp_cache_set( $cache_key, $result, $group, $ttl );
    }

    return $result;
}
```

### WordPress VIP Platform Helpers

On WordPress VIP, use the platform's pre-built cached helper functions instead of writing your own wrappers:

```php
// ❌ AVOID on VIP: Uncached core functions.
$post_id    = url_to_postid( $url );
$attach_id  = attachment_url_to_postid( $image_url );
$post_count = count_user_posts( $user_id );
$prev_post  = get_adjacent_post( false, '', true );
$embed_html = wp_oembed_get( $video_url );
$response   = wp_remote_get( $api_url );

// ✅ USE on VIP: Cached platform alternatives.
$post_id    = wpcom_vip_url_to_postid( $url );
$attach_id  = wpcom_vip_attachment_url_to_postid( $image_url );
$post_count = wpcom_vip_count_user_posts( $user_id );
$prev_post  = wpcom_vip_get_adjacent_post( false, '', true );
$embed_html = wpcom_vip_wp_oembed_get( $video_url );
$response   = vip_safe_wp_remote_get( $api_url );

// VIP-specific: Safe remote request with built-in fallback and caching.
$response = vip_safe_wp_remote_get(
    $api_url,
    array(
        'fallback_value' => '',           // Return this on failure.
        'threshold'      => 3,            // Failures before fallback.
        'timeout'        => 2,            // Request timeout in seconds.
    )
);
```

### Platform Guidance

| Platform | Recommendation |
|----------|----------------|
| **WordPress VIP** | Use `wpcom_vip_*` helpers - they handle caching, fallbacks, and edge cases |
| **WP Engine, Pantheon, etc.** | Check host documentation for platform-specific optimizations |
| **Self-hosted with object cache** | Use the generic caching wrapper pattern above |
| **Shared hosting (no object cache)** | Use transients, but be aware they fall back to database storage |

## External API Anti-Patterns

### Plugin-Initiated PHP Sessions (CRITICAL)
Plugins that call `session_start()` on frontend requests make the entire site uncacheable.

```php
// ❌ CRITICAL: This single line can disable page caching site-wide
session_start();

// Detection: Search codebase for session_start()
grep -r "session_start" wp-content/plugins/ wp-content/themes/

// ✅ SOLUTION: Use cookies or wp_cache for non-sensitive data
// ✅ SOLUTION: Only use sessions for logged-in users
if (is_user_logged_in()) {
    session_start();
}
```

### Query Parameter Cache Busting (WARNING)
Marketing UTM parameters and tracking IDs create unique URLs, causing cache misses.

```php
// ❌ BAD: Each unique URL = separate cache entry
// https://example.com/?utm_source=facebook&utm_campaign=summer&fbclid=abc123
// https://example.com/?utm_source=twitter&utm_campaign=summer
// Result: Homepage cached hundreds of times with different params

// ✅ SOLUTION: Configure CDN to ignore/strip marketing params
// Cloudflare, Fastly, Varnish can all strip query params before cache lookup

// ✅ SOLUTION: Canonical redirect in WordPress
add_action('template_redirect', function() {
    $strip_params = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
    $dominated_query = array_diff_key($_GET, array_flip($strip_params));
    
    if (count($_GET) !== count($dominated_query)) {
        $url = remove_query_arg($strip_params);
        wp_redirect($url, 301);
        exit;
    }
});
```

### Unnecessary Cookies on Public Pages (WARNING)
Setting cookies prevents CDN caching for that visitor.

```php
// ❌ BAD: Cookie set on every visit
add_action('init', function() {
    setcookie('visitor_tracking', uniqid(), time() + 86400, '/');
});
// Result: No page caching for any visitor with this cookie

// ✅ GOOD: Set tracking cookies via JavaScript (doesn't affect server cache)
// ✅ GOOD: Use analytics services instead of custom cookies
// ✅ GOOD: If cookie needed, set only on specific actions (not every page)
```

### Missing Timeout Set (WARNING)
Default timeout is 5 seconds - too long for page generation.

```php
// ❌ BAD: Default 5 second timeout blocks page render
$response = wp_remote_get('https://api.example.com/data');

// ✅ GOOD: Short timeout with fallback
$response = wp_remote_get('https://api.example.com/data', [
    'timeout' => 2,  // 2 seconds max
]);

if (is_wp_error($response)) {
    // Return cached/default data
    return get_fallback_data();
}
```

### No Error Handling (WARNING)
API failures can break page output or cause PHP errors.

```php
// ❌ BAD: Assumes success
$response = wp_remote_get($url);
$data = json_decode($response['body']);

// ✅ GOOD: Handle failures gracefully
$response = wp_remote_get($url, ['timeout' => 2]);

if (is_wp_error($response)) {
    error_log('API Error: ' . $response->get_error_message());
    return $cached_fallback;
}

$code = wp_remote_retrieve_response_code($response);
if (200 !== $code) {
    error_log("API returned status: $code");
    return $cached_fallback;
}

$body = wp_remote_retrieve_body($response);
$data = json_decode($body, true);
```

### Synchronous API Calls Without Caching (WARNING)
Every page load waits for external API response.

```php
// ❌ BAD: Blocks every page load
function get_weather() {
    return wp_remote_get('https://api.weather.com/...');
}

// ✅ GOOD: Cache responses, fetch via cron
function get_weather() {
    $cached = wp_cache_get('weather_data');
    if (false !== $cached) {
        return $cached;
    }
    
    // Fallback to slightly stale data if API fails
    $stale = get_transient('weather_data_stale');
    
    $response = wp_remote_get('https://api.weather.com/...', ['timeout' => 2]);
    if (!is_wp_error($response)) {
        $data = wp_remote_retrieve_body($response);
        wp_cache_set('weather_data', $data, '', 300);
        set_transient('weather_data_stale', $data, DAY_IN_SECONDS);
        return $data;
    }
    
    return $stale ?: '';
}
```

## Sitemap Anti-Patterns

### Uncached Dynamic Sitemaps (WARNING)
Crawlers can hammer sitemap endpoints, generating expensive queries.

```php
// ❌ BAD: Sitemap generated on every request
// WordPress core sitemaps can be slow for large archives

// ✅ GOOD: Pre-generate and cache sitemaps.
// Use msm-sitemaps plugin for large sites.
// Or cache sitemap output:
function cached_sitemap() {
    $cache_key = 'sitemap_' . get_query_var('sitemap');
    $sitemap = wp_cache_get($cache_key, 'sitemaps');
    
    if (false === $sitemap) {
        $sitemap = generate_sitemap();
        wp_cache_set($cache_key, $sitemap, 'sitemaps', HOUR_IN_SECONDS);
    }
    
    return $sitemap;
}
```

### Including Deep Archives (INFO)
Sitemaps for years-old content trigger unnecessary query load.

```php
// ✅ GOOD: Exclude old content from sitemaps
add_filter('wp_sitemaps_posts_query_args', function($args) {
    $args['date_query'] = [
        'after' => '2 years ago'
    ];
    return $args;
});

// ✅ GOOD: Exclude specific post types
add_filter('wp_sitemaps_post_types', function($post_types) {
    unset($post_types['attachment']);
    unset($post_types['revision']);
    return $post_types;
});
```

## Plugin & Theme Anti-Patterns

### Page Builder Performance (WARNING)
Page builder plugins add significant overhead - extra code, database queries, and processing.

```php
// ❌ WARNING: Page builders at scale.
// - Generate inefficient HTML/CSS.
// - Add many database queries per page.
// - May compile templates on every request (especially problematic on read-only filesystems).
// - Block editor (Gutenberg) is more performant than most page builders.

// ✅ RECOMMENDATIONS:
// - Use Gutenberg/block editor for new projects.
// - Custom code for high-traffic landing pages.
// - If using page builders, test query count and generation time.
// - Avoid page builders on pages receiving high traffic.
```

### Infinite Scroll with POST Requests (WARNING)
Infinite scroll plugins often use POST requests, bypassing cache entirely.

```php
// ❌ BAD: POST request for each scroll (bypasses cache)
// As user scrolls, each AJAX request = uncached hit to origin
jQuery.post(ajaxurl, { action: 'load_more_posts', page: 2 });

// ✅ GOOD: Use GET requests for infinite scroll (cacheable)
jQuery.get('/wp-json/mysite/v1/posts', { page: 2 });

// ✅ GOOD: Pre-render next page URLs that can be cached
// /page/2/, /page/3/ etc. are cacheable at CDN level

// ✅ GOOD: Implement cache warming for paginated content
```

## JavaScript Bundle Anti-Patterns

### Full Library Imports (WARNING)
Importing entire libraries when only parts are needed bloats JavaScript bundles.

```javascript
// ❌ BAD: Imports entire lodash library (~70KB)
import _ from 'lodash';
const result = _.map(items, transform);

// ✅ GOOD: Import only what you need (~2KB)
import map from 'lodash/map';
const result = map(items, transform);

// ❌ BAD: Barrel file exports pull in everything
// utils/index.js: export * from './heavy-module';
import { smallFunction } from './utils';  // Loads entire utils

// ✅ GOOD: Import directly from module
import { smallFunction } from './utils/small-module';
```

### Missing Script Loading Strategy (INFO)
WordPress 6.3+ supports native defer/async for non-blocking script loading.

```php
// ❌ BAD: Blocks rendering (default behavior)
wp_enqueue_script('my-script', get_template_directory_uri() . '/js/script.js');

// ✅ GOOD: Defer non-critical scripts (WordPress 6.3+)
wp_enqueue_script('my-script', get_template_directory_uri() . '/js/script.js', [], '1.0.0', [
    'strategy' => 'defer',  // or 'async'
]);

// ✅ GOOD: Load in footer for older WP versions
wp_enqueue_script('my-script', get_template_directory_uri() . '/js/script.js', [], '1.0.0', true);
```

### Missing Asset Version Strings (INFO)
Without version strings, browser caches may serve stale assets after deployments.

```php
// ❌ BAD: No version - cache busting issues
wp_enqueue_script('my-script', get_template_directory_uri() . '/js/script.js');
wp_enqueue_style('my-style', get_template_directory_uri() . '/css/style.css');

// ✅ GOOD: Use theme/plugin version constant
define('THEME_VERSION', '1.0.0');
wp_enqueue_script('my-script', get_template_directory_uri() . '/js/script.js', [], THEME_VERSION);
wp_enqueue_style('my-style', get_template_directory_uri() . '/css/style.css', [], THEME_VERSION);

// ✅ GOOD: Use file modification time for development
wp_enqueue_script('my-script', get_template_directory_uri() . '/js/script.js', [], 
    filemtime(get_template_directory() . '/js/script.js'));
```

## Block Editor Anti-Patterns

### Too Many Custom Block Styles (WARNING)
Each block style creates a preview iframe in the editor, causing severe performance degradation.

```javascript
// ❌ BAD: Each style = separate iframe for preview
registerBlockStyle('core/group', { name: 'green-dots', label: 'Green Dots' });
registerBlockStyle('core/group', { name: 'blue-waves', label: 'Blue Waves' });
registerBlockStyle('core/group', { name: 'red-stripes', label: 'Red Stripes' });
// 10+ styles = editor becomes unusable

// ✅ GOOD: Use custom attributes with block filters
import { addFilter } from '@wordpress/hooks';

addFilter('blocks.registerBlockType', 'namespace/bg-patterns', (settings, name) => {
    if (name !== 'core/group') return settings;
    
    return {
        ...settings,
        attributes: {
            ...settings.attributes,
            backgroundPattern: { type: 'string', default: '' }
        }
    };
});
// Add UI via BlockEdit filter, style via render_block filter
```

### Re-sanitizing InnerBlocks Content (WARNING)
InnerBlocks content is already sanitized - running wp_kses_post breaks embeds and core functionality.

```php
// ❌ BAD: Breaks embeds, iframes, and other allowed content
function render_my_block($attributes, $content) {
    return '<div class="my-block">' . wp_kses_post($content) . '</div>';
}

// ✅ GOOD: InnerBlocks content is pre-sanitized
function render_my_block($attributes, $content) {
    return '<div class="my-block">' . $content . '</div>';
}

// ✅ GOOD: Escape attributes, not InnerBlocks content
function render_my_block($attributes, $content) {
    $class = esc_attr($attributes['className'] ?? '');
    return '<div class="my-block ' . $class . '">' . $content . '</div>';
}
```

### Static Blocks for Client Builds (INFO)
Static blocks store markup in the database, requiring deprecations for any design changes.

```php
// ❌ PROBLEMATIC: Static block - markup stored in DB
// Any HTML change requires deprecation handler or manual re-save of all posts

// ✅ GOOD: Dynamic block - only attributes stored, markup rendered on request
register_block_type('namespace/my-block', [
    'render_callback' => 'render_my_block',  // Dynamic rendering
    'attributes' => [
        'title' => ['type' => 'string'],
    ]
]);

// Design changes update all instances automatically without re-saving posts
```

## Redirect Anti-Patterns

### Redirect Loops (CRITICAL)
Infinite server-side redirects consume CPU without easy detection.

```php
// Debug redirect source using x-redirect-by header
add_filter('x_redirect_by', function($x_redirect_by, $status, $location) {
    // Log for debugging
    error_log("Redirect to $location by: $x_redirect_by (status: $status)");
    
    // For deep debugging, output stack trace:
    // error_log(wp_debug_backtrace_summary());
    
    return $x_redirect_by;
}, 10, 3);

// Always set x_redirect_by when creating redirects
wp_redirect($url, 301, 'My Plugin Name');
```

### Redirect Chains (WARNING)
Multiple sequential redirects add latency and confuse caches.

```php
// ❌ BAD: A → B → C → D (chain of redirects)
// Each redirect = full HTTP round-trip

// ✅ GOOD: Direct redirect A → D
// Audit redirects regularly, collapse chains
```

## Post Meta Anti-Patterns

### Querying meta_value Without Index (WARNING)
The `meta_value` column isn't indexed by default - full table scan.

```php
// ❌ BAD: Scans entire postmeta table
$query = new WP_Query([
    'meta_query' => [
        ['key' => 'color', 'value' => 'red']
    ]
]);

// ✅ BETTER: Use taxonomy for filterable attributes
// Register 'color' taxonomy, term 'red'
$query = new WP_Query([
    'tax_query' => [
        ['taxonomy' => 'color', 'field' => 'slug', 'terms' => 'red']
    ]
]);
```

### Binary Meta Values (WARNING)
Checking `meta_value = 'true'` requires scanning all matching keys.

```php
// ❌ BAD: Must scan meta_value column
$query = new WP_Query([
    'meta_key' => 'is_featured',
    'meta_value' => 'true'
]);

// ✅ GOOD: Key presence = true, absence = false
$query = new WP_Query([
    'meta_key' => 'is_featured',
    'meta_compare' => 'EXISTS'
]);

// ✅ ALTERNATIVE: Encode value in key name
// Instead of: meta_key='category', meta_value='sports'
// Use: meta_key='category_sports' (just check EXISTS)
```

### Excessive Post Meta (INFO)
`wp_postmeta` table grows to multiples of `wp_posts` - optimize storage.

```php
// ❌ BAD: Storing large data in post meta
update_post_meta($id, 'full_api_response', $huge_json);

// ✅ GOOD: Store minimal data, fetch details on demand
update_post_meta($id, 'api_resource_id', $resource_id);

// ❌ BAD: Many separate meta entries
update_post_meta($id, 'address_line1', $line1);
update_post_meta($id, 'address_line2', $line2);
update_post_meta($id, 'address_city', $city);
// ... 10 more fields

// ✅ GOOD: Serialize related data
update_post_meta($id, 'address', [
    'line1' => $line1,
    'city' => $city,
    // ...
]);
```
