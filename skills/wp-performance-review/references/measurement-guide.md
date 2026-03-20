# High-Traffic Event Preparation & Performance Measurement

Guide for preparing WordPress sites for traffic surges and measuring performance.

## When to Use This Reference

This guide is for:
- **Pre-launch audits** - Checklist before high-traffic events
- **Performance testing** - How to load test with K6
- **Monitoring setup** - Query Monitor, New Relic integration
- **Alert configuration** - Threshold recommendations

**For code review**, use `anti-patterns.md` instead. This guide covers operational preparation.

## Code-Level Pre-Event Checks

Before a high-traffic event, scan the codebase for:

```bash
# Things that WILL break under load
grep -rn "posts_per_page.*-1" .                    # Unbounded queries
grep -rn "session_start" .                          # Cache bypass
grep -rn "setInterval.*fetch\|setInterval.*ajax" . # Polling

# Things that DEGRADE under load  
grep -rn "wp_remote_get\|wp_remote_post" .         # Uncached HTTP
grep -rn "update_option\|add_option" .             # DB writes
```

## Pre-Event Checklist

Before a high-traffic event (product launch, viral content, marketing campaign), verify:

### Cache Hit Rate
- [ ] **Page cache hit rate > 90%** - Check CDN/edge cache analytics
- [ ] **Object cache (memcached) hit rate > 90%** - Check cache stats
- [ ] **InnoDB buffer pool hit rate > 95%** - MySQL performance schema
- [ ] Identify pages consistently missing cache - optimize or exclude from event

### Database Health
- [ ] **No INSERT/UPDATE on uncached page loads** - Use Query Monitor
  - Plugins persistently updating options = high DB CPU + binlog growth
- [ ] **Review P95 upstream response times** - Identify slowest endpoints
  - High traffic to slow endpoints ties up PHP workers
- [ ] **Check for slow queries** - Queries > 100ms under normal load
- [ ] **Verify indexes** - Run EXPLAIN on common queries

### Error Monitoring
- [ ] **Clean PHP logs** - No fatal errors, minimize warnings
  - Easier to debug issues if logs aren't full of noise
- [ ] **Zero 500 errors in 24h** - Check application error rate
- [ ] **Review error tracking** - New Relic, Sentry, etc.

### Load Testing
- [ ] **Run load test simulating expected traffic**
- [ ] **Test specific high-traffic URLs** - Homepage, landing pages
- [ ] **Monitor during test** - CPU, memory, DB connections, response times

## Traffic Pattern Types

### Sustained High Traffic on Multiple URLs
**Impact**: Strain on PHP workers, database connections, memory
**Preparation**:
- Scale horizontally (more app servers)
- Increase PHP worker count
- Optimize database queries
- Implement aggressive caching

### Large Spikes on Few URLs
**Impact**: Bottleneck on specific endpoints, potential cache stampede
**Preparation**:
- Pre-warm caches for target URLs
- Implement cache locking to prevent stampede
- Consider static HTML fallback for extreme cases

### Uncached Content Under Load
**Impact**: Every request hits origin, database overload
**Preparation**:
- Identify why pages bypass cache (cookies, sessions, query params)
- Implement partial caching for personalized pages
- Use ESI (Edge Side Includes) for dynamic fragments

## Load Testing with K6

K6 is an open-source load testing tool for simulating traffic.

### Installation
```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Docker
docker run -i grafana/k6 run - <script.js
```

### Basic Load Test Script
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 100,           // 100 virtual users
    duration: '5m',     // 5 minute test
    thresholds: {
        http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
        http_req_failed: ['rate<0.01'],    // Less than 1% failures
    },
};

export default function() {
    // Test homepage
    let homeResponse = http.get('https://example.com/');
    check(homeResponse, {
        'homepage status 200': (r) => r.status === 200,
        'homepage < 500ms': (r) => r.timings.duration < 500,
    });
    
    // Test archive page
    let archiveResponse = http.get('https://example.com/category/news/');
    check(archiveResponse, {
        'archive status 200': (r) => r.status === 200,
    });
    
    sleep(1);  // Wait 1 second between iterations
}
```

### Running Load Tests
```bash
# Basic run
k6 run load-test.js

# With more virtual users
k6 run --vus 200 --duration 10m load-test.js

# Output to JSON for analysis
k6 run --out json=results.json load-test.js
```

### Key Metrics to Monitor
| Metric | Good | Concerning |
|--------|------|------------|
| `http_req_duration` (p95) | < 500ms | > 1000ms |
| `http_req_failed` | < 1% | > 5% |
| `http_reqs` (throughput) | Stable | Declining under load |
| `vus` vs response time | Linear | Exponential degradation |

## Measuring with Query Monitor

Query Monitor plugin provides detailed performance insights per page.

### Key Panels

**Overview Panel**
- Total page generation time
- Database query time
- HTTP API call time

**Database Queries Panel**
- Individual query times
- Duplicate queries (same query run multiple times)
- Slow queries highlighted
- Query origin (which plugin/theme)

**Object Cache Panel**
- Cache hit/miss ratio
- Total cache operations
- Cache groups usage

### Custom Timing with Query Monitor
```php
// Start timer
do_action('qm/start', 'my_operation');

