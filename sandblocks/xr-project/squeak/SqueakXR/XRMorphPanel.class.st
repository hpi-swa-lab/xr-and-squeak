Class {
	#name : #XRMorphPanel,
	#superclass : #XRObject,
	#instVars : [
		'morph',
		'canvasTexture',
		'canvas',
		'pixelsPerMeter',
		'textureNeedsUpdate'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #'instance creation' }
XRMorphPanel class >> for: aMorph [

	^ self new morph: aMorph
]

{ #category : #accessing }
XRMorphPanel >> canvas [

	^ canvas ifNil: [
		canvas := JS window document createElement: 'canvas']
]

{ #category : #private }
XRMorphPanel >> canvas: aCanvas [

	canvas := aCanvas
]

{ #category : #accessing }
XRMorphPanel >> canvasTexture [

	"There might be some potential for deduplication with the XRHtmlPanel here"
	^ canvasTexture ifNil: [
		canvasTexture := (Three CanvasTexture new: self canvas)
			colorSpace: Three SRGBColorSpace;
			magFilter: Three NearestFilter;
			yourself]
]

{ #category : #private }
XRMorphPanel >> canvasTexture: aCanvasTexture [

	canvasTexture := aCanvasTexture
]

{ #category : #accessing }
XRMorphPanel >> handlePointing: anEvent [

	| dimensions normalizedPoint point pointingInformation |
	anEvent hand triggerJustPressed ifFalse: [^ self].
	
	pointingInformation := anEvent info.
	
	point := self threeObject worldToLocal: pointingInformation point.
	dimensions := Three Vector3
		new: pointingInformation object geometry parameters width
		y: pointingInformation object geometry parameters height
		z: 1.
	normalizedPoint := point clone divide: dimensions.
	normalizedPoint x: normalizedPoint x + 0.5.
	normalizedPoint y: 1.0 - (normalizedPoint y + 0.5).
	
	"clickPoint := normalizedPoint multiply: self htmlElementSizeAsVector3.
	clickedElement := self elementFromPoint: clickPoint.
	event := JS MouseEvent
		new: 'click'
		options: ({
			#bubbles -> true.
			#cancelable -> true.
			# view -> JS window} as: Dictionary).
	
	self withElementSelectableDo: [clickedElement dispatchEvent: event].
	self updateTexture"
]

{ #category : #initializing }
XRMorphPanel >> initialize [

	super initialize.
	
	textureNeedsUpdate := false.
	self pixelsPerMeter: 100.
]

{ #category : #initializing }
XRMorphPanel >> initializeThreeObject [
	
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
XRMorphPanel >> morph [

	^ morph
]

{ #category : #accessing }
XRMorphPanel >> morph: aMorph [

	morph := aMorph.
	self queueTextureUpdate.
]

{ #category : #'as yet unclassified' }
XRMorphPanel >> pixelsPerMeter [

	^ pixelsPerMeter
]

{ #category : #'as yet unclassified' }
XRMorphPanel >> pixelsPerMeter: aNumber [

	pixelsPerMeter := aNumber
]

{ #category : #accessing }
XRMorphPanel >> queueTextureUpdate [

	textureNeedsUpdate := true
]

{ #category : #accessing }
XRMorphPanel >> step: deltaTime [

	textureNeedsUpdate ifTrue: [self updateTexture]
]

{ #category : #'as yet unclassified' }
XRMorphPanel >> updateTexture [

	self canvas
		width: self morph width;
		height: self morph height.
	self threeObject scale
		set: self morph width / self pixelsPerMeter
		y: self morph height / self pixelsPerMeter
		z: 1.0.
	
	self morph imageForm drawOnTexture: self canvasTexture.
	self canvasTexture needsUpdate: true.
	
	textureNeedsUpdate := false.
]

{ #category : #accessing }
XRMorphPanel >> worldToMorph: aVector3 [

	| localPoint |
	localPoint := (self threeObject worldToLocal: aVector3) asVector.
	localPoint /= self scale.
	^ localPoint * (self morph extent @ 1)
]
