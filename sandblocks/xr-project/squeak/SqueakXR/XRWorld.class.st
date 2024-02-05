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
		'elementContainer'
	],
	#classVars : [
		'CurrentService'
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

	self new start
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
	} do: [:hand | self scene add: hand threeObject]
	
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
		add: (Three AmbientLight new: 16rffffff intensity: 0.5).
	
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
	self elementContainer setAttribute: 'style' to: 'position: absolute; visibility: hidden;'.
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

	| element htmlMesh text |
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
	
	element := JS window document createElement: 'div'.
	element setAttribute: 'id' to: 'test-id'.
	element setAttribute: 'style' to: 'width: 100px; height: 100px; background: #FFB;'.
	self elementContainer appendChild: element.
	
	text := JS window document createElement: 'p'.
	text innerHTML: 'Hello world!'.
	element appendChild: text.
	
	htmlMesh := JS HTMLMesh new: element.
	htmlMesh position set: 0m y: 1.5m z: -0.5m.
	self scene add: htmlMesh.
]