// Your code here
expensive_operation();

// Stop timer
do_action('qm/stop', 'my_operation');

// For loops, use lap:
do_action('qm/start', 'loop_operation');
foreach ($items as $item) {
    process_item($item);
    do_action('qm/lap', 'loop_operation');
}
do_action('qm/stop', 'loop_operation');
```

### Target Metrics in Query Monitor
| Metric | Target | Investigate |
|--------|--------|-------------|
| Page generation | < 200ms | > 500ms |
| Database queries | < 50 | > 100 |
| Duplicate queries | 0 | > 5 |
| Slowest query | < 50ms | > 100ms |
| Object cache hits | > 90% | < 80% |

## Measuring with PHP Logging

Manual timing for specific code sections.

### Basic Timing
```php
function my_function() {
    $start_time = microtime(true);
    
    // Code to measure
    expensive_operation();
    
    $end_time = microtime(true);
    $execution_time = $end_time - $start_time;
    
    error_log(sprintf(
        'my_function execution time: %.4f seconds',
        $execution_time
    ));
}
```

### Timing Wrapper Function
```php
function measure_execution($callback, $label) {
    $start = microtime(true);
    $result = $callback();
    $duration = microtime(true) - $start;
    
    if ($duration > 0.1) {  // Log if > 100ms
        error_log(sprintf('[SLOW] %s: %.4fs', $label, $duration));
    }
    
    return $result;
}

// Usage
$data = measure_execution(function() {
    return expensive_query();
}, 'expensive_query');
```

### Memory Measurement
```php
$mem_start = memory_get_usage();

// Code that might use lots of memory
$large_array = process_data();

$mem_end = memory_get_usage();
$mem_used = ($mem_end - $mem_start) / 1024 / 1024;

error_log(sprintf('Memory used: %.2f MB', $mem_used));
```

## Measuring with New Relic

New Relic provides APM (Application Performance Monitoring) for production.

### Custom Transaction Naming
```php
// Name transactions for better grouping
if (function_exists('newrelic_name_transaction')) {
    if (is_single()) {
        newrelic_name_transaction('single-post');
    } elseif (is_archive()) {
        newrelic_name_transaction('archive');
    }
}
```

### Custom Instrumentation
```php
// Track custom code segments
if (function_exists('newrelic_start_transaction')) {
    newrelic_start_transaction('my_custom_process');
    
    // Your code
    process_data();
    
    newrelic_end_transaction();
}

// Add custom attributes for filtering
if (function_exists('newrelic_add_custom_parameter')) {
    newrelic_add_custom_parameter('post_type', get_post_type());
    newrelic_add_custom_parameter('user_role', $current_user_role);
}
```

### Key New Relic Metrics
- **Apdex score** - User satisfaction (target: > 0.9)
- **Web transaction time** - Average response time
- **Throughput** - Requests per minute
- **Error rate** - Percentage of failed requests
- **Database time** - Time spent in DB queries

## Performance Alerting

Set up alerts for performance degradation.

### Key Alert Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| Response time (p95) | > 1s | > 3s |
| Error rate | > 1% | > 5% |
| CPU usage | > 70% | > 90% |
| Memory usage | > 80% | > 95% |
| Database connections | > 80% of max | > 95% of max |

### Alert Channels
- **Immediate**: PagerDuty, Slack, SMS for critical
- **Batched**: Email digest for warnings
- **Dashboard**: Real-time visibility for operations team

## Performance Regression Detection

Catch performance issues before production.

### Baseline Metrics
Establish baseline performance metrics:
```
Homepage: < 200ms, < 30 queries
Archive:  < 300ms, < 50 queries
Single:   < 250ms, < 40 queries
Search:   < 500ms (with ElasticSearch)
```

### CI/CD Integration
```yaml
# Example: Run performance check in CI
- name: Performance Check
  run: |
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' https://staging.example.com/)
    if (( $(echo "$RESPONSE_TIME > 0.5" | bc -l) )); then
      echo "Warning: Response time ${RESPONSE_TIME}s exceeds threshold"
      exit 1
    fi
```

### Query Count Monitoring
```php
// Add to theme's functions.php for staging
add_action('shutdown', function() {
    if (!defined('SAVEQUERIES') || !SAVEQUERIES) return;
    
    global $wpdb;
    $query_count = count($wpdb->queries);
    
    if ($query_count > 100) {
        error_log("[PERFORMANCE] High query count: $query_count");
    }
});
```
