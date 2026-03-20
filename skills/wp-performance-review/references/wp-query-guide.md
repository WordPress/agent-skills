# WP_Query Optimization Guide

Best practices for efficient database queries in WordPress applications.

## WP_Query Review Checklist

When reviewing WP_Query code, verify:

- [ ] `posts_per_page` is set (not -1, not missing)
- [ ] `no_found_rows => true` if not paginating
- [ ] `fields => 'ids'` if only IDs needed
- [ ] `update_post_meta_cache => false` if meta not used
- [ ] `update_post_term_cache => false` if terms not used
- [ ] Date limits on archive queries (recent content only)
- [ ] `include_children => false` if child terms not needed
- [ ] No `post__not_in` with large arrays
- [ ] No `meta_query` on `meta_value` (use taxonomy or key presence)
- [ ] Results cached with `wp_cache_set` if repeated

## Core Principles

1. **Always set limits** - Never use `posts_per_page => -1`
2. **Validate inputs** - Check IDs before querying
3. **Limit scope** - Use date ranges, taxonomies to narrow results
4. **Skip unnecessary work** - Use `no_found_rows`, `fields`
5. **Pre-fetch related data** - Avoid N+1 queries
6. **Cache results** - Use object cache for repeated queries

## Essential Query Arguments

### Limiting Results

```php
// REQUIRED: Always limit results
'posts_per_page' => 10,

// Skip counting total posts if not paginating
'no_found_rows' => true,  // Skips SQL_CALC_FOUND_ROWS

// Return only IDs when you don't need full post objects
'fields' => 'ids',

// Suppress filters when you need raw results
'suppress_filters' => true,
```

### Date-Based Limiting

For sites with years of content, limit queries to relevant time ranges:

```php
// Limit to recent content
$query = new WP_Query([
    'post_type' => 'post',
    'posts_per_page' => 10,
    'date_query' => [
        [
            'after' => '3 months ago',
            'inclusive' => true
        ]
    ]
]);

// Specific date range
'date_query' => [
    'after' => '2024-01-01',
    'before' => '2024-12-31'
]

// Dynamic date filtering via pre_get_posts
add_action('pre_get_posts', function($query) {
    if (!is_admin() && $query->is_main_query() && $query->is_category('news')) {
        $query->set('date_query', [
            'after' => date('Y-m-d', strtotime('-3 months'))
        ]);
    }
});
```

### Taxonomy Query Optimization

```php
// Exclude child terms to reduce query complexity
'tax_query' => [
    [
        'taxonomy' => 'category',
        'field' => 'term_id',
        'terms' => [6],
        'include_children' => false  // Important for performance
    ]
]

// Use term_id instead of slug (avoids extra lookup)
'field' => 'term_id',  // Faster than 'slug' or 'name'
```

### Meta Query Optimization

Meta queries are expensive - minimize usage:

```php
// ❌ AVOID: Multiple meta conditions
'meta_query' => [
    'relation' => 'AND',
    ['key' => 'color', 'value' => 'red'],
    ['key' => 'size', 'value' => 'large'],
    ['key' => 'price', 'compare' => '>=', 'value' => 100]
]

// ✅ BETTER: Use taxonomies for filterable attributes
// Register 'color' and 'size' as taxonomies instead

// ✅ ALTERNATIVE: Offload to ElasticSearch
// Configure ElasticPress to index post meta
```

## Pre-fetching & Cache Priming

### Update Meta Cache in Bulk

```php
// After running WP_Query, prime the meta cache
$query = new WP_Query($args);
$post_ids = wp_list_pluck($query->posts, 'ID');

// Prime meta cache (single query vs N queries)
update_postmeta_cache($post_ids);

// Prime term cache
update_object_term_cache($post_ids, 'post');

// Prime user cache for authors
$author_ids = wp_list_pluck($query->posts, 'post_author');
cache_users($author_ids);
```

### WP_Query Built-in Cache Updates

```php
// These are on by default but be aware:
'update_post_meta_cache' => true,   // Updates meta cache after query
'update_post_term_cache' => true,   // Updates term cache after query

// Disable if you don't need meta/terms (saves queries)
'update_post_meta_cache' => false,
'update_post_term_cache' => false,
```

## Caching Query Results

### Object Cache for Repeated Queries

