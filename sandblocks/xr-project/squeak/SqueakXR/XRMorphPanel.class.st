Class {
	#name : #XRMorphPanel,
	#superclass : #XRObject,
	#instVars : [
		'morph',
		'canvasTexture',
		'canvas',
		'pixelsPerMeter'
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

{ #category : #accessing }
XRMorphPanel >> canvasTexture [

	"There might be some potential for deduplication with the XRHtmlPanel here"
	^ canvasTexture ifNil: [
		canvasTexture := (Three CanvasTexture new: self canvas)
			colorSpace: Three SRGBColorSpace;
			magFilter: Three NearestFilter;
			yourself]
]

{ #category : #initializing }
XRMorphPanel >> initialize [

	super initialize.
	
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
	self updateTexture.
]

{ #category : #'as yet unclassified' }
XRMorphPanel >> pixelsPerMeter [

	^ pixelsPerMeter
]

{ #category : #'as yet unclassified' }
XRMorphPanel >> pixelsPerMeter: aNumber [

	pixelsPerMeter := aNumber
]

{ #category : #'as yet unclassified' }
XRMorphPanel >> updateTexture [

	self canvas
		width: self morph width;
		height: self morph height.
	self threeObject scale
		set: self morph width / self pixelsPerMeter;
		y: self morph height / self pixelsPerMeter;
		z: 1.0.
	
	self morph imageForm drawOnTexture: self canvasTexture.
	self canvasTexture needsUpdate: true.
]
