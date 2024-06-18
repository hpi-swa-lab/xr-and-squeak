Class {
	#name : #XRHtmlPanel,
	#superclass : #XRObject,
	#instVars : [
		'element',
		'containingElement',
		'canvasTexture',
		'canvas',
		'mutationObserver',
		'htmlDimensions',
		'canvasDimensions',
		'scale'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #accessing }
XRHtmlPanel >> boundingRect [

	^ self element getBoundingClientRect
]

{ #category : #accessing }
XRHtmlPanel >> canvas [

	^ canvas ifNil: [
		canvas := JS window document createElement: 'canvas']
]

{ #category : #accessing }
XRHtmlPanel >> canvasDimensions [

	^ canvasDimensions
]

{ #category : #accessing }
XRHtmlPanel >> canvasDimensions: aPoint [

	canvasDimensions := aPoint.
	
	self canvas
		setAttribute: #width to: canvasDimensions first;
		setAttribute: #height to: canvasDimensions second.
	self updateScale
]

{ #category : #accessing }
XRHtmlPanel >> canvasTexture [

	^ canvasTexture ifNil: [
		canvasTexture := (Three CanvasTexture new: self canvas)
			colorSpace: Three SRGBColorSpace;
			yourself]
]

{ #category : #accessing }
XRHtmlPanel >> containingElement [

	^ containingElement ifNil: [
		containingElement := JS window document createElement: 'div'.
		containingElement style
			position: #fixed;
			top: '0';
			left: '0';
			overflow: #hidden;
			visibility: #hidden.
		containingElement]
]

{ #category : #accessing }
XRHtmlPanel >> element [

	^ element
]

{ #category : #accessing }
XRHtmlPanel >> element: anHtmlElement [

	element ifNotNil: [
		self containingElement removeChild: element.
		self mutationObserver disconnect].
	
	element := anHtmlElement.
	
	element style overflow: #hidden. "discard overflowing margins"
	self containingElement appendChild: element.
	self mutationObserver observe: element config: ({
		#subtree -> true.
		#childList -> true.
		#attributes -> true.} as: Dictionary).
	self updateTexture.
]

{ #category : #'as yet unclassified' }
XRHtmlPanel >> elementFromPoint: aPoint [

	^ self elementFromPoint: aPoint inElement: self element
]

{ #category : #'as yet unclassified' }
XRHtmlPanel >> elementFromPoint: aPoint inElement: anHTMLElement [

	| insideRect rect |
	rect := anHTMLElement getBoundingClientRect.
	insideRect := (rect left < aPoint x) and: [rect right > aPoint x] and: [rect top < aPoint y] and: [rect bottom > aPoint y].
	insideRect
		ifFalse: [^ nil]
		ifTrue: [
			(JSArrayWrapper from: anHTMLElement children) do: [:childElement |
				(self elementFromPoint: aPoint inElement: childElement)
					ifNotNil: [:element | ^ element]].
			^ anHTMLElement]
]

{ #category : #'as yet unclassified' }
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
	clickedElement := self elementFromPoint: clickPoint.
	event := JS MouseEvent
		new: 'click'
		options: ({
			#bubbles -> true.
			#cancelable -> true.
			# view -> JS window} as: Dictionary).
	
	self withElementSelectableDo: [clickedElement dispatchEvent: event].
	self updateTexture
]

{ #category : #accessing }
XRHtmlPanel >> htmlDimensions [

	| rect |
	rect := self boundingRect.
	"TODO: the proper solution is to re-add Point to the minimal image"
	^ {rect width. rect height}
]

{ #category : #accessing }
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
	
	| geometry material |
	geometry := Three PlaneGeometry
		new: 1m
		height: 1m.
	material := Three MeshLambertMaterial
		new: ({#map -> self canvasTexture} as: Dictionary).
	
	^ (Three Mesh
		new: geometry
		material: material)
		userData: ({#isPointable -> true} as: Dictionary);
		yourself
]

{ #category : #accessing }
XRHtmlPanel >> mutationObserver [

	^ mutationObserver ifNil: [
		mutationObserver := JS MutationObserver new: [:mutations :observer |
			self onMutation: mutations observer: observer]]
]

{ #category : #'as yet unclassified' }
XRHtmlPanel >> onMutation: mutations observer: observer [

	self updateTexture
]

{ #category : #accessing }
XRHtmlPanel >> scale [

	^ scale ifNil: [scale := 1.0]
]

{ #category : #accessing }
XRHtmlPanel >> scale: aNumber [

	scale := aNumber.
	self updateScale
]

{ #category : #'as yet unclassified' }
XRHtmlPanel >> updateScale [

	| dimensions width |
	dimensions := self canvasDimensions.
	width := dimensions second isZero
		ifTrue: [1.0]
		ifFalse: [dimensions first / dimensions second].

	self threeObject scale
		set: width * self scale
		y: self scale
		z: self scale
]

{ #category : #'as yet unclassified' }
XRHtmlPanel >> updateTexture [
	"rendering to HTML canvas adapted from https://stackoverflow.com/a/25760896"
	| ctx img svg svgBlob svgObjectUrl |
	
	htmlDimensions := self htmlDimensions.
	self canvasDimensions = htmlDimensions ifFalse: [
		self canvasDimensions: htmlDimensions].
	
	svg := '
		<svg xmlns="http://www.w3.org/2000/svg" width="{1}" height="{2}">
			<foreignObject width="100%" height="100%">
				<div xmlns="http://www.w3.org/1999/xhtml">{3}</div>
			</foreignObject>
		</svg>' format: {
			self canvasDimensions first.
			self canvasDimensions second.
			self element outerHTML}.
	
	svgBlob := JS Blob new: {svg} options: ({#type -> 'image/svg+xml;charset=utf-8'} as: Dictionary).
	svgObjectUrl := JS URL createObjectURL: svgBlob.
	
	img := JS Image new.
	img addEventListener: #load do: [
		ctx := self canvas getContext: #'2d'.
		ctx drawImage: img dx: 0 dy: 0.
		JS URL revokeObjectURL: svgObjectUrl.
		self canvasTexture needsUpdate: true.].
	img src: svgObjectUrl.
]

{ #category : #'as yet unclassified' }
XRHtmlPanel >> withElementSelectableDo: aBlock [

	"This method ensures that JS methods like elementByPoint work correctly, which expect that the element is visible and on top"
	self world elementContainer removeChild: self containingElement.
	self world elementContainer appendChild: self containingElement.
	aBlock value.
]

{ #category : #accessing }
XRHtmlPanel >> world: aWorld [

	self world ifNotNil: [:world | world removeChild: self containingElement].
	
	super world: aWorld.
	self world elementContainer appendChild: self containingElement.
	self updateTexture.
]
