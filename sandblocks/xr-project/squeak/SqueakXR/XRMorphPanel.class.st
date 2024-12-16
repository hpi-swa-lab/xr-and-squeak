Class {
	#name : #XRMorphPanel,
	#superclass : #XRObject,
	#instVars : [
		'morph',
		'canvasTexture',
		'canvas',
		'pixelsPerMeter',
		'preClickBlock'
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

{ #category : #'as yet unclassified' }
XRMorphPanel >> cleanupMorph [

	morph delete
]

{ #category : #'as yet unclassified' }
XRMorphPanel >> delete [

	self cleanupMorph
]

{ #category : #accessing }
XRMorphPanel >> handlePointing: anEvent [

	| dimensions normalizedPoint point pointingInformation clickPoint event |
	anEvent hand triggerJustPressed ifFalse: [^ self].
	
	pointingInformation := anEvent info.
	
	point := (self threeObject worldToLocal: pointingInformation point) asVector.
	dimensions := Vector3
		x: pointingInformation object geometry parameters width
		y: pointingInformation object geometry parameters height
		z: 1.
	normalizedPoint := point / dimensions.
	normalizedPoint x: normalizedPoint x + 0.5.
	normalizedPoint y: 1.0 - (normalizedPoint y + 0.5).
	clickPoint := (normalizedPoint xy * (self morph extent)) asPoint + self morph topLeft.
	
	Transcript showln: clickPoint.
	
	"preClickBlock cull: self morph."
	"self currentHand mouseFocus: morph."
	"morph activate."
	[event := MouseButtonEvent new
		setType: #mouseDown
		position: clickPoint asPoint
		which: MouseButtonEvent redButton
		buttons: MouseButtonEvent redButton
		nClicks: 1
		hand: self currentHand
		stamp: Sensor eventTimeNow.
	self currentHand handleEvent: event.
	event := MouseButtonEvent new
		setType: #mouseUp
		position: clickPoint asPoint
		which: MouseButtonEvent redButton
		buttons: MouseButtonEvent redButton
		nClicks: 1
		hand: self currentHand
		stamp: Sensor eventTimeNow.
	self currentHand handleEvent: event.]
		on: ProvideAnswerNotification
		do: [:n | Transcript showln: n. n resume: true].
	
	"clickPoint := normalizedPoint multiply: self htmlElementSizeAsVector3.
	clickedElement := self elementFromPoint: clickPoint.
	event := JS MouseEvent
		new: 'click'
		options: ({
			#bubbles -> true.
			#cancelable -> true.
			# view -> JS window} as: Dictionary).
	
	self withElementSelectableDo: [clickedElement dispatchEvent: event]."
	self updateTexture
]

{ #category : #initializing }
XRMorphPanel >> initialize [

	super initialize.
	
	self pixelsPerMeter: 100.
	
	JS document onkeydown: [:event | [self onKeydown: event] on: Error do: [:e | Transcript showln: 'keydown error ', e asString]].
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

	morph ifNotNil: [
		self cleanupMorph].
	
	morph := aMorph.
	morph openInWorld.
	self updateTexture.
]

{ #category : #initializing }
XRMorphPanel >> onKeydown: aJSEvent [

	| character event value keyString keyCode keyValue buttons |
	keyString := aJSEvent key asString.
	(keyString size > 1 and: [keyString ~= 'Backspace']) ifTrue: [Transcript showln: 'Character string must be length 1: ', keyString. ^ self].
	character := keyString first.
	"character isAlphaNumeric ifFalse: [Transcript showln: 'No support for non-alphanumeric characters'. ^ self]."
	value := EventSensor virtualKeyTable keyAtValue: character asUppercase.
	[Transcript showln: ('keyString: "{1}" character: "{2}" value: "{3}" value to character: "{4}"' format: {keyString. character. value. EventSensor virtualKeyTable at: value. 1. 2. 3. 4}).]
		on: Error do: [:e | Transcript showln: e].
	
	Transcript showln: aJSEvent ctrlKey.
	keyValue := aJSEvent ctrlKey ifTrue: [115] ifFalse: [character asInteger].
	keyCode := aJSEvent ctrlKey ifTrue: [1] ifFalse: [value].
	buttons := aJSEvent ctrlKey ifTrue: [64] ifFalse: [0].
	
	keyString = 'Backspace' ifTrue: [
		keyValue := 8.
		keyCode := 51].
	
	event := KeyboardEvent new
		setType: #keystroke
		buttons: buttons
		position: self currentHand position
		keyValue: keyValue
		keyCode: keyCode
		hand: self currentHand
		stamp: Sensor eventTimeNow.
	[self currentHand keyboardFocus keyStroke: event.]
		on: Error
		do: [:e | Transcript showln: 'error occurred during keystroke: ', e description asString].
	Transcript showln: event .
	Transcript showln: self currentHand keyboardFocus.
	self updateTexture.
	aJSEvent preventDefault.
	"self currentHand handleEvent: event."
	"event := KeyboardEvent new
		setType: #keyUp
		buttons: 0
		position: self currentHand position
		keyValue: value
		keyCode: value
		hand: self currentHand
		stamp: Sensor eventTimeNow.
	self currentHand handleEvent: event."
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
XRMorphPanel >> preClickBlock: aBlock [

	preClickBlock := aBlock
]

{ #category : #accessing }
XRMorphPanel >> scale [
]

{ #category : #'as yet unclassified' }
XRMorphPanel >> updateTexture [

	self morph ifNil: [^ self].

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

{ #category : #accessing }
XRMorphPanel >> worldToMorph: aVector3 [

	| localPoint |
	localPoint := (self threeObject worldToLocal: aVector3) asVector.
	localPoint /= self scale.
	^ localPoint * self morph extent
]
