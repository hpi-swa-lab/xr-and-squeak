Class {
	#name : #XRWorld,
	#superclass : #Object,
	#instVars : [
		'server',
		'cube',
		'renderer',
		'scene',
		'camera',
		'hands',
		'elementContainer',
		'xrObjects',
		'lastTime',
		'errorPanel'
	],
	#classVars : [
		'CurrentService',
		'CurrentWorld',
		'RenderFrame',
		'RenderProcess'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #'as yet unclassified' }
XRWorld class >> aspect [

	^ self canvasWidth asFloat / self canvasHeight
]

{ #category : #'as yet unclassified' }
XRWorld class >> canvasHeight [

	^ JS window innerHeight
]

{ #category : #'as yet unclassified' }
XRWorld class >> canvasWidth [

	^ JS window innerWidth
]

{ #category : #'as yet unclassified' }
XRWorld class >> clearRenderFrame [

	RenderFrame := nil
]

{ #category : #'as yet unclassified' }
XRWorld class >> clearRenderProcess [

	self renderProcess: nil
]

{ #category : #'as yet unclassified' }
XRWorld class >> current [

	^ CurrentWorld
]

{ #category : #'as yet unclassified' }
XRWorld class >> ensureRenderFrame: frame deltaTime: deltaTime world: world [

	^ RenderFrame
		ifNil: [
			RenderFrame := XRRenderFrame new
				deltaTime: deltaTime;
				frame: frame;
				world: world]
		ifNotNil: [
			RenderFrame isNew: false]
		
]

{ #category : #'as yet unclassified' }
XRWorld class >> renderProcess [

	^ RenderProcess
]

{ #category : #'as yet unclassified' }
XRWorld class >> renderProcess: aProcess [

	RenderProcess := aProcess
]

{ #category : #'as yet unclassified' }
XRWorld class >> renderProcessIsActive [

	^ Processor activeProcess = self renderProcess
]

{ #category : #'as yet unclassified' }
XRWorld class >> start [

	XRToolSet doWithDefaultErrorHandling: [
		CurrentWorld ifNotNil: #stop.
		CurrentWorld := self new start]
]

{ #category : #'as yet unclassified' }
XRWorld >> add: anXRObject [

	self xrObjects add: anXRObject.
	anXRObject world: self.
	self scene add: anXRObject threeObject.
	
	^ anXRObject
]

{ #category : #setup }
XRWorld >> animationLoop [

	^ [:time :frame | self renderTime: time frame: frame]
]

{ #category : #setup }
XRWorld >> createCamera [

	camera := Three PerspectiveCamera
		new: 50
		aspect: self class aspect
		near: 0.1
		far: 100.
	camera position set: 0m y: 1.6m z: 3m.
	^ camera
]

{ #category : #setup }
XRWorld >> createHands [

	hands := {
		XRHand new
			world: self;
			index: 0;
			yourself.
		XRHand new
			world: self;
			index: 1;
			yourself.
	} do: [:hand | self add: hand]
	
]

{ #category : #setup }
XRWorld >> createRenderer [
	
	self renderer: (Three WebGLRenderer new: ({#antialias -> true} as: Dictionary)).
	self renderer
		setPixelRatio: JS window devicePixelRatio;
		setSize: self class canvasWidth height: self class canvasHeight.
	self renderer xr enabled: true.
	
	self renderer setAnimationLoop: self animationLoop.
]

{ #category : #setup }
XRWorld >> createScene [
	| light |
	self scene: Three Scene new.
	self scene background: (Three Color new: 16r505050).
	
	light := Three DirectionalLight new: 16rffffff intensity: 0.5.
	light position
		set: 1m y: 1m z: 1m;
 		normalize.
	self scene
		add: light;
		add: (Three AmbientLight new: 16rffffff intensity: 1.0).
	
	self
		createCamera;
		createHands.
]

{ #category : #setup }
XRWorld >> displayError: anError [

	| errorString |
	errorString := String new: 1000 streamContents: [:stream | | context |
		stream
			nextPutAll: '======== An error occurred ========';
			nextPut: Character cr;
			nextPutAll: anError asString;
			nextPut: Character cr;
			nextPutAll: 'Stack trace:';
			nextPut: Character cr.
		
		context := anError signalerContext.
		[context] whileNotNil: [
			stream
				nextPutAll: context asString;
				nextPut: Character cr.
			context := context sender]].

	errorPanel text: errorString
]

{ #category : #accessing }
XRWorld >> elementContainer [

	^ elementContainer
]

{ #category : #accessing }
XRWorld >> elementContainer: anHTMLElement [

	elementContainer := anHTMLElement
]

{ #category : #initializing }
XRWorld >> initialize [

	lastTime := 0.
	xrObjects := OrderedCollection new.
]

{ #category : #rendering }
XRWorld >> render [

	renderer render: self scene camera: camera
]

{ #category : #rendering }
XRWorld >> renderTime: time frame: frameNumber [

	ToolSet doWithDefaultErrorHandling: [ | frame |
		self class renderProcess: Processor activeProcess.
		frame := self class
			ensureRenderFrame: frameNumber
			deltaTime: time - lastTime
			world: self.
		frame isNew ifTrue: [
			lastTime := time].
		
		frame process.
		
		self class
			clearRenderFrame;
			clearRenderProcess]
]

{ #category : #accessing }
XRWorld >> renderer [

	^ renderer
]

{ #category : #accessing }
XRWorld >> renderer: aRenderer [

	renderer := aRenderer
]

{ #category : #accessing }
XRWorld >> scene [

	^ scene
]

{ #category : #accessing }
XRWorld >> scene: aScene [

	scene := aScene
]

{ #category : #setup }
XRWorld >> setupDocument [
	| resize container |
	
	self assert: self renderer notNil.
	
	container := JS window document getElementById: 'xr-container'.
	container appendChild: self renderer domElement.
	container appendChild: (JS VRButton createButton: self renderer).
	
	self elementContainer: (JS window document createElement: 'div').
	container appendChild: elementContainer.
	
	resize := [camera aspect: self class aspect.
			camera updateProjectionMatrix.
			self renderer setSize: self class canvasWidth height: self class canvasHeight].
	resize value.
	
	JS window
		addEventListener: 'resize'
		do: resize
		useCapture: false
]

{ #category : #setup }
XRWorld >> setupEnvironment [

	ToolSet default: XRToolSet
]

{ #category : #setup }
XRWorld >> start [

	| createTestElement |
	self
		setupEnvironment;
		createRenderer;
		createScene;
		setupDocument.
	
	"temporary"
	createTestElement := [ | button clickCounter count element text updateCounter |
		element := JS window document createElement: 'div'.
		element setAttribute: 'id' to: 'test-id'.
		element style
			width: '400px';
			height: '200px';
			background: '#ffb';
			at: 'overflow-wrap' put: 'break-word';
			at: #'z-index' put: 0;
			at: #'font-family' put: #'sans-serif';
			at: #'font-size' put: '10px'.
	
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
		
		element].
	
	self add: (XRHtmlPanel new
		position: (Three Vector3 new: 1m y: 1m z: -0.5m);
		element: createTestElement value).
	
	self add: (XRRotatingCube new
		position: (Three Vector3 new: 0m y: 1.5m z: -10m)).
	"self add: (XRBrokenRotatingCube new
		position: (Three Vector3 new: 2m y: 1.5m z: -10m))."
		
	errorPanel := XRTextPanel new.
	self add: (errorPanel
		position: (Three Vector3 new: -1m y: 1m z: -0.5m)).
	
	self add: (XRTextEditorPanel new
		position: (Three Vector3 new: -1m y: 2.1m z: -0.5m);
		editedClass: XRRotatingCube selector: #step:)
]

{ #category : #setup }
XRWorld >> stop [

	self renderer setAnimationLoop: nil.
	self renderer dispose.
]

{ #category : #rendering }
XRWorld >> update: aSymbol [

	Transcript showln: aSymbol
]

{ #category : #'as yet unclassified' }
XRWorld >> xrObjectWithIdentifier: anIdentifier [

	self xrObjects do: [:xrObject |
		(xrObject xrObjectWithIdentifier: anIdentifier) ifNotNil: [:obj | ^ obj]].
	^ nil
]

{ #category : #accessing }
XRWorld >> xrObjects [

	^ xrObjects
]

{ #category : #accessing }
XRWorld >> xrObjectsDo: aBlock [

	xrObjects do: aBlock
]