```php
function get_featured_posts() {
    $cache_key = 'featured_posts_v1';
    $posts = wp_cache_get($cache_key, 'my_plugin');
    
    if (false === $posts) {
        $query = new WP_Query([
            'post_type' => 'post',
            'posts_per_page' => 5,
            'meta_key' => 'featured',
            'meta_value' => '1'
        ]);
        
        $posts = $query->posts;
        wp_cache_set($cache_key, $posts, 'my_plugin', HOUR_IN_SECONDS);
    }
    
    return $posts;
}

// Invalidate when posts are updated
add_action('save_post', function($post_id) {
    wp_cache_delete('featured_posts_v1', 'my_plugin');
});
```

### Static Variable Caching (Request-Scoped)

```php
function get_expensive_data($id) {
    static $cache = [];
    
    if (!isset($cache[$id])) {
        $cache[$id] = expensive_computation($id);
    }
    
    return $cache[$id];
}
```

## ElasticSearch Offloading

For complex searches, offload to ElasticSearch via ElasticPress:

### When to Offload

- Full-text search queries
- Complex meta queries
- Faceted search / filtering
- Large result sets with sorting
- Aggregations / analytics

### When NOT to Offload

- Simple primary key lookups
- Transactional data requiring ACID
- Data requiring immediate consistency
- Small data sets

```php
// ElasticPress automatically intercepts WP_Query
// for search queries when configured

// Force MySQL for specific queries
$query = new WP_Query([
    'ep_integrate' => false,  // Skip ElasticSearch
    // ... args
]);
```

## Analyzing Queries with EXPLAIN

Use EXPLAIN to identify slow queries:

```sql
EXPLAIN SELECT * FROM wp_posts 
WHERE post_type = 'post' 
AND post_status = 'publish' 
ORDER BY post_date DESC 
LIMIT 10;
```

### Key EXPLAIN Indicators

| Column | Good Value | Bad Value |
|--------|------------|-----------|
| `type` | `const`, `eq_ref`, `ref`, `range` | `ALL` (full table scan) |
| `key` | Named index | `NULL` (no index used) |
| `rows` | Small number | Large number |
| `Extra` | `Using index` | `Using filesort`, `Using temporary` |

### Common Optimization Actions

```sql
-- Add index for frequently queried meta key
ALTER TABLE wp_postmeta ADD INDEX meta_key_value (meta_key, meta_value(50));

-- Add composite index
ALTER TABLE wp_posts ADD INDEX type_status_date (post_type, post_status, post_date);
```

## Query Monitor Integration

Use Query Monitor plugin to identify:

1. **Slow queries** - Queries over threshold
2. **Duplicate queries** - Same query run multiple times
3. **Queries by component** - Which plugin/theme caused each query
4. **Query count** - Total queries per page load

### Target Metrics

| Metric | Target | Concern |
|--------|--------|---------|
| Total queries | < 50 | > 100 |
| Duplicate queries | 0 | > 5 |
| Slowest query | < 50ms | > 100ms |
| Total query time | < 100ms | > 500ms |

## Common Query Patterns

### Get Latest Posts (Optimized)

```php
$query = new WP_Query([
    'post_type' => 'post',
    'post_status' => 'publish',
    'posts_per_page' => 10,
    'no_found_rows' => true,
    'update_post_term_cache' => false,  // If not displaying categories
]);
```

### Get Posts by IDs (Optimized)

```php
$query = new WP_Query([
    'post__in' => $post_ids,
    'posts_per_page' => count($post_ids),
    'orderby' => 'post__in',  // Preserve ID order
    'no_found_rows' => true,
    'ignore_sticky_posts' => true
]);
```

### Check if Posts Exist (Optimized)

```php
// Don't fetch full posts just to check existence
$query = new WP_Query([
    'post_type' => 'product',
    'posts_per_page' => 1,
    'fields' => 'ids',
    'no_found_rows' => true,
    'update_post_meta_cache' => false,
    'update_post_term_cache' => false
]);
$has_products = $query->have_posts();
```

### Count Posts (Optimized)

```php
// Use wp_count_posts() for simple counts
$counts = wp_count_posts('post');
$published = $counts->publish;

// For filtered counts, use found_posts
$query = new WP_Query([
    'post_type' => 'post',
    'posts_per_page' => 1,  // Minimize actual retrieval
    'category_name' => 'news',
    // no_found_rows must be FALSE to get found_posts
]);
$total = $query->found_posts;
```
