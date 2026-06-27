/*
 * contribgraph — Wikipedia user-page contribution graph (self-contained userscript)
 *
 * Paste into your Special:MyPage/common.js (e.g. User:ImperfectlyInformed/common.js).
 * Renders a GitHub-style edits-per-day heatmap at the top of any User: page, for that
 * page's user, with ◀ year ▶ navigation.
 *
 * Self-contained on purpose: it calls the SAME-ORIGIN MediaWiki API
 * (action=query&list=usercontribs) via mw.Api and draws the calendar in plain SVG.
 * No external services (no Toolforge), no external scripts (CSP-safe), no D3/jQuery
 * plugins. Source/dev version: https://gitlab.com/jcrben-all-groups/jcrben-wiki/wikihistory
 */
( function () {
	'use strict';

	// Render only on a dedicated User: subpage named ".../wikihistory"
	// (e.g. User:ImperfectlyInformed/wikihistory) — not the main user page.
	var ns = mw.config.get( 'wgNamespaceNumber' );
	if ( ns !== 2 && ns !== 3 ) {
		return;
	}
	var parts = mw.config.get( 'wgTitle' ).split( '/' ); // ["ImperfectlyInformed","wikihistory"]
	if ( parts[ parts.length - 1 ] !== 'wikihistory' ) {
		return;
	}
	// Prefer the username from the page's .username span (the userbox), else the subpage owner.
	var unameEl = document.querySelector( '#wikihistory .username, .username' );
	var user = ( unameEl && unameEl.textContent.trim() ) || parts[ 0 ];
	if ( !user ) {
		return;
	}

	var CELL = 11;            // px per day cell
	var GAP = 2;              // px between cells
	var ROWS = 7;             // days of week (Sun=0 at top)
	var TOP = 20;             // space for month labels
	var LEFT = 28;            // space for weekday labels
	var COLORS = [ '#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39' ];

	var selectedYear = new Date().getFullYear();
	var container;

	function bucket( count, max ) {
		if ( !count ) { return 0; }
		if ( max <= 1 ) { return 2; }
		var q = count / max;
		if ( q > 0.66 ) { return 4; }
		if ( q > 0.33 ) { return 3; }
		if ( q > 0.10 ) { return 2; }
		return 1;
	}

	function pad( n ) { return ( n < 10 ? '0' : '' ) + n; }

	// Fetch all usercontribs for [start, end] (handles continuation), return {date: count}.
	function fetchYear( username, year ) {
		var api = new mw.Api();
		var perDay = {};
		var start = year + '-12-31T23:59:59Z'; // newer bound (API is descending)
		var end = year + '-01-01T00:00:00Z';   // older bound
		function page( uccontinue ) {
			var params = {
				action: 'query', list: 'usercontribs', ucuser: username,
				uclimit: 'max', ucstart: start, ucend: end,
				ucprop: 'timestamp', formatversion: 2, format: 'json'
			};
			if ( uccontinue ) { params.uccontinue = uccontinue; }
			return api.get( params ).then( function ( data ) {
				( ( data.query && data.query.usercontribs ) || [] ).forEach( function ( c ) {
					var d = c.timestamp.slice( 0, 10 );
					perDay[ d ] = ( perDay[ d ] || 0 ) + 1;
				} );
				if ( data.continue && data.continue.uccontinue ) {
					return page( data.continue.uccontinue );
				}
				return perDay;
			} );
		}
		return page( null );
	}

	function svgEl( name, attrs ) {
		var el = document.createElementNS( 'http://www.w3.org/2000/svg', name );
		for ( var k in attrs ) { el.setAttribute( k, attrs[ k ] ); }
		return el;
	}

	function render( perDay ) {
		var jan1 = new Date( Date.UTC( selectedYear, 0, 1 ) );
		var today = new Date();
		var lastDay = ( selectedYear === today.getFullYear() ) ?
			new Date( Date.UTC( today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() ) ) :
			new Date( Date.UTC( selectedYear, 11, 31 ) );

		var max = 0, k;
		for ( k in perDay ) { if ( perDay[ k ] > max ) { max = perDay[ k ]; } }

		var col0 = function ( d ) {
			return Math.floor( ( ( d - jan1 ) / 86400000 + jan1.getUTCDay() ) / 7 );
		};
		var weeks = col0( lastDay ) + 1;
		var width = LEFT + weeks * ( CELL + GAP );
		var height = TOP + ROWS * ( CELL + GAP );
		var svg = svgEl( 'svg', { width: width, height: height, 'font-family': 'sans-serif' } );

		[ [ 'Mon', 1 ], [ 'Wed', 3 ], [ 'Fri', 5 ] ].forEach( function ( wl ) {
			var t = svgEl( 'text', { x: 0, y: TOP + wl[ 1 ] * ( CELL + GAP ) + CELL, 'font-size': 9, fill: '#666' } );
			t.textContent = wl[ 0 ];
			svg.appendChild( t );
		} );

		var months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
		var lastMonthCol = -1;
		var d = new Date( jan1.getTime() );
		while ( d <= lastDay ) {
			var col = col0( d );
			var row = d.getUTCDay();
			var key = d.getUTCFullYear() + '-' + pad( d.getUTCMonth() + 1 ) + '-' + pad( d.getUTCDate() );
			var count = perDay[ key ] || 0;
			var rect = svgEl( 'rect', {
				x: LEFT + col * ( CELL + GAP ), y: TOP + row * ( CELL + GAP ),
				width: CELL, height: CELL, rx: 2, fill: COLORS[ bucket( count, max ) ]
			} );
			var title = svgEl( 'title', {} );
			title.textContent = count + ( count === 1 ? ' edit on ' : ' edits on ' ) + key;
			rect.appendChild( title );
			svg.appendChild( rect );
			if ( d.getUTCDate() === 1 && col !== lastMonthCol ) {
				var mt = svgEl( 'text', { x: LEFT + col * ( CELL + GAP ), y: 12, 'font-size': 9, fill: '#666' } );
				mt.textContent = months[ d.getUTCMonth() ];
				svg.appendChild( mt );
				lastMonthCol = col;
			}
			d = new Date( d.getTime() + 86400000 );
		}
		return svg;
	}

	function load() {
		var graph = container.querySelector( '.cg-graph' );
		graph.textContent = 'Loading ' + selectedYear + '…';
		container.querySelector( '.cg-year' ).textContent = selectedYear;
		fetchYear( user, selectedYear ).then( function ( perDay ) {
			graph.textContent = '';
			graph.appendChild( render( perDay ) );
		}, function () {
			graph.textContent = 'Could not load contribution data.';
		} );
	}

	function changeYear( delta ) {
		var target = selectedYear + delta;
		if ( target < 2001 || target > new Date().getFullYear() ) { return; }
		selectedYear = target;
		load();
	}

	function build() {
		container = document.createElement( 'div' );
		container.style.cssText = 'margin:0 0 1em;padding:8px;border:1px solid #c8ccd1;border-radius:4px;overflow-x:auto';
		var bar = document.createElement( 'div' );
		bar.style.cssText = 'margin-bottom:6px;font-weight:bold';
		bar.innerHTML = 'Wikipedia contributions: ' +
			'<button class="cg-prev">◀</button> <span class="cg-year"></span> <button class="cg-next">▶</button>';
		var graph = document.createElement( 'div' );
		graph.className = 'cg-graph';
		container.appendChild( bar );
		container.appendChild( graph );
		bar.querySelector( '.cg-prev' ).onclick = function () { changeYear( -1 ); };
		bar.querySelector( '.cg-next' ).onclick = function () { changeYear( 1 ); };

		var content = document.getElementById( 'mw-content-text' );
		content.parentNode.insertBefore( container, content );
		load();
	}

	mw.loader.using( [ 'mediawiki.api' ] ).then( build );
}() );
