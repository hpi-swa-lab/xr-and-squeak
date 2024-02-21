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
		'xrObjects'
	],
	#classVars : [
		'CurrentService',
		'CurrentWorld'
	],
	#category : #SqueakXR
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
XRWorld class >> start [

	CurrentWorld ifNotNil: #stop.
	CurrentWorld := self new start
]

{ #category : #'as yet unclassified' }
XRWorld >> add: anXRObject [

	xrObjects add: anXRObject.
	anXRObject world: self.
	self scene add: anXRObject threeObject.
	
	^ anXRObject
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
	
	self renderer setAnimationLoop: [:time :frame | self renderTime: time frame: frame].
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

	xrObjects := OrderedCollection new.
]

{ #category : #'as yet unclassified' }
XRWorld >> renderTime: time frame: frame [

	cube rotation y: time / 1000.
	renderer render: self scene camera: camera
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
XRWorld >> start [

	| createTestElement |
	self
		createRenderer;
		createScene;
		setupDocument.
	
	"temporary"
	cube := Three Mesh
		new: (Three BoxGeometry
			new: 1m
			y: 1m
			z: 1m)
		material: (Three MeshLambertMaterial
			new: ({#color -> 16rff0000} as: Dictionary)).
	cube position set: 0m y: 1.5m z: -10m.
	self scene add: cube.
	
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
]

{ #category : #setup }
XRWorld >> stop [

	self renderer setAnimationLoop: nil.
	self renderer dispose.
]

{ #category : #'as yet unclassified' }
XRWorld >> xrObjectWithIdentifier: anIdentifier [

	^ xrObjects detect: [:xrObject | xrObject matchesIdentifier: anIdentifier]
]
