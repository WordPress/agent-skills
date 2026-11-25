#!/usr/bin/env node
/*
 * Checks that the security reference files stay in sync with the files that name them.
 *
 * Directive files live in one folder per surface, numbered in encounter order:
 * references/security/<surface>/NN-name.md (for example database/01-use-wpdb.md).
 *
 * - Every directive file is listed in SKILL.md and named in security.md.
 * - Every directive file named in SKILL.md or security.md exists.
 * - Every directive file has Prohibited, Required, and Exceptions headings.
 *
 * Usage: node skills/wp-plugin-development/scripts/check_security_refs.mjs
 * Exits 1 when a problem is found.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skillDir = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const securityDir = path.join( skillDir, 'references', 'security' );
const directiveFile = /^\d{2}-[a-z0-9-]+\.md$/;
const directiveMention = /\b([a-z0-9-]+\/\d{2}-[a-z0-9-]+\.md)\b/g;
const headings = [ '**Prohibited**', '**Required**', '**Exceptions' ];

const problems = [];
const read = ( file ) => fs.readFileSync( file, 'utf8' );

// Directive files as "<surface>/NN-name.md", relative to references/security/.
const files = [];
if ( fs.existsSync( securityDir ) ) {
	for ( const surface of fs.readdirSync( securityDir, { withFileTypes: true } ) ) {
		if ( ! surface.isDirectory() ) {
			continue;
		}
		for ( const name of fs.readdirSync( path.join( securityDir, surface.name ) ) ) {
			if ( directiveFile.test( name ) ) {
				files.push( `${ surface.name }/${ name }` );
			}
		}
	}
}

const skill = read( path.join( skillDir, 'SKILL.md' ) );
const security = read( path.join( skillDir, 'references', 'security.md' ) );

for ( const file of files ) {
	if ( ! skill.includes( `references/security/${ file }` ) ) {
		problems.push( `${ file }: not listed in SKILL.md, so no model will load it` );
	}
	if ( ! security.includes( file ) ) {
		problems.push( `${ file }: not named in security.md` );
	}
	const body = read( path.join( securityDir, file ) );
	for ( const heading of headings ) {
		if ( ! body.includes( heading ) ) {
			problems.push( `${ file }: missing the ${ heading.replace( /\*/g, '' ) } heading` );
		}
	}
}

for ( const [ label, text ] of [ [ 'SKILL.md', skill ], [ 'security.md', security ] ] ) {
	const mentioned = new Set( Array.from( text.matchAll( directiveMention ), ( match ) => match[ 1 ] ) );
	for ( const file of mentioned ) {
		if ( ! files.includes( file ) ) {
			problems.push( `${ label }: names ${ file }, which does not exist in references/security/` );
		}
	}
}

if ( ! files.length ) {
	problems.push( 'No directive files found in references/security/<surface>/.' );
}

if ( problems.length ) {
	console.error( problems.join( '\n' ) );
	process.exit( 1 );
}
console.log( `OK: ${ files.length } directive files listed in SKILL.md and security.md, each with all three headings.` );
