Class {
	#name : #XRTextPanel,
	#superclass : #XRObject,
	#instVars : [
		'element',
		'htmlPanel'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #'as yet unclassified' }
XRTextPanel >> initialize [

	super initialize.

	element := JS window document createElement: 'pre'.
	element style
		width: 400px;
		height: 400px;
		padding: 30px;
		background: '#fff';
		at: #'font-size' put: 10px.
	
	htmlPanel := XRHtmlPanel new element: element.
	self addChild: htmlPanel.
]

{ #category : #'as yet unclassified' }
XRTextPanel >> text [

	^ element innerHTML asString
]

{ #category : #'as yet unclassified' }
XRTextPanel >> text: aString [

	element innerHTML: aString.
	htmlPanel updateTexture.
]
