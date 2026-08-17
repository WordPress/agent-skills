# WP_List_Table

Use `WP_List_Table` for tabular admin data when targeting WP < 6.6 or when a pure-PHP table is preferred.

## Minimal implementation

```php
if ( ! class_exists( 'WP_List_Table' ) ) {
    require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
}

class My_Plugin_List_Table extends WP_List_Table {

    public function get_columns() {
        return [
            'cb'    => '<input type="checkbox">',
            'name'  => __( 'Name', 'my-plugin' ),
            'email' => __( 'Email', 'my-plugin' ),
            'date'  => __( 'Date', 'my-plugin' ),
        ];
    }

    public function get_sortable_columns() {
        return [
            'name' => [ 'name', false ],
            'date' => [ 'date', true ],   // true = already sorted descending
        ];
    }

    public function get_bulk_actions() {
        return [ 'delete' => __( 'Delete', 'my-plugin' ) ];
    }

    public function prepare_items() {
        $per_page     = 20;
        $current_page = $this->get_pagenum();
        $orderby      = sanitize_sql_orderby( $_REQUEST['orderby'] ?? 'date' ) ?: 'date';
        $order        = 'ASC' === strtoupper( $_REQUEST['order'] ?? '' ) ? 'ASC' : 'DESC';

        // Fetch data — replace with your query.
        $all_items  = my_plugin_get_items( $orderby, $order );
        $total      = count( $all_items );

        $this->items = array_slice( $all_items, ( $current_page - 1 ) * $per_page, $per_page );

        $this->_column_headers = [ $this->get_columns(), [], $this->get_sortable_columns() ];

        $this->set_pagination_args( [
            'total_items' => $total,
            'per_page'    => $per_page,
            'total_pages' => ceil( $total / $per_page ),
        ] );
    }

    public function column_default( $item, $column_name ) {
        return esc_html( $item[ $column_name ] ?? '' );
    }

    public function column_cb( $item ) {
        return sprintf( '<input type="checkbox" name="item[]" value="%s">', absint( $item['id'] ) );
    }

    public function column_name( $item ) {
        $actions = [
            'edit'   => sprintf( '<a href="%s">%s</a>', esc_url( admin_url( 'admin.php?page=my-plugin&action=edit&id=' . absint( $item['id'] ) ) ), __( 'Edit', 'my-plugin' ) ),
            'delete' => sprintf( '<a href="%s">%s</a>', esc_url( wp_nonce_url( admin_url( 'admin.php?page=my-plugin&action=delete&id=' . absint( $item['id'] ) ) ), 'delete_item_' . $item['id'] ) ), __( 'Delete', 'my-plugin' ) ),
        ];
        return esc_html( $item['name'] ) . $this->row_actions( $actions );
    }
}
```

## Rendering in the page callback

```php
function my_plugin_render_page() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }

    // Handle bulk actions before output.
    $table = new My_Plugin_List_Table();
    $table->process_bulk_action();   // implement this method with nonce + cap check
    $table->prepare_items();
    ?>
    <div class="wrap">
        <h1><?php esc_html_e( 'My Items', 'my-plugin' ); ?></h1>
        <form method="get">
            <input type="hidden" name="page" value="<?php echo esc_attr( $_REQUEST['page'] ); ?>">
            <?php $table->search_box( __( 'Search', 'my-plugin' ), 'my-plugin-search' ); ?>
        </form>
        <form method="post">
            <?php wp_nonce_field( 'my_plugin_bulk_action', '_wpnonce_bulk' ); ?>
            <?php $table->display(); ?>
        </form>
    </div>
    <?php
}
```

## Processing bulk actions safely

```php
public function process_bulk_action() {
    if ( 'delete' !== $this->current_action() ) {
        return;
    }
    check_admin_referer( 'my_plugin_bulk_action', '_wpnonce_bulk' );
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( esc_html__( 'Permission denied.', 'my-plugin' ) );
    }
    $ids = array_map( 'absint', (array) ( $_POST['item'] ?? [] ) );
    foreach ( $ids as $id ) {
        my_plugin_delete_item( $id );
    }
}
```
