Class {
	#name : #XRWorld,
	#superclass : #Object,
	#instVars : [
		'server'
	],
	#classVars : [
		'CurrentService'
	],
	#category : #SqueakXR
}

{ #category : #'as yet unclassified' }
XRWorld class >> start [

	self new start
]

{ #category : #'as yet unclassified' }
XRWorld >> start [

	| camera cube geometry material renderer scene |
	camera := Three PerspectiveCamera
		new: 75
		aspect: JS window innerWidth asFloat / JS window innerHeight
		near: 0.1
		far: 100.
	scene := Three Scene new.
	renderer := Three WebGLRenderer new: ({#antialias -> true} as: Dictionary).
	renderer xr enabled: true.
	renderer setSize: JS window innerWidth height: JS window innerHeight.
	
	JS window document body appendChild: renderer domElement.
	
	geometry := Three BoxGeometry new: 1 y: 1 z: 1.
	material := Three MeshBasicMaterial new: ({#color -> 16r00ff00} as: Dictionary).
	cube := Three Mesh new: geometry material: material.
	scene add: cube.
	
	camera position z: 5.
	
	JS window document body appendChild: (JS VRButton createButton: renderer).
	
	renderer setAnimationLoop: [:time |
		cube rotation y: time * 0.001.
		renderer render: scene camera: camera]
]
