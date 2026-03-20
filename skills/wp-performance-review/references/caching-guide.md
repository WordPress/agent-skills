# WordPress Caching Strategy Guide

Comprehensive guide to caching strategies for high-performance WordPress applications.

## Caching Review Checklist

When reviewing caching implementation:

**Page Cache Compatibility**
- [ ] No `session_start()` on frontend
- [ ] No `setcookie()` on public pages (unless necessary)
- [ ] No `$_SESSION` usage on cacheable pages
- [ ] POST used only for writes, GET for reads

**Object Cache Usage**
- [ ] Expensive queries wrapped with `wp_cache_get`/`wp_cache_set`
- [ ] Cache keys include relevant variables (locale, user role if needed)
- [ ] TTL set appropriately (not too long, not too short)
- [ ] `wp_cache_get_multiple` for batch lookups
- [ ] Cache invalidation on relevant `save_post` hooks

**Race Condition Prevention**
- [ ] `wp_cache_add` used for locking when needed
- [ ] Stale-while-revalidate for high-traffic cached items
- [ ] Cache pre-warming via cron for critical data

## Caching Layers Overview

```
User Request
    ↓
┌─────────────────┐
│   CDN / Edge    │ ← Full page cache (HTML)
│   Cache         │   Static assets (JS, CSS, images)
└────────┬────────┘
         ↓
┌─────────────────┐
│  Page Cache     │ ← Full page cache (server-level)
│  (Varnish, etc) │   Bypassed by: cookies, POST, query vars
└────────┬────────┘
         ↓
┌─────────────────┐
│  Object Cache   │ ← Database query results
│  (Redis/Memcached)│   Transients, options, computed data
└────────┬────────┘
         ↓
┌─────────────────┐
│   Database      │ ← MySQL query cache (if enabled)
│   (MySQL)       │   InnoDB buffer pool
└─────────────────┘
```

## Page Cache

### Cache Headers

```php
// Set cache-friendly headers
function set_cache_headers() {
    if (!is_user_logged_in() && !is_admin()) {
        header('Cache-Control: public, max-age=300, s-maxage=3600');
        header('Vary: Accept-Encoding');
    }
}
add_action('send_headers', 'set_cache_headers');

// Prevent caching for dynamic pages
function prevent_page_cache() {
    if (is_user_specific_page()) {
        header('Cache-Control: private, no-cache, no-store');
        nocache_headers();
    }
}
```

### Cache Bypass Triggers (Avoid These)

```php
// ❌ Starting PHP sessions bypasses cache
session_start();  // Avoid on frontend

// ❌ Unique query parameters create cache misses
// https://example.com/?utm_source=twitter&utm_campaign=123
// Solution: Strip marketing params at CDN level

// ❌ POST requests always bypass cache
// Use GET for read operations

// ❌ Setting cookies prevents caching
setcookie('my_cookie', 'value');  // Use sparingly
```

### TTL (Time To Live) Strategy

| Content Type | Recommended TTL |
|--------------|-----------------|
| Homepage | 5-15 minutes |
| Archive pages | 15-60 minutes |
| Single posts | 1-24 hours |
| Static pages | 24+ hours |
| Media files | 1 year (versioned) |

## Object Cache

### Basic Usage

```php
// Store data
wp_cache_set('my_key', $data, 'my_group', 3600);  // 1 hour expiry

// Retrieve data
$data = wp_cache_get('my_key', 'my_group');
if (false === $data) {
    $data = expensive_computation();
    wp_cache_set('my_key', $data, 'my_group', 3600);
}

// Delete data
wp_cache_delete('my_key', 'my_group');

// Add only if doesn't exist (atomic)
$added = wp_cache_add('my_key', $data, 'my_group', 3600);
```

### Batch Operations (Efficient)

```php
// ❌ BAD: Multiple round-trips
foreach ($ids as $id) {
    $data[$id] = wp_cache_get("item_$id", 'items');
}

// ✅ GOOD: Single round-trip
$keys = array_map(fn($id) => "item_$id", $ids);
$data = wp_cache_get_multiple($keys, 'items');
```

### Cache Groups

