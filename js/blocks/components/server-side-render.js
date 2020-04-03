/**
 * Forked from Gutenberg, with a minor edit to allow using POST requests instead of GET requests.
 * Todo: delete if this is merged: https://github.com/WordPress/gutenberg/pull/21068/
 *
 * @see https://github.com/WordPress/gutenberg/blob/c72030189017c8aac44453c1386f4251e45e80df/packages/server-side-render/src/index.js
 */

/**
 * External dependencies
 */
import { isEqual, debounce } from 'lodash';

/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { Placeholder, Spinner } from '@wordpress/components';
import { withSelect } from '@wordpress/data';
import { Component, RawHTML, useMemo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

/**
 * Constants
 */
const EMPTY_OBJECT = {};

export function rendererPath( block, attributes = null, urlQueryArgs = {} ) {
	return addQueryArgs( `/wp/v2/block-renderer/${ block }`, {
		context: 'edit',
		...( null !== attributes ? { attributes } : {} ),
		...urlQueryArgs,
	} );
}

export class ServerSideRender extends Component {
	constructor( props ) {
		super( props );
		this.state = {
			response: null,
		};
	}

	componentDidMount() {
		this.isStillMounted = true;
		this.fetch( this.props );
		// Only debounce once the initial fetch occurs to ensure that the first
		// renders show data as soon as possible.
		this.fetch = debounce( this.fetch, 500 );
	}

	componentWillUnmount() {
		this.isStillMounted = false;
	}

	componentDidUpdate( prevProps ) {
		if ( ! isEqual( prevProps, this.props ) ) {
			this.fetch( this.props );
		}
	}

	fetch( props ) {
		if ( ! this.isStillMounted ) {
			return;
		}
		if ( null !== this.state.response ) {
			this.setState( { response: null } );
		}

		const {
			block,
			attributes = null,
			requestBody,
			urlQueryArgs = {},
		} = props;

		// If requestBody, make a POST request, with the attributes in the request body instead of the URL.
		// This allows sending a larger attributes object than in a GET request, where the attributes are in the URL.
		const urlAttributes = requestBody ? null : attributes;
		const path = rendererPath( block, urlAttributes, urlQueryArgs );
		const method = requestBody ? 'POST' : 'GET';
		const data = requestBody ? attributes : null;

		// Store the latest fetch request so that when we process it, we can
		// check if it is the current request, to avoid race conditions on slow networks.
		const fetchRequest = ( this.currentFetchRequest = apiFetch( {
			path,
			method,
			data,
		} )
			.then( ( response ) => {
				if (
					this.isStillMounted &&
					fetchRequest === this.currentFetchRequest &&
					response
				) {
					this.setState( { response: response.rendered } );
				}
			} )
			.catch( ( error ) => {
				if (
					this.isStillMounted &&
					fetchRequest === this.currentFetchRequest
				) {
					this.setState( {
						response: {
							error: true,
							errorMsg: error.message,
						},
					} );
				}
			} ) );
		return fetchRequest;
	}

	render() {
		const response = this.state.response;
		const {
			className,
			EmptyResponsePlaceholder,
			ErrorResponsePlaceholder,
			LoadingResponsePlaceholder,
		} = this.props;

		if ( response === '' ) {
			return (
				<EmptyResponsePlaceholder
					response={ response }
					{ ...this.props }
				/>
			);
		} else if ( ! response ) {
			return (
				<LoadingResponsePlaceholder
					response={ response }
					{ ...this.props }
				/>
			);
		} else if ( response.error ) {
			return (
				<ErrorResponsePlaceholder
					response={ response }
					{ ...this.props }
				/>
			);
		}

		return (
			<RawHTML key="html" className={ className }>
				{ response }
			</RawHTML>
		);
	}
}

ServerSideRender.defaultProps = {
	EmptyResponsePlaceholder: ( { className } ) => (
		<Placeholder className={ className }>
			{ __( 'Block rendered as empty.' ) }
		</Placeholder>
	),
	ErrorResponsePlaceholder: ( { response, className } ) => {
		const errorMessage = sprintf(
			// translators: %s: error message describing the problem
			__( 'Error loading block: %s' ),
			response.errorMsg
		);
		return (
			<Placeholder className={ className }>{ errorMessage }</Placeholder>
		);
	},
	LoadingResponsePlaceholder: ( { className } ) => {
		return (
			<Placeholder className={ className }>
				<Spinner />
			</Placeholder>
		);
	},
};

export default withSelect( ( select ) => {
	const coreEditorSelect = select( 'core/editor' );
	if ( coreEditorSelect ) {
		const currentPostId = coreEditorSelect.getCurrentPostId();
		if ( currentPostId ) {
			return {
				currentPostId,
			};
		}
	}
	return EMPTY_OBJECT;
} )( ( { urlQueryArgs = EMPTY_OBJECT, currentPostId, ...props } ) => {
	const newUrlQueryArgs = useMemo( () => {
		if ( ! currentPostId ) {
			return urlQueryArgs;
		}
		return {
			post_id: currentPostId,
			...urlQueryArgs,
		};
	}, [ currentPostId, urlQueryArgs ] );

	return <ServerSideRender urlQueryArgs={ newUrlQueryArgs } { ...props } />;
} );
