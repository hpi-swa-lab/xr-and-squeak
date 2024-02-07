Class {
	#name : #XRHtmlPanel,
	#superclass : #XRObject,
	#instVars : [
		'element'
	],
	#category : #SqueakXR
}

{ #category : #initializing }
XRHtmlPanel >> boundingRect [

	^ element getBoundingClientRect
]

{ #category : #accessing }
XRHtmlPanel >> element [

	^ element
]

{ #category : #accessing }
XRHtmlPanel >> element: anHtmlElement [

	element := anHtmlElement
]

{ #category : #initializing }
XRHtmlPanel >> handlePointing: pointingInformation [

	| dimensions normalizedPoint point clickPoint clickedElement event |
	point := self threeObject worldToLocal: pointingInformation point.
	dimensions := Three Vector3
		new: pointingInformation object geometry parameters width
		y: pointingInformation object geometry parameters height
		z: 1.
	normalizedPoint := point clone divide: dimensions.
	normalizedPoint x: normalizedPoint x + 0.5.
	normalizedPoint y: 1.0 - (normalizedPoint y + 0.5).
	
	clickPoint := normalizedPoint multiply: self htmlElementSizeAsVector3.
	clickedElement := JS window document elementFromPoint: clickPoint x y: clickPoint y.
	event := JS MouseEvent
		new: 'click'
		options: ({
			#bubbles -> true.
			#cancelable -> true.
			# view -> JS window} as: Dictionary).
	clickedElement dispatchEvent: event.
]

{ #category : #initializing }
XRHtmlPanel >> htmlElementSizeAsVector3 [

	| rect |
	rect := self boundingRect.
	^ Three Vector3
		new: rect width
		y: rect height
		z: 0
]

{ #category : #initializing }
XRHtmlPanel >> initializeThreeObject [

	| button clickCounter count htmlMesh text updateCounter |
	self element: (JS window document createElement: 'div').
	self element setAttribute: 'id' to: 'test-id'.
	"IMPORTANT: overflow: hidden prevents offset in viewport if children have margins etc"
	self element setAttribute: 'style' to: 'width: 200px; height: 200px; background: #FFB; overflow-wrap: break-word; overflow: hidden'.
	self world elementContainer appendChild: element.
	
	text := JS window document createElement: 'h1'.
	text innerHTML: 'Test UI'.
	self element appendChild: text.
	
	count := 0.
	clickCounter := JS window document createElement: 'p'.
	updateCounter := [clickCounter innerHTML: 'The button was clicked ', count asString, ' times'].
	updateCounter value.
	self element appendChild: clickCounter.
	
	button := JS window document createElement: 'button'.
	button innerHTML: 'Click me!'.
	button onclick: [count := count + 1. updateCounter value].
	self element appendChild: button.
	
	htmlMesh := JS HTMLMesh new: self element.
	htmlMesh position set: 0m y: 1.5m z: -0.5m.
	htmlMesh userData: ({#isPointable -> true} as: Dictionary).
	
	^ htmlMesh
]
