Class {
	#name : #XRWorld,
	#superclass : #Object,
	#instVars : [
		'server',
		'cube',
		'renderer',
		'scene',
		'camera'
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

{ #category : #'as yet unclassified' }
XRWorld >> renderTime: time frame: frame [

	cube rotation y: time / 1000.
	renderer render: scene camera: camera
]

{ #category : #'as yet unclassified' }
XRWorld >> start [
	| light resize |
	scene := Three Scene new.
	scene background: (Three Color new: 16r505050).
	
	camera := Three PerspectiveCamera
		new: 50
		aspect: self class aspect
		near: 0.1
		far: 100.
	camera position set: 0 y: 1.6 z: 3.
	scene add: camera.
	
	light := Three DirectionalLight new: 16rffffff intensity: 0.5.
	light position set: 1 y: 1 z: 1;
 		normalize.
	scene add: light.
	scene add: (Three AmbientLight new: 16rffffff intensity: 0.5).
	
	cube := Three Mesh
		new: (Three BoxGeometry
			new: 1
			y: 1
			z: 1)
		material: (Three MeshLambertMaterial
			new: ({#color -> 16rff0000} as: Dictionary)).
	cube position set: 0 y: 1.5 z: -10.
	scene add: cube.
	
	renderer := Three WebGLRenderer new: ({#antialias -> true} as: Dictionary).
	renderer
		setPixelRatio: JS window devicePixelRatio;
		setSize: self class canvasWidth height: self class canvasHeight.
	renderer xr enabled: true.
	
	renderer setAnimationLoop: [:time :frame | self renderTime: time frame: frame].
	
	JS window document body appendChild: renderer domElement.
	JS window document body
		appendChild: (JS VRButton createButton: renderer).
	
	resize := [camera aspect: self class aspect.
			camera updateProjectionMatrix.
			renderer setSize: self class canvasWidth height: self class canvasHeight].
	resize value.
	
	JS window
		addEventListener: 'resize'
		do: resize
		useCapture: false
]
