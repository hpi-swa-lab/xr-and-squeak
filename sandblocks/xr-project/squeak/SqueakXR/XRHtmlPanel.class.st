Class {
	#name : #XRHtmlPanel,
	#superclass : #XRObject,
	#category : #SqueakXR
}

{ #category : #initializing }
XRHtmlPanel >> handlePointing: pointingInformation [

	| dimensions normalizedPoint point |
	point := self threeObject worldToLocal: pointingInformation point.
	dimensions := Three Vector3
		new: pointingInformation object geometry parameters width
		y: pointingInformation object geometry parameters height
		z: 1.
	normalizedPoint := point clone divide: dimensions.
	normalizedPoint x: normalizedPoint x + 0.5.
	normalizedPoint y: 1.0 - (normalizedPoint y + 0.5).
]

{ #category : #initializing }
XRHtmlPanel >> initializeThreeObject [

	| button clickCounter count element htmlMesh text updateCounter |
	element := JS window document createElement: 'div'.
	element setAttribute: 'id' to: 'test-id'.
	element setAttribute: 'style' to: 'width: 200px; height: 200px; background: #FFB; overflow-wrap: break-word;'.
	self world elementContainer appendChild: element.
	
	text := JS window document createElement: 'h1'.
	text innerHTML: 'Test UI'.
	element appendChild: text.
	
	count := 0.
	clickCounter := JS window document createElement: 'p'.
	updateCounter := [clickCounter innerHTML: 'The button was clicked ', count asString, ' times'].
	updateCounter value.
	element appendChild: clickCounter.
	
	button := JS window document createElement: 'button'.
	button innerHTML: 'Click me!'.
	button onclick: [count := count + 1. updateCounter value].
	element appendChild: button.
	
	htmlMesh := JS HTMLMesh new: element.
	htmlMesh position set: 0m y: 1.5m z: -0.5m.
	htmlMesh userData: ({#isPointable -> true} as: Dictionary).
	
	^ htmlMesh
]
