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

	element := JS window document createElement: 'div'.
	element style
		width: 400px;
		height: 400px;
		background: '#fff'.
	 
	self addChild: (XRHtmlPanel new element: element).
]

{ #category : #'as yet unclassified' }
XRTextPanel >> text: aString [

	element innerHTML: aString
]