```php
// Use groups to organize and bulk-delete
wp_cache_set('post_123', $data, 'my_plugin_posts');
wp_cache_set('post_456', $data, 'my_plugin_posts');

// Clear entire group (if supported by backend)
wp_cache_flush_group('my_plugin_posts');  // Redis supports this
```

### Cache Key Versioning

```php
// Version cache keys for easy invalidation
function get_cache_key($base) {
    $version = wp_cache_get('cache_version', 'my_plugin') ?: 1;
    return "{$base}_v{$version}";
}

// Invalidate all by incrementing version
function invalidate_all_cache() {
    wp_cache_incr('cache_version', 1, 'my_plugin');
}
```

## Race Conditions

### Problem: Concurrent Cache Regeneration

When cache expires, multiple requests may simultaneously regenerate it.

```
Request A ─┬─ Cache miss ─→ Start regeneration ───────→ Set cache
           │
Request B ─┴─ Cache miss ─→ Start regeneration ───────→ Set cache (duplicate!)
           │
Request C ─┴─ Cache miss ─→ Start regeneration ───────→ Set cache (duplicate!)
```

### Solution: Locking Pattern

```php
function get_expensive_data() {
    $cache_key = 'expensive_data';
    $lock_key = 'expensive_data_lock';
    
    // Try to get cached data
    $data = wp_cache_get($cache_key);
    if (false !== $data) {
        return $data;
    }
    
    // Try to acquire lock (atomic operation)
    $lock_acquired = wp_cache_add($lock_key, true, '', 30);  // 30 second lock
    
    if ($lock_acquired) {
        // We got the lock - regenerate cache
        $data = expensive_computation();
        wp_cache_set($cache_key, $data, '', 3600);
        wp_cache_delete($lock_key);  // Release lock
        return $data;
    }
    
    // Another process is regenerating - wait and retry
    usleep(100000);  // 100ms
    return get_expensive_data();  // Retry (add max retries in production)
}
```

### Solution: Stale-While-Revalidate

```php
function get_data_with_stale() {
    $cache_key = 'my_data';
    $stale_key = 'my_data_stale';
    
    $data = wp_cache_get($cache_key);
    if (false !== $data) {
        return $data;
    }
    
    // Try to get stale data while regenerating
    $stale_data = wp_cache_get($stale_key);
    
    // Regenerate in background (non-blocking)
    if (false === $stale_data) {
        // No stale data - must wait
        $data = regenerate_data();
        wp_cache_set($cache_key, $data, '', 300);
        wp_cache_set($stale_key, $data, '', 3600);  // Keep stale longer
        return $data;
    }
    
    // Schedule background regeneration
    wp_schedule_single_event(time(), 'regenerate_my_data');
    
    // Return stale data immediately
    return $stale_data;
}
```

## Cache Stampede Prevention

### Problem

Cache expires → Thousands of requests hit database simultaneously.

### Solution 1: Jitter (Randomized Expiry)

```php
function set_cache_with_jitter($key, $data, $base_ttl) {
    // Add ±10% randomization to TTL
    $jitter = rand(-($base_ttl * 0.1), $base_ttl * 0.1);
    $ttl = $base_ttl + $jitter;
    wp_cache_set($key, $data, '', $ttl);
}
```

### Solution 2: Pre-warming via Cron

```php
// Regenerate cache before it expires
add_action('pre_warm_popular_caches', function() {
    $popular_queries = ['homepage_posts', 'featured_products', 'menu_items'];
    
    foreach ($popular_queries as $query) {
        // Force regeneration
        wp_cache_delete($query);
        get_cached_query($query);  // Regenerates and caches
    }
});

// Schedule to run before typical expiry
if (!wp_next_scheduled('pre_warm_popular_caches')) {
    wp_schedule_event(time(), 'hourly', 'pre_warm_popular_caches');
}
```

### Solution 3: Early Expiry Check

