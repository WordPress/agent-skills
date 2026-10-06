# @wordpress/dataviews and @wordpress/dataform (WP 6.6+)

Use these components for modern React-based admin tables and forms, backed by the REST API.

## When to use the modern path

- WordPress 6.6+ is the minimum target.
- The plugin already uses `@wordpress/scripts` for building JS.
- You need filtering, sorting, layout switching (table/grid/list), or inline editing out of the box.

## Enqueuing

```php
add_action( 'admin_enqueue_scripts', function ( $hook ) {
    if ( 'toplevel_page_my-plugin' !== $hook ) {
        return;
    }
    $asset = require plugin_dir_path( __FILE__ ) . 'build/index.asset.php';
    wp_enqueue_script(
        'my-plugin-admin',
        plugin_dir_url( __FILE__ ) . 'build/index.js',
        $asset['dependencies'],
        $asset['version'],
        true
    );
    wp_add_inline_script(
        'my-plugin-admin',
        'window.myPluginData = ' . wp_json_encode( [
            'nonce'  => wp_create_nonce( 'wp_rest' ),
            'apiUrl' => rest_url( 'my-plugin/v1/items' ),
        ] ),
        'before'
    );
} );
```

## DataViews — basic table

```jsx
import { DataViews, filterSortAndPaginate } from '@wordpress/dataviews';
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

const DEFAULT_VIEW = {
    type: 'table',
    perPage: 20,
    page: 1,
    sort: { field: 'date', direction: 'desc' },
    filters: [],
    hiddenFields: [],
    layout: {},
};

export default function MyItemsView() {
    const [ items, setItems ] = useState( [] );
    const [ view, setView ] = useState( DEFAULT_VIEW );
    const [ isLoading, setIsLoading ] = useState( true );

    useEffect( () => {
        setIsLoading( true );
        apiFetch( { path: '/my-plugin/v1/items', headers: { 'X-WP-Nonce': window.myPluginData.nonce } } )
            .then( ( data ) => { setItems( data ); setIsLoading( false ); } );
    }, [] );

    const fields = [
        { id: 'name',  label: 'Name',  render: ( { item } ) => item.name },
        { id: 'email', label: 'Email', render: ( { item } ) => item.email },
        { id: 'date',  label: 'Date',  render: ( { item } ) => item.date },
    ];

    const actions = [
        {
            id: 'delete',
            label: 'Delete',
            isPrimary: false,
            isDestructive: true,
            callback: ( selectedItems ) => {
                selectedItems.forEach( ( item ) =>
                    apiFetch( {
                        path: `/my-plugin/v1/items/${ item.id }`,
                        method: 'DELETE',
                        headers: { 'X-WP-Nonce': window.myPluginData.nonce },
                    } )
                );
            },
        },
    ];

    const { data: processedData, paginationInfo } = filterSortAndPaginate( items, view, fields );

    return (
        <DataViews
            data={ processedData }
            fields={ fields }
            view={ view }
            onChangeView={ setView }
            actions={ actions }
            paginationInfo={ paginationInfo }
            isLoading={ isLoading }
            getItemId={ ( item ) => String( item.id ) }
        />
    );
}
```

## DataForm — schema-driven form

```jsx
import { DataForm } from '@wordpress/dataviews';
import { useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

const FORM_FIELDS = [
    { id: 'name',  label: 'Name',  type: 'text' },
    { id: 'email', label: 'Email', type: 'email' },
];

export default function EditItemForm( { item, onSaved } ) {
    const [ formData, setFormData ] = useState( item );

    const handleSave = async () => {
        await apiFetch( {
            path: `/my-plugin/v1/items/${ item.id }`,
            method: 'POST',
            data: formData,
            headers: { 'X-WP-Nonce': window.myPluginData.nonce },
        } );
        onSaved();
    };

    return (
        <>
            <DataForm
                data={ formData }
                fields={ FORM_FIELDS }
                form={ { type: 'regular', fields: [ 'name', 'email' ] } }
                onChange={ ( updates ) => setFormData( { ...formData, ...updates } ) }
            />
            <button onClick={ handleSave }>Save</button>
        </>
    );
}
```

## REST API endpoint requirements

Every `DataViews` data source must have a REST endpoint that:

- enforces `permissions_callback` with `current_user_can()`.
- sanitizes query params (`absint`, `sanitize_text_field`).
- returns consistent shape: `{ id, ...fields }` per item.
- supports DELETE with the same capability check.

## Common mistakes

- Passing `data` as a non-array value (e.g., an object from `apiFetch` before it resolves).
- Forgetting `X-WP-Nonce` header — REST requests will return 403.
- Omitting `getItemId` — DataViews requires a stable string ID per item.
- Using `@wordpress/dataviews` on WP < 6.6 — the package is not bundled in core before that version.
