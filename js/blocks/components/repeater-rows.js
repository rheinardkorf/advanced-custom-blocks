/**
 * WordPress dependencies
 */
const { BaseControl, Button, IconButton } = wp.components;
const { Component, Fragment } = wp.element;
const { __ } = wp.i18n;

/**
 * Internal dependencies
 */
import { Fields } from './';

/**
 * Gets the rendered fields, using their control functions.
 *
 * @param {Array}  rows   The repeater rows to render.
 * @param {Array}  fields The fields to render.
 * @param {Object} parentBlockProps  The props to pass to the control function.
 * @param {Object} parentBlock  The block where the fields are.
 * @return {Array} fields The rendered fields.
 */
 export default class RepeaterRows extends Component {

	/**
	 * Constructs the component class.
	 */
	constructor() {
		super( ...arguments );
		this.removeRow = this.removeRow.bind( this );

		this.state = {
			activeRow: 0,
		};
	}

	/**
	 * Gets the parent from fields, if one exists.
	 *
	 * Sub-fields in the Repeater control have parents.
	 * This looks for a parent in each field, and returns a parent as long as they don't have different parents.
	 *
	 * @param {Object} fields The fields in which to look for the parent.
	 * @return {String|null} parent The parent of the fields.
	 */
	getParent( fields ) {
		let parent = null;
		for ( const field in fields ) {
			if ( fields.hasOwnProperty( field ) ) {
				if ( parent && parent !== fields[ field ].parent ) {
					return null;
				}
				parent = fields[ field ].parent;
			}
		}

		return parent;
	};

	/*
	 * On clicking the 'remove' button in a repeater row, this removes it.
	 *
	 * @param {Number} index The index of the row to remove, 0 being the first.
	 */
	removeRow( index ) {
		return () => {
			const { parentBlockProps } = this.props;
			const attr = { ...parentBlockProps.attributes };
			const parentName = this.getParent( this.props.fields );
			const repeaterRows = attr[ parentName ];
			if ( ! repeaterRows ) {
				return;
			}

			/*
			 * Calling slice() essentially creates a copy of repeaterRows.
			 * Without this, it looks like setAttributes() doesn't recognize a change to the array, and the component doesn't re-render.
			 */
			const repeaterRowsCopy = repeaterRows.slice();
			repeaterRowsCopy.splice( index, 1 );

			attr[ parentName ] = repeaterRowsCopy;
			parentBlockProps.setAttributes( attr );
		};
	}

	/**
	 * Renders the repeater rows.
	 */
	render() {
		const { rows, subFields, parentBlockProps, parentBlock } = this.props;

		return (
			<Fragment>
				<div className="block-lab-repeater__rows">
					{
						rows.map( ( row, rowIndex ) => {
							const activeClass = this.state.activeRow === parseInt( rowIndex ) ? 'active' : ''; // @todo: Make this dynamic.

							return (
								<BaseControl className={ `block-lab-repeater--row ${ activeClass }` } key={ `bl-row-${ rowIndex }` }>
									<Fields
										fields={ subFields }
										parentBlockProps={ parentBlockProps }
										parentBlock={ parentBlock }
										rowIndex={ rowIndex }
									/>
									<div className="block-lab-repeater--row-actions">
										<Button
											key={ `${ rowIndex }-move-left` }
											isLink={true}
											className="button-move-left"
										>
											{ __( 'Move left', 'block-lab' ) }
										</Button>
										<span className="separator">|</span>
										<Button
											key={ `${ rowIndex }-move-right` }
											isLink={true}
											className="button-move-right"
										>
											{ __( 'Move right', 'block-lab' ) }
										</Button>
										<span className="separator">|</span>
										<Button
											key={ `${ rowIndex }-delete` }
											isLink={true}
											onClick={ this.removeRow( rowIndex ) }
											className="button-dismiss"
										>
											{ __( 'Delete', 'block-lab' ) }
										</Button>
									</div>
								</BaseControl>
							);
						} )
					}
				</div>
				<div className="block-lab-repeater__carousel-buttons">
					<IconButton
						icon="arrow-left-alt2"
						label={ __( 'Previous', 'block-lab' ) }
						labelPosition="bottom"
						className="button-move-left"
						onClick={ () => {
							var activeRow = this.state.activeRow - 1;
							if ( activeRow < 0 ) {
								activeRow = rows.length - 1;
							}
							this.setState( { activeRow: activeRow } );
						} }
					/>
					<IconButton
						icon="arrow-right-alt2"
						label={ __( 'Next', 'block-lab' ) }
						labelPosition="bottom"
						className="button-move-right"
						onClick={ () => {
							var activeRow = this.state.activeRow + 1;
							if ( activeRow >= rows.length ) {
								activeRow = 0;
							}
							this.setState( { activeRow: activeRow } );
						} }
					/>
				</div>
			</Fragment>
		);
	}
};