```php
function get_with_early_expiry($key, $ttl, $regenerate_callback) {
    $data = wp_cache_get($key);
    
    if (false !== $data) {
        // Check if we should pre-regenerate (last 10% of TTL)
        $meta = wp_cache_get("{$key}_meta");
        if ($meta && (time() - $meta['created']) > ($ttl * 0.9)) {
            // Trigger background regeneration
            wp_schedule_single_event(time(), 'regenerate_cache', [$key]);
        }
        return $data;
    }
    
    // Cache miss - regenerate
    $data = call_user_func($regenerate_callback);
    wp_cache_set($key, $data, '', $ttl);
    wp_cache_set("{$key}_meta", ['created' => time()], '', $ttl);
    
    return $data;
}
```

## Transients

### When to Use Transients

- Data with known expiration
- External API responses
- Computed data that's expensive to regenerate

### Transient Best Practices

```php
// ✅ GOOD: Named clearly, reasonable TTL
set_transient('weather_data_seattle', $data, HOUR_IN_SECONDS);

// ❌ BAD: Dynamic keys create transient bloat
set_transient("user_{$user_id}_preferences", $data, DAY_IN_SECONDS);
// Better: Use user meta or object cache
```

### Transient Storage Warning

Without persistent object cache, transients are stored in wp_options table:

```php
// Check if object cache is available
if (wp_using_ext_object_cache()) {
    // Transients use object cache (good)
    set_transient('my_data', $data, HOUR_IN_SECONDS);
} else {
    // Transients go to database (potentially bad)
    // Consider: file cache, skip caching, or warn admin
}
```

## Partial Output Caching

Cache rendered HTML fragments for repeated use:

```php
function get_cached_sidebar() {
    $cache_key = 'sidebar_html_' . get_locale();
    $html = wp_cache_get($cache_key, 'partials');
    
    if (false === $html) {
        ob_start();
        get_sidebar();
        $html = ob_get_clean();
        wp_cache_set($cache_key, $html, 'partials', HOUR_IN_SECONDS);
    }
    
    return $html;
}
```

## In-Memory Caching (Request-Scoped)

### Static Variables

```php
function get_current_user_data() {
    static $user_data = null;
    
    if (null === $user_data) {
        $user_data = expensive_user_query();
    }
    
    return $user_data;
}
```

### Global Variable Pattern

```php
// Store request-scoped data
global $my_plugin_cache;
$my_plugin_cache = [];

function get_item($id) {
    global $my_plugin_cache;
    
    if (!isset($my_plugin_cache[$id])) {
        $my_plugin_cache[$id] = fetch_item($id);
    }
    
    return $my_plugin_cache[$id];
}
```

## Cache Invalidation Strategy

### Event-Based Invalidation

```php
// Clear post-related caches when post is updated
add_action('save_post', function($post_id, $post) {
    // Clear specific post cache
    wp_cache_delete("post_{$post_id}", 'posts');
    
    // Clear related caches
    wp_cache_delete('recent_posts', 'listings');
    wp_cache_delete('homepage_posts', 'listings');
    
    // Clear category archive caches
    $categories = wp_get_post_categories($post_id);
    foreach ($categories as $cat_id) {
        wp_cache_delete("category_{$cat_id}_posts", 'archives');
    }
}, 10, 2);
```

### Tag-Based Invalidation (Advanced)

```php
// Store cache tags
function set_tagged_cache($key, $data, $tags, $ttl) {
    wp_cache_set($key, $data, '', $ttl);
    
    foreach ($tags as $tag) {
        $tag_keys = wp_cache_get("tag_{$tag}", 'cache_tags') ?: [];
        $tag_keys[] = $key;
        wp_cache_set("tag_{$tag}", array_unique($tag_keys), 'cache_tags');
    }
}

// Invalidate by tag
function invalidate_tag($tag) {
    $keys = wp_cache_get("tag_{$tag}", 'cache_tags') ?: [];
    foreach ($keys as $key) {
        wp_cache_delete($key);
    }
    wp_cache_delete("tag_{$tag}", 'cache_tags');
}
```

## Memcached vs Redis

| Feature | Memcached | Redis |
|---------|-----------|-------|
| Speed | Slightly faster | Fast |
| Data types | String only | Strings, lists, sets, hashes |
| Persistence | No | Optional |
| Memory efficiency | Higher | Lower |
| Cache groups | Limited | Full support |
| Complexity | Simple | More features |

**Recommendation**: Use what your host provides. Memcached for simple caching, Redis if you need advanced features.
