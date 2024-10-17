Class {
	#name : #XRTextPanel,
	#superclass : #XRObject,
	#instVars : [
		'element'
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
	 
	self addChild: (XRHtmlPanel new element: element).
]

{ #category : #'as yet unclassified' }
XRTextPanel >> text [

	^ element innerHTML
]

{ #category : #'as yet unclassified' }
XRTextPanel >> text: aString [

	element innerHTML: aString
]
