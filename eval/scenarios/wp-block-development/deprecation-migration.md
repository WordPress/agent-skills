# Block Deprecation Migration

Skill: wp-block-development

Attribute shape changes in blocks need a migration path to avoid invalidating existing content.

## Attribute changes include deprecations

**Given** a block update that changes saved markup or attribute structure
**When** the skill proposes the implementation
**Then** it should include a `deprecated` version or another migration strategy for existing content

### Examples

Pass:
```javascript
deprecated: [
  {
    attributes: { label: { type: 'string' } },
    save: OldSave,
    migrate: ( attributes ) => ( { title: attributes.label } ),
  },
]
```

Fail:
```javascript
attributes: {
  title: { type: 'string' }
}
```
The old `label` attribute is removed with no migration path, so existing blocks can become invalid.
